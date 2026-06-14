/**
 * SEO-friendly slug utilities for property listings.
 *
 * Format:  {listing_type}-{room_type}-{project_name}-{stk-xxxx}
 * Example: for-rent-studio-the-address-chidlom-stk-0006
 *          for-sale-2-bedroom-rhythm-sukhumvit-stk-0042
 *          for-rent-sale-penthouse-stk-0100  (no project name if Thai-only)
 *
 * Rules:
 *  - Project name is slugified from ASCII characters only (Thai stripped).
 *    If the name is entirely Thai (no ASCII left), it is omitted gracefully.
 *  - STK-XXXX always at the end — extractListingId() can recover the DB ID
 *    from any slug format without a DB lookup.
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

/** Slugify a project name — keeps only ASCII alphanumerics, strips Thai */
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    // Replace Thai and other non-ASCII with a space
    .replace(/[^\x00-\x7F]+/g, ' ')
    // Keep alphanumeric and spaces/hyphens only
    .replace(/[^a-z0-9\s-]/g, '')
    // Collapse whitespace → hyphens
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Build a SEO slug from stock fields */
export function buildListingSlug(stock: {
  id: string
  room_type?: string | null
  listing_type?: string | null
  project_name?: string | null
}): string {
  const parts: string[] = []

  const lt = stock.listing_type ?? 'rent'
  parts.push(LISTING_TYPE_SLUGS[lt] ?? 'for-rent')

  const rt = stock.room_type
    ? (ROOM_TYPE_SLUGS[stock.room_type] ?? stock.room_type.toLowerCase().replace(/\s+/g, '-'))
    : null
  if (rt) parts.push(rt)

  // Include project name if it has meaningful ASCII content (e.g. English names)
  if (stock.project_name) {
    const nameSlug = slugifyName(stock.project_name)
    if (nameSlug.length >= 2) parts.push(nameSlug)
  }

  parts.push(stock.id.toLowerCase()) // stk-0006

  return parts.join('-')
}

/** Extract the STK-XXXX ID from a slug (or pass through if already an ID) */
export function extractListingId(slug: string): string {
  const match = slug.match(/\bstk-\d+\b/i)
  if (match) return match[0].toUpperCase() // → STK-0006
  return slug.toUpperCase()
}
