import asyncio
import json
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from news_fetcher import NewsArticle

load_dotenv()

logger = logging.getLogger(__name__)

class CrimePrediction(BaseModel):
    id: str = Field(default_factory=lambda: str(__import__('uuid').uuid4()))
    prediction_text: str
    confidence_level: str  # "low", "medium", "high"
    crime_type: str
    location_area: str
    risk_factors: List[str] = []
    preventive_measures: List[str] = []
    valid_until: datetime
    data_sources: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TrendAnalysis(BaseModel):
    trend_type: str  # "increasing", "decreasing", "stable"
    crime_categories: List[str]
    time_period: str
    key_insights: List[str]
    statistical_summary: Dict[str, Any]

class AICrimePredictor:
    def __init__(self, emergent_llm_key: str):
        self.emergent_llm_key = emergent_llm_key
        self.session_id = f"crime_predictor_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
    async def analyze_crime_trends(self, articles: List[NewsArticle]) -> TrendAnalysis:
        """Analyze crime trends from news articles using LLM"""
        
        if not articles:
            return TrendAnalysis(
                trend_type="stable",
                crime_categories=[],
                time_period="past_week",
                key_insights=["No significant crime data available for analysis"],
                statistical_summary={"total_articles": 0, "average_crime_score": 0.0}
            )
        
        # Prepare articles data for analysis
        articles_summary = []
        crime_scores = []
        crime_types = set()
        
        for article in articles[:20]:  # Limit to top 20 articles
            crime_scores.append(article.crime_score or 0.0)
            
            # Extract crime type from analysis
            if article.crime_analysis:
                # Simple crime type classification based on keywords
                title_lower = article.title.lower()
                if any(word in title_lower for word in ["murder", "killing", "homicide", "shooting", "stabbing"]):
                    crime_type = "violent"
                elif any(word in title_lower for word in ["theft", "robbery", "burglary", "stolen"]):
                    crime_type = "property"
                elif any(word in title_lower for word in ["drug", "narcotics", "substance", "overdose"]):
                    crime_type = "drug"
                elif any(word in title_lower for word in ["assault", "attack", "harassment"]):
                    crime_type = "assault"
                else:
                    crime_type = "general"
                    
                crime_types.add(crime_type)
            
            articles_summary.append({
                "title": article.title[:100],  # Truncate for LLM input
                "crime_score": article.crime_score,
                "published_date": article.published_at.strftime('%Y-%m-%d'),
                "source": article.source_name
            })
        
        # Calculate statistical summary
        avg_score = sum(crime_scores) / len(crime_scores) if crime_scores else 0.0
        statistical_summary = {
            "total_articles": len(articles),
            "average_crime_score": round(avg_score, 2),
            "unique_sources": len(set(article.source_name for article in articles)),
            "date_range": f"{articles[-1].published_at.strftime('%Y-%m-%d')} to {articles[0].published_at.strftime('%Y-%m-%d')}"
        }
        
        # Create LLM prompt for trend analysis
        prompt = f"""
        Analyze the following crime-related news articles and provide a comprehensive trend analysis for campus safety.

        ARTICLES DATA:
        {json.dumps(articles_summary, indent=2)}

        STATISTICAL SUMMARY:
        - Total articles analyzed: {statistical_summary['total_articles']}
        - Average crime severity score: {statistical_summary['average_crime_score']}/10
        - Date range: {statistical_summary['date_range']}
        - Unique news sources: {statistical_summary['unique_sources']}

        Please provide a trend analysis in the following JSON format:
        {{
            "trend_type": "increasing|decreasing|stable",
            "crime_categories": ["list of main crime types found"],
            "time_period": "past_week",
            "key_insights": ["insight 1", "insight 2", "insight 3"],
            "confidence_assessment": "high|medium|low"
        }}

        Focus on:
        1. Overall crime trend direction (increasing, decreasing, stable)
        2. Most prevalent crime categories
        3. Key patterns or insights for campus safety
        4. Geographic or temporal patterns if evident
        5. Confidence level in the analysis

        Respond with ONLY the JSON object, no additional text.
        """
        
        try:
            chat = LlmChat(
                api_key=self.emergent_llm_key,
                session_id=self.session_id,
                system_message="You are an expert crime analyst specializing in campus safety and crime trend analysis. Provide accurate, data-driven insights based on news articles."
            ).with_model("openai", "gpt-4o-mini")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse LLM response
            response_text = response.strip()
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            
            analysis_data = json.loads(response_text)
            
            return TrendAnalysis(
                trend_type=analysis_data.get("trend_type", "stable"),
                crime_categories=analysis_data.get("crime_categories", list(crime_types)),
                time_period=analysis_data.get("time_period", "past_week"),
                key_insights=analysis_data.get("key_insights", ["Analysis completed successfully"]),
                statistical_summary=statistical_summary
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return TrendAnalysis(
                trend_type="stable",
                crime_categories=list(crime_types),
                time_period="past_week",
                key_insights=["Analysis completed with limited insights due to parsing error"],
                statistical_summary=statistical_summary
            )
        except Exception as e:
            logger.error(f"Error in trend analysis: {str(e)}")
            return TrendAnalysis(
                trend_type="stable",
                crime_categories=list(crime_types),
                time_period="past_week",
                key_insights=[f"Analysis completed with basic insights due to error: {str(e)[:100]}"],
                statistical_summary=statistical_summary
            )

    async def generate_predictions(self, articles: List[NewsArticle], trend_analysis: TrendAnalysis) -> List[CrimePrediction]:
        """Generate crime predictions based on articles and trend analysis"""
        
        predictions = []
        
        if not articles:
            # Return a default prediction if no articles
            return [CrimePrediction(
                prediction_text="No significant crime trends detected for campus area",
                confidence_level="low",
                crime_type="general",
                location_area="Campus Area",
                risk_factors=["Limited data available"],
                preventive_measures=["Maintain standard safety protocols"],
                valid_until=datetime.now(timezone.utc) + timedelta(days=7),
                data_sources=["System analysis"]
            )]
        
        # Prepare data for LLM prediction
        recent_crimes = []
        for article in articles[:10]:  # Use top 10 articles
            recent_crimes.append({
                "title": article.title,
                "crime_score": article.crime_score,
                "date": article.published_at.strftime('%Y-%m-%d'),
                "locations": article.crime_analysis.get("locations", []) if article.crime_analysis else []
            })
        
        prompt = f"""
        Based on the following crime trend analysis and recent crime incidents, generate 3 specific crime predictions for campus safety.

        TREND ANALYSIS:
        - Trend direction: {trend_analysis.trend_type}
        - Crime categories: {', '.join(trend_analysis.crime_categories)}
        - Key insights: {'; '.join(trend_analysis.key_insights)}

        RECENT CRIME INCIDENTS:
        {json.dumps(recent_crimes, indent=2)}

        Generate predictions in the following JSON format:
        [
            {{
                "prediction_text": "Specific prediction description",
                "confidence_level": "high|medium|low",
                "crime_type": "violent|property|drug|assault|cyber|general",
                "location_area": "Specific campus area or general area",
                "risk_factors": ["factor1", "factor2", "factor3"],
                "preventive_measures": ["measure1", "measure2", "measure3"],
                "validity_days": 7
            }}
        ]

        Requirements:
        1. Make predictions actionable and specific to campus safety
        2. Include realistic risk factors based on the data
        3. Provide practical preventive measures
        4. Set appropriate confidence levels based on data quality
        5. Focus on areas like "Academic Buildings", "Dormitories", "Campus Parking", "Library Area", etc.
        6. Generate exactly 3 predictions

        Respond with ONLY the JSON array, no additional text.
        """
        
        try:
            chat = LlmChat(
                api_key=self.emergent_llm_key,
                session_id=self.session_id,
                system_message="You are a campus safety expert who generates accurate, actionable crime predictions based on data analysis. Focus on practical campus safety measures."
            ).with_model("openai", "gpt-4o-mini")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse LLM response
            response_text = response.strip()
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            
            predictions_data = json.loads(response_text)
            
            # Create prediction objects
            for pred_data in predictions_data:
                validity_days = pred_data.get("validity_days", 7)
                prediction = CrimePrediction(
                    prediction_text=pred_data.get("prediction_text", "Crime prediction generated"),
                    confidence_level=pred_data.get("confidence_level", "medium"),
                    crime_type=pred_data.get("crime_type", "general"),
                    location_area=pred_data.get("location_area", "Campus Area"),
                    risk_factors=pred_data.get("risk_factors", []),
                    preventive_measures=pred_data.get("preventive_measures", []),
                    valid_until=datetime.now(timezone.utc) + timedelta(days=validity_days),
                    data_sources=[article.source_name for article in articles[:5]]
                )
                predictions.append(prediction)
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse prediction response: {e}")
            # Fallback predictions
            predictions = self._generate_fallback_predictions(trend_analysis, articles)
        except Exception as e:
            logger.error(f"Error generating predictions: {str(e)}")
            predictions = self._generate_fallback_predictions(trend_analysis, articles)
        
        return predictions[:3]  # Ensure max 3 predictions

    def _generate_fallback_predictions(self, trend_analysis: TrendAnalysis, articles: List[NewsArticle]) -> List[CrimePrediction]:
        """Generate fallback predictions when LLM fails"""
        
        # Analyze most common crime types from articles
        crime_type_counts = {}
        for article in articles:
            title_lower = article.title.lower()
            if any(word in title_lower for word in ["theft", "robbery", "burglary", "stolen"]):
                crime_type_counts["property"] = crime_type_counts.get("property", 0) + 1
            elif any(word in title_lower for word in ["assault", "attack", "violence"]):
                crime_type_counts["violent"] = crime_type_counts.get("violent", 0) + 1
            elif any(word in title_lower for word in ["drug", "substance", "overdose"]):
                crime_type_counts["drug"] = crime_type_counts.get("drug", 0) + 1
        
        most_common_crime = max(crime_type_counts.items(), key=lambda x: x[1])[0] if crime_type_counts else "property"
        
        fallback_predictions = [
            CrimePrediction(
                prediction_text=f"Increased {most_common_crime} crime risk in campus areas based on recent trends",
                confidence_level="medium" if len(articles) > 5 else "low",
                crime_type=most_common_crime,
                location_area="Campus Parking Areas",
                risk_factors=["Recent increase in reported incidents", "Limited security coverage", "High foot traffic"],
                preventive_measures=["Increase security patrols", "Improve lighting", "Install security cameras"],
                valid_until=datetime.now(timezone.utc) + timedelta(days=7),
                data_sources=[article.source_name for article in articles[:3]]
            ),
            CrimePrediction(
                prediction_text="General safety concerns around academic buildings during evening hours",
                confidence_level="medium",
                crime_type="general",
                location_area="Academic Buildings",
                risk_factors=["Evening hours", "Reduced visibility", "Fewer people around"],
                preventive_measures=["Travel in groups", "Use campus escort service", "Stay in well-lit areas"],
                valid_until=datetime.now(timezone.utc) + timedelta(days=5),
                data_sources=[article.source_name for article in articles[:3]]
            ),
            CrimePrediction(
                prediction_text="Recommended increased vigilance in dormitory areas",
                confidence_level="low",
                crime_type="property",
                location_area="Dormitory Complex",
                risk_factors=["High-value items", "Multiple entry points", "Varying security awareness"],
                preventive_measures=["Lock doors and windows", "Secure valuables", "Report suspicious activity"],
                valid_until=datetime.now(timezone.utc) + timedelta(days=7),
                data_sources=[article.source_name for article in articles[:3]]
            )
        ]
        
        return fallback_predictions

    async def generate_safety_tips(self, predictions: List[CrimePrediction]) -> List[str]:
        """Generate general safety tips based on predictions"""
        
        if not predictions:
            return [
                "Stay aware of your surroundings at all times",
                "Travel in groups when possible, especially at night",
                "Keep valuables secure and out of sight",
                "Report any suspicious activity to campus security immediately",
                "Use well-lit pathways and avoid shortcuts through isolated areas"
            ]
        
        # Extract common themes from predictions
        all_measures = []
        crime_types = set()
        locations = set()
        
        for pred in predictions:
            all_measures.extend(pred.preventive_measures)
            crime_types.add(pred.crime_type)
            locations.add(pred.location_area)
        
        # Remove duplicates and get top measures
        unique_measures = list(set(all_measures))
        
        # Add general safety tips
        general_tips = [
            "Stay alert and trust your instincts",
            "Keep emergency contacts readily available",
            "Use campus safety apps and emergency call boxes",
            "Inform someone of your whereabouts when going out",
            "Avoid displaying expensive items in public"
        ]
        
        # Combine and limit to reasonable number
        all_tips = unique_measures + general_tips
        return all_tips[:8]  # Return top 8 tips