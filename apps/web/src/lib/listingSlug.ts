/**
 * SEO-friendly slug utilities for property listings.
 *
 * Format:  {listing_type}-{room_type}-{stk-xxxx}
 * Example: for-rent-studio-stk-0006
 *          for-sale-2-bedroom-stk-0042
 *          for-rent-sale-penthouse-stk-0100
 *
 * The STK-XXXX portion is always at the end so we can extract
 * the DB ID from any slug format without a DB lookup.
 */

const ROOM_TYPE_SLUGS: Record<string, string> = {
  Studio:    'studio',
  '1BR':     '1-bedroom',
  '2BR':     '2-bedroom',
  '3BR':     '3-bedroom',
  Penthouse: 'penthouse',
}

const LISTING_TYPE_SLUGS: Record<string, string> = {
  rent: 'for-rent',
  sale: 'for-sale',
  both: 'for-rent-sale',
}

/** Build a SEO slug from stock fields */
export function buildListingSlug(stock: {
  id: string
  room_type?: string | null
  listing_type?: string | null
}): string {
  const parts: string[] = []

  const lt = stock.listing_type ?? 'rent'
  parts.push(LISTING_TYPE_SLUGS[lt] ?? 'for-rent')

  const rt = stock.room_type ? (ROOM_TYPE_SLUGS[stock.room_type] ?? stock.room_type.toLowerCase().replace(/\s+/g, '-')) : null
  if (rt) parts.push(rt)

  parts.push(stock.id.toLowerCase()) // stk-0006

  return parts.join('-')
}

/** Extract the STK-XXXX ID from a slug (or pass through if already an ID) */
export function extractListingId(slug: string): string {
  // Match STK-XXXX anywhere in the slug (case-insensitive)
  const match = slug.match(/\bstk-\d+\b/i)
  if (match) return match[0].toUpperCase() // → STK-0006
  // Fallback — treat the whole slug as the ID (backwards compat)
  return slug.toUpperCase()
}
