import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
import os
import logging
from pydantic import BaseModel, Field
import re
import json
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class NewsArticle(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    url: str
    url_to_image: Optional[str] = None
    published_at: datetime
    source_name: str
    source_id: Optional[str] = None
    author: Optional[str] = None
    crime_score: Optional[float] = None
    crime_analysis: Optional[Dict[str, Any]] = None

class NewsAPIClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://newsapi.org/v2"
        self.session = None
    
    async def __aenter__(self):
        self.session = httpx.AsyncClient(
            headers={"X-API-Key": self.api_key},
            timeout=30.0
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.aclose()
    
    async def fetch_top_headlines(
        self, 
        country: str = "us",
        category: Optional[str] = None,
        sources: Optional[str] = None,
        q: Optional[str] = None,
        page_size: int = 20,
        page: int = 1
    ) -> Dict[str, Any]:
        params = {
            "country": country,
            "pageSize": min(page_size, 100),
            "page": page
        }
        
        if category:
            params["category"] = category
        if sources:
            params["sources"] = sources
        if q:
            params["q"] = q
            
        try:
            # Add small delay to respect rate limits
            await asyncio.sleep(0.1)
            
            response = await self.session.get(
                f"{self.base_url}/top-headlines",
                params=params
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"NewsAPI HTTP error: {e.response.status_code} - {e.response.text}")
            raise Exception(f"NewsAPI error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"NewsAPI request error: {str(e)}")
            raise Exception(f"Failed to connect to NewsAPI: {str(e)}")
    
    async def search_everything(
        self,
        q: str,
        sources: Optional[str] = None,
        domains: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        language: str = "en",
        sort_by: str = "relevancy",
        page_size: int = 20,
        page: int = 1
    ) -> Dict[str, Any]:
        params = {
            "q": q,
            "language": language,
            "sortBy": sort_by,
            "pageSize": min(page_size, 100),
            "page": page
        }
        
        if sources:
            params["sources"] = sources
        if domains:
            params["domains"] = domains
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
            
        try:
            # Add small delay to respect rate limits
            await asyncio.sleep(0.1)
            
            response = await self.session.get(
                f"{self.base_url}/everything",
                params=params
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"NewsAPI HTTP error: {e.response.status_code} - {e.response.text}")
            raise Exception(f"NewsAPI error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"NewsAPI request error: {str(e)}")
            raise Exception(f"Failed to connect to NewsAPI: {str(e)}")

class CrimeContentFilter:
    def __init__(self):
        self.crime_keywords = {
            "violent_crimes": {
                "keywords": [
                    "murder", "homicide", "killing", "shot", "shooting", "stabbing",
                    "assault", "attack", "violence", "rape", "robbery", "mugging",
                    "kidnapping", "abduction", "domestic violence", "gang violence",
                    "armed robbery", "gunshot", "knife attack", "fatal shooting"
                ],
                "weight": 3.0
            },
            "property_crimes": {
                "keywords": [
                    "theft", "stealing", "burglary", "breaking and entering",
                    "vandalism", "arson", "fraud", "embezzlement", "forgery",
                    "shoplifting", "car theft", "identity theft", "burglary",
                    "stolen", "robbed", "break-in", "larceny"
                ],
                "weight": 2.0
            },
            "drug_crimes": {
                "keywords": [
                    "drug trafficking", "narcotics", "cocaine", "heroin", "methamphetamine",
                    "drug bust", "drug seizure", "drug arrest", "substance abuse",
                    "illegal drugs", "drug dealing", "drug possession", "marijuana",
                    "cannabis", "fentanyl", "opioid", "overdose"
                ],
                "weight": 2.5
            },
            "white_collar": {
                "keywords": [
                    "money laundering", "tax evasion", "securities fraud", "insider trading",
                    "corruption", "bribery", "ponzi scheme", "corporate fraud",
                    "financial crime", "wire fraud", "bank fraud", "scam"
                ],
                "weight": 2.0
            },
            "cyber_crimes": {
                "keywords": [
                    "cybercrime", "hacking", "data breach", "ransomware", "phishing",
                    "cyber attack", "online fraud", "internet crime", "malware",
                    "identity theft online", "cybersecurity incident", "hack"
                ],
                "weight": 2.5
            },
            "campus_specific": {
                "keywords": [
                    "campus crime", "university crime", "college crime", "student safety",
                    "campus security", "campus assault", "dorm", "dormitory",
                    "fraternity", "sorority", "campus police", "university police"
                ],
                "weight": 3.5
            }
        }
        
        self.legal_keywords = [
            "arrest", "arrested", "charged", "convicted", "sentenced", "indicted",
            "trial", "court", "judge", "jury", "prison", "jail", "custody",
            "police", "investigation", "suspect", "criminal", "crime", "victim",
            "prosecutor", "detective", "officer", "law enforcement"
        ]
    
    def calculate_crime_score(self, text: str) -> float:
        if not text:
            return 0.0
            
        text_lower = text.lower()
        total_score = 0.0
        
        # Check crime category keywords
        for category, data in self.crime_keywords.items():
            for keyword in data["keywords"]:
                if keyword in text_lower:
                    total_score += data["weight"]
        
        # Check legal process keywords
        legal_matches = sum(1 for keyword in self.legal_keywords if keyword in text_lower)
        total_score += legal_matches * 0.5
        
        return min(total_score, 10.0)  # Cap at 10.0
    
    def is_crime_related(
        self, 
        title: str, 
        description: str = "", 
        content: str = "",
        threshold: float = 2.0
    ) -> tuple[bool, float, dict]:
        combined_text = f"{title} {description} {content}"
        crime_score = self.calculate_crime_score(combined_text)
        
        # Detailed analysis
        analysis = {
            "title_score": self.calculate_crime_score(title),
            "description_score": self.calculate_crime_score(description),
            "content_score": self.calculate_crime_score(content) if content else 0.0,
            "total_score": crime_score,
            "is_crime_related": crime_score >= threshold,
            "confidence_level": min(crime_score / 5.0, 1.0)
        }
        
        return crime_score >= threshold, crime_score, analysis

    def extract_location_info(self, text: str) -> List[str]:
        """Extract potential location information from text"""
        if not text:
            return []
        
        # Common location patterns
        location_patterns = [
            r'\b([A-Z][a-z]+ (?:University|College|Campus))\b',
            r'\b([A-Z][a-z]+ (?:Street|Road|Avenue|Boulevard|Lane))\b',
            r'\b([A-Z][a-z]+, [A-Z]{2})\b',  # City, State
            r'\b([A-Z][a-z]+ (?:County|District))\b',
            r'\b(downtown|uptown|campus|university area)\b',
        ]
        
        locations = []
        for pattern in location_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            locations.extend(matches)
        
        return list(set(locations))  # Remove duplicates

async def fetch_crime_news(
    news_api_key: str,
    location_filter: str = "campus OR university OR college",
    max_articles: int = 50
) -> List[NewsArticle]:
    """Fetch and filter crime-related news articles"""
    
    crime_filter = CrimeContentFilter()
    filtered_articles = []
    
    async with NewsAPIClient(news_api_key) as client:
        try:
            # Search for crime-related articles
            crime_queries = [
                f"crime AND ({location_filter})",
                f"assault AND ({location_filter})",
                f"theft AND ({location_filter})",
                f"robbery AND ({location_filter})",
                f"safety AND ({location_filter})"
            ]
            
            for query in crime_queries:
                try:
                    # Get articles from past week
                    from_date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime('%Y-%m-%d')
                    
                    news_data = await client.search_everything(
                        q=query,
                        from_date=from_date,
                        language="en",
                        sort_by="relevancy",
                        page_size=20
                    )
                    
                    if news_data.get("status") != "ok":
                        logger.warning(f"NewsAPI warning for query '{query}': {news_data.get('message', 'Unknown error')}")
                        continue
                    
                    # Process articles
                    for article_data in news_data.get("articles", []):
                        if not article_data.get("title") or not article_data.get("url"):
                            continue
                        
                        # Skip articles we already have
                        if any(art.url == article_data["url"] for art in filtered_articles):
                            continue
                        
                        # Apply crime filtering
                        is_crime, crime_score, analysis = crime_filter.is_crime_related(
                            title=article_data.get("title", ""),
                            description=article_data.get("description", ""),
                            content=article_data.get("content", ""),
                            threshold=1.5  # Lower threshold for broader detection
                        )
                        
                        if is_crime and crime_score >= 1.5:
                            try:
                                # Parse published date
                                published_at = datetime.fromisoformat(
                                    article_data["publishedAt"].replace("Z", "+00:00")
                                )
                                
                                # Extract location information
                                combined_text = f"{article_data.get('title', '')} {article_data.get('description', '')}"
                                locations = crime_filter.extract_location_info(combined_text)
                                
                                # Enhanced analysis with location
                                analysis["locations"] = locations
                                analysis["has_location"] = len(locations) > 0
                                
                                # Create article object
                                article = NewsArticle(
                                    title=article_data["title"],
                                    description=article_data.get("description"),
                                    content=article_data.get("content"),
                                    url=article_data["url"],
                                    url_to_image=article_data.get("urlToImage"),
                                    published_at=published_at,
                                    source_name=article_data["source"]["name"],
                                    source_id=article_data["source"].get("id"),
                                    author=article_data.get("author"),
                                    crime_score=crime_score,
                                    crime_analysis=analysis
                                )
                                
                                filtered_articles.append(article)
                                
                                # Stop if we have enough articles
                                if len(filtered_articles) >= max_articles:
                                    break
                                    
                            except Exception as e:
                                logger.warning(f"Error processing article: {str(e)}")
                                continue
                
                except Exception as e:
                    logger.error(f"Error fetching news for query '{query}': {str(e)}")
                    continue
                
                # Stop if we have enough articles
                if len(filtered_articles) >= max_articles:
                    break
                    
                # Small delay between queries
                await asyncio.sleep(0.5)
        
        except Exception as e:
            logger.error(f"Error in fetch_crime_news: {str(e)}")
            raise
    
    # Sort by crime score (highest first) and publication date
    filtered_articles.sort(key=lambda x: (-x.crime_score, -x.published_at.timestamp()))
    
    return filtered_articles[:max_articles]