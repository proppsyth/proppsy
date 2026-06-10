import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const admin = await createAdminClient()

      // ── Google profile sync ────────────────────────────────────
      if (data.user.app_metadata?.provider === 'google') {
        const meta = data.user.user_metadata ?? {}
        const { data: profile } = await admin
          .from('profiles')
          .select('name, auth_provider')
          .eq('id', data.user.id)
          .single()

        const updates: Record<string, string | null> = {
          auth_provider: 'google',
          // Always refresh avatar from Google
          avatar_url: (meta.picture as string) || (meta.avatar_url as string) || null,
        }

        // First sync only: populate name from Google if not already set
        if (profile?.auth_provider !== 'google' && !profile?.name) {
          const googleName = (meta.full_name || meta.name) as string | undefined
          if (googleName) updates.name = googleName
        }

        await admin.from('profiles').update(updates).eq('id', data.user.id)
      }

      // ── Consent check ──────────────────────────────────────────
      const { data: profile } = await admin
        .from('profiles')
        .select('accepted_terms_at')
        .eq('id', data.user.id)
        .single()

      if (!profile?.accepted_terms_at) {
        return NextResponse.redirect(`${origin}/consent?next=${encodeURIComponent(next)}`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
