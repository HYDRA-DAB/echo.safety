from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import bcrypt
import re
import asyncio
from news_fetcher import fetch_crime_news, NewsArticle
from ai_predictor import AICrimePredictor, CrimePrediction, TrendAnalysis
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# API Keys and Configuration
NEWS_API_KEY = os.environ.get('NEWS_API_KEY')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT and Password settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DELTA = timedelta(days=7)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enhanced Models
class TrustedContact(BaseModel):
    name: str
    phone: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    srm_roll_number: str
    password_hash: str
    trusted_contacts: List[TrustedContact] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    srm_roll_number: str
    password: str
    trusted_contact_1_name: Optional[str] = ""
    trusted_contact_1_phone: Optional[str] = ""
    trusted_contact_2_name: Optional[str] = ""
    trusted_contact_2_phone: Optional[str] = ""

    @validator('phone', 'trusted_contact_1_phone', 'trusted_contact_2_phone')
    def validate_phone(cls, v):
        if v and v.strip():  # Only validate if phone number is provided
            # Remove all non-digit characters
            cleaned = re.sub(r'\D', '', v)
            # Check if it's a valid Indian mobile number (10 digits starting with 6-9)
            if not re.match(r'^[6-9]\d{9}$', cleaned):
                raise ValueError('Phone number must be a valid 10-digit Indian mobile number')
            return cleaned
        return v

class UserLogin(BaseModel):
    email_or_roll: str  # Can be email or SRM roll number
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    srm_roll_number: str
    trusted_contacts: List[TrustedContact] = []
    created_at: datetime

class LocationData(BaseModel):
    lat: float
    lng: float
    address: str
    source: Optional[str] = "unknown"  # "current", "search", "map", "unknown"

class CrimeReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    crime_type: str  # "theft", "women_safety", "drugs"
    location: LocationData
    severity: str  # "low", "medium", "high"
    status: str = "pending"  # "pending", "investigating", "resolved"
    is_anonymous: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CrimeReportCreate(BaseModel):
    title: str
    description: str
    crime_type: str
    location: LocationData
    severity: str
    is_anonymous: bool = False

class CrimeReportResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    crime_type: str
    location: LocationData
    severity: str
    status: str
    is_anonymous: bool
    created_at: datetime

class SOSAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    location: LocationData
    emergency_type: str = "general"  # "general", "medical", "security", "fire"
    status: str = "active"  # "active", "resolved"
    trusted_contacts_notified: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SOSCreate(BaseModel):
    location: LocationData
    emergency_type: str = "general"

class AITrendPrediction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prediction_text: str
    confidence_level: str  # "low", "medium", "high"
    crime_type: str
    location_area: str
    valid_until: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Enhanced AI Models
