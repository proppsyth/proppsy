'use server'

import { createAdminClient } from '@/lib/supabase/server'

// Creates a time-limited signed URL for a file in a private bucket.
// Must run server-side — requires the service role key.
export async function getSignedDocumentUrl(
  bucket: string,
  storagePath: string,
  expiresIn = 3600,
): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn)
    if (error || !data) return { error: error?.message ?? 'signed URL failed' }
    return { url: data.signedUrl }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
