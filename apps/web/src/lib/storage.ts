/**
 * Supabase storage URL utilities.
 *
 * DB columns may contain:
 *   - full public URLs  → returned as-is after validation
 *   - storage-relative paths (bucket/path or just path) → resolved to full URL
 *   - null / undefined / empty string → returns null
 */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')

/**
 * Resolve a raw DB value into a valid absolute URL, or null.
 *
 * @param raw    - value from DB column (full URL, storage path, null, empty)
 * @param bucket - Supabase storage bucket name, used only when raw is a relative path
 */
export function getStorageUrl(
  raw: string | null | undefined,
  bucket = 'photos',
): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s) return null

  // Already an absolute URL — validate it parses correctly
  if (s.startsWith('https://') || s.startsWith('http://')) {
    try {
      new URL(s)
      return s
    } catch {
      return null
    }
  }

  // Treat as a storage-relative path and build the Supabase public URL
  if (!SUPABASE_URL) return null
  const cleanPath = s.replace(/^\//, '')
  const full = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`
  try {
    new URL(full)
    return full
  } catch {
    return null
  }
}

/** Returns true when getStorageUrl would return a non-null value. */
export function isValidStorageUrl(raw: string | null | undefined): raw is string {
  return getStorageUrl(raw) !== null
}