class NewsArticleStored(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    url: str
    url_to_image: Optional[str] = None
    published_at: datetime
    source_name: str
    source_id: Optional[str] = None
    author: Optional[str] = None
    crime_score: float
    crime_analysis: Dict[str, Any]
    locations: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EnhancedAIPrediction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prediction_text: str
    confidence_level: str  # "low", "medium", "high"
    crime_type: str
    location_area: str
    risk_factors: List[str] = []
    preventive_measures: List[str] = []
    data_sources: List[str] = []
    valid_until: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CrimeTrendAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trend_type: str  # "increasing", "decreasing", "stable"
    crime_categories: List[str]
    time_period: str
    key_insights: List[str]
    statistical_summary: Dict[str, Any]
    analysis_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAnalysisResponse(BaseModel):
    predictions: List[EnhancedAIPrediction]
    trend_analysis: CrimeTrendAnalysis
    safety_tips: List[str]
    news_articles_analyzed: int
    last_updated: datetime

# Voice Chatbot Models
class VoiceChatMessage(BaseModel):
    message: str
    incident_type: Optional[str] = None  # "theft", "harassment", "drug_abuse", "other"
    priority_level: Optional[str] = None  # "low", "medium", "high"
    conversation_stage: Optional[str] = "initial"  # "initial", "incident_type", "priority", "actions", "signin_help"
    session_id: Optional[str] = None

class VoiceChatResponse(BaseModel):
    response: str
    quick_replies: List[str] = []
    buttons: List[Dict[str, str]] = []  # {"text": "Button Text", "action": "action_type"}
    conversation_stage: str
    show_serious_actions: bool = False
    session_id: str

# Authentication helpers
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + JWT_EXPIRATION_DELTA
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Authentication routes
@api_router.post("/auth/signup")
async def signup(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({
        "$or": [
            {"email": user_data.email},
            {"srm_roll_number": user_data.srm_roll_number}
        ]
    })
    
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email or roll number already exists")
    
    # Process trusted contacts
    trusted_contacts = []
    if user_data.trusted_contact_1_phone and user_data.trusted_contact_1_name:
        trusted_contacts.append(TrustedContact(
            name=user_data.trusted_contact_1_name.strip(),
            phone=user_data.trusted_contact_1_phone
        ))
    
    if user_data.trusted_contact_2_phone and user_data.trusted_contact_2_name:
        trusted_contacts.append(TrustedContact(
            name=user_data.trusted_contact_2_name.strip(),
            phone=user_data.trusted_contact_2_phone
        ))
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_dict = {
        "name": user_data.name.strip(),
        "email": user_data.email.strip().lower(),
        "phone": user_data.phone,
        "srm_roll_number": user_data.srm_roll_number.strip(),
        "password_hash": hashed_password,
        "trusted_contacts": [contact.dict() for contact in trusted_contacts],
        "created_at": datetime.now(timezone.utc)
    }
    
    user = User(**user_dict)
    await db.users.insert_one(user.dict())
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user.dict())
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    # Find user by email or roll number
    user = await db.users.find_one({
        "$or": [
            {"email": login_data.email_or_roll},
            {"srm_roll_number": login_data.email_or_roll}
        ]
    })
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user)
    }

# Crime reporting routes
@api_router.post("/crimes/report", response_model=CrimeReportResponse)
async def report_crime(crime_data: CrimeReportCreate, current_user: User = Depends(get_current_user)):
    crime_dict = crime_data.dict()
    crime_dict["user_id"] = current_user.id
    crime = CrimeReport(**crime_dict)
    
    await db.crime_reports.insert_one(crime.dict())
    return CrimeReportResponse(**crime.dict())

@api_router.get("/crimes", response_model=List[CrimeReportResponse])
async def get_crimes():
    # Sort by created_at descending (latest first)
    crimes = await db.crime_reports.find().sort("created_at", -1).to_list(1000)
    return [CrimeReportResponse(**crime) for crime in crimes]

@api_router.get("/crimes/recent", response_model=List[CrimeReportResponse])
async def get_recent_crimes(limit: int = 5):
    # Get recent crimes for dashboard
    crimes = await db.crime_reports.find().sort("created_at", -1).limit(limit).to_list(limit)
    return [CrimeReportResponse(**crime) for crime in crimes]

@api_router.get("/crimes/map-data")
async def get_map_data():
    crimes = await db.crime_reports.find().sort("created_at", -1).to_list(1000)
    
    # Transform data for map visualization
    map_data = []
    for crime in crimes:
        map_data.append({
            "id": crime["id"],
            "type": crime["crime_type"],
            "location": crime["location"],
            "severity": crime["severity"],
            "title": crime["title"],
            "description": crime["description"],
            "created_at": crime["created_at"].isoformat() if isinstance(crime["created_at"], datetime) else crime["created_at"]
        })
    
    return {"crimes": map_data}

# SOS routes
@api_router.post("/sos/alert", response_model=SOSAlert)
async def create_sos_alert(sos_data: SOSCreate, current_user: User = Depends(get_current_user)):
    # Get trusted contacts for notification
    trusted_contacts_phones = [contact.phone for contact in current_user.trusted_contacts]
    
    sos_dict = sos_data.dict()
    sos_dict["user_id"] = current_user.id
    sos_dict["trusted_contacts_notified"] = trusted_contacts_phones
    sos_alert = SOSAlert(**sos_dict)
    
    await db.sos_alerts.insert_one(sos_alert.dict())
    return sos_alert

@api_router.get("/sos/alerts", response_model=List[SOSAlert])
async def get_sos_alerts():
    alerts = await db.sos_alerts.find().sort("created_at", -1).to_list(100)
    return [SOSAlert(**alert) for alert in alerts]

