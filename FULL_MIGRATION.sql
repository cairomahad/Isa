-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║         TAZAKKUR — ПОЛНАЯ МИГРАЦИЯ БАЗЫ ДАННЫХ                          ║
-- ║   Вставить В: Supabase → SQL Editor → New query → Run                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝


-- ════════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ 1 — НЕДОСТАЮЩИЕ КОЛОНКИ В СУЩЕСТВУЮЩИХ ТАБЛИЦАХ
-- ════════════════════════════════════════════════════════════════════════════

-- ── Таблица users ──────────────────────────────────────────────────────────
-- Колонка points — очки пользователя (начисляются за уроки, хомворки, зикр)
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Колонка role — роль пользователя: 'student' или 'admin'
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- Колонка app_user_id — UUID из Supabase Auth (для OAuth-входа через Supabase)
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_user_id UUID;

-- Колонка notifications_enabled — включены ли пуш-уведомления
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- Колонка city — выбранный город пользователя в профиле приложения
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;


-- ── Таблица homework_tasks ────────────────────────────────────────────────
-- Бэкенд ищет задания по lesson_id, но таблица использует video_id
-- Добавляем lesson_id как алиас / синоним video_id
ALTER TABLE homework_tasks ADD COLUMN IF NOT EXISTS lesson_id TEXT;
-- Обновить существующие записи: lesson_id = video_id
UPDATE homework_tasks SET lesson_id = video_id::TEXT WHERE lesson_id IS NULL;

-- Добавить недостающие поля заданий
ALTER TABLE homework_tasks ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Домашнее задание';
ALTER TABLE homework_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE homework_tasks ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE homework_tasks ADD COLUMN IF NOT EXISTS max_audio_duration INTEGER DEFAULT 300;


-- ── Таблица homeworks (сданные ДЗ студентов) ──────────────────────────────
-- Бэкенд вставляет homework_id (ID задания), но таблица хранит video_id
ALTER TABLE homeworks ADD COLUMN IF NOT EXISTS homework_id TEXT;
-- Бэкенд вставляет audio_file_id, но таблица хранит voice_file_id
ALTER TABLE homeworks ADD COLUMN IF NOT EXISTS audio_file_id TEXT;
-- Бэкенд вставляет submitted_at
ALTER TABLE homeworks ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
-- user_id UUID — приложение идентифицирует пользователей по UUID, не telegram_id
ALTER TABLE homeworks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
-- Комментарий учителя
ALTER TABLE homeworks ADD COLUMN IF NOT EXISTS teacher_comment TEXT;


-- ── Таблица zikr_list ─────────────────────────────────────────────────────
-- Добавить недостающие колонки для полноценного отображения зикров
ALTER TABLE zikr_list ADD COLUMN IF NOT EXISTS arabic TEXT;
ALTER TABLE zikr_list ADD COLUMN IF NOT EXISTS transliteration TEXT;
ALTER TABLE zikr_list ADD COLUMN IF NOT EXISTS goal INTEGER DEFAULT 33;
ALTER TABLE zikr_list ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 5;
ALTER TABLE zikr_list ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'
    CHECK (category IN ('morning', 'evening', 'general'));
ALTER TABLE zikr_list ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;


-- ════════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ 2 — НОВЫЕ ТАБЛИЦЫ
-- ════════════════════════════════════════════════════════════════════════════

-- ── Таблица zikr_progress ─────────────────────────────────────────────────
-- Ежедневный прогресс пользователя по каждому зикру
CREATE TABLE IF NOT EXISTS zikr_progress (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  zikr_id     UUID REFERENCES zikr_list(id) ON DELETE CASCADE,
  count       INTEGER DEFAULT 0,
  completed   BOOLEAN DEFAULT false,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, zikr_id, date)
);

CREATE INDEX IF NOT EXISTS idx_zikr_progress_user  ON zikr_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_zikr_progress_date  ON zikr_progress(date);


-- ── Таблица achievements ──────────────────────────────────────────────────
-- Определения достижений (бейджей) приложения
CREATE TABLE IF NOT EXISTS achievements (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key           TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  icon          TEXT DEFAULT '🏆',
  points_reward INTEGER DEFAULT 0,
  category      TEXT DEFAULT 'general',
  created_at    TIMESTAMPTZ DEFAULT now()
);


