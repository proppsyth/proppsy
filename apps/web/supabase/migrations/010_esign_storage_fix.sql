-- ============================================================
-- PROPPSY — Migration 010: Fix E-Sign Storage Policies
-- วันที่: 15 พฤษภาคม 2026
-- ============================================================

-- Allow server-side uploads to the signatures bucket.
-- Security: uploads only happen through the submitSignature server action
-- which validates the sign token before calling storage.

CREATE POLICY IF NOT EXISTS "allow upload to signatures bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signatures');

CREATE POLICY IF NOT EXISTS "allow update signatures bucket"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'signatures')
  WITH CHECK (bucket_id = 'signatures');
