-- ─────────────────────────────────────────────────────────────
-- 074: Allow PDF/DOCX in secure-documents (fix H2 upload failure)
-- ─────────────────────────────────────────────────────────────
-- After moving contract files into the private secure-documents bucket (H2),
-- uploads failed because the bucket only permitted images. Allow contract MIME
-- types and raise the size limit to 25 MB.
update storage.buckets
set allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    file_size_limit = 26214400
where id = 'secure-documents';
