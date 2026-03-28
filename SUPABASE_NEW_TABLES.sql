-- ============================================
-- НОВЫЕ ТАБЛИЦЫ ДЛЯ TAZAKKUR
-- Выполните этот SQL в Supabase SQL Editor
-- ============================================

-- 1. ТАБЛИЦА ЗИКРОВ
CREATE TABLE IF NOT EXISTS zikr_items (
    id TEXT PRIMARY KEY,
    arabic TEXT NOT NULL,
    transliteration TEXT NOT NULL,
    translation TEXT NOT NULL,
    goal INTEGER NOT NULL DEFAULT 33,
    reward_points INTEGER NOT NULL DEFAULT 5,
    category TEXT NOT NULL DEFAULT 'daily',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Заполнение базовых зикров
INSERT INTO zikr_items (id, arabic, transliteration, translation, goal, reward_points, category) VALUES
('zikr_1', 'سُبْحَانَ اللهِ', 'Субханаллах', 'Пречист Аллах', 33, 5, 'daily'),
('zikr_2', 'الْحَمْدُ لِلَّهِ', 'Альхамдулиллях', 'Хвала Аллаху', 33, 5, 'daily'),
('zikr_3', 'اللهُ أَكْبَرُ', 'Аллаху Акбар', 'Аллах Велик', 34, 5, 'daily'),
('zikr_4', 'لَا إِلَٰهَ إِلَّا اللَّهُ', 'Ля иляха илляллах', 'Нет божества, кроме Аллаха', 100, 10, 'daily'),
('zikr_5', 'أَسْتَغْفِرُ اللهَ', 'Астагфируллах', 'Прошу прощения у Аллаха', 100, 10, 'daily'),
('zikr_6', 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', 'Ля хавля ва ля куввата илля биллях', 'Нет силы и мощи кроме как от Аллаха', 50, 8, 'morning'),
('zikr_7', 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', 'Субханаллахи ва бихамдихи', 'Пречист Аллах и хвала Ему', 100, 10, 'evening');

-- 2. ПРОГРЕСС ЗИКРА ПОЛЬЗОВАТЕЛЕЙ
CREATE TABLE IF NOT EXISTS zikr_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    zikr_id TEXT NOT NULL REFERENCES zikr_items(id),
    count INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, zikr_id, date)
);

-- 3. ВОПРОСЫ ТЕСТОВ
CREATE TABLE IF NOT EXISTS quiz_questions (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- массив строк
    correct_answer INTEGER NOT NULL, -- индекс правильного ответа
    points INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. ПОПЫТКИ ТЕСТОВ
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    passed BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP DEFAULT NOW()
);

-- 5. ДОСТИЖЕНИЯ
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL, -- emoji или URL иконки
    requirement_type TEXT NOT NULL, -- 'lessons_completed', 'points_earned', 'streak_days', 'quiz_passed'
    requirement_value INTEGER NOT NULL,
    points_reward INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Заполнение базовых достижений
INSERT INTO achievements (id, title, description, icon, requirement_type, requirement_value, points_reward) VALUES
('ach_1', 'Первые шаги', 'Завершите первый урок', '🎯', 'lessons_completed', 1, 10),
('ach_2', 'Ученик', 'Завершите 5 уроков', '📚', 'lessons_completed', 5, 30),
('ach_3', 'Знаток', 'Завершите 20 уроков', '🎓', 'lessons_completed', 20, 100),
('ach_4', 'Мастер', 'Завершите 50 уроков', '👑', 'lessons_completed', 50, 250),
('ach_5', 'Коллекционер баллов', 'Наберите 100 баллов', '⭐', 'points_earned', 100, 50),
('ach_6', 'Богатство знаний', 'Наберите 500 баллов', '💎', 'points_earned', 500, 150),
('ach_7', 'Отличник', 'Сдайте 10 тестов', '✅', 'quiz_passed', 10, 80);

-- 6. ДОСТИЖЕНИЯ ПОЛЬЗОВАТЕЛЕЙ
CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL REFERENCES achievements(id),
    unlocked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- 7. ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ
CREATE INDEX IF NOT EXISTS idx_zikr_progress_user ON zikr_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_zikr_progress_date ON zikr_progress(date);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson ON quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson ON quiz_questions(lesson_id);

-- ============================================
-- ГОТОВО! Теперь все новые таблицы созданы
-- ============================================
