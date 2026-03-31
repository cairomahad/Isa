# РУКОВОДСТВО ПО ИНТЕГРАЦИИ ФУНКЦИИ ХИФЗ КОРАНА
## Источник: репозиторий cairomahad/Isa → приложение Tazakkur (React Native / Expo)

---

## ОБЗОР: ЧТО ДАЁТ ДОНОР И ЧТО У НАС УЖЕ ЕСТЬ

### Что уже реализовано в Tazakkur (НЕ ТРОГАТЬ):
- `services/QuranService.ts` — сервис работы с аятами (кэш, аудио, fetchAyah)
- `app/quran/lesson.tsx` — экран вечернего урока
- `app/quran/review.tsx` — экран утреннего повторения
- `app/quran/progress.tsx` — экран прогресса
- `app/(tabs)/quran.tsx` — главный экран хифза с дашбордом

### Что есть в доноре и ЧЕГО НЕТ в Tazakkur (нужно внедрить):
1. **Backend API эндпоинты** — в `server.py` нет ни одного `/api/quran/...` эндпоинта
2. **SQL таблицы** `quran_program` и `quran_progress` с правильной схемой
3. **Логика Panel A / Panel B** для утреннего повторения
4. **Идентификация пользователя через UUID** (у донора `user_id TEXT` = Supabase UUID)

> **ВАЖНО**: У донора — веб-приложение (React + React Router). У Tazakkur — мобильное приложение (React Native + Expo Router). Код компонентов переписывать с нуля под RN. Переносить нужно ЛОГИКУ и BACKEND.

---

## ШАГ 1 — БАЗА ДАННЫХ: SQL в Supabase

Открыть: https://supabase.com/dashboard/project/kmhhazpyalpjwspjxzry/editor  
Выполнить следующий SQL (скопировать целиком):

```sql
-- ==============================================================
-- ТАБЛИЦА 1: quran_program (программа заучивания пользователя)
-- ==============================================================
CREATE TABLE IF NOT EXISTS quran_program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,             -- Supabase UUID пользователя
  current_surah INTEGER NOT NULL CHECK (current_surah >= 1 AND current_surah <= 114),
  current_ayah INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  evening_hour INTEGER DEFAULT 21 CHECK (evening_hour >= 0 AND evening_hour <= 23),
  morning_hour INTEGER DEFAULT 7 CHECK (morning_hour >= 0 AND morning_hour <= 23),
  last_lesson_date DATE,
  last_review_date DATE,
  current_block_index INTEGER DEFAULT 0,  -- для Panel B
  last_block_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quran_program_user_id ON quran_program(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quran_program_user_unique ON quran_program(user_id);

-- ==============================================================
-- ТАБЛИЦА 2: quran_progress (история выученных аятов)
-- ==============================================================
CREATE TABLE IF NOT EXISTS quran_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  surah INTEGER NOT NULL CHECK (surah >= 1 AND surah <= 114),
  ayah INTEGER NOT NULL,
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'learned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quran_progress_user_id ON quran_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quran_progress_surah ON quran_progress(user_id, surah);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quran_progress_unique ON quran_progress(user_id, surah, ayah);

-- ==============================================================
-- RLS ПОЛИТИКИ
-- ==============================================================
ALTER TABLE quran_program ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all quran_program" ON quran_program;
CREATE POLICY "Allow all quran_program" ON quran_program FOR ALL USING (true);

ALTER TABLE quran_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all quran_progress" ON quran_progress;
CREATE POLICY "Allow all quran_progress" ON quran_progress FOR ALL USING (true);

-- ==============================================================
-- ПРОВЕРКА
-- ==============================================================
SELECT 'quran_program OK' as status, COUNT(*) FROM quran_program;
SELECT 'quran_progress OK' as status, COUNT(*) FROM quran_progress;
```

> **ПРИМЕЧАНИЕ**: Если у вас уже есть старые таблицы `quran_program` и `quran_progress` с полем `telegram_id` — удалите их сначала:
> ```sql
> DROP TABLE IF EXISTS quran_program CASCADE;
> DROP TABLE IF EXISTS quran_progress CASCADE;
> DROP TABLE IF EXISTS quran_reviews CASCADE;
> ```

