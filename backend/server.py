from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import httpx
from supabase import create_client, Client
import random


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Supabase connection
supabase_url = os.getenv('SUPABASE_URL', 'https://kmhhazpyalpjwspjxzry.supabase.co')
supabase_key = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaGhhenB5YWxwandzcGp4enJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODIyNzEsImV4cCI6MjA3ODQ1ODI3MX0.adj7b0hh3deVFN4JK6_s0Vjx_KtdLs9N9LaVkQQ__BA')
supabase: Client = create_client(supabase_url, supabase_key)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Prayer Times Models
class PrayerTimes(BaseModel):
    fajr: str
    sunrise: str
    dhuhr: str
    asr: str
    maghrib: str
    isha: str
    date: str
    city: str

# Hadith Models
class Hadith(BaseModel):
    id: Optional[str] = None
    arabic_text: str
    russian_text: str
    source: Optional[str] = None
    image_url: Optional[str] = None

class Story(BaseModel):
    id: Optional[str] = None
    title: str
    text: str
    image_url: Optional[str] = None

class Benefit(BaseModel):
    id: Optional[str] = None
    title: str
    text: str
    image_url: Optional[str] = None

# Login Models
class LoginRequest(BaseModel):
    phone: str
    password: str

class LoginResponse(BaseModel):
    user_id: str
    phone: str
    display_name: str
    role: str
    points: int

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# ========== PRAYER TIMES API ==========
CITIES = {
    "moscow": {"name": "Москва", "lat": 55.7558, "lon": 37.6173},
    "kazan": {"name": "Казань", "lat": 55.7887, "lon": 49.1221},
    "grozny": {"name": "Грозный", "lat": 43.3183, "lon": 45.6933},
    "cairo": {"name": "Каир", "lat": 30.0444, "lon": 31.2357},
    "istanbul": {"name": "Стамбул", "lat": 41.0082, "lon": 28.9784},
    "mecca": {"name": "Мекка", "lat": 21.4225, "lon": 39.8262},
    "medina": {"name": "Медина", "lat": 24.5247, "lon": 39.5692},
}

@api_router.get("/prayer-times", response_model=PrayerTimes)
async def get_prayer_times(city: str = Query("moscow", description="City slug")):
    """Get prayer times for a specific city using Aladhan API"""
    try:
        if city not in CITIES:
            raise HTTPException(status_code=400, detail=f"City not found. Available: {list(CITIES.keys())}")
        
        city_data = CITIES[city]
        
        # Check cache (24 hours)
        cache_key = f"prayer_times_{city}_{datetime.now().strftime('%Y-%m-%d')}"
        cached = await db.prayer_cache.find_one({"key": cache_key})
        
        if cached and cached.get('data'):
            logger.info(f"Prayer times cache hit for {city}")
            return PrayerTimes(**cached['data'])
        
        # Call Aladhan API
        async with httpx.AsyncClient(follow_redirects=True) as client:
            url = f"http://api.aladhan.com/v1/timings"
            params = {
                "latitude": city_data["lat"],
                "longitude": city_data["lon"],
                "method": 2,  # Islamic Society of North America
            }
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
        
        timings = data["data"]["timings"]
        result = PrayerTimes(
            fajr=timings["Fajr"],
            sunrise=timings["Sunrise"],
            dhuhr=timings["Dhuhr"],
            asr=timings["Asr"],
            maghrib=timings["Maghrib"],
            isha=timings["Isha"],
            date=data["data"]["date"]["readable"],
            city=city_data["name"],
        )
        
        # Cache for 24 hours
        await db.prayer_cache.insert_one({
            "key": cache_key,
            "data": result.dict(),
            "created_at": datetime.now(),
        })
        
        logger.info(f"Prayer times fetched for {city}")
        return result
        
    except httpx.HTTPError as e:
        logger.error(f"Error fetching prayer times: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch prayer times")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== HADITH/STORY/BENEFIT API ==========