# Get user's trusted contacts
@api_router.get("/user/trusted-contacts")
async def get_trusted_contacts(current_user: User = Depends(get_current_user)):
    return {"trusted_contacts": current_user.trusted_contacts}

# Update user's trusted contacts
@api_router.put("/user/trusted-contacts")
async def update_trusted_contacts(
    contacts_data: dict, 
    current_user: User = Depends(get_current_user)
):
    # Validate and process the contacts data
    trusted_contacts = []
    
    # Process contact 1
    if contacts_data.get('contact1_name') and contacts_data.get('contact1_phone'):
        contact1_phone = re.sub(r'\D', '', contacts_data['contact1_phone'])
        if not re.match(r'^[6-9]\d{9}$', contact1_phone):
            raise HTTPException(status_code=400, detail="Contact 1: Invalid phone number format")
        trusted_contacts.append(TrustedContact(
            name=contacts_data['contact1_name'].strip(),
            phone=contact1_phone
        ))
    
    # Process contact 2
    if contacts_data.get('contact2_name') and contacts_data.get('contact2_phone'):
        contact2_phone = re.sub(r'\D', '', contacts_data['contact2_phone'])
        if not re.match(r'^[6-9]\d{9}$', contact2_phone):
            raise HTTPException(status_code=400, detail="Contact 2: Invalid phone number format")
        trusted_contacts.append(TrustedContact(
            name=contacts_data['contact2_name'].strip(),
            phone=contact2_phone
        ))
    
    # Update user's trusted contacts in database
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"trusted_contacts": [contact.dict() for contact in trusted_contacts]}}
    )
    
    return {
        "message": "Trusted contacts updated successfully",
        "trusted_contacts": [contact.dict() for contact in trusted_contacts]
    }

# Get user profile
@api_router.get("/user/profile")
async def get_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "srm_roll_number": current_user.srm_roll_number,
        "trusted_contacts": current_user.trusted_contacts,
        "created_at": current_user.created_at
    }

# Enhanced AI Predictions routes
@api_router.get("/ai/predictions", response_model=AIAnalysisResponse)
async def get_enhanced_ai_predictions(background_tasks: BackgroundTasks):
    """Get AI-powered crime predictions based on real news data analysis"""
    
    try:
        # Check if we have API keys
        if not NEWS_API_KEY or not EMERGENT_LLM_KEY:
            # Fall back to mock predictions if keys not available
            return await get_mock_ai_predictions()
        
        # Try to get recent cached analysis first
        recent_analysis = await db.ai_analysis.find_one(
            {"analysis_date": {"$gte": datetime.now(timezone.utc) - timedelta(hours=6)}},
            sort=[("analysis_date", -1)]
        )
        
        if recent_analysis:
            # Return cached analysis if less than 6 hours old
            return AIAnalysisResponse(**recent_analysis)
        
        # Fetch new crime news data
        try:
            crime_articles = await fetch_crime_news(
                news_api_key=NEWS_API_KEY,
                location_filter="campus OR university OR college OR SRM OR academic",
                max_articles=30
            )
        except Exception as e:
            logging.error(f"Error fetching news: {str(e)}")
            # Fall back to mock if news fetch fails
            return await get_mock_ai_predictions()
        
        # Initialize AI predictor
        ai_predictor = AICrimePredictor(EMERGENT_LLM_KEY)
        
        # Analyze trends
        try:
            trend_analysis = await ai_predictor.analyze_crime_trends(crime_articles)
        except Exception as e:
            logging.error(f"Error in trend analysis: {str(e)}")
            trend_analysis = TrendAnalysis(
                trend_type="stable",
                crime_categories=["general"],
                time_period="past_week",
                key_insights=["Analysis temporarily unavailable"],
                statistical_summary={"total_articles": len(crime_articles)}
            )
        
        # Generate predictions
        try:
            predictions = await ai_predictor.generate_predictions(crime_articles, trend_analysis)
        except Exception as e:
            logging.error(f"Error generating predictions: {str(e)}")
            predictions = []
        
        # Generate safety tips
        try:
            safety_tips = await ai_predictor.generate_safety_tips(predictions)
        except Exception as e:
            logging.error(f"Error generating safety tips: {str(e)}")
            safety_tips = [
                "Stay aware of your surroundings",
                "Travel in groups when possible",
                "Report suspicious activity to campus security"
            ]
        
        # Convert to response models
        enhanced_predictions = []
        for pred in predictions:
            enhanced_pred = EnhancedAIPrediction(
                id=pred.id,
                prediction_text=pred.prediction_text,
                confidence_level=pred.confidence_level,
                crime_type=pred.crime_type,
                location_area=pred.location_area,
                risk_factors=pred.risk_factors,
                preventive_measures=pred.preventive_measures,
                data_sources=pred.data_sources,
                valid_until=pred.valid_until,
                created_at=pred.created_at
            )
            enhanced_predictions.append(enhanced_pred)
        
        # Create trend analysis model
        trend_analysis_model = CrimeTrendAnalysis(
            trend_type=trend_analysis.trend_type,
            crime_categories=trend_analysis.crime_categories,
            time_period=trend_analysis.time_period,
            key_insights=trend_analysis.key_insights,
            statistical_summary=trend_analysis.statistical_summary
        )
        
        # Create response
        analysis_response = AIAnalysisResponse(
            predictions=enhanced_predictions,
            trend_analysis=trend_analysis_model,
            safety_tips=safety_tips,
            news_articles_analyzed=len(crime_articles),
            last_updated=datetime.now(timezone.utc)
        )
        
        # Store analysis in database for caching
        background_tasks.add_task(
            store_ai_analysis,
            analysis_response.dict(),
            crime_articles
        )
        
        return analysis_response
        
    except Exception as e:
        logging.error(f"Error in enhanced AI predictions: {str(e)}")
        # Fall back to mock predictions
        return await get_mock_ai_predictions()

