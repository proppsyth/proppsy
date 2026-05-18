import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('profiles')
    .select('avatar_url, logo_url')
    .eq('public_slug', slug)
    .eq('account_status', 'approved')
    .single()

  const avatarUrl = data?.avatar_url || data?.logo_url || null

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
        {/* Avatar as background (blurred treatment via opacity) */}
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
            opacity: avatarUrl ? 0.7 : 1,
            display: 'flex',
          }}
        />

        {/* Centered avatar circle */}
        {avatarUrl && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -60%)',
              width: 240,
              height: 240,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '6px solid rgba(255,255,255,0.2)',
              display: 'flex',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Bottom branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            right: 44,
            background: 'rgba(37,99,235,0.9)',
            borderRadius: 8,
            padding: '6px 16px',
            color: 'white',
            fontSize: 26,
            fontWeight: 700,
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
