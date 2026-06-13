/**
 * BannerZone — renders active banners for a given position from the database.
 *
 * Positions: home_top | listing_top | dashboard_top | listing_sidebar
 *
 * Usage (server component context):
 *   <BannerZone position="listing_top" />
 *
 * Renders nothing if no active banners exist for the position.
 */

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import BannerImage from '@/components/shared/BannerImage'

interface Banner {
  id: string
  title: string | null
  image_url: string | null
  link_url: string | null
  position: string
  sort_order: number
}

async function fetchBanners(position: string): Promise<Banner[]> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]!
  const { data } = await supabase
    .from('banners')
    .select('id, title, image_url, link_url, position, sort_order')
    .eq('position', position)
    .eq('is_active', true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('sort_order')
  return (data ?? []) as Banner[]
}

// ─── Horizontal strip (listing_top / dashboard_top) ───────────────────────────

export async function BannerStrip({ position }: { position: string }) {
  const banners = await fetchBanners(position)
  if (banners.length === 0) return null

  return (
    <div className="w-full">
      {banners.map(b => {
        if (!b.image_url) return null
        const img = <BannerImage src={b.image_url} alt={b.title ?? undefined} sizes="100vw" />
        return b.link_url ? (
          <Link key={b.id} href={b.link_url} target="_blank" rel="noopener noreferrer" className="block">
            {img}
          </Link>
        ) : (
          <div key={b.id}>{img}</div>
        )
      })}
    </div>
  )
}

// ─── Sidebar block (listing_sidebar) ─────────────────────────────────────────

export async function BannerSidebar({ position }: { position: string }) {
  const banners = await fetchBanners(position)
  if (banners.length === 0) return null

  return (
    <div className="space-y-3">
      {banners.map(b => {
        if (!b.image_url) return null
        const img = <BannerImage src={b.image_url} alt={b.title ?? undefined} sizes="300px" className="rounded-xl" />
        return b.link_url ? (
          <Link key={b.id} href={b.link_url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition">
            {img}
            {b.title && <p className="text-xs text-gray-400 mt-1 truncate">{b.title}</p>}
          </Link>
        ) : (
          <div key={b.id}>
            {img}
            {b.title && <p className="text-xs text-gray-400 mt-1 truncate">{b.title}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Generic default export (strip) ──────────────────────────────────────────

export default BannerStrip
