-- 045: Add admin write policies for website_videos
-- Fixes RLS error when admin tries to INSERT/UPDATE/DELETE via createAdminClient.

-- Admins can do everything (INSERT, UPDATE, DELETE, SELECT)
CREATE POLICY "website_videos_admin_all"
  ON public.website_videos
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
