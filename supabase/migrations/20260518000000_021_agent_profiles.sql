-- ============================================================
-- 021: Agent Public Profile Fields + Avatars Bucket
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_slug  TEXT    UNIQUE,
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS show_phone   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_links JSONB   NOT NULL DEFAULT '{}';

-- Fast lookup by slug (partial index, ignores NULL rows)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_public_slug_idx
  ON public.profiles(public_slug)
  WHERE public_slug IS NOT NULL;

-- ── Avatars bucket (public, 2 MB limit) ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Public read (anyone can see avatars)
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Owners can only upload into their own folder ({user_id}/...)
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
