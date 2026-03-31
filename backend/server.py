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
import io


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging — must be before any usage
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Supabase connection (NO MONGODB)
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

# Zikr Models
class ZikrItem(BaseModel):
    id: str
    arabic: str
    transliteration: str
    translation: str
    goal: int
    reward_points: int
    category: str = "daily"  # daily, morning, evening

class ZikrProgress(BaseModel):
    user_id: str
    zikr_id: str
    count: int
    completed: bool
    date: str

class RecordZikrRequest(BaseModel):
    user_id: str
    zikr_id: str
    count: int

# Quiz/Test Models
class QuizQuestion(BaseModel):
    id: str
    lesson_id: str
    question: str
    options: List[str]
    correct_answer: int  # index
    points: int = 5

class QuizAttempt(BaseModel):
    id: str
    user_id: str
    lesson_id: str
    score: int
    total_questions: int
    passed: bool
    attempted_at: str

class SubmitQuizRequest(BaseModel):
    user_id: str
    lesson_id: str
    answers: List[int]  # indices

# Achievements Models
class Achievement(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    requirement_type: str  # lessons_completed, points_earned, streak_days
    requirement_value: int
    points_reward: int

class UserAchievement(BaseModel):
    user_id: str
    achievement_id: str
    unlocked_at: str
    title: str
    icon: str

# Content Management Models
class UpdateHadithRequest(BaseModel):
    id: str
    arabic_text: Optional[str] = None
    russian_text: Optional[str] = None
    source: Optional[str] = None
    image_url: Optional[str] = None

class UpdateStoryRequest(BaseModel):
    id: str
    title: Optional[str] = None
    text: Optional[str] = None
    image_url: Optional[str] = None

# Search Models
class SearchRequest(BaseModel):
    query: str
    types: List[str] = ["lessons", "hadiths", "stories"]  # what to search

class SearchResult(BaseModel):
    type: str  # lesson, hadith, story
    id: str
    title: str
    snippet: str
    relevance: float

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Tazakkur API - Supabase Only"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    supabase.table('status_checks').insert(status_obj.dict()).execute()
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    response = supabase.table('status_checks').select('*').order('created_at', desc=True).limit(1000).execute(); status_checks = response.data or []
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
        city = city.lower()  # Convert to lowercase
        
        if city not in CITIES:
            raise HTTPException(status_code=400, detail=f"City not found. Available: {list(CITIES.keys())}")
        
        city_data = CITIES[city]
        
        # Call Aladhan API directly (no DB cache needed)
        async with httpx.AsyncClient(follow_redirects=True) as client:
            url = "http://api.aladhan.com/v1/timings"
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
    'fard_shafi': {'label': 'Шафиитский мазхаб', 'emoji': '📘', 'description': 'Обязательные знания'},
    'fard_hanafi': {'label': 'Ханафитский мазхаб', 'emoji': '📗', 'description': 'Обязательные знания'},
    'arab': {'label': 'Арабский язык', 'emoji': '🔤', 'description': 'Открывается после основных знаний'},
    'family': {'label': 'Семейные отношения', 'emoji': '🏠', 'description': 'Открывается после основных знаний'},
    # Legacy aliases
    'fard': {'label': 'Шафиитский мазхаб', 'emoji': '📘', 'description': 'Обязательные знания'},
    'hanafi': {'label': 'Ханафитский мазхаб', 'emoji': '📗', 'description': 'Обязательные знания'},
    'arabic': {'label': 'Арабский язык', 'emoji': '🔤', 'description': 'Открывается после основных знаний'},
}