async def get_mock_ai_predictions() -> AIAnalysisResponse:
    """Fallback mock predictions when API services are unavailable"""
    
    mock_predictions = [
        EnhancedAIPrediction(
            prediction_text="Moderate theft risk near Main Library during evening hours",
            confidence_level="medium",
            crime_type="property",
            location_area="Academic Block A",
            risk_factors=["Evening hours", "High foot traffic", "Limited security visibility"],
            preventive_measures=["Secure personal belongings", "Use well-lit pathways", "Travel in groups"],
            data_sources=["Campus security reports"],
            valid_until=datetime.now(timezone.utc) + timedelta(days=7)
        ),
        EnhancedAIPrediction(
            prediction_text="Increased safety awareness needed near hostel areas after 8 PM",
            confidence_level="medium",
            crime_type="general",
            location_area="Hostel Complex",
            risk_factors=["Late hours", "Reduced visibility", "Multiple entry points"],
            preventive_measures=["Use campus escort service", "Stay in groups", "Report suspicious activity"],
            data_sources=["Historical data analysis"],
            valid_until=datetime.now(timezone.utc) + timedelta(days=5)
        ),
        EnhancedAIPrediction(
            prediction_text="Standard security protocols recommended for parking areas",
            confidence_level="low",
            crime_type="property",
            location_area="Campus Parking",
            risk_factors=["Vehicle vulnerability", "Limited surveillance", "Isolated locations"],
            preventive_measures=["Lock vehicles securely", "Avoid displaying valuables", "Park in well-lit areas"],
            data_sources=["General safety guidelines"],
            valid_until=datetime.now(timezone.utc) + timedelta(days=7)
        )
    ]
    
    mock_trend = CrimeTrendAnalysis(
        trend_type="stable",
        crime_categories=["property", "general"],
        time_period="past_week",
        key_insights=[
            "No significant changes in campus crime patterns",
            "Property crimes remain the primary concern",
            "Enhanced security measures showing positive results"
        ],
        statistical_summary={
            "total_incidents": 0,
            "data_sources": 0,
            "analysis_type": "mock_data"
        }
    )
    
    mock_safety_tips = [
        "Always be aware of your surroundings",
        "Travel in groups, especially during evening hours",
        "Keep personal belongings secure and out of sight",
        "Use well-lit pathways and avoid shortcuts",
        "Report any suspicious activity to campus security immediately",
        "Keep emergency contact numbers readily available"
    ]
    
    return AIAnalysisResponse(
        predictions=mock_predictions,
        trend_analysis=mock_trend,
        safety_tips=mock_safety_tips,
        news_articles_analyzed=0,
        last_updated=datetime.now(timezone.utc)
    )