-- ── Таблица user_achievements ─────────────────────────────────────────────
-- Выданные пользователям достижения
CREATE TABLE IF NOT EXISTS user_achievements (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ach_user ON user_achievements(user_id);


-- ── Таблица umma_posts ────────────────────────────────────────────────────
-- Публикации в социальной сети «Умма»
CREATE TABLE IF NOT EXISTS umma_posts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT DEFAULT 'text' CHECK (type IN ('text','quote','question')),
  body         TEXT NOT NULL,
  arabic_text  TEXT,
  source       TEXT,
  likes_count  INTEGER DEFAULT 0,
  is_hidden    BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_umma_posts_created ON umma_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_umma_posts_user    ON umma_posts(user_id);


-- ── Таблица umma_likes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS umma_likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES umma_posts(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_umma_likes_post ON umma_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_umma_likes_user ON umma_likes(user_id);


-- ── Таблица umma_reports ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS umma_reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID REFERENCES umma_posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_umma_reports_post ON umma_reports(post_id);


-- ════════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ 3 — ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE zikr_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE umma_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE umma_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE umma_reports    ENABLE ROW LEVEL SECURITY;

-- zikr_progress — открыт для чтения/записи через сервис
CREATE POLICY IF NOT EXISTS "zikr_progress_all" ON zikr_progress FOR ALL USING (true) WITH CHECK (true);

-- achievements — только чтение для всех
CREATE POLICY IF NOT EXISTS "achievements_select" ON achievements FOR SELECT USING (true);

-- user_achievements — только чтение для всех, запись через сервис
CREATE POLICY IF NOT EXISTS "user_ach_select" ON user_achievements FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "user_ach_insert" ON user_achievements FOR INSERT WITH CHECK (true);

-- umma_posts — чтение только не-скрытых постов
DROP POLICY IF EXISTS "posts_select" ON umma_posts;
DROP POLICY IF EXISTS "posts_insert" ON umma_posts;
DROP POLICY IF EXISTS "posts_delete" ON umma_posts;
DROP POLICY IF EXISTS "posts_update" ON umma_posts;

CREATE POLICY "posts_select" ON umma_posts FOR SELECT USING (NOT is_hidden);
CREATE POLICY "posts_insert" ON umma_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "posts_delete" ON umma_posts FOR DELETE USING (true);
CREATE POLICY "posts_update" ON umma_posts FOR UPDATE USING (true);

-- umma_likes, umma_reports — открыт для всех через сервис
DROP POLICY IF EXISTS "likes_all"   ON umma_likes;
DROP POLICY IF EXISTS "reports_all" ON umma_reports;

CREATE POLICY "likes_all"    ON umma_likes   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "reports_all"  ON umma_reports FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ 4 — НАЧАЛЬНЫЕ ДАННЫЕ (SEED)
-- ════════════════════════════════════════════════════════════════════════════

-- ── Зикры (zikr_list) ────────────────────────────────────────────────────
-- Обновить существующие записи или вставить новые
INSERT INTO zikr_list (id, text_ru, arabic, transliteration, goal, reward_points, category, sort_order, created_at)
VALUES
  (gen_random_uuid(), 'Субханаллах — Пречист Аллах', 'سُبْحَانَ اللهِ', 'Subhanallah', 33, 5, 'general', 1, now()),
  (gen_random_uuid(), 'Альхамдулиллях — Хвала Аллаху', 'الْحَمْدُ لِلهِ', 'Alhamdulillah', 33, 5, 'general', 2, now()),
  (gen_random_uuid(), 'Аллаху Акбар — Аллах Велик', 'اللهُ أَكْبَرُ', 'Allahu Akbar', 33, 5, 'general', 3, now()),
  (gen_random_uuid(), 'Ля иляха илляллах — Нет бога кроме Аллаха', 'لَا إِلَهَ إِلَّا اللهُ', 'La ilaha illallah', 100, 10, 'general', 4, now()),
  (gen_random_uuid(), 'АстагфируЛлах — Прошу прощения у Аллаха', 'أَسْتَغْفِرُ اللهَ', 'Astaghfirullah', 100, 10, 'general', 5, now()),
  (gen_random_uuid(), 'Субханаллахи ва бихамдихи — Пречист Аллах и хвала Ему', 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', 'Subhanallahi wa bihamdihi', 100, 10, 'morning', 6, now()),
  (gen_random_uuid(), 'Субханаллахи ва бихамдихи субханаллахиль-азым', 'سُبْحَانَ اللهِ وَبِحَمْدِهِ سُبْحَانَ اللهِ الْعَظِيمِ', 'Subhanallahi wa bihamdihi subhanallahil-azim', 10, 15, 'morning', 7, now()),
  (gen_random_uuid(), 'Хасбияллаху ля иляха илля ху — достаточно мне Аллаха', 'حَسْبِيَ اللهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ', 'Hasbiyallahu la ilaha illa hu', 7, 10, 'morning', 8, now()),
  (gen_random_uuid(), 'Аллахумма салли ала Мухаммад — салават', 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', 'Allahumma salli ala Muhammad', 10, 10, 'general', 9, now()),
  (gen_random_uuid(), 'Ля хавля валя куввата илля биллях — нет силы кроме Аллаха', 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ', 'La hawla wa la quwwata illa billah', 10, 10, 'evening', 10, now())
ON CONFLICT DO NOTHING;


-- ── Достижения (achievements) ─────────────────────────────────────────────
INSERT INTO achievements (key, title, description, icon, points_reward, category)
VALUES
  ('first_lesson',      'Первый шаг',         'Пройдите первый урок',                          '📖', 10,  'lessons'),
  ('lessons_10',        'Прилежный студент',   'Пройдите 10 уроков',                            '🎓', 50,  'lessons'),
  ('lessons_50',        'Знаток',              'Пройдите 50 уроков',                            '🏆', 200, 'lessons'),
  ('first_homework',    'Первое задание',      'Сдайте первое домашнее задание',                '📝', 15,  'homework'),
  ('homework_10',       'Трудолюбивый',        'Сдайте 10 домашних заданий',                   '💪', 75,  'homework'),
  ('zikr_100',          'Поминающий Аллаха',   'Прочитайте зикр 100 раз за один день',          '📿', 20,  'zikr'),
  ('zikr_1000',         'Усердный',            'Прочитайте зикр 1000 раз суммарно',             '✨', 100, 'zikr'),
  ('quran_start',       'Хафиз — начало пути', 'Начните программу хифза Корана',                '🌙', 25,  'quran'),
  ('quran_juz',         'Хифз Джуза',          'Запомните один Джуз Корана',                    '🌟', 500, 'quran'),
  ('first_post',        'Голос уммы',          'Опубликуйте первый пост в соц. сети',           '💬', 10,  'umma'),
  ('post_10_likes',     'Популярный',          'Получите 10 лайков на один пост',               '❤️', 30,  'umma'),
  ('streak_7',          'Неделя без перерыва', 'Заходите в приложение 7 дней подряд',           '🔥', 50,  'streak'),
  ('streak_30',         'Месяц упорства',      'Заходите в приложение 30 дней подряд',          '💎', 200, 'streak')
ON CONFLICT (key) DO NOTHING;


-- ── Тестовые публикации в Умма ────────────────────────────────────────────
-- ВАЖНО: Вставляем только если таблица umma_posts создана успешно
-- Используем ПЕРВОГО пользователя из таблицы users как автора
DO $$
DECLARE
  v_user_id UUID;
  v_user2   UUID;
  v_user3   UUID;
BEGIN
  -- Берём первых 3 пользователей
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;
  SELECT id INTO v_user2   FROM users ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO v_user3   FROM users ORDER BY created_at OFFSET 2 LIMIT 1;

  -- Если нет хотя бы одного пользователя — пропустить
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Нет пользователей — тестовые посты не созданы';
    RETURN;
  END IF;

  -- Если нет 2-го/3-го пользователя — использовать 1-го для всех
  IF v_user2 IS NULL THEN v_user2 := v_user_id; END IF;
  IF v_user3 IS NULL THEN v_user3 := v_user_id; END IF;

  -- Вставить тестовые посты (только если postов ещё нет)
  IF (SELECT COUNT(*) FROM umma_posts) = 0 THEN
    INSERT INTO umma_posts (user_id, type, body, arabic_text, source, likes_count, created_at)
    VALUES
      (v_user_id, 'quote',
       'Поистине, с каждым затруднением приходит облегчение. Аллах не возлагает на душу больше, чем она в силах вынести.',
       'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
       'Сура Аль-Инширах (94:6)',
       12,
       now() - interval '2 hours'),

      (v_user2, 'text',
       'Аль-хамдулиллях, сегодня завершил 5-й урок по шариату. Алгаритм обучения в этом приложении очень помогает структурировать знания. Рекомендую всем!',
       NULL, NULL, 8,
       now() - interval '5 hours'),

      (v_user3, 'question',
       'Братья и сёстры, подскажите — как правильно делать намерение перед омовением? Слышал разные мнения.',
       NULL, NULL, 5,
       now() - interval '1 day'),

      (v_user_id, 'quote',
       'Пророк ﷺ сказал: «Лучший из вас тот, кто изучает Коран и обучает ему других».',
       'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
       'Хадис. Бухари №5027',
       21,
       now() - interval '1 day 3 hours'),

      (v_user2, 'text',
       'Начал программу хифза Корана в этом приложении. Уже запомнил Суру Аль-Фатиха и первые аяты Аль-Бакара. Система повторений очень удобная, машааллах!',
       NULL, NULL, 15,
       now() - interval '2 days'),

      (v_user3, 'quote',
       'Пророк ﷺ сказал: «Поистине, Аллах доволен рабом, который съел кусок еды и воздал Ему хвалу, и выпил глоток воды и воздал Ему хвалу».',
       NULL,
       'Хадис. Муслим',
       9,
       now() - interval '3 days'),

      (v_user_id, 'text',
       'Напоминание себе и всем: не забывайте делать зикр утром и вечером. Это защита и источник спокойствия в сердце. Субханаллах, Альхамдулиллях, Аллаху Акбар — по 33 раза каждый.',
       NULL, NULL, 18,
       now() - interval '3 days 6 hours'),

      (v_user2, 'question',
       'Кто-нибудь знает хорошие книги на русском языке о правилах поста в Рамадан? Хочу подготовиться заранее.',
       NULL, NULL, 4,
       now() - interval '4 days'),

      (v_user3, 'quote',
       'Аллах сказал: «Я такой, каким считает Меня Мой раб, и Я с ним, когда он поминает Меня».',
       'أَنَا عِنْدَ ظَنِّ عَبْدِي بِي، وَأَنَا مَعَهُ إِذَا ذَكَرَنِي',
       'Хадис Кудси. Бухари, Муслим',
       27,
       now() - interval '5 days'),

      (v_user_id, 'text',
       'Машааллах! Сегодня впервые прочитал намаз Фаджр вовремя — до восхода солнца. Чувство удовлетворения непередаваемое. Аль-хамдулиллях за это благословение.',
       NULL, NULL, 33,
       now() - interval '6 days');

    RAISE NOTICE 'Тестовые посты (10 штук) успешно созданы!';
  ELSE
    RAISE NOTICE 'Посты уже существуют — пропускаем вставку.';
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ 5 — ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ЛИДЕРБОРДА
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INT DEFAULT 20)
RETURNS TABLE (
  user_id      UUID,
  display_name TEXT,
  zikr_count   INT,
  points       INT,
  rank         BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    id                          AS user_id,
    COALESCE(display_name, first_name, 'Студент') AS display_name,
    COALESCE(zikr_count, 0)    AS zikr_count,
    COALESCE(u.points, 0)      AS points,
    ROW_NUMBER() OVER (ORDER BY COALESCE(zikr_count, 0) DESC) AS rank
  FROM users u
  WHERE COALESCE(zikr_count, 0) > 0
  ORDER BY zikr_count DESC
  LIMIT p_limit;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- ИТОГО:
--   Изменены таблицы:  users, homework_tasks, homeworks, zikr_list
--   Созданы таблицы:   zikr_progress, achievements, user_achievements,
--                      umma_posts, umma_likes, umma_reports
--   Добавлены данные:  10 зикров, 13 достижений, 10 тестовых постов
--   Функция:           get_leaderboard()
-- ════════════════════════════════════════════════════════════════════════════
