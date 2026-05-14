import { createClient } from '@/lib/supabase/client'

// Upload a Blob to a public bucket and return the public URL.
// Optionally deletes oldPath first (for overwrites).
export async function uploadPublic(
  bucket: string,
  path: string,
  blob: Blob,
  oldPath?: string,
): Promise<string> {
  const supabase = createClient()
  if (oldPath) {
    await supabase.storage.from(bucket).remove([oldPath])
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error || !data) throw new Error(error?.message ?? 'upload failed')
  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
}

// Upload a Blob to a private bucket; returns the storage path (not a URL).
// Use getSignedDocumentUrl (server action) to create a temporary signed URL for display.
export async function uploadPrivate(
  bucket: string,
  path: string,
  blob: Blob,
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: 'image/webp', upsert: true })
  if (error || !data) throw new Error(error?.message ?? 'upload failed')
  return data.path
}

export async function deleteStorageFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(bucket).remove([path])
}

// Extract the storage path from a Supabase public URL.
// e.g. "https://…/storage/v1/object/public/stock-photos/STK-001/123-main.webp"
//   → "STK-001/123-main.webp"
export function extractStoragePath(publicUrl: string): string | null {
  try {
    const { pathname } = new URL(publicUrl)
    const match = pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}