---

## ШАГ 2 — BACKEND: Добавить API эндпоинты в server.py

Открыть файл `/app/backend/server.py` и добавить в конец файла (перед `app.include_router(api_router)`):

### 2.1 — Добавить модели данных

Добавить в `models.py` или непосредственно в начало `server.py`:

```python
# === QURAN HIFZ MODELS ===
class QuranProgramCreate(BaseModel):
    user_id: str
    surah_number: int
    evening_hour: int = 21
    morning_hour: int = 7

class QuranLessonComplete(BaseModel):
    user_id: str
    ayahs: List[dict]  # [{"surah": int, "ayah": int}]

class QuranReviewComplete(BaseModel):
    user_id: str
    ayahs_reviewed_count: int = 0
```

### 2.2 — Добавить статичные данные 114 сур

```python
# === QURAN SURAH DATA ===
QURAN_SURAHS = [
  {"number": 1,  "name": "Al-Fatiha",   "nameRu": "Аль-Фатиха",  "ayahs": 7},
  {"number": 2,  "name": "Al-Baqara",   "nameRu": "Аль-Бакара",  "ayahs": 286},
  {"number": 3,  "name": "Aal-E-Imran", "nameRu": "Аль-Имран",   "ayahs": 200},
  # ... вставить все 114 сур из donor server.py строки с QURAN_SURAHS ...
  {"number": 114,"name": "An-Nas",      "nameRu": "Ан-Нас",      "ayahs": 6},
]

def get_surah_info(surah_number: int):
    for s in QURAN_SURAHS:
        if s["number"] == surah_number:
            return s
    return None

def get_phase_info(learned_count: int) -> str:
    if learned_count <= 20:   return "Начало"
    elif learned_count <= 100: return "Середина"
    else:                      return "Финиш"
```

### 2.3 — Добавить API эндпоинты

Все эндпоинты добавляются в `api_router` (используется prefix `/api`).

#### GET /api/quran/surahs
```python
@api_router.get("/quran/surahs")
async def get_all_surahs():
    return {"surahs": QURAN_SURAHS}
```

