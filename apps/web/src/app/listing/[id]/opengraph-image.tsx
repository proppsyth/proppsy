import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('stock')
    .select('photo_urls, photo_thumb_urls')
    .eq('id', id)
    .single()

  // Prefer large main photo for the 1200×630 canvas
  const photoUrl = data?.photo_urls?.[0] ?? null

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          background: '#0f172a',
        }}
      >
        {/* Property photo — full bleed */}
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Gradient overlay — darkens bottom third for branding legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: photoUrl
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.75) 100%)'
              : 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
            display: 'flex',
          }}
        />

        {/* Bottom-right branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              background: 'rgba(37,99,235,0.9)',
              borderRadius: 8,
              padding: '6px 16px',
              color: 'white',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.3px',
            }}
          >
            Proppsy
          </div>
        </div>

        {/* Placeholder text when no photo */}
        {!photoUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.15)',
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-1px',
            }}
          >
            Proppsy
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
