from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    srm_roll_number: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    srm_roll_number: str
    password: str

class UserLogin(BaseModel):
    email_or_roll: str  # Can be email or SRM roll number
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    srm_roll_number: str
    created_at: datetime

class CrimeReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: str
    crime_type: str  # "theft", "women_safety", "drugs"
    location: dict  # {"lat": float, "lng": float, "address": str}
    severity: str  # "low", "medium", "high"
    status: str = "pending"  # "pending", "investigating", "resolved"
    is_anonymous: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CrimeReportCreate(BaseModel):
    title: str
    description: str
    crime_type: str
    location: dict
    severity: str
    is_anonymous: bool = False

class SOSAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    location: dict  # {"lat": float, "lng": float, "address": str}
    emergency_type: str = "general"  # "general", "medical", "security", "fire"
    status: str = "active"  # "active", "resolved"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SOSCreate(BaseModel):
    location: dict
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
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    user_dict.pop("password")
    user_dict["password_hash"] = hashed_password
    
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
@api_router.post("/crimes/report", response_model=CrimeReport)
async def report_crime(crime_data: CrimeReportCreate, current_user: User = Depends(get_current_user)):
    crime_dict = crime_data.dict()
    crime_dict["user_id"] = current_user.id
    crime = CrimeReport(**crime_dict)
    
    await db.crime_reports.insert_one(crime.dict())
    return crime

@api_router.get("/crimes", response_model=List[CrimeReport])
async def get_crimes():
    crimes = await db.crime_reports.find().to_list(1000)
    return [CrimeReport(**crime) for crime in crimes]

@api_router.get("/crimes/map-data")
async def get_map_data():
    crimes = await db.crime_reports.find().to_list(1000)
    
    # Transform data for map visualization
    map_data = []
    for crime in crimes:
        map_data.append({
            "id": crime["id"],
            "type": crime["crime_type"],
            "location": crime["location"],
            "severity": crime["severity"],
            "title": crime["title"],
            "created_at": crime["created_at"].isoformat() if isinstance(crime["created_at"], datetime) else crime["created_at"]
        })
    
    return {"crimes": map_data}

# SOS routes
@api_router.post("/sos/alert", response_model=SOSAlert)
async def create_sos_alert(sos_data: SOSCreate, current_user: User = Depends(get_current_user)):
    sos_dict = sos_data.dict()
    sos_dict["user_id"] = current_user.id
    sos_alert = SOSAlert(**sos_dict)
    
    await db.sos_alerts.insert_one(sos_alert.dict())
    return sos_alert

@api_router.get("/sos/alerts", response_model=List[SOSAlert])
async def get_sos_alerts():
    alerts = await db.sos_alerts.find().sort("created_at", -1).to_list(100)
    return [SOSAlert(**alert) for alert in alerts]

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