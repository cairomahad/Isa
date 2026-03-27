from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
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
import base64
import io


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection (ONLY DATABASE - NO MONGODB)
supabase_url = os.getenv('SUPABASE_URL', 'https://kmhhazpyalpjwspjxzry.supabase.co')
supabase_key = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaGhhenB5YWxwandzcGp4enJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODIyNzEsImV4cCI6MjA3ODQ1ODI3MX0.adj7b0hh3deVFN4JK6_s0Vjx_KtdLs9N9LaVkQQ__BA')
supabase: Client = create_client(supabase_url, supabase_key)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== MODELS ==========
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
    hijri_date: str

# Auth Models
class LoginRequest(BaseModel):
    phone: str
    password: str

class LoginResponse(BaseModel):
    user_id: str
    phone: str
    display_name: str
    role: str
    points: int

# Lesson Models
class Lesson(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    video_url: Optional[str] = None
    audio_url: Optional[str] = None
    pdf_url: Optional[str] = None
    course_type: str
    order_num: int
    is_locked: bool
    duration: Optional[str] = None
    unlock_date: Optional[str] = None

class CourseGroup(BaseModel):
    type: str
    label: str
    emoji: str
    lessons: List[Lesson]
    completed: int
    total: int
    progress: int

class CoursesResponse(BaseModel):
    courses: List[CourseGroup]

class CompleteLessonRequest(BaseModel):
    user_id: str

class CompleteLessonResponse(BaseModel):
    success: bool
    points_earned: int
    next_unlock_date: Optional[str] = None

# Homework Models
class HomeworkTask(BaseModel):
    id: str
    lesson_id: str
    title: str
    description: str
    image_url: Optional[str] = None
    max_audio_duration: int = 300

class SubmitHomeworkRequest(BaseModel):
    user_id: str
    homework_id: str
    audio_base64: Optional[str] = None
    photos_base64: List[str] = []

class SubmitHomeworkResponse(BaseModel):
    success: bool
    submission_id: str
    message: str

# Admin Models
class StudentProgress(BaseModel):
    user_id: str
    display_name: str
    phone: str
    total_lessons: int
    completed_lessons: int
    progress_percentage: int
    points: int
    pending_homeworks: int
    pending_questions: int

class ReviewHomeworkRequest(BaseModel):
    submission_id: str
    grade: int
    comment: str

# Quran Models
class StartQuranProgramRequest(BaseModel):
    user_id: str
    surah_number: int

class LearnAyahRequest(BaseModel):
    user_id: str
    surah: int
    ayah: int

class ReviewAyahRequest(BaseModel):
    user_id: str
    surah: int
    ayah: int

# Admin Lessons Models
class CreateLessonRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str
    video_file_id: Optional[str] = None
    audio_file_id: Optional[str] = None
    pdf_file_id: Optional[str] = None
    duration: Optional[str] = None

class UpdateLessonRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    video_file_id: Optional[str] = None
    audio_file_id: Optional[str] = None
    pdf_file_id: Optional[str] = None
    duration: Optional[str] = None

# File Upload Response
class UploadResponse(BaseModel):
    success: bool
    file_url: str
    file_id: str
    bucket: str


# ========== BASIC ENDPOINTS ==========
@api_router.get("/")
async def root():
    return {"message": "Tazakkur API - Supabase Only"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "supabase",
        "timestamp": datetime.now().isoformat()
    }


# ========== STATUS CHECKS (MIGRATED TO SUPABASE) ==========
@api_router.post("/status")
async def create_status(data: StatusCheckCreate):
    """Create status check (Supabase)"""
    try:
        status_data = {
            'id': str(uuid.uuid4()),
            'client_name': data.client_name,
            'timestamp': datetime.utcnow().isoformat(),
            'created_at': datetime.utcnow().isoformat(),
        }
        
        response = supabase.table('status_checks').insert(status_data).execute()
        return {"id": status_data['id'], "message": "Status created"}
        
    except Exception as e:
        logger.error(f"Error creating status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/status")
async def get_all_statuses():
    """Get all status checks (Supabase)"""
    try:
        response = supabase.table('status_checks').select('*').order('created_at', desc=True).limit(1000).execute()
        return response.data or []
        
    except Exception as e:
        logger.error(f"Error fetching statuses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== PRAYER TIMES (EXTERNAL API) ==========
@api_router.get("/prayer-times", response_model=PrayerTimes)
async def get_prayer_times(city: str = Query("Moscow")):
    """Get prayer times from Aladhan API"""
    try:
        # Check cache first (Supabase)
        cache_key = f"prayer_{city}_{datetime.now().strftime('%Y-%m-%d')}"
        
        try:
            cached = supabase.table('prayer_cache').select('*').eq('key', cache_key).execute()
            
            if cached.data and len(cached.data) > 0:
                cache_data = cached.data[0]
                cache_time = datetime.fromisoformat(cache_data['created_at'].replace('Z', '+00:00'))
                
                if datetime.now() - cache_time < timedelta(hours=1):
                    logger.info(f"Cache hit for {city}")
                    return PrayerTimes(**cache_data['data'])
        except:
            pass
        
        # Fetch from Aladhan API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.aladhan.com/v1/timingsByCity",
                params={"city": city, "country": "", "method": 2},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch prayer times")
            
            data = response.json()
            timings = data['data']['timings']
            date_data = data['data']['date']
            
            prayer_data = {
                "fajr": timings['Fajr'],
                "sunrise": timings['Sunrise'],
                "dhuhr": timings['Dhuhr'],
                "asr": timings['Asr'],
                "maghrib": timings['Maghrib'],
                "isha": timings['Isha'],
                "date": date_data['readable'],
                "hijri_date": date_data['hijri']['date']
            }
            
            # Save to cache (Supabase)
            try:
                supabase.table('prayer_cache').insert({
                    'key': cache_key,
                    'data': prayer_data,
                    'created_at': datetime.now().isoformat(),
                }).execute()
            except:
                pass
            
            return PrayerTimes(**prayer_data)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prayer times error: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching prayer times: {str(e)}")


# ========== DAILY CONTENT ==========
@api_router.get("/hadith/daily")
async def get_daily_hadith():
    """Get random hadith"""
    try:
        response = supabase.table('hadiths').select('*').execute()
        
        if not response.data or len(response.data) == 0:
            return {"text": "Хадис дня не найден", "source": ""}
        
        hadith = random.choice(response.data)
        return {
            "text": hadith.get('text', ''),
            "source": hadith.get('source', ''),
        }
    except Exception as e:
        logger.error(f"Error fetching hadith: {e}")
        return {"text": "Ошибка загрузки хадиса", "source": ""}


@api_router.get("/story/daily")
async def get_daily_story():
    """Get random story"""
    try:
        response = supabase.table('stories').select('*').execute()
        
        if not response.data or len(response.data) == 0:
            return {"title": "История не найдена", "text": ""}
        
        story = random.choice(response.data)
        return {
            "title": story.get('title', ''),
            "text": story.get('text', ''),
        }
    except Exception as e:
        logger.error(f"Error fetching story: {e}")
        return {"title": "Ошибка загрузки", "text": ""}


@api_router.get("/benefit/daily")
async def get_daily_benefit():
    """Get random benefit"""
    try:
        response = supabase.table('benefits').select('*').execute()
        
        if not response.data or len(response.data) == 0:
            return {"text": "Польза дня не найдена"}
        
        benefit = random.choice(response.data)
        return {
            "text": benefit.get('text', ''),
        }
    except Exception as e:
        logger.error(f"Error fetching benefit: {e}")
        return {"text": "Ошибка загрузки пользы"}


# ========== AUTH ==========
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login with phone and password"""
    try:
        response = supabase.table('users').select('*').eq('phone', request.phone).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=401, detail="Неверный телефон или пароль")
        
        user = response.data[0]
        
        if user.get('password') != request.password:
            raise HTTPException(status_code=401, detail="Неверный телефон или пароль")
        
        role = user.get('role')
        if role is None:
            role = 'admin' if user.get('phone') == 'admin' else 'student'
        
        return LoginResponse(
            user_id=str(user.get('id', '')),
            phone=user.get('phone', ''),
            display_name=user.get('display_name', 'Студент'),
            role=role,
            points=user.get('points', 0) or 0,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Continue in next file part...