async def store_ai_analysis(analysis_data: dict, articles: List[NewsArticle]):
    """Background task to store AI analysis and news articles"""
    try:
        # Store the analysis
        await db.ai_analysis.insert_one(analysis_data)
        
        # Store news articles for future reference
        for article in articles:
            article_dict = {
                "title": article.title,
                "description": article.description,
                "content": article.content,
                "url": article.url,
                "url_to_image": article.url_to_image,
                "published_at": article.published_at,
                "source_name": article.source_name,
                "source_id": article.source_id,
                "author": article.author,
                "crime_score": article.crime_score,
                "crime_analysis": article.crime_analysis,
                "locations": article.crime_analysis.get("locations", []) if article.crime_analysis else [],
                "created_at": datetime.now(timezone.utc)
            }
            
            # Only store if we don't already have this article
            existing = await db.news_articles.find_one({"url": article.url})
            if not existing:
                await db.news_articles.insert_one(article_dict)
        
        # Clean up old analysis (keep only last 10)
        analyses = await db.ai_analysis.find().sort("analysis_date", -1).skip(10).to_list(100)
        for old_analysis in analyses:
            await db.ai_analysis.delete_one({"_id": old_analysis["_id"]})
            
        # Clean up old articles (keep only last 200)
        old_articles = await db.news_articles.find().sort("created_at", -1).skip(200).to_list(1000)
        for old_article in old_articles:
            await db.news_articles.delete_one({"_id": old_article["_id"]})
            
        logging.info(f"Stored AI analysis with {len(articles)} articles")
        
    except Exception as e:
        logging.error(f"Error storing AI analysis: {str(e)}")

# Get recent news articles
@api_router.get("/ai/news-articles")
async def get_recent_news_articles(limit: int = 10):
    """Get recent crime-related news articles used for analysis"""
    try:
        articles = await db.news_articles.find().sort("published_at", -1).limit(limit).to_list(limit)
        
        return {
            "articles": articles,
            "count": len(articles),
            "last_updated": articles[0]["created_at"] if articles else None
        }
        
    except Exception as e:
        logging.error(f"Error fetching news articles: {str(e)}")
        return {
            "articles": [],
            "count": 0,
            "last_updated": None,
            "error": "Unable to fetch news articles"
        }

