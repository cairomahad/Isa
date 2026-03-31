-- ==============================================================
-- ТАБЛИЦЫ ДЛЯ МОДУЛЯ ХИФЗ КОРАНА (новая версия, user_id UUID)
-- Выполнить в: https://supabase.com/dashboard/project/kmhhazpyalpjwspjxzry/editor
-- ==============================================================

-- Таблица 1: Программа заучивания пользователя
CREATE TABLE IF NOT EXISTS quran_hifz_program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  current_surah INTEGER NOT NULL DEFAULT 114 CHECK (current_surah >= 1 AND current_surah <= 114),
  current_ayah INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  evening_hour INTEGER DEFAULT 21,
  morning_hour INTEGER DEFAULT 7,
  last_lesson_date DATE,
  last_review_date DATE,
  current_block_index INTEGER DEFAULT 0,
  last_block_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quran_hifz_program_user ON quran_hifz_program(user_id);

-- Таблица 2: История выученных аятов
CREATE TABLE IF NOT EXISTS quran_hifz_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  surah INTEGER NOT NULL CHECK (surah >= 1 AND surah <= 114),
  ayah INTEGER NOT NULL,
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quran_hifz_progress_user ON quran_hifz_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quran_hifz_progress_surah ON quran_hifz_progress(user_id, surah);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quran_hifz_progress_unique ON quran_hifz_progress(user_id, surah, ayah);

-- RLS Политики
ALTER TABLE quran_hifz_program ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all hifz program" ON quran_hifz_program;
CREATE POLICY "Allow all hifz program" ON quran_hifz_program FOR ALL USING (true);

ALTER TABLE quran_hifz_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all hifz progress" ON quran_hifz_progress;
CREATE POLICY "Allow all hifz progress" ON quran_hifz_progress FOR ALL USING (true);

-- Проверка
SELECT 'quran_hifz_program OK' as status, COUNT(*) FROM quran_hifz_program;
SELECT 'quran_hifz_progress OK' as status, COUNT(*) FROM quran_hifz_progress;