#### POST /api/quran/program/start
```python
@api_router.post("/quran/program/start")
async def start_quran_program(data: QuranProgramCreate):
    try:
        existing = supabase.table("quran_program")\
            .select("id")\
            .eq("user_id", data.user_id)\
            .execute()

        program_data = {
            "current_surah": data.surah_number,
            "current_ayah": 1,
            "is_active": True,
            "evening_hour": data.evening_hour,
            "morning_hour": data.morning_hour,
            "started_at": datetime.utcnow().isoformat(),
            "current_block_index": 0,
            "last_block_date": None,
            "updated_at": datetime.utcnow().isoformat(),
        }

        if existing.data:
            result = supabase.table("quran_program")\
                .update(program_data)\
                .eq("user_id", data.user_id)\
                .execute()
        else:
            program_data["user_id"] = data.user_id
            result = supabase.table("quran_program")\
                .insert(program_data)\
                .execute()

        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### GET /api/quran/program/{user_id}
```python
@api_router.get("/quran/program/{user_id}")
async def get_quran_program(user_id: str):
    try:
        result = supabase.table("quran_program")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()

        if not result.data:
            return {"active": False, "program": None}

        program = result.data[0]
        surah_info = get_surah_info(program["current_surah"])

        # Подсчёт выученных аятов текущей суры
        progress = supabase.table("quran_progress")\
            .select("id", count="exact")\
            .eq("user_id", user_id)\
            .eq("surah", program["current_surah"])\
            .execute()

        learned_count = progress.count or 0
        total_ayahs = surah_info["ayahs"] if surah_info else 0
        progress_pct = (learned_count / total_ayahs * 100) if total_ayahs > 0 else 0

        return {
            "active": program["is_active"],
            "program": {
                **program,
                "current_surah_name": surah_info["name"] if surah_info else "",
                "current_surah_name_ru": surah_info["nameRu"] if surah_info else "",
                "phase": get_phase_info(learned_count),
                "learned_ayahs_count": learned_count,
                "total_ayahs_in_surah": total_ayahs,
                "progress_percentage": progress_pct,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### GET /api/quran/lesson/evening/{user_id}
```python
@api_router.get("/quran/lesson/evening/{user_id}")
async def get_evening_lesson(user_id: str):
    try:
        prog_result = supabase.table("quran_program")\
            .select("*").eq("user_id", user_id).execute()
        if not prog_result.data:
            raise HTTPException(status_code=404, detail="Программа не найдена")

        program = prog_result.data[0]
        current_surah = program["current_surah"]
        current_ayah = program["current_ayah"]
        surah_info = get_surah_info(current_surah)

        progress_result = supabase.table("quran_progress")\
            .select("id", count="exact")\
            .eq("user_id", user_id).eq("surah", current_surah).execute()
        learned_count = progress_result.count or 0

        is_first_lesson = (current_ayah == 1)
        total_in_surah = surah_info["ayahs"]
        remaining = total_in_surah - current_ayah + 1

        ayahs = []
        # Добавляем Басмалу только на первый урок суры
        if is_first_lesson:
            ayahs.append({
                "surah": 1, "ayah": 1, "is_basmala": True,
                "audio_url": "https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/001001.mp3"
            })

        # Добавляем 2 новых аята (или все оставшиеся если суры почти конец)
        count = 2 if remaining >= 2 else remaining
        for i in range(current_ayah, current_ayah + count):
            ayahs.append({
                "surah": current_surah, "ayah": i, "is_basmala": False,
                "audio_url": f"https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/"
                             f"{str(current_surah).zfill(3)}{str(i).zfill(3)}.mp3"
            })

        return {
            "lesson_number": learned_count // 2 + 1,
            "surah_number": current_surah,
            "surah_name": surah_info["name"],
            "surah_name_ru": surah_info["nameRu"],
            "phase": get_phase_info(learned_count),
            "is_first_lesson": is_first_lesson,
            "ayahs": ayahs,
            "total_ayahs_count": len([a for a in ayahs if not a["is_basmala"]]),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### POST /api/quran/lesson/complete
```python
@api_router.post("/quran/lesson/complete")
async def complete_lesson(data: QuranLessonComplete):
    try:
        points = 0
        for ayah_data in data.ayahs:
            if ayah_data["surah"] == 1 and ayah_data["ayah"] == 1:
                continue  # Пропустить Басмалу

            # Сохранить только если ещё не записан
            existing = supabase.table("quran_progress")\
                .select("id")\
                .eq("user_id", data.user_id)\
                .eq("surah", ayah_data["surah"])\
                .eq("ayah", ayah_data["ayah"])\
                .execute()

            if not existing.data:
                supabase.table("quran_progress").insert({
                    "user_id": data.user_id,
                    "surah": ayah_data["surah"],
                    "ayah": ayah_data["ayah"],
                    "learned_at": datetime.utcnow().isoformat(),
                }).execute()
                points += 10  # +10 за каждый новый аят

        # Обновить позицию в программе
        prog = supabase.table("quran_program")\
            .select("*").eq("user_id", data.user_id).execute()
        if prog.data:
            program = prog.data[0]
            real_ayahs = [a for a in data.ayahs if not (a["surah"] == 1 and a["ayah"] == 1)]
            if real_ayahs:
                max_ayah = max(a["ayah"] for a in real_ayahs)
                surah_info = get_surah_info(program["current_surah"])
                new_ayah = max_ayah + 1
                surah_completed = new_ayah > surah_info["ayahs"]

                supabase.table("quran_program").update({
                    "current_ayah": new_ayah,
                    "last_lesson_date": datetime.utcnow().date().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("user_id", data.user_id).execute()
            else:
                surah_completed = False
        else:
            surah_completed = False

        # Начислить очки пользователю
        if points > 0:
            user = supabase.table("users")\
                .select("zikr_count").eq("id", data.user_id).execute()
            if user.data:
                current = user.data[0].get("zikr_count", 0) or 0
                supabase.table("users").update({"zikr_count": current + points})\
                    .eq("id", data.user_id).execute()

        return {"success": True, "points_earned": points, "surah_completed": surah_completed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### GET /api/quran/review/morning/{user_id}
```python
@api_router.get("/quran/review/morning/{user_id}")
async def get_morning_review(user_id: str):
    try:
        prog = supabase.table("quran_program")\
            .select("*").eq("user_id", user_id).execute()
        if not prog.data:
            raise HTTPException(status_code=404, detail="Программа не найдена")

        program = prog.data[0]
        current_surah = program["current_surah"]

        # Все выученные аяты текущей суры
        progress = supabase.table("quran_progress")\
            .select("surah,ayah,learned_at")\
            .eq("user_id", user_id)\
            .eq("surah", current_surah)\
            .order("ayah").execute()

        learned_ayahs = progress.data or []
        total = len(learned_ayahs)

        def make_audio_url(s, a):
            return f"https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/{str(s).zfill(3)}{str(a).zfill(3)}.mp3"

        # Вчерашние аяты (последние 24 часа)
        yesterday = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        yesterday_ayahs = [
            {"surah": a["surah"], "ayah": a["ayah"], "audio_url": make_audio_url(a["surah"], a["ayah"])}
            for a in learned_ayahs
            if a.get("learned_at", "") >= yesterday
        ]

        # PANEL A — менее 25 выученных аятов
        if total < 25:
            all_ayahs = [
                {"surah": a["surah"], "ayah": a["ayah"], "audio_url": make_audio_url(a["surah"], a["ayah"])}
                for a in learned_ayahs
            ]
            return {"mode": "panel_a", "all_ayahs": all_ayahs, "total_ayahs_count": len(all_ayahs)}

        # PANEL B — 25+ аятов: ротация блоков по 25
        blocks = []
        for i in range(0, total, 25):
            block = learned_ayahs[i:i+25]
            if len(block) == 25:
                blocks.append(block)

        if not blocks:
            # Fallback к Panel A
            all_ayahs = [
                {"surah": a["surah"], "ayah": a["ayah"], "audio_url": make_audio_url(a["surah"], a["ayah"])}
                for a in learned_ayahs
            ]
            return {"mode": "panel_a", "all_ayahs": all_ayahs, "total_ayahs_count": len(all_ayahs)}

        # Ротация блока
        current_block_index = program.get("current_block_index", 0) or 0
        last_block_date = program.get("last_block_date")
        today = datetime.utcnow().date().isoformat()

        if current_block_index >= len(blocks):
            current_block_index = 0

        if last_block_date != today:
            current_block_index = (current_block_index + 1) % len(blocks)
            supabase.table("quran_program").update({
                "current_block_index": current_block_index,
                "last_block_date": today,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("user_id", user_id).execute()

        current_block = blocks[current_block_index]
        yesterday_ids = {(a["surah"], a["ayah"]) for a in yesterday_ayahs}
        block_filtered = [
            {"surah": a["surah"], "ayah": a["ayah"], "audio_url": make_audio_url(a["surah"], a["ayah"])}
            for a in current_block
            if (a["surah"], a["ayah"]) not in yesterday_ids
        ]

        return {
            "mode": "panel_b",
            "yesterday_ayahs": yesterday_ayahs,
            "current_block": {
                "block_number": current_block_index + 1,
                "block_ayahs": block_filtered,
                "start_ayah": current_block[0]["ayah"],
                "end_ayah": current_block[-1]["ayah"],
            },
            "total_ayahs_count": len(yesterday_ayahs) + len(block_filtered),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### POST /api/quran/review/complete
```python
@api_router.post("/quran/review/complete")
async def complete_review(data: QuranReviewComplete):
    try:
        points = 5
        user = supabase.table("users")\
            .select("zikr_count").eq("id", data.user_id).execute()
        if user.data:
            current = user.data[0].get("zikr_count", 0) or 0
            supabase.table("users").update({"zikr_count": current + points})\
                .eq("id", data.user_id).execute()

        supabase.table("quran_program").update({
            "last_review_date": datetime.utcnow().date().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("user_id", data.user_id).execute()

        return {"success": True, "points_earned": points, "message": "Повторение завершено! +5 очков"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### GET /api/quran/ayah/{surah}/{ayah}
```python
@api_router.get("/quran/ayah/{surah}/{ayah}")
async def get_ayah_text(surah: int, ayah: int):
    """Прокси для получения арабского текста и транслитерации"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/editions/quran-uthmani,en.transliteration"
            )
            data = resp.json()

        editions = data.get("data", [])
        arabic = editions[0] if editions else {}
        translit = editions[1] if len(editions) > 1 else {}
        number_in_quran = arabic.get("numberInQuran", 0)

        return {
            "surah": surah,
            "ayah": ayah,
            "arabic_text": arabic.get("text", ""),
            "transliteration": translit.get("text", ""),
            "surah_name": arabic.get("surah", {}).get("englishName", ""),
            "number_in_quran": number_in_quran,
            "audio_url": f"https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/{str(surah).zfill(3)}{str(ayah).zfill(3)}.mp3",
        }
    except Exception as e:
        return {
            "surah": surah, "ayah": ayah,
            "arabic_text": "", "transliteration": "",
            "surah_name": "", "number_in_quran": 0,
            "audio_url": f"https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/{str(surah).zfill(3)}{str(ayah).zfill(3)}.mp3",
        }
```

#### GET /api/quran/stats/{user_id}
```python
@api_router.get("/quran/stats/{user_id}")
async def get_quran_stats(user_id: str):
    try:
        all_progress = supabase.table("quran_progress")\
            .select("surah,ayah").eq("user_id", user_id).execute()

        total_ayahs = len(all_progress.data or [])

        surahs_count = {}
        for p in (all_progress.data or []):
            surahs_count[p["surah"]] = surahs_count.get(p["surah"], 0) + 1

        completed_surahs = sum(
            1 for s, cnt in surahs_count.items()
            if get_surah_info(s) and cnt >= get_surah_info(s)["ayahs"]
        )

        prog = supabase.table("quran_program")\
            .select("started_at").eq("user_id", user_id).execute()
        started_at = prog.data[0]["started_at"] if prog.data else None

        user = supabase.table("users")\
            .select("zikr_count").eq("id", user_id).execute()
        total_points = user.data[0].get("zikr_count", 0) if user.data else 0

        return {
            "total_ayahs_learned": total_ayahs,
            "total_surahs_completed": completed_surahs,
            "total_points": total_points,
            "started_at": started_at,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ШАГ 3 — FRONTEND: Обновить QuranService.ts

Полностью переписать `QuranService.ts` чтобы он использовал бэкенд API вместо прямых запросов к Supabase.

### 3.1 — Как получить userId

В текущем приложении используется `telegram_id` (integer). В доноре — Supabase UUID пользователя.
Необходимо **использовать Supabase UUID**:

```typescript
// В компонентах quran получать userId так:
import { supabase } from '../lib/supabase';

const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id;  // это UUID строка — передавать на бэкенд
```

### 3.2 — Переписать сервис

```typescript
const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001';

export const QuranService = {
  // Получить программу пользователя
  async getProgram(userId: string) {
    const res = await fetch(`${API}/api/quran/program/${userId}`);
    return res.json(); // { active: bool, program: {...} | null }
  },

  // Начать программу
  async startProgram(userId: string, surahNumber: number) {
    const res = await fetch(`${API}/api/quran/program/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, surah_number: surahNumber }),
    });
    return res.json();
  },

  // Получить вечерний урок
  async getEveningLesson(userId: string) {
    const res = await fetch(`${API}/api/quran/lesson/evening/${userId}`);
    return res.json(); // { ayahs: [...], surah_name, phase, ... }
  },

  // Завершить урок
  async completeLesson(userId: string, ayahs: {surah: number, ayah: number}[]) {
    const res = await fetch(`${API}/api/quran/lesson/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ayahs }),
    });
    return res.json(); // { success, points_earned, surah_completed }
  },

  // Получить утреннее повторение
  async getMorningReview(userId: string) {
    const res = await fetch(`${API}/api/quran/review/morning/${userId}`);
    return res.json(); // { mode: 'panel_a'|'panel_b', ... }
  },

  // Завершить повторение
  async completeReview(userId: string) {
    const res = await fetch(`${API}/api/quran/review/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    return res.json(); // { success, points_earned }
  },

  // Получить текст аята (арабский + транслитерация)
  async getAyahText(surah: number, ayah: number) {
    const res = await fetch(`${API}/api/quran/ayah/${surah}/${ayah}`);
    return res.json(); // { arabic_text, transliteration, audio_url, ... }
  },

  // Статистика
  async getStats(userId: string) {
    const res = await fetch(`${API}/api/quran/stats/${userId}`);
    return res.json();
  },
};
```

---

## ШАГ 4 — FRONTEND: Обновить экраны

### 4.1 — lesson.tsx (Вечерний урок)

Логика экрана:

```
useEffect:
  1. userId = await supabase.auth.getUser() → user.id
  2. lesson = await QuranService.getEveningLesson(userId)
  3. Для каждого аята: text = await QuranService.getAyahText(surah, ayah)
  4. setAyahs(ayahsWithText)

onComplete:
  1. await QuranService.completeLesson(userId, ayahs.filter(!is_basmala))
  2. if surah_completed → navigate to SurahCompleted screen
  3. else → show Alert("+N очков") → navigate back

playAudio(url):
  1. await soundRef.current?.unloadAsync()
  2. const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true })
  3. soundRef.current = sound
  4. setPlayingKey(ayah.key)  // устанавливать ПОСЛЕ создания звука
```

UI на каждый аят:
- Если `is_basmala` → показать "بسم الله الرحمن الرحيم" без номера
- Иначе → Арабский текст (шрифт Amiri, размер 24-28sp, RTL)
- Транслитерация (мелкий шрифт, курсив)
- Кнопка "Слушать ▶" → воспроизвести `audio_url`

### 4.2 — review.tsx (Утреннее повторение)

Логика:
```
useEffect:
  1. review = await QuranService.getMorningReview(userId)
  2. if review.mode === 'panel_a': загрузить тексты для all_ayahs
  3. if review.mode === 'panel_b': загрузить тексты для yesterday_ayahs и block_ayahs

Panel A UI:
  - Кнопка "Слушать все подряд" → воспроизвести все аяты последовательно
  - Список всех аятов (арабский + транслитерация, без play-кнопок)
  - Кнопка "✅ Повторил все аяты" внизу → completeReview()

Panel B UI:
  - Раздел 1: "Вчерашние аяты" + кнопка "Слушать"
  - Разделитель
  - Раздел 2: "Блок N (аяты X-Y)" + кнопка "Слушать"
  - Кнопка "✅ Повторил все аяты" внизу → completeReview()

playSequentially(ayahs):
  for (const ayah of ayahs) {
    const { sound } = await Audio.Sound.createAsync({ uri: ayah.audio_url }, { shouldPlay: true });
    await new Promise(resolve => {
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) { sound.unloadAsync(); resolve(); }
      });
    });
  }
```

### 4.3 — quran.tsx (Главный экран / Дашборд)

Показывать:
- Имя суры + номер
- Фаза: "Начало / Середина / Финиш" (based on learned_count)
- Прогресс-бар: `learned / total_in_surah * 100%`
- Кнопка "🌙 Вечерний урок" → navigate('/quran/lesson')
- Кнопка "☀️ Утреннее повторение" → navigate('/quran/review')
- Кнопка "Сменить суру" → navigate('/quran/settings')

Если программы нет:
- Начальный экран: "Учи 2 аята в день. Повторяй каждое утро."
- Кнопка "Выбрать суру"

---

## ШАГ 5 — FRONTEND: Выбор суры (SurahSelector)

Создать экран `/app/quran/settings.tsx` или добавить в существующий:

```
useEffect:
  surahs = await fetch(`${API}/api/quran/surahs`)

UI:
  FlatList с сурами: номер + название
  По нажатию → startProgram(userId, surahNumber) → navigate to quran dashboard
```

---

## ШАГ 6 — ПРОВЕРКА ЗАВИСИМОСТЕЙ

### В backend/requirements.txt убедиться что есть:
```
httpx>=0.24.0   # для запросов к alquran.cloud API
```

Установить если нет:
```bash
pip install httpx
```

### Как использовать Supabase в новых эндпоинтах

В `server.py` уже есть `supabase_client`. Новые хифз-эндпоинты используют прямые вызовы через Python Supabase SDK:

```python
from supabase import create_client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)
```

> **ВАЖНО**: Проверить `.env` файл бэкенда — там должны быть `SUPABASE_URL` и `SUPABASE_SERVICE_KEY` (не anon key — иначе RLS заблокирует).

---

## ИТОГОВАЯ СХЕМА РАБОТЫ СИСТЕМЫ

```
Пользователь открывает экран Хифз
         ↓
quran.tsx → GET /api/quran/program/{userId}
         ↓
  Нет программы → экран выбора суры
  Есть программа → дашборд с прогрессом

Нажимает "Вечерний урок"
         ↓
lesson.tsx → GET /api/quran/lesson/evening/{userId}
           → GET /api/quran/ayah/{s}/{a} (для каждого аята)
           → UI: арабский текст + транслитерация + кнопка Слушать
           → Нажал "Выучил" → POST /api/quran/lesson/complete

Нажимает "Утреннее повторение"
         ↓
review.tsx → GET /api/quran/review/morning/{userId}
           → mode=panel_a: все аяты сплошным списком + одна кнопка Слушать
           → mode=panel_b: вчерашние аяты + блок 25 аятов
           → Нажал "Повторил" → POST /api/quran/review/complete
```

---

## ПРИОРИТЕТ РЕАЛИЗАЦИИ

| Порядок | Шаг | Время | Сложность |
|---------|-----|-------|-----------|
| 1 | SQL в Supabase | 5 мин | Низкая |
| 2 | Бэкенд эндпоинты в server.py | 2-3 часа | Средняя |
| 3 | Обновить QuranService.ts | 30 мин | Низкая |
| 4 | Обновить lesson.tsx | 1 час | Средняя |
| 5 | Обновить review.tsx (Panel A/B) | 1-2 часа | Высокая |
| 6 | Обновить quran.tsx (дашборд) | 30 мин | Низкая |
| 7 | Создать SurahSelector экран | 30 мин | Низкая |

**Итого**: ~6-8 часов разработки при чётком следовании этому руководству.

---

## ИЗВЕСТНЫЕ ПОДВОДНЫЕ КАМНИ

1. **telegram_id vs user_id** — Текущий Tazakkur использует `telegram_id` (integer) во многих местах. Новая схема хифза использует `user_id` (Supabase UUID). Не смешивать!

2. **Аудио Abdul Basit vs Husary** — Донор использует `Abdul_Basit_Murattal_192kbps`, текущий QuranService.ts использует `Husary_128kbps`. Выбрать один CDN и использовать везде. Рекомендую оставить `everyayah.com/data/Abdul_Basit_Murattal_192kbps/` как в доноре.

3. **Числа суры/аята в URL** — всегда padStart(3, '0'): сура 2, аят 5 → `002005.mp3`

4. **React Native ≠ React web** — HTML `<Audio>` не работает в RN. Использовать `expo-av` (`Audio.Sound.createAsync`). Этот сервис уже есть в lesson.tsx текущего приложения.

5. **httpx в Railway** — Добавить в `requirements.txt`, иначе бэкенд упадёт при запросе к alquran.cloud.

6. **Panel B (ротация блоков)** — Блок меняется раз в день. Если пользователь открыл приложение дважды в один день — ротации не будет. Это правильное поведение.

---

*Документ создан на основе анализа репозитория cairomahad/Isa*
*Последнее обновление: Март 2026*