# Force refresh AI analysis
@api_router.post("/ai/refresh-analysis")
async def refresh_ai_analysis(background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Force refresh of AI analysis (requires authentication)"""
    
    try:
        # Delete cached analysis to force refresh
        await db.ai_analysis.delete_many({})
        
        # Get fresh analysis
        analysis = await get_enhanced_ai_predictions(background_tasks)
        
        return {
            "message": "AI analysis refreshed successfully",
            "analysis": analysis,
            "refreshed_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"Error refreshing AI analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh AI analysis: {str(e)}"
        )

# Voice Chatbot Routes
@api_router.post("/voice", response_model=VoiceChatResponse)
async def voice_chat(chat_message: VoiceChatMessage):
    """Interactive voice chatbot powered by Emergent LLM (ChatGPT)"""
    
    try:
        # Generate session ID if not provided
        if not chat_message.session_id:
            chat_message.session_id = f"voice_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
        
        # System prompt for Voice chatbot
        system_prompt = """You are Voice, the Echo beginner guide for campus safety. You help users with signup, signin, crime reporting, and safety steps.

IMPORTANT RULES:
1. Ask ONE question at a time only
2. Never perform actions - only provide guidance
3. Keep responses concise and helpful
4. Always end serious safety responses with: "If life is in danger, call police now. I can't call for you, but our site offers one-click helpline access."

CONVERSATION FLOW:
- Start by asking what happened (if not provided)
- Then ask about priority level (if not provided)
- High priority → Show serious safety actions
- Low/Medium → Show reporting guidance
- Offer signin help if needed

Your role is to guide users through Echo's safety features step by step."""

        # Determine conversation stage and generate appropriate response
        stage = chat_message.conversation_stage or "initial"
        
        # Create context for the LLM based on current stage and user input
        context_messages = []
        
        if stage == "initial":
            context_messages.append(f"User message: {chat_message.message}")
            context_messages.append("This is the first interaction. Ask what happened or what type of incident they need help with.")
        
        elif stage == "incident_type":
            context_messages.append(f"User reported incident type: {chat_message.incident_type}")
            context_messages.append("Now ask about the priority level: Low, Medium, or High.")
        
        elif stage == "priority":
            context_messages.append(f"Incident: {chat_message.incident_type}, Priority: {chat_message.priority_level}")
            if chat_message.priority_level == "high":
                context_messages.append("This is HIGH priority. Provide serious safety actions guidance immediately and end with the emergency disclaimer.")
            else:
                context_messages.append("This is Low/Medium priority. Provide reporting guidance and steps.")
        
        elif stage == "actions":
            context_messages.append(f"User needs help with: {chat_message.message}")
            context_messages.append("Provide specific guidance for their situation.")
        
        elif stage == "signin_help":
            context_messages.append(f"User asking about signin: {chat_message.message}")
            context_messages.append("Provide signin/signup guidance.")
        
        # Combine context into a single prompt
        full_context = "\n".join(context_messages)
        
        # Initialize LLM chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=chat_message.session_id,
            system_message=system_prompt
        ).with_model("openai", "gpt-4o-mini")
        
        # Send message to ChatGPT
        user_message = UserMessage(text=full_context)
        llm_response = await chat.send_message(user_message)
        
        # Determine next stage and quick replies based on current stage
        quick_replies = []
        buttons = []
        next_stage = stage
        show_serious = False
        
        if stage == "initial":
            quick_replies = ["Theft", "Harassment", "Drug Abuse", "Other"]
            next_stage = "incident_type"
        
        elif stage == "incident_type":
            quick_replies = ["Low", "Medium", "High"]
            next_stage = "priority"
        
        elif stage == "priority":
            if chat_message.priority_level == "high":
                show_serious = True
                buttons = [
                    {"text": "Open Report Page", "action": "open_report"},
                    {"text": "Open Sign In", "action": "open_signin"},
                    {"text": "Call Help", "action": "call_help"}
                ]
                next_stage = "actions"
            else:
                buttons = [
                    {"text": "Open Report Page", "action": "open_report"},
                    {"text": "Open Sign In", "action": "open_signin"}
                ]
                quick_replies = ["Sign Up Guide", "Sign In Guide", "No Thanks"]
                next_stage = "signin_help"
        
        elif stage == "actions" or stage == "signin_help":
            # Final stage - provide options to restart or get more help
            buttons = [
                {"text": "Start Over", "action": "restart"},
                {"text": "Get More Help", "action": "help"}
            ]
        
        # Log intent for metrics (non-PII)
        intent_log = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "incident_type": chat_message.incident_type,
            "priority_level": chat_message.priority_level,
            "conversation_stage": next_stage,
            "session_id": chat_message.session_id
        }
        logging.info(f"Voice chatbot intent: {intent_log}")
        
        return VoiceChatResponse(
            response=llm_response,
            quick_replies=quick_replies,
            buttons=buttons,
            conversation_stage=next_stage,
            show_serious_actions=show_serious,
            session_id=chat_message.session_id
        )
        
    except Exception as e:
        logging.error(f"Error in voice chatbot: {str(e)}")
        
        # Fallback response
        return VoiceChatResponse(
            response="I'm having trouble right now. For immediate help, please contact campus security or use our SOS feature. If life is in danger, call police now. I can't call for you, but our site offers one-click helpline access.",
            quick_replies=["Try Again", "Get Help"],
            buttons=[
                {"text": "Open Sign In", "action": "open_signin"},
                {"text": "Call Help", "action": "call_help"}
            ],
            conversation_stage="error",
            show_serious_actions=True,
            session_id=chat_message.session_id or f"error_{str(uuid.uuid4())[:8]}"
        )

# Basic route from original code
@api_router.get("/")
async def root():
    return {"message": "Echo - Campus Crime Alert & Prevention API - SRM KTR"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()