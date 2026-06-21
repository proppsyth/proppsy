// Server-side storage cleanup (uses the service-role admin client).
// Used by delete/purge flows so removing a record also frees its files —
// no orphaned objects left behind in buckets.
import { createAdminClient } from '@/lib/supabase/server'

/** Extract the object path from a Supabase PUBLIC url for a given bucket. */
export function publicUrlToPath(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null
  const m = url.match(new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`))
  return m?.[1] ? decodeURIComponent(m[1]) : null
}

/** Best-effort removal of objects from a bucket. Never throws. */
export async function removeFromBucket(bucket: string, paths: (string | null | undefined)[]): Promise<void> {
  const clean = paths.filter((p): p is string => !!p)
  if (clean.length === 0) return
  try {
    const admin = await createAdminClient()
    await admin.storage.from(bucket).remove(clean)
  } catch {
    // Cleanup is best-effort — never block the primary delete on it.
  }
}

/** Remove a set of PUBLIC-url objects from a bucket (maps urls → paths first). */
export async function removePublicUrls(bucket: string, urls: (string | null | undefined)[]): Promise<void> {
  await removeFromBucket(bucket, urls.map(u => publicUrlToPath(u, bucket)))
}

const CONTRACT_BUCKET = 'secure-documents'
const isHttp = (v?: string | null) => !!v && /^https?:\/\//.test(v)

/**
 * Resolve a stored contract-file value to a usable URL.
 * New files are stored as private `secure-documents` paths → returns a short
 * signed URL. Legacy values that are already public http URLs pass through.
 */
export async function signContractFile(value: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  if (!value) return null
  if (isHttp(value)) return value
  try {
    const admin = await createAdminClient()
    const { data } = await admin.storage.from(CONTRACT_BUCKET).createSignedUrl(value, expiresIn)
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

/** Delete contract files: private paths from secure-documents, legacy http from documents. */
export async function removeContractFiles(values: (string | null | undefined)[]): Promise<void> {
  const paths: string[] = []
  const legacyDocs: (string | null)[] = []
  for (const v of values) {
    if (!v) continue
    if (isHttp(v)) legacyDocs.push(publicUrlToPath(v, 'documents'))
    else paths.push(v)
  }
  await removeFromBucket(CONTRACT_BUCKET, paths)
  await removeFromBucket('documents', legacyDocs)
}
