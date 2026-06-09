/**
 * Extracts an 11-character YouTube video ID from any standard YouTube URL format:
 *   https://youtu.be/VIDEO_ID
 *   https://youtu.be/VIDEO_ID?si=...
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtube.com/watch?v=VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url.trim())
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0] ?? ''
      return id.length === 11 ? id : null
    }
    if (u.hostname.endsWith('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v && v.length === 11) return v
      const parts = u.pathname.split('/')
      const idx = parts.findIndex(p => p === 'embed' || p === 'shorts')
      if (idx !== -1) {
        const id = parts[idx + 1] ?? ''
        return id.length === 11 ? id : null
      }
    }
  } catch {
    // not a valid URL — fall back to regex
  }
  const match = url.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0`
}
