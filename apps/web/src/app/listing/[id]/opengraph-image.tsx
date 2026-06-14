import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'
import { extractListingId } from '@/lib/listingSlug'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawSlug } = await params
  const id = extractListingId(rawSlug)
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('stock')
    .select(`
      photo_urls, photo_thumb_urls,
      project_name, room_type, unit_no,
      listing_type, rent_price, sale_price,
      project:projects(name_th, district, province)
    `)
    .eq('id', id)
    .single()

  const photoUrl = data?.photo_urls?.[0] ?? null

  // Build text overlays
  const d = data as {
    project_name?: string | null
    room_type?: string | null
    unit_no?: string | null
    listing_type?: string | null
    rent_price?: number | null
    sale_price?: number | null
    project?: { name_th?: string | null; district?: string | null; province?: string | null } | null
  } | null

  const projectName = d?.project?.name_th ?? d?.project_name ?? null
  const unitText = d?.unit_no ? `ยูนิต ${d.unit_no}` : null
  const headline = [projectName, unitText].filter(Boolean).join(' · ') || 'ทรัพย์สินที่น่าสนใจ'

  const isRent = d?.listing_type !== 'sale'
  const isSale = d?.listing_type !== 'rent'
  const priceText = isRent && d?.rent_price
    ? `เช่า ฿${fmt(d.rent_price)}/เดือน`
    : isSale && d?.sale_price
      ? `ขาย ฿${fmt(d.sale_price)}`
      : null

  const location = [d?.project?.district, d?.project?.province].filter(Boolean).join(', ')

  const ROOM_TYPE_LABELS: Record<string, string> = {
    Studio: 'Studio', '1BR': '1 ห้องนอน', '2BR': '2 ห้องนอน', '3BR': '3 ห้องนอน', Penthouse: 'Penthouse',
  }
  const roomLabel = d?.room_type ? (ROOM_TYPE_LABELS[d.room_type] ?? d.room_type) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          background: '#0f172a',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Property photo — full bleed */}
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        {/* Gradient overlay — strong at bottom for text legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: photoUrl
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.88) 100%)'
              : 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
            display: 'flex',
          }}
        />

        {/* Content block — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 52px 44px 52px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            {isRent && (
              <div style={{ background: 'rgba(59,130,246,0.9)', borderRadius: 6, padding: '4px 12px', color: 'white', fontSize: 18, fontWeight: 700 }}>
                เช่า
              </div>
            )}
            {isSale && d?.listing_type !== 'rent' && (
              <div style={{ background: 'rgba(22,163,74,0.9)', borderRadius: 6, padding: '4px 12px', color: 'white', fontSize: 18, fontWeight: 700 }}>
                ขาย
              </div>
            )}
            {roomLabel && (
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 6, padding: '4px 12px', color: 'white', fontSize: 18, fontWeight: 600 }}>
                {roomLabel}
              </div>
            )}
          </div>

          {/* Headline */}
          <div style={{ color: 'white', fontSize: 42, fontWeight: 800, lineHeight: 1.2, maxWidth: 900 }}>
            {headline}
          </div>

          {/* Price */}
          {priceText && (
            <div style={{ color: '#60a5fa', fontSize: 32, fontWeight: 700 }}>
              {priceText}
            </div>
          )}

          {/* Location */}
          {location && (
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>
              📍 {location}
            </div>
          )}
        </div>

        {/* Branding — top right */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: 44,
            background: 'rgba(37,99,235,0.92)',
            borderRadius: 10,
            padding: '8px 20px',
            color: 'white',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '-0.3px',
            display: 'flex',
          }}
        >
          Proppsy
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
