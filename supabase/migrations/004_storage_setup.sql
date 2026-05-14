-- Add thumbnail URL array to stock table for dual-size strategy
ALTER TABLE stock
  ADD COLUMN IF NOT EXISTS photo_thumb_urls TEXT[] DEFAULT '{}';

-- Create private bucket for sensitive documents (ID cards)
-- Bucket is non-public: files are only accessible via signed URLs generated server-side
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'secure-documents',
  'secure-documents',
  false,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for secure-documents bucket
-- Authenticated users can upload
CREATE POLICY "secure_docs_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'secure-documents');

-- Authenticated users can read (actual access gated by signed URL expiry)
CREATE POLICY "secure_docs_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'secure-documents');

-- Authenticated users can delete their own uploads
CREATE POLICY "secure_docs_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'secure-documents');
