-- ════════════════════════════════════════════════════
-- UMMA MIGRATION — запустить в Supabase SQL Editor
-- ════════════════════════════════════════════════════

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

CREATE TABLE IF NOT EXISTS umma_likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID REFERENCES umma_posts(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS umma_reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID REFERENCES umma_posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE umma_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE umma_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE umma_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select" ON umma_posts;
DROP POLICY IF EXISTS "posts_insert" ON umma_posts;
DROP POLICY IF EXISTS "posts_delete" ON umma_posts;
DROP POLICY IF EXISTS "likes_all"    ON umma_likes;
DROP POLICY IF EXISTS "reports_all"  ON umma_reports;

CREATE POLICY "posts_select" ON umma_posts FOR SELECT USING (NOT is_hidden);
CREATE POLICY "posts_insert" ON umma_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "posts_delete" ON umma_posts FOR DELETE USING (true);
CREATE POLICY "posts_update" ON umma_posts FOR UPDATE USING (true);
CREATE POLICY "likes_all"    ON umma_likes   FOR ALL   USING (true) WITH CHECK (true);
CREATE POLICY "reports_all"  ON umma_reports FOR ALL   USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_umma_posts_created ON umma_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_umma_posts_user    ON umma_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_umma_likes_post    ON umma_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_umma_likes_user    ON umma_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_umma_reports_post  ON umma_reports(post_id);
