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
    max_audio_duration: int = 300  # seconds
    created_at: str

class HomeworkSubmission(BaseModel):
    id: str
    user_id: str
    homework_id: str
    audio_url: Optional[str] = None
    photo_urls: List[str] = []
    submitted_at: str
    status: str  # pending, reviewed
    grade: Optional[int] = None
    teacher_comment: Optional[str] = None

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

class HomeworkReview(BaseModel):
    submission_id: str
    user_name: str
    homework_title: str
    submitted_at: str
    audio_url: Optional[str]
    photo_urls: List[str]
    status: str

class ReviewHomeworkRequest(BaseModel):
    submission_id: str
    grade: int
    comment: str

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
        
        # Определяем роль: из БД или fallback по phone
        role = user.get('role')
        if role is None:
            # Временная проверка, пока поле role не добавлено в БД
            role = 'admin' if user.get('phone') == 'admin' else 'student'
        
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


# ========== LESSONS API ==========
COURSE_CONFIG = {
    'fard': {'label': 'Шафиитский мазхаб', 'emoji': '📘', 'description': 'Обязательные знания'},
    'hanafi': {'label': 'Ханафитский мазхаб', 'emoji': '📗', 'description': 'Обязательные знания'},
    'arabic': {'label': 'Арабский язык', 'emoji': '🔤', 'description': 'Открывается после основных знаний'},
    'family': {'label': 'Семейные отношения', 'emoji': '🏠', 'description': 'Открывается после основных знаний'},
}

@api_router.get("/lessons", response_model=CoursesResponse)
async def get_lessons(user_id: str = Query(..., description="User ID")):
    """Get all lessons with unlock logic for user"""
    try:
        # Fetch all video lessons from Supabase
        lessons_response = supabase.table('video_lessons').select('*').order('category, id').execute()
        
        if not lessons_response.data:
            logger.info("No lessons found in database")
            return CoursesResponse(courses=[])
        
        all_lessons = lessons_response.data
        
        # Fetch user info to get telegram_id if needed
        user_response = supabase.table('users').select('id, telegram_id').eq('id', user_id).execute()
        telegram_id = None
        if user_response.data and len(user_response.data) > 0:
            telegram_id = user_response.data[0].get('telegram_id')
        
        # Fetch user's course progress
        user_progress = {}
        if telegram_id:
            progress_response = supabase.table('course_progress').select('*').eq('telegram_id', telegram_id).execute()
            for p in (progress_response.data or []):
                category = p.get('category', '')
                user_progress[category] = p
        
        # Group lessons by category (course_type)
        courses_dict: Dict[str, List[Dict]] = {}
        for lesson_data in all_lessons:
            category = lesson_data.get('category', 'fard')
            if category not in courses_dict:
                courses_dict[category] = []
            courses_dict[category].append(lesson_data)
        
        # Build course groups with unlock logic
        course_groups = []
        
        for category, lessons_list in courses_dict.items():
            config = COURSE_CONFIG.get(category, {'label': category, 'emoji': '📚', 'description': ''})
            
            # Sort by id (acts as order)
            lessons_list.sort(key=lambda x: x.get('id', 0))
            
            # Get progress for this category
            category_progress = user_progress.get(category, {})
            current_lesson_num = category_progress.get('current_lesson', 1)
            last_sent_at = category_progress.get('last_sent_at')
            
            completed_count = max(0, current_lesson_num - 1)
            formatted_lessons = []
            
            for idx, lesson_data in enumerate(lessons_list):
                lesson_id = str(lesson_data.get('id', ''))
                lesson_num = idx + 1
                
                # Determine if lesson is completed or locked
                is_completed = lesson_num < current_lesson_num
                is_locked = False
                unlock_date = None
                
                if lesson_num == 1:
                    # First lesson always unlocked
                    is_locked = False
                elif lesson_num == current_lesson_num:
                    # Current lesson - check 3-day wait if not first
                    if last_sent_at and lesson_num > 1:
                        if isinstance(last_sent_at, str):
                            last_datetime = datetime.fromisoformat(last_sent_at.replace('Z', '+00:00'))
                        else:
                            last_datetime = last_sent_at
                        
                        unlock_datetime = last_datetime + timedelta(days=3)
                        
                        if datetime.now() < unlock_datetime:
                            is_locked = True
                            unlock_date = unlock_datetime.strftime('%Y-%m-%d')
                        else:
                            is_locked = False
                    else:
                        is_locked = False
                elif lesson_num > current_lesson_num:
                    # Future lessons are locked
                    is_locked = True
                
                # Build file URLs from Telegram file IDs (they need to be converted or shown as is)
                # For now, we'll keep them as file_ids
                file_id = lesson_data.get('file_id')
                audio_file_id = lesson_data.get('audio_file_id')
                pdf_file_id = lesson_data.get('pdf_file_id')
                
                formatted_lesson = Lesson(
                    id=lesson_id,
                    title=lesson_data.get('title', 'Untitled'),
                    description=lesson_data.get('description', ''),
                    video_url=file_id,  # Telegram file_id for video
                    audio_url=audio_file_id,  # Telegram file_id for audio
                    pdf_url=pdf_file_id,  # Telegram file_id for PDF
                    course_type=category,
                    order_num=lesson_num,
                    is_locked=is_locked,
                    duration=None,  # Not available in current schema
                    unlock_date=unlock_date,
                )
                formatted_lessons.append(formatted_lesson)
            
            # Calculate progress percentage
            total = len(lessons_list)
            progress_percent = int((completed_count / total * 100)) if total > 0 else 0
            
            course_group = CourseGroup(
                type=category,
                label=config['label'],
                emoji=config['emoji'],
                lessons=formatted_lessons,
                completed=completed_count,
                total=total,
                progress=progress_percent,
            )
            course_groups.append(course_group)
        
        # Sort: basic courses first (fard, hanafi), then advanced
        course_groups.sort(key=lambda c: (c.type in ['arabic', 'family'], c.type))
        
        return CoursesResponse(courses=course_groups)
        
    except Exception as e:
        logger.error(f"Error fetching lessons: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/lesson/{lesson_id}")