def extract_youtube_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from various URL formats"""
    import re
    patterns = [
        r'youtu\.be/([A-Za-z0-9_-]{11})',
        r'youtube\.com/watch\?v=([A-Za-z0-9_-]{11})',
        r'youtube\.com/embed/([A-Za-z0-9_-]{11})',
        r'^([A-Za-z0-9_-]{11})$',  # Raw video ID
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

@api_router.get("/lessons", response_model=CoursesResponse)
async def get_lessons(user_id: str = Query(..., description="User ID")):
    """Get all lessons with unlock logic for user"""
    try:
        # Validate UUID format
        try:
            import uuid as _uuid
            _uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="user_id must be a valid UUID")
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
async def start_quran_program(request: StartQuranProgramRequest):
    """Start Quran learning program"""
    try:
        user_id = request.user_id
        surah_number = request.surah_number
        
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
async def learn_ayah(request: LearnAyahRequest):
    """Mark ayah as learned"""
    try:
        user_id = request.user_id
        surah = request.surah
        ayah = request.ayah
        
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
async def review_ayah(request: ReviewAyahRequest):
    """Mark ayah as reviewed"""
    try:
        user_id = request.user_id
        surah = request.surah
        ayah = request.ayah
        
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


# ========== ADMIN LESSONS MANAGEMENT ==========
class CreateLessonRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str
    youtube_url: Optional[str] = None
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

@api_router.get("/admin/lessons")
async def get_all_lessons_admin():
    """Get all lessons for admin management"""
    try:
        response = supabase.table('video_lessons').select('*').order('category, id').execute()
        
        lessons = []
        for lesson in (response.data or []):
            lessons.append({
                'id': str(lesson.get('id', '')),
                'title': lesson.get('title', ''),
                'description': lesson.get('description', ''),
                'category': lesson.get('category', ''),
                'video_file_id': lesson.get('file_id'),
                'audio_file_id': lesson.get('audio_file_id'),
                'pdf_file_id': lesson.get('pdf_file_id'),
                'duration': lesson.get('duration'),
                'created_at': lesson.get('created_at', ''),
            })
        
        return {"lessons": lessons}
        
    except Exception as e:
        logger.error(f"Error fetching lessons for admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/lessons")
async def create_lesson(request: CreateLessonRequest):
    """Create a new lesson. Accepts youtube_url and extracts videoId."""
    try:
        # Extract YouTube video ID if youtube_url is provided
        file_id = request.video_file_id
        if request.youtube_url:
            extracted = extract_youtube_id(request.youtube_url)
            if not extracted:
                raise HTTPException(status_code=400, detail="Неверный YouTube URL. Поддерживаются youtu.be/... и youtube.com/watch?v=...")
            file_id = extracted

        lesson_data = {
            'title': request.title,
            'description': request.description,
            'category': request.category,
            'file_id': file_id,
            'audio_file_id': request.audio_file_id,
            'pdf_file_id': request.pdf_file_id,
            'file_type': 'video' if file_id else 'text',
            'file_name': request.title,
            'created_at': datetime.now().isoformat(),
        }

        response = supabase.table('video_lessons').insert(lesson_data).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create lesson")

        return {
            "success": True,
            "message": "Урок успешно создан",
            "lesson_id": str(response.data[0].get('id', '')),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/admin/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, request: UpdateLessonRequest):
    """Update an existing lesson"""
    try:
        update_data = {}
        
        if request.title is not None:
            update_data['title'] = request.title
        if request.description is not None:
            update_data['description'] = request.description
        if request.category is not None:
            update_data['category'] = request.category
        if request.video_file_id is not None:
            update_data['file_id'] = request.video_file_id
        if request.audio_file_id is not None:
            update_data['audio_file_id'] = request.audio_file_id
        if request.pdf_file_id is not None:
            update_data['pdf_file_id'] = request.pdf_file_id
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase.table('video_lessons').update(update_data).eq('id', lesson_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        return {
            "success": True,
            "message": "Урок успешно обновлен",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/admin/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str):
    """Delete a lesson"""
    try:
        response = supabase.table('video_lessons').delete().eq('id', lesson_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        return {
            "success": True,
            "message": "Урок успешно удален",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ ADMIN QUIZ MANAGEMENT ============
class QuizBatchQuestion(BaseModel):
    question: str
    options: List[str]
    correct_option: int
    score: int = 5


class QuizBatchRequest(BaseModel):
    video_id: str
    questions: List[QuizBatchQuestion]


@api_router.post("/admin/quiz/batch")
async def create_quiz_batch(request: QuizBatchRequest):
    """Batch insert quiz questions for a lesson (uses option_a/b/c/d schema)"""
    try:
        # Verify lesson exists first
        lesson_check = supabase.table('video_lessons').select('id').eq('id', request.video_id).execute()
        if not lesson_check.data:
            raise HTTPException(status_code=400, detail=f"Урок с id={request.video_id} не найден")

        idx_to_letter = {0: 'a', 1: 'b', 2: 'c', 3: 'd'}
        rows = []
        for q in request.questions:
            opts = q.options
            rows.append({
                'video_id': request.video_id,
                'question': q.question,
                'option_a': opts[0] if len(opts) > 0 else '',
                'option_b': opts[1] if len(opts) > 1 else '',
                'option_c': opts[2] if len(opts) > 2 else '',
                'option_d': opts[3] if len(opts) > 3 else '',
                'correct_option': idx_to_letter.get(q.correct_option, 'a'),
            })
        if not rows:
            raise HTTPException(status_code=400, detail="No questions provided")
        response = supabase.table('quiz_tasks').insert(rows).execute()
        return {"success": True, "inserted": len(response.data or []), "message": f"Добавлено {len(rows)} вопросов"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating quiz batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/lessons/{lesson_id}/quiz")
async def get_quiz_for_lesson(lesson_id: str):
    """Get quiz questions for a specific lesson (admin view)"""
    try:
        response = supabase.table('quiz_tasks').select('*').eq('video_id', lesson_id).execute()
        return {"questions": response.data or [], "count": len(response.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/migrate/categories")
async def migrate_categories():
    """One-time migration: rename old category values to new ones"""
    try:
        migrations = [
            ('fard', 'fard_shafi'),
            ('hanafi', 'fard_hanafi'),
            ('arabic', 'arab'),
        ]
        results = {}
        for old, new in migrations:
            resp = supabase.table('video_lessons').update({'category': new}).eq('category', old).execute()
            results[f"{old}->{new}"] = len(resp.data or [])
        return {"success": True, "migrated": results}
    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== SUPABASE STORAGE ==========
# File Upload Response
class UploadResponse(BaseModel):
    success: bool
    file_url: str
    file_id: str
    bucket: str

@api_router.post("/upload/video", response_model=UploadResponse)
async def upload_video(file: UploadFile = File(...)):
    """Upload video to Supabase Storage"""
    try:
        # Read file content
        content = await file.read()
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
        filename = f"{file_id}.{file_extension}"
        
        # Upload to Supabase Storage
        bucket_name = 'lessons'
        response = supabase.storage.from_(bucket_name).upload(
            filename,
            content,
            file_options={"content-type": file.content_type or "video/mp4"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(filename)
        
        return UploadResponse(
            success=True,
            file_url=public_url,
            file_id=file_id,
            bucket=bucket_name
        )
        
    except Exception as e:
        logger.error(f"Error uploading video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload video: {str(e)}")


@api_router.post("/upload/audio", response_model=UploadResponse)
async def upload_audio(file: UploadFile = File(...)):
    """Upload audio to Supabase Storage"""
    try:
        content = await file.read()
        
        file_id = str(uuid.uuid4())
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'mp3'
        filename = f"{file_id}.{file_extension}"
        
        bucket_name = 'homework'
        response = supabase.storage.from_(bucket_name).upload(
            filename,
            content,
            file_options={"content-type": file.content_type or "audio/mpeg"}
        )
        
        public_url = supabase.storage.from_(bucket_name).get_public_url(filename)
        
        return UploadResponse(
            success=True,
            file_url=public_url,
            file_id=file_id,
            bucket=bucket_name
        )
        
    except Exception as e:
        logger.error(f"Error uploading audio: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload audio: {str(e)}")


@api_router.post("/upload/photo", response_model=UploadResponse)
async def upload_photo(file: UploadFile = File(...)):
    """Upload photo to Supabase Storage"""
    try:
        content = await file.read()
        
        file_id = str(uuid.uuid4())
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"{file_id}.{file_extension}"
        
        bucket_name = 'homework'
        response = supabase.storage.from_(bucket_name).upload(
            filename,
            content,
            file_options={"content-type": file.content_type or "image/jpeg"}
        )
        
        public_url = supabase.storage.from_(bucket_name).get_public_url(filename)
        
        return UploadResponse(
            success=True,
            file_url=public_url,
            file_id=file_id,
            bucket=bucket_name
        )
        
    except Exception as e:
        logger.error(f"Error uploading photo: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")


@api_router.get("/files/{bucket}/{filename}")
async def get_file(bucket: str, filename: str):
    """Get file from Supabase Storage"""
    try:
        # Get file from Supabase Storage
        file_data = supabase.storage.from_(bucket).download(filename)
        
        # Determine content type
        content_type = "application/octet-stream"
        if filename.endswith(('.jpg', '.jpeg', '.png')):
            content_type = "image/jpeg"
        elif filename.endswith('.mp4'):
            content_type = "video/mp4"
        elif filename.endswith('.mp3'):
            content_type = "audio/mpeg"
        elif filename.endswith('.pdf'):
            content_type = "application/pdf"
        
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=content_type,
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Error getting file: {e}")
        raise HTTPException(status_code=404, detail="File not found")


# ============ ZIKR ENDPOINTS ============
@api_router.get("/zikr/list")
async def get_zikr_list():
    """Get all zikr items from database"""
    try:
        response = supabase.table('zikr_list').select('*').order('sort_order').execute()
        zikr_items = []
        for item in (response.data or []):
            zikr_items.append({
                "id": str(item.get('id', '')),
                "arabic":          item.get('arabic', ''),
                "transliteration": item.get('transliteration', ''),
                # translation: приоритет text_ru, иначе пустая строка
                "translation":     item.get('text_ru') or item.get('translation', ''),
                "goal":            item.get('goal', 33),
                "reward_points":   item.get('reward_points', 5),
                "category":        item.get('category', 'general'),
                "sort_order":      item.get('sort_order', 0),
            })
        return {"zikr_items": zikr_items}
    except Exception as e:
        logger.error(f"Error fetching zikr: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/zikr/record")
async def record_zikr_progress(request: RecordZikrRequest):
    """Record user's zikr progress"""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Check if record exists
        existing = supabase.table('zikr_progress').select('*').eq('user_id', request.user_id).eq('zikr_id', request.zikr_id).eq('date', today).execute()
        
        if existing.data:
            # Update
            supabase.table('zikr_progress').update({
                'count': request.count,
                'completed': request.count >= 100  # simplified logic
            }).eq('id', existing.data[0]['id']).execute()
        else:
            # Insert
            supabase.table('zikr_progress').insert({
                'id': str(uuid.uuid4()),
                'user_id': request.user_id,
                'zikr_id': request.zikr_id,
                'count': request.count,
                'completed': request.count >= 100,
                'date': today
            }).execute()
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Error recording zikr: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ QUIZ/TESTS ENDPOINTS ============
@api_router.get("/quiz/{lesson_id}")
async def get_lesson_quiz(lesson_id: str):
    """Get quiz questions for a lesson from quiz_tasks table"""
    try:
        response = supabase.table('quiz_tasks').select('*').eq('video_id', lesson_id).execute()
        questions = []
        letter_to_idx = {'a': 0, 'b': 1, 'c': 2, 'd': 3}
        for q in (response.data or []):
            opts = [
                q.get('option_a', '') or '',
                q.get('option_b', '') or '',
                q.get('option_c', '') or '',
                q.get('option_d', '') or '',
            ]
            correct_letter = str(q.get('correct_option', 'a')).lower()
            correct_idx = letter_to_idx.get(correct_letter, 0)
            questions.append({
                'id': str(q.get('id', '')),
                'video_id': str(q.get('video_id', '')),
                'question': q.get('question', ''),
                'options': opts,
                'correct_option': correct_idx,
                'score': 5,
            })
        return {"questions": questions}
    except Exception as e:
        logger.error(f"Error fetching quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class QuizSubmitRequest(BaseModel):
    user_id: str
    video_id: str
    score: int


@api_router.post("/quiz/submit")
async def submit_quiz_result(request: QuizSubmitRequest):
    """Submit quiz result, update zikr_count"""
    try:
        # Look up telegram_id from user UUID
        user_resp = supabase.table('users').select('id, telegram_id, zikr_count').eq('id', request.user_id).execute()
        telegram_id = None
        if user_resp.data:
            telegram_id = user_resp.data[0].get('telegram_id')
            current_zikr = user_resp.data[0].get('zikr_count') or 0
            # Update zikr_count
            supabase.table('users').update({'zikr_count': current_zikr + request.score}).eq('id', request.user_id).execute()

        # Insert into quiz_results
        insert_data = {
            'video_id': request.video_id,
            'score': request.score,
            'created_at': datetime.now().isoformat(),
        }
        if telegram_id:
            insert_data['telegram_id'] = telegram_id
        try:
            supabase.table('quiz_results').insert(insert_data).execute()
        except Exception as qe:
            logger.warning(f"Quiz result insert warning: {qe}")

        return {"success": True, "message": f"+{request.score} очков начислено"}
    except Exception as e:
        logger.error(f"Error submitting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ LEADERBOARD ENDPOINT ============
@api_router.get("/leaderboard")
async def get_leaderboard(limit: int = 20):
    """Get top users by zikr_count (leaderboard), only active users"""
    try:
        response = supabase.table('users').select(
            'id, display_name, first_name, username, zikr_count'
        ).gt('zikr_count', 0).order('zikr_count', desc=True).limit(limit).execute()

        leaderboard = []
        rank = 1
        for user in (response.data or []):
            name = (
                user.get('display_name') or
                user.get('first_name') or
                user.get('username') or
                'Студент'
            )
            score = user.get('zikr_count') or 0
            leaderboard.append({
                "rank": rank,
                "user_id": str(user.get('id', '')),
                "name": name,
                "points": score,
            })
            rank += 1

        return {"leaderboard": leaderboard}
    except Exception as e:
        logger.error(f"Error fetching leaderboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ ACHIEVEMENTS ENDPOINTS ============
@api_router.get("/achievements")
async def get_all_achievements():
    """Get all available achievements"""
    try:
        response = supabase.table('achievements').select('*').execute()
        return {"achievements": response.data}
    except Exception as e:
        logger.error(f"Error fetching achievements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/achievements/user/{user_id}")
async def get_user_achievements(user_id: str):
    """Get user's unlocked achievements"""
    try:
        response = supabase.table('user_achievements').select('*').eq('user_id', user_id).execute()
        return {"achievements": response.data}
    except Exception as e:
        logger.error(f"Error fetching user achievements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ PROFILE ENDPOINT ============
@api_router.get("/profile/{user_id}")
async def get_user_profile(user_id: str):
    """Get user profile with stats"""
    try:
        user_response = supabase.table('users').select('*').eq('id', user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        user = user_response.data[0]

        # Count completed homeworks (safe fallback)
        completed_lessons = 0
        quiz_passed = 0
        quiz_total = 0
        try:
            hw = supabase.table('homeworks').select('id, status').eq('telegram_id', user.get('telegram_id', '')).execute()
            completed_lessons = len([h for h in (hw.data or []) if h.get('status') == 'approved'])
            quiz_total = len(hw.data or [])
            quiz_passed = completed_lessons
        except Exception:
            pass

        return {
            "user": {
                "id": user.get('id', ''),
                "name": user.get('display_name') or user.get('first_name') or user.get('phone', 'Студент'),
                "phone": user.get('phone', ''),
                "role": user.get('role', 'student'),
                "points": user.get('zikr_count', 0),
                "created_at": str(user.get('created_at', '')),
            },
            "stats": {
                "completed_lessons": completed_lessons,
                "achievements_count": 0,
                "quiz_passed": quiz_passed,
                "quiz_total": quiz_total,
            },
            "achievements": []
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ SEARCH ENDPOINT ============
@api_router.post("/search")
async def search_content(request: SearchRequest):
    """Search across lessons, hadiths, stories"""
    try:
        results = []
        query = request.query.lower()
        
        # Search lessons
        if "lessons" in request.types:
            lessons_response = supabase.table('video_lessons').select('*').execute()
            for lesson in lessons_response.data:
                title = (lesson.get('title') or '').lower()
                desc = (lesson.get('description') or '').lower()
                if query in title or query in desc:
                    results.append({
                        "type": "lesson",
                        "id": lesson['id'],
                        "title": lesson.get('title') or 'Урок',
                        "snippet": (lesson.get('description') or '')[:100],
                        "relevance": 1.0 if query in title else 0.7
                    })
        
        # Search hadiths
        if "hadiths" in request.types:
            hadiths_response = supabase.table('hadiths').select('*').execute()
            for hadith in hadiths_response.data:
                text = hadith.get('text_ru', '').lower()
                if query in text:
                    results.append({
                        "type": "hadith",
                        "id": hadith['id'],
                        "title": "Хадис",
                        "snippet": hadith.get('text_ru', '')[:100],
                        "relevance": 0.9
                    })
        
        # Search stories
        if "stories" in request.types:
            stories_response = supabase.table('stories').select('*').execute()
            for story in stories_response.data:
                text = story.get('text_ru', '').lower()
                if query in text:
                    lines = story.get('text_ru', '').split('\n', 1)
                    title = lines[0].strip('*').strip()[:60] if lines else 'История'
                    results.append({
                        "type": "story",
                        "id": story['id'],
                        "title": title,
                        "snippet": story.get('text_ru', '')[:100],
                        "relevance": 0.8
                    })
        
        # Sort by relevance
        results.sort(key=lambda x: x['relevance'], reverse=True)
        
        return {"results": results[:20]}  # Top 20
    except Exception as e:
        logger.error(f"Error searching: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ ADMIN CONTENT MANAGEMENT ============
@api_router.put("/admin/hadith/update")
async def update_hadith(request: UpdateHadithRequest):
    """Update hadith content"""
    try:
        update_data = {}
        if request.arabic_text:
            update_data['arabic_text'] = request.arabic_text
        if request.russian_text:
            update_data['russian_text'] = request.russian_text
        if request.source:
            update_data['source'] = request.source
        if request.image_url:
            update_data['image_url'] = request.image_url
        
        supabase.table('hadiths').update(update_data).eq('id', request.id).execute()
        return {"success": True, "message": "Hadith updated"}
    except Exception as e:
        logger.error(f"Error updating hadith: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/story/update")
async def update_story(request: UpdateStoryRequest):
    """Update story content"""
    try:
        update_data = {}
        if request.title:
            update_data['title'] = request.title
        if request.text:
            update_data['text'] = request.text
        if request.image_url:
            update_data['image_url'] = request.image_url
        
        supabase.table('stories').update(update_data).eq('id', request.id).execute()
        return {"success": True, "message": "Story updated"}
    except Exception as e:
        logger.error(f"Error updating story: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/hadith/{hadith_id}")
async def delete_hadith(hadith_id: str):
    """Delete hadith"""
    try:
        supabase.table('hadiths').delete().eq('id', hadith_id).execute()
        return {"success": True, "message": "Hadith deleted"}
    except Exception as e:
        logger.error(f"Error deleting hadith: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════
# UMMA — Islamic Social Feed
# ════════════════════════════════════════════════════

class CreatePostRequest(BaseModel):
    user_id: str
    type: str = "text"  # text | quote | question
    body: str
    arabic_text: Optional[str] = None
    source: Optional[str] = None


class ReportPostRequest(BaseModel):
    user_id: str
    reason: str


async def _check_can_post(user_id: str) -> bool:
    """Check if user completed fard_shafi or fard_hanafi course."""
    try:
        user_resp = supabase.table('users').select('telegram_id').eq('id', user_id).execute()
        if not user_resp.data:
            return False
        telegram_id = user_resp.data[0].get('telegram_id')
        if not telegram_id:
            return False

        for cat in ['fard_shafi', 'fard_hanafi']:
            total_resp = supabase.table('video_lessons').select('id', count='exact').eq('category', cat).execute()
            total = total_resp.count or 0
            if total == 0:
                continue
            prog = supabase.table('course_progress').select('current_lesson').eq('telegram_id', telegram_id).eq('category', cat).execute()
            if prog.data and prog.data[0].get('current_lesson', 0) > total:
                return True
    except Exception as e:
        logger.warning(f"_check_can_post error: {e}")
    return False


@api_router.get("/umma/feed")
async def get_umma_feed(page: int = 1, limit: int = 20, user_id: str = ""):
    """Get Umma feed with pagination and is_liked flag."""
    try:
        offset = (page - 1) * limit
        posts_resp = supabase.table('umma_posts') \
            .select('*, users!inner(display_name, first_name, username)') \
            .eq('is_hidden', False) \
            .order('created_at', desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        posts = posts_resp.data or []

        # Build liked set for this user
        liked_set: set = set()
        if user_id and posts:
            post_ids = [p['id'] for p in posts]
            try:
                likes_resp = supabase.table('umma_likes') \
                    .select('post_id') \
                    .eq('user_id', user_id) \
                    .in_('post_id', post_ids) \
                    .execute()
                liked_set = {l['post_id'] for l in (likes_resp.data or [])}
            except Exception:
                pass

        result = []
        for p in posts:
            user_data = p.get('users') or {}
            author_name = (
                user_data.get('display_name') or
                user_data.get('first_name') or
                user_data.get('username') or
                'Студент'
            )
            result.append({
                'id': p['id'],
                'user_id': p['user_id'],
                'author_name': author_name,
                'type': p.get('type', 'text'),
                'body': p.get('body', ''),
                'arabic_text': p.get('arabic_text'),
                'source': p.get('source'),
                'likes_count': p.get('likes_count', 0),
                'is_liked': p['id'] in liked_set,
                'created_at': str(p.get('created_at', '')),
            })

        return {
            "posts": result,
            "page": page,
            "has_more": len(posts) == limit,
        }
    except Exception as e:
        logger.error(f"Error fetching umma feed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/umma/post")
async def create_umma_post(request: CreatePostRequest):
    """Create a new Umma post. Requires course completion."""
    try:
        # Permission check
        can_post = await _check_can_post(request.user_id)
        if not can_post:
            raise HTTPException(
                status_code=403,
                detail="Завершите Шафиитский или Ханафитский мазхаб, чтобы публиковать посты"
            )

        if len(request.body.strip()) < 3:
            raise HTTPException(status_code=400, detail="Текст поста слишком короткий")
        if len(request.body) > 1000:
            raise HTTPException(status_code=400, detail="Текст не должен превышать 1000 символов")
        if request.type not in ('text', 'quote', 'question'):
            raise HTTPException(status_code=400, detail="Неверный тип поста")

        insert_data = {
            'user_id': request.user_id,
            'type': request.type,
            'body': request.body.strip(),
            'arabic_text': request.arabic_text,
            'source': request.source,
            'likes_count': 0,
            'is_hidden': False,
        }

        resp = supabase.table('umma_posts').insert(insert_data).select(
            '*, users!inner(display_name, first_name, username)'
        ).execute()

        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create post")

        p = resp.data[0]
        user_data = p.get('users') or {}
        return {
            'id': p['id'],
            'user_id': p['user_id'],
            'author_name': user_data.get('display_name') or user_data.get('first_name') or 'Студент',
            'type': p.get('type', 'text'),
            'body': p.get('body', ''),
            'arabic_text': p.get('arabic_text'),
            'source': p.get('source'),
            'likes_count': 0,
            'is_liked': False,
            'created_at': str(p.get('created_at', '')),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/umma/post/{post_id}/like")
async def toggle_umma_like(post_id: str, user_id: str = Query(...)):
    """Toggle like on a post."""
    try:
        # Check if already liked
        existing = supabase.table('umma_likes') \
            .select('id') \
            .eq('post_id', post_id) \
            .eq('user_id', user_id) \
            .execute()

        if existing.data:
            # Unlike
            supabase.table('umma_likes').delete() \
                .eq('post_id', post_id).eq('user_id', user_id).execute()
            liked = False
        else:
            # Like
            supabase.table('umma_likes').insert({'post_id': post_id, 'user_id': user_id}).execute()
            liked = True

        # Recount likes
        count_resp = supabase.table('umma_likes') \
            .select('id', count='exact') \
            .eq('post_id', post_id).execute()
        new_count = count_resp.count or 0

        supabase.table('umma_posts').update({'likes_count': new_count}).eq('id', post_id).execute()

        return {"liked": liked, "likes_count": new_count}
    except Exception as e:
        logger.error(f"Error toggling like: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/umma/post/{post_id}")
async def delete_umma_post(post_id: str, user_id: str = Query(...)):
    """Delete a post. Only owner or admin."""
    try:
        post = supabase.table('umma_posts').select('user_id').eq('id', post_id).single().execute()
        if not post.data:
            raise HTTPException(status_code=404, detail="Post not found")

        # Check owner or admin
        user_resp = supabase.table('users').select('role').eq('id', user_id).single().execute()
        role = user_resp.data.get('role', 'student') if user_resp.data else 'student'

        if post.data['user_id'] != user_id and role != 'admin':
            raise HTTPException(status_code=403, detail="Нет прав для удаления")

        supabase.table('umma_posts').delete().eq('id', post_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/umma/post/{post_id}/report")
async def report_umma_post(post_id: str, request: ReportPostRequest):
    """Report a post. Auto-hide on 3+ reports."""
    try:
        supabase.table('umma_reports').insert({
            'post_id': post_id,
            'reporter_id': request.user_id,
            'reason': request.reason,
        }).execute()

        # Count reports
        count_resp = supabase.table('umma_reports') \
            .select('id', count='exact') \
            .eq('post_id', post_id).execute()
        report_count = count_resp.count or 0

        if report_count >= 3:
            supabase.table('umma_posts').update({'is_hidden': True}).eq('id', post_id).execute()
            return {"success": True, "hidden": True, "message": "Пост скрыт после проверки"}

        return {"success": True, "hidden": False}
    except Exception as e:
        logger.error(f"Error reporting post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/umma/can-post")
async def can_user_post(user_id: str = Query(...)):
    """Check if user is allowed to create posts."""
    can = await _check_can_post(user_id)
    return {"can_post": can}


@api_router.get("/admin/umma/reports")
async def get_umma_reports(user_id: str = Query(...)):
    """Admin: list reported posts."""
    try:
        user_resp = supabase.table('users').select('role').eq('id', user_id).single().execute()
        if not user_resp.data or user_resp.data.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Только для администраторов")

        reports = supabase.table('umma_reports') \
            .select('*, umma_posts(body, user_id, is_hidden)') \
            .order('created_at', desc=True) \
            .limit(100) \
            .execute()

        return {"reports": reports.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/umma/migration-sql")
async def get_umma_migration_sql():
    """Returns the SQL needed to create Umma tables."""
    sql = open(Path(__file__).parent / 'umma_migration.sql').read() if (Path(__file__).parent / 'umma_migration.sql').exists() else "File not found"
    return {"sql": sql, "instructions": "Выполните этот SQL в Supabase SQL Editor: https://supabase.com/dashboard/project/kmhhazpyalpjwspjxzry/editor"}

# ========== QURAN HIFZ API (NEW — uses user_id UUID) ==========

ALL_SURAHS = [
    {"number": 1, "name": "Al-Fatiha", "name_ru": "Аль-Фатиха", "name_ar": "الفاتحة", "ayahs": 7},
    {"number": 2, "name": "Al-Baqara", "name_ru": "Аль-Бакара", "name_ar": "البقرة", "ayahs": 286},
    {"number": 3, "name": "Aal-E-Imran", "name_ru": "Аль-Имран", "name_ar": "آل عمران", "ayahs": 200},
    {"number": 4, "name": "An-Nisa", "name_ru": "Ан-Нисаа", "name_ar": "النساء", "ayahs": 176},
    {"number": 5, "name": "Al-Maidah", "name_ru": "Аль-Маида", "name_ar": "المائدة", "ayahs": 120},
    {"number": 6, "name": "Al-Anam", "name_ru": "Аль-Анам", "name_ar": "الأنعام", "ayahs": 165},
    {"number": 7, "name": "Al-Araf", "name_ru": "Аль-Ааараф", "name_ar": "الأعراف", "ayahs": 206},
    {"number": 8, "name": "Al-Anfal", "name_ru": "Аль-Анфаль", "name_ar": "الأنفال", "ayahs": 75},
    {"number": 9, "name": "At-Tawbah", "name_ru": "Ат-Тауба", "name_ar": "التوبة", "ayahs": 129},
    {"number": 10, "name": "Yunus", "name_ru": "Юнус", "name_ar": "يونس", "ayahs": 109},
    {"number": 11, "name": "Hud", "name_ru": "Худ", "name_ar": "هود", "ayahs": 123},
    {"number": 12, "name": "Yusuf", "name_ru": "Юсуф", "name_ar": "يوسف", "ayahs": 111},
    {"number": 13, "name": "Ar-Rad", "name_ru": "Ар-Раад", "name_ar": "الرعد", "ayahs": 43},
    {"number": 14, "name": "Ibrahim", "name_ru": "Ибрагим", "name_ar": "إبراهيم", "ayahs": 52},
    {"number": 15, "name": "Al-Hijr", "name_ru": "Аль-Хиджр", "name_ar": "الحجر", "ayahs": 99},
    {"number": 16, "name": "An-Nahl", "name_ru": "Ан-Нахль", "name_ar": "النحل", "ayahs": 128},
    {"number": 17, "name": "Al-Isra", "name_ru": "Аль-Исраа", "name_ar": "الإسراء", "ayahs": 111},
    {"number": 18, "name": "Al-Kahf", "name_ru": "Аль-Кахф", "name_ar": "الكهف", "ayahs": 110},
    {"number": 19, "name": "Maryam", "name_ru": "Марьям", "name_ar": "مريم", "ayahs": 98},
    {"number": 20, "name": "Ta-Ha", "name_ru": "Та-Ха", "name_ar": "طه", "ayahs": 135},
    {"number": 21, "name": "Al-Anbiya", "name_ru": "Аль-Анбияа", "name_ar": "الأنبياء", "ayahs": 112},
    {"number": 22, "name": "Al-Hajj", "name_ru": "Аль-Хадж", "name_ar": "الحج", "ayahs": 78},
    {"number": 23, "name": "Al-Muminun", "name_ru": "Аль-Муминун", "name_ar": "المؤمنون", "ayahs": 118},
    {"number": 24, "name": "An-Nur", "name_ru": "Ан-Нур", "name_ar": "النور", "ayahs": 64},
    {"number": 25, "name": "Al-Furqan", "name_ru": "Аль-Фуркаан", "name_ar": "الفرقان", "ayahs": 77},
    {"number": 26, "name": "Ash-Shuara", "name_ru": "Аш-Шуара", "name_ar": "الشعراء", "ayahs": 227},
    {"number": 27, "name": "An-Naml", "name_ru": "Ан-Намль", "name_ar": "النمل", "ayahs": 93},
    {"number": 28, "name": "Al-Qasas", "name_ru": "Аль-Касас", "name_ar": "القصص", "ayahs": 88},
    {"number": 29, "name": "Al-Ankabut", "name_ru": "Аль-Анкабут", "name_ar": "العنكبوت", "ayahs": 69},
    {"number": 30, "name": "Ar-Rum", "name_ru": "Ар-Рум", "name_ar": "الروم", "ayahs": 60},
    {"number": 31, "name": "Luqman", "name_ru": "Лукман", "name_ar": "لقمان", "ayahs": 34},
    {"number": 32, "name": "As-Sajdah", "name_ru": "Ас-Саджда", "name_ar": "السجدة", "ayahs": 30},
    {"number": 33, "name": "Al-Ahzab", "name_ru": "Аль-Ахзаб", "name_ar": "الأحزاب", "ayahs": 73},
    {"number": 34, "name": "Saba", "name_ru": "Саба", "name_ar": "سبإ", "ayahs": 54},
    {"number": 35, "name": "Fatir", "name_ru": "Фатыр", "name_ar": "فاطر", "ayahs": 45},
    {"number": 36, "name": "Ya-Sin", "name_ru": "Ясин", "name_ar": "يس", "ayahs": 83},
    {"number": 37, "name": "As-Saffat", "name_ru": "Ас-Саффат", "name_ar": "الصافات", "ayahs": 182},
    {"number": 38, "name": "Sad", "name_ru": "Сад", "name_ar": "ص", "ayahs": 88},
    {"number": 39, "name": "Az-Zumar", "name_ru": "Аз-Зумар", "name_ar": "الزمر", "ayahs": 75},
    {"number": 40, "name": "Ghafir", "name_ru": "Гафир", "name_ar": "غافر", "ayahs": 85},
    {"number": 41, "name": "Fussilat", "name_ru": "Фуссылят", "name_ar": "فصلت", "ayahs": 54},
    {"number": 42, "name": "Ash-Shura", "name_ru": "Аш-Шура", "name_ar": "الشورى", "ayahs": 53},
    {"number": 43, "name": "Az-Zukhruf", "name_ru": "Аз-Зухруф", "name_ar": "الزخرف", "ayahs": 89},
    {"number": 44, "name": "Ad-Dukhan", "name_ru": "Ад-Духан", "name_ar": "الدخان", "ayahs": 59},
    {"number": 45, "name": "Al-Jathiyah", "name_ru": "Аль-Джасийа", "name_ar": "الجاثية", "ayahs": 37},
    {"number": 46, "name": "Al-Ahqaf", "name_ru": "Аль-Ахкааф", "name_ar": "الأحقاف", "ayahs": 35},
    {"number": 47, "name": "Muhammad", "name_ru": "Мухаммад", "name_ar": "محمد", "ayahs": 38},
    {"number": 48, "name": "Al-Fath", "name_ru": "Аль-Фатх", "name_ar": "الفتح", "ayahs": 29},
    {"number": 49, "name": "Al-Hujurat", "name_ru": "Аль-Худжурат", "name_ar": "الحجرات", "ayahs": 18},
    {"number": 50, "name": "Qaf", "name_ru": "Каф", "name_ar": "ق", "ayahs": 45},
    {"number": 51, "name": "Adh-Dhariyat", "name_ru": "Аз-Зариат", "name_ar": "الذاريات", "ayahs": 60},
    {"number": 52, "name": "At-Tur", "name_ru": "Ат-Тур", "name_ar": "الطور", "ayahs": 49},
    {"number": 53, "name": "An-Najm", "name_ru": "Ан-Наджм", "name_ar": "النجم", "ayahs": 62},
    {"number": 54, "name": "Al-Qamar", "name_ru": "Аль-Камар", "name_ar": "القمر", "ayahs": 55},
    {"number": 55, "name": "Ar-Rahman", "name_ru": "Ар-Рахман", "name_ar": "الرحمن", "ayahs": 78},
    {"number": 56, "name": "Al-Waqiah", "name_ru": "Аль-Вакыа", "name_ar": "الواقعة", "ayahs": 96},
    {"number": 57, "name": "Al-Hadid", "name_ru": "Аль-Хадид", "name_ar": "الحديد", "ayahs": 29},
    {"number": 58, "name": "Al-Mujadila", "name_ru": "Аль-Муджадала", "name_ar": "المجادلة", "ayahs": 22},
    {"number": 59, "name": "Al-Hashr", "name_ru": "Аль-Хашр", "name_ar": "الحشر", "ayahs": 24},
    {"number": 60, "name": "Al-Mumtahanah", "name_ru": "Аль-Мумтахана", "name_ar": "الممتحنة", "ayahs": 13},
    {"number": 61, "name": "As-Saff", "name_ru": "Ас-Сафф", "name_ar": "الصف", "ayahs": 14},
    {"number": 62, "name": "Al-Jumuah", "name_ru": "Аль-Джумуа", "name_ar": "الجمعة", "ayahs": 11},
    {"number": 63, "name": "Al-Munafiqun", "name_ru": "Аль-Мунафикун", "name_ar": "المنافقون", "ayahs": 11},
    {"number": 64, "name": "At-Taghabun", "name_ru": "Ат-Тагабун", "name_ar": "التغابن", "ayahs": 18},
    {"number": 65, "name": "At-Talaq", "name_ru": "Ат-Талак", "name_ar": "الطلاق", "ayahs": 12},
    {"number": 66, "name": "At-Tahrim", "name_ru": "Ат-Тахрим", "name_ar": "التحريم", "ayahs": 12},
    {"number": 67, "name": "Al-Mulk", "name_ru": "Аль-Мульк", "name_ar": "الملك", "ayahs": 30},
    {"number": 68, "name": "Al-Qalam", "name_ru": "Аль-Калям", "name_ar": "القلم", "ayahs": 52},
    {"number": 69, "name": "Al-Haqqah", "name_ru": "Аль-Хакка", "name_ar": "الحاقة", "ayahs": 52},
    {"number": 70, "name": "Al-Maarij", "name_ru": "Аль-Маариж", "name_ar": "المعارج", "ayahs": 44},
    {"number": 71, "name": "Nuh", "name_ru": "Нух", "name_ar": "نوح", "ayahs": 28},
    {"number": 72, "name": "Al-Jinn", "name_ru": "Аль-Джинн", "name_ar": "الجن", "ayahs": 28},
    {"number": 73, "name": "Al-Muzzammil", "name_ru": "Аль-Муззаммиль", "name_ar": "المزمل", "ayahs": 20},
    {"number": 74, "name": "Al-Muddaththir", "name_ru": "Аль-Муддасир", "name_ar": "المدثر", "ayahs": 56},
    {"number": 75, "name": "Al-Qiyamah", "name_ru": "Аль-Кыяма", "name_ar": "القيامة", "ayahs": 40},
    {"number": 76, "name": "Al-Insan", "name_ru": "Аль-Инсан", "name_ar": "الإنسان", "ayahs": 31},
    {"number": 77, "name": "Al-Mursalat", "name_ru": "Аль-Мурсалят", "name_ar": "المرسلات", "ayahs": 50},
    {"number": 78, "name": "An-Naba", "name_ru": "Ан-Наба", "name_ar": "النبأ", "ayahs": 40},
    {"number": 79, "name": "An-Naziat", "name_ru": "Ан-Назиат", "name_ar": "النازعات", "ayahs": 46},
    {"number": 80, "name": "Abasa", "name_ru": "Абаса", "name_ar": "عبس", "ayahs": 42},
    {"number": 81, "name": "At-Takwir", "name_ru": "Ат-Таквир", "name_ar": "التكوير", "ayahs": 29},
    {"number": 82, "name": "Al-Infitar", "name_ru": "Аль-Инфитар", "name_ar": "الانفطار", "ayahs": 19},
    {"number": 83, "name": "Al-Mutaffifin", "name_ru": "Аль-Мутаффифин", "name_ar": "المطففين", "ayahs": 36},
    {"number": 84, "name": "Al-Inshiqaq", "name_ru": "Аль-Иншикак", "name_ar": "الانشقاق", "ayahs": 25},
    {"number": 85, "name": "Al-Buruj", "name_ru": "Аль-Бурудж", "name_ar": "البروج", "ayahs": 22},
    {"number": 86, "name": "At-Tariq", "name_ru": "Ат-Тарик", "name_ar": "الطارق", "ayahs": 17},
    {"number": 87, "name": "Al-Ala", "name_ru": "Аль-Аала", "name_ar": "الأعلى", "ayahs": 19},
    {"number": 88, "name": "Al-Ghashiyah", "name_ru": "Аль-Гашия", "name_ar": "الغاشية", "ayahs": 26},
    {"number": 89, "name": "Al-Fajr", "name_ru": "Аль-Фаджр", "name_ar": "الفجر", "ayahs": 30},
    {"number": 90, "name": "Al-Balad", "name_ru": "Аль-Балад", "name_ar": "البلد", "ayahs": 20},
    {"number": 91, "name": "Ash-Shams", "name_ru": "Аш-Шамс", "name_ar": "الشمس", "ayahs": 15},
    {"number": 92, "name": "Al-Layl", "name_ru": "Аль-Лейль", "name_ar": "الليل", "ayahs": 21},
    {"number": 93, "name": "Ad-Duha", "name_ru": "Ад-Духа", "name_ar": "الضحى", "ayahs": 11},
    {"number": 94, "name": "Ash-Sharh", "name_ru": "Аш-Шарх", "name_ar": "الشرح", "ayahs": 8},
    {"number": 95, "name": "At-Tin", "name_ru": "Ат-Тин", "name_ar": "التين", "ayahs": 8},
    {"number": 96, "name": "Al-Alaq", "name_ru": "Аль-Аляк", "name_ar": "العلق", "ayahs": 19},
    {"number": 97, "name": "Al-Qadr", "name_ru": "Аль-Кадр", "name_ar": "القدر", "ayahs": 5},
    {"number": 98, "name": "Al-Bayyinah", "name_ru": "Аль-Баййина", "name_ar": "البينة", "ayahs": 8},
    {"number": 99, "name": "Az-Zalzalah", "name_ru": "Аз-Зальзаля", "name_ar": "الزلزلة", "ayahs": 8},
    {"number": 100, "name": "Al-Adiyat", "name_ru": "Аль-Адийат", "name_ar": "العاديات", "ayahs": 11},
    {"number": 101, "name": "Al-Qariah", "name_ru": "Аль-Кариа", "name_ar": "القارعة", "ayahs": 11},
    {"number": 102, "name": "At-Takathur", "name_ru": "Ат-Такасур", "name_ar": "التكاثر", "ayahs": 8},
    {"number": 103, "name": "Al-Asr", "name_ru": "Аль-Аср", "name_ar": "العصر", "ayahs": 3},
    {"number": 104, "name": "Al-Humazah", "name_ru": "Аль-Хумаза", "name_ar": "الهمزة", "ayahs": 9},
    {"number": 105, "name": "Al-Fil", "name_ru": "Аль-Филь", "name_ar": "الفيل", "ayahs": 5},
    {"number": 106, "name": "Quraysh", "name_ru": "Курайш", "name_ar": "قريش", "ayahs": 4},
    {"number": 107, "name": "Al-Maun", "name_ru": "Аль-Маун", "name_ar": "الماعون", "ayahs": 7},
    {"number": 108, "name": "Al-Kawthar", "name_ru": "Аль-Каусар", "name_ar": "الكوثر", "ayahs": 3},
    {"number": 109, "name": "Al-Kafirun", "name_ru": "Аль-Кафирун", "name_ar": "الكافرون", "ayahs": 6},
    {"number": 110, "name": "An-Nasr", "name_ru": "Ан-Наср", "name_ar": "النصر", "ayahs": 3},
    {"number": 111, "name": "Al-Masad", "name_ru": "Аль-Масад", "name_ar": "المسد", "ayahs": 5},
    {"number": 112, "name": "Al-Ikhlas", "name_ru": "Аль-Ихляс", "name_ar": "الإخلاص", "ayahs": 4},
    {"number": 113, "name": "Al-Falaq", "name_ru": "Аль-Фаляк", "name_ar": "الفلق", "ayahs": 5},
    {"number": 114, "name": "An-Nas", "name_ru": "Ан-Нас", "name_ar": "الناس", "ayahs": 6},
]

def _get_surah(num: int):
    return next((s for s in ALL_SURAHS if s["number"] == num), None)

def _hifz_phase(count: int) -> str:
    if count <= 20: return "Начало"
    if count <= 100: return "Середина"
    return "Финиш"

def _audio_url(surah: int, ayah: int) -> str:
    return f"https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/{str(surah).zfill(3)}{str(ayah).zfill(3)}.mp3"


class HifzStartRequest(BaseModel):
    user_id: str
    surah_number: int
    evening_hour: int = 21
    morning_hour: int = 7

class HifzLessonComplete(BaseModel):
    user_id: str
    ayahs: List[Dict[str, Any]]

class HifzReviewComplete(BaseModel):
    user_id: str


@api_router.get("/quran/hifz/surahs")
async def hifz_get_surahs():
    return {"surahs": ALL_SURAHS}


@api_router.post("/quran/hifz/program/start")
async def hifz_start_program(data: HifzStartRequest):
    try:
        s = _get_surah(data.surah_number)
        if not s:
            raise HTTPException(status_code=400, detail="Неверный номер суры")

        existing = supabase.table("quran_program").select("id").eq("user_id", data.user_id).execute()
        now = datetime.utcnow().isoformat()
        program_data = {
            "current_surah": data.surah_number,
            "current_ayah": 1,
            "is_active": True,
            "evening_hour": data.evening_hour,
            "morning_hour": data.morning_hour,
            "started_at": now,
            "study_week": 1,
            "current_block_index": 0,
            "last_block_date": None,
            "last_lesson_date": None,
        }
        if existing.data:
            r = supabase.table("quran_program").update(program_data).eq("user_id", data.user_id).execute()
        else:
            program_data["user_id"] = data.user_id
            program_data["created_at"] = now
            r = supabase.table("quran_program").insert(program_data).execute()
        return {"success": True, "surah": data.surah_number}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"hifz start: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/quran/hifz/program/{user_id}")
async def hifz_get_program(user_id: str):
    try:
        r = supabase.table("quran_program").select("*").eq("user_id", user_id).execute()
        if not r.data:
            return {"active": False, "program": None}

        prog = r.data[0]
        surah_info = _get_surah(prog["current_surah"])

        pr = supabase.table("quran_progress").select("id", count="exact")\
            .eq("user_id", user_id).eq("surah", prog["current_surah"]).execute()
        learned = pr.count or 0
        total = surah_info["ayahs"] if surah_info else 0
        pct = round(learned / total * 100, 1) if total > 0 else 0.0

        return {
            "active": prog["is_active"],
            "program": {
                **{k: v for k, v in prog.items() if k != "telegram_id"},
                "surah_name": surah_info["name"] if surah_info else "",
                "surah_name_ru": surah_info["name_ru"] if surah_info else "",
                "surah_name_ar": surah_info["name_ar"] if surah_info else "",
                "phase": _hifz_phase(learned),
                "learned_count": learned,
                "total_ayahs": total,
                "progress_pct": pct,
            }
        }
    except Exception as e:
        err_str = str(e)
        if "schema cache" in err_str or "PGRST205" in err_str or "does not exist" in err_str:
            return {"active": False, "program": None, "sql_needed": True}
        if "invalid input syntax for type uuid" in err_str:
            return {"active": False, "program": None}
        logger.error(f"hifz program: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/quran/hifz/program/settings")
async def hifz_update_settings(data: dict):
    try:
        user_id = data.get("user_id")
        update = {}
        if "evening_hour" in data:
            update["evening_hour"] = data["evening_hour"]
        if "morning_hour" in data:
            update["morning_hour"] = data["morning_hour"]
        if update:
            supabase.table("quran_program").update(update).eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/quran/hifz/program/change-surah")
async def hifz_change_surah(data: dict):
    try:
        user_id = data.get("user_id")
        new_surah = data.get("surah_number")
        s = _get_surah(new_surah)
        if not s:
            raise HTTPException(status_code=400, detail="Неверный номер суры")
        supabase.table("quran_program").update({
            "current_surah": new_surah, "current_ayah": 1,
            "current_block_index": 0, "last_block_date": None,
        }).eq("user_id", user_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/quran/hifz/lesson/{user_id}")
async def hifz_get_lesson(user_id: str):
    try:
        r = supabase.table("quran_program").select("*").eq("user_id", user_id).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail="Программа не найдена")
        prog = r.data[0]
        s = prog["current_surah"]
        a = prog["current_ayah"]
        surah_info = _get_surah(s)
        if not surah_info:
            raise HTTPException(status_code=404, detail="Сура не найдена")

        total = surah_info["ayahs"]
        is_first = (a == 1)
        remaining = total - a + 1

        pr = supabase.table("quran_progress").select("id", count="exact")\
            .eq("user_id", user_id).eq("surah", s).execute()
        learned = pr.count or 0
        lesson_num = learned // 2 + 1

        ayahs = []
        if is_first:
            ayahs.append({"surah": 1, "ayah": 1, "is_basmala": True, "audio_url": _audio_url(1, 1)})

        count = min(2, remaining) if remaining >= 1 else 0
        for i in range(a, a + count):
            if i <= total:
                ayahs.append({"surah": s, "ayah": i, "is_basmala": False, "audio_url": _audio_url(s, i)})

        return {
            "lesson_number": lesson_num,
            "surah_number": s,
            "surah_name": surah_info["name"],
            "surah_name_ru": surah_info["name_ru"],
            "is_first_lesson": is_first,
            "phase": _hifz_phase(learned),
            "ayahs": ayahs,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"hifz lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quran/hifz/lesson/complete")
async def hifz_complete_lesson(data: HifzLessonComplete):
    try:
        points = 0
        real_ayahs = [a for a in data.ayahs if not (a.get("surah") == 1 and a.get("ayah") == 1)]
        now = datetime.utcnow().isoformat()

        for ay in real_ayahs:
            ex = supabase.table("quran_progress").select("id")\
                .eq("user_id", data.user_id).eq("surah", ay["surah"]).eq("ayah", ay["ayah"]).execute()
            if not ex.data:
                supabase.table("quran_progress").insert({
                    "user_id": data.user_id,
                    "surah": ay["surah"],
                    "ayah": ay["ayah"],
                    "learned_at": now,
                    "review_count": 0,
                    "status": "learned",
                    "week_learned": 1,
                    "created_at": now,
                }).execute()
                points += 10

        r = supabase.table("quran_program").select("*").eq("user_id", data.user_id).execute()
        surah_completed = False
        if r.data and real_ayahs:
            prog = r.data[0]
            cur_s = prog["current_surah"]
            surah_info = _get_surah(cur_s)
            max_a = max((a["ayah"] for a in real_ayahs if a["surah"] == cur_s), default=prog["current_ayah"])
            new_a = max_a + 1
            surah_completed = new_a > surah_info["ayahs"]
            supabase.table("quran_program").update({
                "current_ayah": new_a,
                "last_lesson_date": datetime.utcnow().date().isoformat(),
            }).eq("user_id", data.user_id).execute()

        if points > 0:
            u = supabase.table("users").select("zikr_count").eq("id", data.user_id).execute()
            if u.data:
                cur = u.data[0].get("zikr_count") or 0
                supabase.table("users").update({"zikr_count": cur + points}).eq("id", data.user_id).execute()

        return {"success": True, "points_earned": points, "surah_completed": surah_completed}
    except Exception as e:
        logger.error(f"hifz complete lesson: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/quran/hifz/review/{user_id}")
async def hifz_get_review(user_id: str):
    try:
        r = supabase.table("quran_program").select("*").eq("user_id", user_id).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail="Программа не найдена")
        prog = r.data[0]
        cur_s = prog["current_surah"]

        pr = supabase.table("quran_progress").select("surah,ayah,learned_at")\
            .eq("user_id", user_id).eq("surah", cur_s).order("ayah").execute()
        learned = pr.data or []
        total = len(learned)

        def make_url(s, a):
            return _audio_url(s, a)

        yesterday_dt = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        yesterday_ayahs = [
            {"surah": a["surah"], "ayah": a["ayah"], "audio_url": make_url(a["surah"], a["ayah"])}
            for a in learned if (a.get("learned_at") or "") >= yesterday_dt
        ]

        if total < 25:
            all_ayahs = [{"surah": a["surah"], "ayah": a["ayah"], "audio_url": make_url(a["surah"], a["ayah"])} for a in learned]
            return {"mode": "panel_a", "all_ayahs": all_ayahs, "yesterday_ayahs": [], "current_block": None}

        blocks = [learned[i:i+25] for i in range(0, total, 25) if len(learned[i:i+25]) == 25]
        if not blocks:
            all_ayahs = [{"surah": a["surah"], "ayah": a["ayah"], "audio_url": make_url(a["surah"], a["ayah"])} for a in learned]
            return {"mode": "panel_a", "all_ayahs": all_ayahs, "yesterday_ayahs": [], "current_block": None}

        today = datetime.utcnow().date().isoformat()
        idx = prog.get("current_block_index") or 0
        if idx >= len(blocks): idx = 0

        if prog.get("last_block_date") != today:
            idx = (idx + 1) % len(blocks)
            supabase.table("quran_program").update({
                "current_block_index": idx, "last_block_date": today,
            }).eq("user_id", user_id).execute()

        block = blocks[idx]
        yesterday_ids = {(a["surah"], a["ayah"]) for a in yesterday_ayahs}
        block_filtered = [
            {"surah": a["surah"], "ayah": a["ayah"], "audio_url": make_url(a["surah"], a["ayah"])}
            for a in block if (a["surah"], a["ayah"]) not in yesterday_ids
        ]

        return {
            "mode": "panel_b",
            "all_ayahs": [],
            "yesterday_ayahs": yesterday_ayahs,
            "current_block": {
                "block_number": idx + 1,
                "ayahs": block_filtered,
                "start_ayah": block[0]["ayah"],
                "end_ayah": block[-1]["ayah"],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"hifz review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quran/hifz/review/complete")
async def hifz_complete_review(data: HifzReviewComplete):
    try:
        points = 5
        u = supabase.table("users").select("zikr_count").eq("id", data.user_id).execute()
        if u.data:
            cur = u.data[0].get("zikr_count") or 0
            supabase.table("users").update({"zikr_count": cur + points}).eq("id", data.user_id).execute()

        supabase.table("quran_program").update({
            "last_review_date": datetime.utcnow().date().isoformat(),
        }).eq("user_id", data.user_id).execute()

        return {"success": True, "points_earned": points}
    except Exception as e:
        logger.error(f"hifz complete review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/quran/hifz/ayah/{surah}/{ayah}")
async def hifz_get_ayah(surah: int, ayah: int):
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                f"https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/editions/quran-uthmani,en.transliteration"
            )
            d = resp.json()
        editions = d.get("data", [])
        arabic = editions[0] if editions else {}
        translit = editions[1] if len(editions) > 1 else {}
        return {
            "surah": surah, "ayah": ayah,
            "arabic_text": arabic.get("text", ""),
            "transliteration": translit.get("text", ""),
            "surah_name": arabic.get("surah", {}).get("englishName", ""),
            "audio_url": _audio_url(surah, ayah),
        }
    except Exception:
        return {
            "surah": surah, "ayah": ayah,
            "arabic_text": "", "transliteration": "",
            "surah_name": "", "audio_url": _audio_url(surah, ayah),
        }


@api_router.get("/quran/hifz/stats/{user_id}")
async def hifz_get_stats(user_id: str):
    try:
        all_pr = supabase.table("quran_progress").select("surah,ayah").eq("user_id", user_id).execute()
        total = len(all_pr.data or [])

        by_surah: Dict[int, int] = {}
        for p in (all_pr.data or []):
            by_surah[p["surah"]] = by_surah.get(p["surah"], 0) + 1
        completed_surahs = sum(1 for sn, cnt in by_surah.items() if _get_surah(sn) and cnt >= _get_surah(sn)["ayahs"])

        prog_r = supabase.table("quran_program").select("started_at").eq("user_id", user_id).execute()
        started_at = prog_r.data[0]["started_at"] if prog_r.data else None

        u = supabase.table("users").select("zikr_count").eq("id", user_id).execute()
        points = u.data[0].get("zikr_count", 0) if u.data else 0

        return {"total_ayahs": total, "completed_surahs": completed_surahs, "points": points, "started_at": started_at}
    except Exception as e:
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

# App lifecycle events (MongoDB removed)