@api_router.get("/hadith/daily", response_model=Hadith)
async def get_daily_hadith():
    """Get random hadith from Supabase"""
    try:
        # Get total count
        count_response = supabase.table('hadiths').select('id', count='exact').execute()
        total_count = count_response.count if count_response.count else 0
        
        if total_count == 0:
            raise HTTPException(status_code=404, detail="No hadiths found")
        
        # Get random offset
        offset = random.randint(0, max(0, total_count - 1))
        
        # Fetch one hadith
        response = supabase.table('hadiths').select('*').range(offset, offset).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Hadith not found")
        
        hadith_data = response.data[0]
        return Hadith(
            id=str(hadith_data.get('id', '')),
            arabic_text='',  # No Arabic text in current schema
            russian_text=hadith_data.get('text_ru', ''),
            source=None,  # No source field in current schema
            image_url=hadith_data.get('photo_file_id'),  # Using photo_file_id as image_url
        )
        
    except Exception as e:
        logger.error(f"Error fetching hadith: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/story/daily", response_model=Story)
async def get_daily_story():
    """Get random story from Supabase"""
    try:
        count_response = supabase.table('stories').select('id', count='exact').execute()
        total_count = count_response.count if count_response.count else 0
        
        if total_count == 0:
            raise HTTPException(status_code=404, detail="No stories found")
        
        offset = random.randint(0, max(0, total_count - 1))
        response = supabase.table('stories').select('*').range(offset, offset).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Story not found")
        
        story_data = response.data[0]
        # Extract title from text_ru (first line) and use rest as text
        text_ru = story_data.get('text_ru', '')
        lines = text_ru.split('\n', 1)
        title = lines[0].strip('*').strip() if lines else 'Story'
        text = lines[1] if len(lines) > 1 else text_ru
        
        return Story(
            id=str(story_data.get('id', '')),
            title=title,
            text=text,
            image_url=story_data.get('photo_file_id'),  # Using photo_file_id as image_url
        )
        
    except Exception as e:
        logger.error(f"Error fetching story: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/benefit/daily", response_model=Benefit)
async def get_daily_benefit():
    """Get random benefit from Supabase"""
    try:
        count_response = supabase.table('benefits').select('id', count='exact').execute()
        total_count = count_response.count if count_response.count else 0
        
        if total_count == 0:
            raise HTTPException(status_code=404, detail="No benefits found")
        
        offset = random.randint(0, max(0, total_count - 1))
        response = supabase.table('benefits').select('*').range(offset, offset).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Benefit not found")
        
        benefit_data = response.data[0]
        # Use text_ru as both title and text for benefits
        text_ru = benefit_data.get('text_ru', '')
        # Extract first line as title, rest as text
        lines = text_ru.split('\n', 1)
        title = lines[0][:50] + '...' if len(lines[0]) > 50 else lines[0]  # Truncate title
        text = text_ru  # Full text
        
        return Benefit(
            id=str(benefit_data.get('id', '')),
            title=title,
            text=text,
            image_url=benefit_data.get('photo_file_id'),  # Using photo_file_id as image_url
        )
        
    except Exception as e:
        logger.error(f"Error fetching benefit: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== AUTH API ==========
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login with phone and password"""
    try:
        # Query Supabase for user
        response = supabase.table('users').select('*').eq('phone', request.phone).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=401, detail="Неверный телефон или пароль")
        
        user = response.data[0]
        
        # Simple password check (без хеширования пока)
        # В продакшене используйте bcrypt
        if user.get('password') != request.password:
            raise HTTPException(status_code=401, detail="Неверный телефон или пароль")
        
        # Определяем роль
        role = user.get('role', 'student')
        
        return LoginResponse(
            user_id=str(user.get('id', '')),
            phone=user.get('phone', ''),
            display_name=user.get('display_name', 'Студент'),
            role=role,
            points=user.get('points', 0),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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