async def get_lesson_detail(lesson_id: str, user_id: str = Query(...)):
    """Get detailed information for a specific lesson"""
    try:
        response = supabase.table('video_lessons').select('*').eq('id', lesson_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        lesson_data = response.data[0]
        
        # Get user's telegram_id
        user_response = supabase.table('users').select('telegram_id').eq('id', user_id).execute()
        telegram_id = None
        if user_response.data and len(user_response.data) > 0:
            telegram_id = user_response.data[0].get('telegram_id')
        
        # Check progress
        is_completed = False
        if telegram_id:
            category = lesson_data.get('category')
            progress_response = supabase.table('course_progress').select('*').eq('telegram_id', telegram_id).eq('category', category).execute()
            
            if progress_response.data and len(progress_response.data) > 0:
                current_lesson = progress_response.data[0].get('current_lesson', 1)
                # Get all lessons in category to determine order
                all_category_lessons = supabase.table('video_lessons').select('id').eq('category', category).order('id').execute()
                lesson_ids = [str(l['id']) for l in all_category_lessons.data]
                
                try:
                    lesson_position = lesson_ids.index(lesson_id) + 1
                    is_completed = lesson_position < current_lesson
                except ValueError:
                    is_completed = False
        
        return {
            **lesson_data,
            'is_completed': is_completed,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lesson detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/lesson/{lesson_id}/complete", response_model=CompleteLessonResponse)
async def complete_lesson(lesson_id: str, request: CompleteLessonRequest):
    """Mark a lesson as completed"""
    try:
        user_id = request.user_id
        
        # Get user's telegram_id
        user_response = supabase.table('users').select('telegram_id').eq('id', user_id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        telegram_id = user_response.data[0].get('telegram_id')
        if not telegram_id:
            raise HTTPException(status_code=400, detail="User has no telegram_id")
        
        # Get lesson info
        lesson_response = supabase.table('video_lessons').select('*').eq('id', lesson_id).execute()
        
        if not lesson_response.data or len(lesson_response.data) == 0:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        lesson_data = lesson_response.data[0]
        category = lesson_data.get('category')
        
        # Get all lessons in this category to find current position
        all_lessons = supabase.table('video_lessons').select('id').eq('category', category).order('id').execute()
        lesson_ids = [str(l['id']) for l in all_lessons.data]
        
        try:
            lesson_position = lesson_ids.index(lesson_id) + 1
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid lesson")
        
        # Update or create progress
        progress_response = supabase.table('course_progress').select('*').eq('telegram_id', telegram_id).eq('category', category).execute()
        
        now = datetime.now().isoformat()
        next_unlock_date = (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')
        next_send_at = (datetime.now() + timedelta(days=3)).isoformat()
        
        if progress_response.data and len(progress_response.data) > 0:
            # Update: move to next lesson
            current = progress_response.data[0].get('current_lesson', 1)
            new_lesson_num = max(current, lesson_position + 1)
            
            supabase.table('course_progress').update({
                'current_lesson': new_lesson_num,
                'last_sent_at': now,
                'next_send_at': next_send_at,
                'is_active': True,
            }).eq('telegram_id', telegram_id).eq('category', category).execute()
        else:
            # Create new progress
            supabase.table('course_progress').insert({
                'telegram_id': telegram_id,
                'category': category,
                'current_lesson': lesson_position + 1,
                'last_sent_at': now,
                'next_send_at': next_send_at,
                'is_active': True,
                'created_at': now,
            }).execute()
        
        # Award points (+10)
        points_response = supabase.table('users').select('points').eq('id', user_id).execute()
        
        if points_response.data and len(points_response.data) > 0:
            current_points = points_response.data[0].get('points', 0) or 0
            new_points = current_points + 10
            
            supabase.table('users').update({
                'points': new_points
            }).eq('id', user_id).execute()
        
        return CompleteLessonResponse(
            success=True,
            points_earned=10,
            next_unlock_date=next_unlock_date,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing lesson: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ========== HOMEWORK API ==========
@api_router.get("/homework/{lesson_id}")
async def get_homework(lesson_id: str):
    """Get homework task for a specific lesson"""
    try:
        response = supabase.table('homework_tasks').select('*').eq('lesson_id', lesson_id).execute()
        
        if not response.data or len(response.data) == 0:
            # Return empty if no homework for this lesson
            return {"homework": None}
        
        homework = response.data[0]
        return {
            "homework": {
                "id": str(homework.get('id', '')),
                "lesson_id": lesson_id,
                "title": homework.get('title', 'Домашнее задание'),
                "description": homework.get('description', ''),
                "image_url": homework.get('image_url'),
                "max_audio_duration": homework.get('max_audio_duration', 300),
            }
        }
    except Exception as e:
        logger.error(f"Error fetching homework: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/homework/submit", response_model=SubmitHomeworkResponse)
async def submit_homework(request: SubmitHomeworkRequest):
    """Submit homework with audio and photos"""
    try:
        import base64
        from io import BytesIO
        
        user_id = request.user_id
        homework_id = request.homework_id
        
        # Get user's telegram_id
        user_response = supabase.table('users').select('telegram_id, display_name').eq('id', user_id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        telegram_id = user_response.data[0].get('telegram_id')
        display_name = user_response.data[0].get('display_name', 'Студент')
        
        # Upload files to Supabase Storage (simplified - using file_id storage)
        audio_url = None
        photo_urls = []
        
        # For now, we'll store base64 directly or file references
        # In production, decode base64 and upload to Supabase Storage
        if request.audio_base64:
            # Simplified: store reference or upload to storage
            audio_url = f"audio_{user_id}_{homework_id}_{datetime.now().timestamp()}"
        
        if request.photos_base64:
            for idx, photo_b64 in enumerate(request.photos_base64):
                photo_url = f"photo_{user_id}_{homework_id}_{idx}_{datetime.now().timestamp()}"
                photo_urls.append(photo_url)
        
        # Create submission record
        submission_data = {
            'telegram_id': telegram_id,
            'homework_id': homework_id,
            'audio_file_id': audio_url,
            'photo_file_ids': photo_urls,
            'submitted_at': datetime.now().isoformat(),
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
        }
        
        submission_response = supabase.table('homeworks').insert(submission_data).execute()
        
        if not submission_response.data or len(submission_response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create submission")
        
        submission_id = str(submission_response.data[0].get('id', ''))
        
        return SubmitHomeworkResponse(
            success=True,
            submission_id=submission_id,
            message="Домашнее задание отправлено на проверку!",
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting homework: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/homework/submissions")
async def get_pending_homeworks(user_id: str = Query(None), status: str = Query("pending")):
    """Get homework submissions (for admin or user)"""
    try:
        query = supabase.table('homeworks').select('*')
        
        if user_id:
            # Get user's telegram_id
            user_response = supabase.table('users').select('telegram_id').eq('id', user_id).execute()
            if user_response.data and len(user_response.data) > 0:
                telegram_id = user_response.data[0].get('telegram_id')
                query = query.eq('telegram_id', telegram_id)
        
        if status:
            query = query.eq('status', status)
        
        response = query.order('submitted_at', desc=True).execute()
        
        submissions = []
        for hw in (response.data or []):
            # Get user info
            user_info = supabase.table('users').select('display_name').eq('telegram_id', hw.get('telegram_id')).execute()
            user_name = user_info.data[0].get('display_name', 'Студент') if user_info.data else 'Студент'
            
            # Get homework task info
            task_info = supabase.table('homework_tasks').select('title').eq('id', hw.get('homework_id')).execute()
            hw_title = task_info.data[0].get('title', 'Задание') if task_info.data else 'Задание'
            
            submissions.append({
                'id': str(hw.get('id', '')),
                'user_name': user_name,
                'homework_title': hw_title,
                'submitted_at': hw.get('submitted_at', ''),
                'audio_url': hw.get('audio_file_id'),
                'photo_urls': hw.get('photo_file_ids', []),
                'status': hw.get('status', 'pending'),
                'grade': hw.get('grade'),
                'teacher_comment': hw.get('teacher_comment'),
            })
        
        return {"submissions": submissions}
        
    except Exception as e:
        logger.error(f"Error fetching submissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/homework/review")
async def review_homework(request: ReviewHomeworkRequest):
    """Admin: Review and grade homework"""
    try:
        submission_id = request.submission_id
        grade = request.grade
        comment = request.comment
        
        # Update submission
        update_data = {
            'status': 'reviewed',
            'grade': grade,
            'teacher_comment': comment,
            'reviewed_at': datetime.now().isoformat(),
        }
        
        response = supabase.table('homeworks').update(update_data).eq('id', submission_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Award points based on grade
        submission = response.data[0]
        telegram_id = submission.get('telegram_id')
        
        # Get user_id from telegram_id
        user_response = supabase.table('users').select('id, points').eq('telegram_id', telegram_id).execute()
        
        if user_response.data and len(user_response.data) > 0:
            user_data = user_response.data[0]
            current_points = user_data.get('points', 0) or 0
            
            # Award points: grade / 10 (max 10 points for grade 100)
            points_earned = max(0, int(grade / 10))
            new_points = current_points + points_earned
            
            supabase.table('users').update({'points': new_points}).eq('id', user_data.get('id')).execute()
        
        return {
            "success": True,
            "message": "Домашнее задание проверено",
            "grade": grade,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing homework: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ADMIN API ==========
@api_router.get("/admin/stats")
async def get_admin_stats():
    """Get admin dashboard statistics"""
    try:
        # Count users
        users_response = supabase.table('users').select('id', count='exact').execute()
        total_users = users_response.count or 0
        
        # Count pending homeworks
        hw_response = supabase.table('homeworks').select('id', count='exact').eq('status', 'pending').execute()
        pending_homeworks = hw_response.count or 0
        
        # Count pending questions
        qa_response = supabase.table('sheikh_questions').select('id', count='exact').eq('status', 'pending').execute()
        pending_questions = qa_response.count or 0
        
        # Active users (simplified - users with recent activity)
        active_today = max(1, int(total_users * 0.3))  # Mock data
        active_week = max(1, int(total_users * 0.6))   # Mock data
        
        return {
            "total_users": total_users,
            "active_today": active_today,
            "active_week": active_week,
            "pending_questions": pending_questions,
            "pending_homeworks": pending_homeworks,
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/students")
async def get_students_list():
    """Get list of all students with progress"""
    try:
        # Get all users with phone (registered students)
        users_response = supabase.table('users').select('*').execute()
        
        students = []
        for user in (users_response.data or []):
            if not user.get('phone'):
                continue  # Skip users without phone (Telegram-only)
            
            user_id = str(user.get('id', ''))
            telegram_id = user.get('telegram_id')
            
            # Count completed lessons
            completed_lessons = 0
            if telegram_id:
                progress_response = supabase.table('course_progress').select('*').eq('telegram_id', telegram_id).execute()
                for prog in (progress_response.data or []):
                    current_lesson = prog.get('current_lesson', 1)
                    completed_lessons += max(0, current_lesson - 1)
            
            # Count total lessons
            total_lessons_response = supabase.table('video_lessons').select('id', count='exact').execute()
            total_lessons = total_lessons_response.count or 0
            
            # Count pending homeworks
            pending_hw = 0
            if telegram_id:
                hw_response = supabase.table('homeworks').select('id', count='exact').eq('telegram_id', telegram_id).eq('status', 'pending').execute()
                pending_hw = hw_response.count or 0
            
            # Count pending questions
            pending_questions = 0
            if telegram_id:
                qa_response = supabase.table('sheikh_questions').select('id', count='exact').eq('telegram_id', telegram_id).eq('status', 'pending').execute()
                pending_questions = qa_response.count or 0
            
            progress_pct = int((completed_lessons / total_lessons * 100)) if total_lessons > 0 else 0
            
            students.append({
                'user_id': user_id,
                'display_name': user.get('display_name', 'Студент'),
                'phone': user.get('phone', ''),
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'progress_percentage': progress_pct,
                'points': user.get('points', 0) or 0,
                'pending_homeworks': pending_hw,
                'pending_questions': pending_questions,
            })
        
        return {"students": students}
        
    except Exception as e:
        logger.error(f"Error fetching students: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/questions")
async def get_pending_questions(status: str = Query("pending")):
    """Get pending questions from students"""
    try:
        query = supabase.table('sheikh_questions').select('*')
        query = query.eq('status', status)
        
        response = query.order('created_at', desc=True).execute()
        
        questions = []
        for q in (response.data or []):
            # Get user info
            user_info = supabase.table('users').select('display_name').eq('telegram_id', q.get('telegram_id')).execute()
            user_name = user_info.data[0].get('display_name', 'Студент') if user_info.data else 'Студент'
            
            questions.append({
                'id': str(q.get('id', '')),
                'user_name': user_name,
                'question': q.get('question', ''),
                'created_at': q.get('created_at', ''),
                'status': q.get('status', 'pending'),
                'answer': q.get('answer'),
            })
        
        return {"questions": questions}
        
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/answer-question")
async def answer_question(question_id: str, answer: str):
    """Admin: Answer a student's question"""
    try:
        update_data = {
            'status': 'answered',
            'answer': answer,
            'answered_at': datetime.now().isoformat(),
        }
        
        response = supabase.table('sheikh_questions').update(update_data).eq('id', question_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Question not found")
        
        return {
            "success": True,
            "message": "Ответ отправлен студенту",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error answering question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== QURAN PROGRAM API ==========
# List of 114 Surahs (simplified)
SURAHS = [
    {"number": 1, "name": "Аль-Фатиха", "name_ar": "الفاتحة", "ayahs": 7},
    {"number": 2, "name": "Аль-Бакара", "name_ar": "البقرة", "ayahs": 286},
    {"number": 3, "name": "Али Имран", "name_ar": "آل عمران", "ayahs": 200},
    {"number": 110, "name": "Ан-Наср", "name_ar": "النصر", "ayahs": 3},
    {"number": 111, "name": "Аль-Масад", "name_ar": "المسد", "ayahs": 5},
    {"number": 112, "name": "Аль-Ихлас", "name_ar": "الإخلاص", "ayahs": 4},
    {"number": 113, "name": "Аль-Фаляк", "name_ar": "الفلق", "ayahs": 5},
    {"number": 114, "name": "Ан-Нас", "name_ar": "الناس", "ayahs": 6},
]

@api_router.get("/quran/surahs")
async def get_surahs():
    """Get list of all surahs"""
    return {"surahs": SURAHS}


@api_router.get("/quran/program")
async def get_quran_program(user_id: str = Query(...)):
    """Get user's Quran learning program"""
    try:
        # Get user's telegram_id
        user_response = supabase.table('users').select('telegram_id').eq('id', user_id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        telegram_id = user_response.data[0].get('telegram_id')
        
        # Get user's program
        program_response = supabase.table('quran_program').select('*').eq('telegram_id', telegram_id).execute()
        
        if not program_response.data or len(program_response.data) == 0:
            # Create default program
            return {
                "has_program": False,
                "current_surah": 114,  # Start with short surahs
                "current_ayah": 1,
                "study_week": 1,
            }
        
        program = program_response.data[0]
        
        # Get learned ayahs count
        progress_response = supabase.table('quran_progress').select('*', count='exact').eq('telegram_id', telegram_id).execute()
        learned_count = progress_response.count or 0
        
        # Get reviews due today
        today = datetime.now().strftime('%Y-%m-%d')
        reviews_response = supabase.table('quran_reviews').select('*').eq('telegram_id', telegram_id).eq('due_date', today).eq('completed', False).execute()
        reviews_due = reviews_response.data or []
        
        return {
            "has_program": True,
            "current_surah": program.get('current_surah', 114),
            "current_ayah": program.get('current_ayah', 1),
            "study_week": program.get('study_week', 1),
            "learned_count": learned_count,
            "reviews_due_today": len(reviews_due),
            "last_lesson_date": program.get('last_lesson_date'),
            "last_review_date": program.get('last_review_date'),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quran program: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quran/start-program")
async def start_quran_program(user_id: str, surah_number: int):
    """Start Quran learning program"""
    try:
        user_response = supabase.table('users').select('telegram_id').eq('id', user_id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        telegram_id = user_response.data[0].get('telegram_id')
        
        # Create program
        program_data = {
            'telegram_id': telegram_id,
            'is_active': True,
            'started_at': datetime.now().isoformat(),
            'study_week': 1,
            'current_surah': surah_number,
            'current_ayah': 1,
            'evening_hour': 19,
            'morning_hour': 10,
            'last_lesson_date': datetime.now().strftime('%Y-%m-%d'),
            'created_at': datetime.now().isoformat(),
        }
        
        supabase.table('quran_program').insert(program_data).execute()
        
        return {
            "success": True,
            "message": "Программа изучения Корана запущена!",
            "surah_number": surah_number,
        }
        
    except Exception as e:
        logger.error(f"Error starting program: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quran/learn-ayah")
async def learn_ayah(user_id: str, surah: int, ayah: int):
    """Mark ayah as learned"""
    try:
        user_response = supabase.table('users').select('telegram_id').eq('id', user_id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        telegram_id = user_response.data[0].get('telegram_id')
        
        # Check if already learned
        existing = supabase.table('quran_progress').select('*').eq('telegram_id', telegram_id).eq('surah', surah).eq('ayah', ayah).execute()
        
        if existing.data and len(existing.data) > 0:
            return {
                "success": True,
                "message": "Аят уже отмечен как выученный",
                "already_learned": True,
            }
        
        # Get program info
        program_response = supabase.table('quran_program').select('study_week').eq('telegram_id', telegram_id).execute()
        study_week = program_response.data[0].get('study_week', 1) if program_response.data else 1
        
        # Save progress
        progress_data = {
            'telegram_id': telegram_id,
            'surah': surah,
            'ayah': ayah,
            'learned_at': datetime.now().isoformat(),
            'review_count': 0,
            'status': 'reviewing',
            'week_learned': study_week,
            'created_at': datetime.now().isoformat(),
        }
        
        supabase.table('quran_progress').insert(progress_data).execute()
        
        # Create review schedule: 1 day, 3 days, 7 days, 14 days
        review_dates = [1, 3, 7, 14]
        for idx, days in enumerate(review_dates):
            due_date = (datetime.now() + timedelta(days=days)).strftime('%Y-%m-%d')
            review_data = {
                'telegram_id': telegram_id,
                'surah': surah,
                'ayah': ayah,
                'due_date': due_date,
                'review_number': idx + 1,
                'completed': False,
                'created_at': datetime.now().isoformat(),
            }
            supabase.table('quran_reviews').insert(review_data).execute()
        
        # Award points
        points_response = supabase.table('users').select('points').eq('id', user_id).execute()
        if points_response.data:
            current_points = points_response.data[0].get('points', 0) or 0
            new_points = current_points + 5
            supabase.table('users').update({'points': new_points}).eq('id', user_id).execute()
        
        # Update program
        supabase.table('quran_program').update({
            'current_ayah': ayah + 1,
            'last_lesson_date': datetime.now().strftime('%Y-%m-%d'),
        }).eq('telegram_id', telegram_id).execute()
        
        return {
            "success": True,
            "message": "Аят выучен! +5 очков",
            "points_earned": 5,
            "next_review": review_dates[0],
        }
        
    except Exception as e:
        logger.error(f"Error learning ayah: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quran/review-ayah")
async def review_ayah(user_id: str, surah: int, ayah: int):
    """Mark ayah as reviewed"""
    try:
        user_response = supabase.table('users').select('telegram_id').eq('id', user_id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        telegram_id = user_response.data[0].get('telegram_id')
        
        # Find pending review
        today = datetime.now().strftime('%Y-%m-%d')
        review_response = supabase.table('quran_reviews').select('*').eq('telegram_id', telegram_id).eq('surah', surah).eq('ayah', ayah).eq('due_date', today).eq('completed', False).execute()
        
        if review_response.data and len(review_response.data) > 0:
            review = review_response.data[0]
            
            # Mark as completed
            supabase.table('quran_reviews').update({
                'completed': True,
                'completed_at': datetime.now().isoformat(),
            }).eq('id', review.get('id')).execute()
            
            # Update progress
            supabase.table('quran_progress').update({
                'review_count': (review.get('review_number', 0)),
                'status': 'learned' if review.get('review_number', 0) >= 4 else 'reviewing',
            }).eq('telegram_id', telegram_id).eq('surah', surah).eq('ayah', ayah).execute()
            
            # Award points
            points_response = supabase.table('users').select('points').eq('id', user_id).execute()
            if points_response.data:
                current_points = points_response.data[0].get('points', 0) or 0
                new_points = current_points + 2
                supabase.table('users').update({'points': new_points}).eq('id', user_id).execute()
            
            return {
                "success": True,
                "message": "Повторение завершено! +2 очка",
                "points_earned": 2,
                "review_number": review.get('review_number', 0),
            }
        else:
            return {
                "success": False,
                "message": "Нет запланированного повторения на сегодня",
            }
        
    except Exception as e:
        logger.error(f"Error reviewing ayah: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/quran/reviews-today")
async def get_reviews_today(user_id: str = Query(...)):
    """Get ayahs to review today"""
    try:
        user_response = supabase.table('users').select('telegram_id').eq('id', user_id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        telegram_id = user_response.data[0].get('telegram_id')
        
        today = datetime.now().strftime('%Y-%m-%d')
        reviews_response = supabase.table('quran_reviews').select('*').eq('telegram_id', telegram_id).eq('due_date', today).eq('completed', False).execute()
        
        reviews = []
        for review in (reviews_response.data or []):
            surah_num = review.get('surah')
            ayah_num = review.get('ayah')
            
            # Find surah name
            surah_info = next((s for s in SURAHS if s['number'] == surah_num), None)
            surah_name = surah_info['name'] if surah_info else f"Сура {surah_num}"
            
            reviews.append({
                'id': str(review.get('id', '')),
                'surah': surah_num,
                'ayah': ayah_num,
                'surah_name': surah_name,
                'review_number': review.get('review_number', 1),
            })
        
        return {"reviews": reviews}
        
    except Exception as e:
        logger.error(f"Error fetching reviews: {e}")
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
