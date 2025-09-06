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

# AI Predictions routes
@api_router.get("/ai/predictions")
async def get_ai_predictions():
    # Mock AI predictions for the MVP
    mock_predictions = [
        {
            "id": str(uuid.uuid4()),
            "prediction_text": "High theft risk near Main Library this weekend",
            "confidence_level": "high",
            "crime_type": "theft",
            "location_area": "Academic Block A",
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "prediction_text": "Increased women safety concerns near Hostel Road after 8 PM",
            "confidence_level": "medium",
            "crime_type": "women_safety",
            "location_area": "Hostel Complex",
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "prediction_text": "Drug activity detected near Sports Complex",
            "confidence_level": "medium",
            "crime_type": "drugs",
            "location_area": "Sports Complex",
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    return {"predictions": mock_predictions}

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