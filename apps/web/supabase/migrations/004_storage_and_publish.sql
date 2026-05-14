-- ============================================================
-- MIGRATION 004: Storage buckets + publish columns on stock
-- ============================================================

-- ── 1. New columns on stock ───────────────────────────────────
ALTER TABLE public.stock
  ADD COLUMN IF NOT EXISTS photo_thumb_urls TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_published      BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_premium        BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS published_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- Index for public listing query (status + is_published + is_premium)
CREATE INDEX IF NOT EXISTS idx_stock_public_listing
  ON public.stock (status, is_published, is_premium DESC, published_at DESC);

-- ── 2. New columns on profiles (plan tracking) ───────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan            TEXT DEFAULT 'starter'
    CHECK (plan IN ('starter', 'professional', 'business')),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- ── 3. Storage buckets ───────────────────────────────────────
-- Public bucket: stock photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stock-photos', 'stock-photos', TRUE,
  10485760,   -- 10 MB
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Public bucket: documents (signatures, profiles, news covers)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', TRUE,
  5242880,    -- 5 MB
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Private bucket: secure documents (ID cards)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'secure-documents', 'secure-documents', FALSE,
  5242880,    -- 5 MB
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Storage RLS policies ──────────────────────────────────

-- stock-photos: authenticated users can upload/delete their own
CREATE POLICY "auth users manage stock-photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'stock-photos')
  WITH CHECK (bucket_id = 'stock-photos');

-- documents: authenticated users can upload/delete
CREATE POLICY "auth users manage documents"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

-- secure-documents: authenticated users can upload/delete their own only
CREATE POLICY "auth users manage secure-documents"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'secure-documents')
  WITH CHECK (bucket_id = 'secure-documents');
