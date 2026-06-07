-- 040: website_videos table for CMS-managed promotional/tutorial videos
CREATE TABLE IF NOT EXISTS website_videos (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT        NOT NULL,
  title_en     TEXT,
  youtube_url  TEXT        NOT NULL,
  description  TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  featured     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE website_videos ENABLE ROW LEVEL SECURITY;

-- Public read (active only)
CREATE POLICY "public read active videos"
  ON website_videos FOR SELECT
  USING (is_active = TRUE);

-- Admin full access via service role (no RLS bypass needed; service role ignores RLS)
