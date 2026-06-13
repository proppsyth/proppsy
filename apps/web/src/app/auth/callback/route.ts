import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    console.warn('[auth/callback] no code param — redirecting to /login')
    return NextResponse.redirect(`${origin}/login`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
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

  console.log('[auth/callback] exchangeCodeForSession:', {
    ok: !error,
    error: error?.message,
    userId: data.user?.id,
    email: data.user?.email,
    provider: data.user?.app_metadata?.provider,
  })

  if (error || !data.user) {
    console.error('[auth/callback] session exchange failed:', error?.message)
    return NextResponse.redirect(`${origin}/login`)
  }

  const admin = await createAdminClient()

  // ── Google profile sync ──────────────────────────────────────────
  if (data.user.app_metadata?.provider === 'google') {
    const meta = data.user.user_metadata ?? {}
    const { data: existingProfile, error: profileErr } = await admin
      .from('profiles')
      .select('name, auth_provider, account_status')
      .eq('id', data.user.id)
      .single()

    console.log('[auth/callback] google profile lookup:', {
      found: !!existingProfile,
      profileError: profileErr?.message,
      auth_provider: existingProfile?.auth_provider,
      account_status: existingProfile?.account_status,
    })

    const updates: Record<string, string | null> = {
      auth_provider: 'google',
      avatar_url: (meta.picture as string) || (meta.avatar_url as string) || null,
    }

    // First sync only: populate name from Google if not already set
    if (existingProfile?.auth_provider !== 'google' && !existingProfile?.name) {
      const googleName = (meta.full_name || meta.name) as string | undefined
      if (googleName) updates.name = googleName
    }

    const { error: syncErr } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', data.user.id)

    if (syncErr) {
      console.error('[auth/callback] profile sync failed:', syncErr.message)
    }
  }

  // ── Consent + approval check ─────────────────────────────────────
  const { data: profile, error: consentErr } = await admin
    .from('profiles')
    .select('accepted_terms_at, account_status, deleted_at')
    .eq('id', data.user.id)
    .single()

  console.log('[auth/callback] consent check:', {
    profileError: consentErr?.message,
    account_status: profile?.account_status,
    hasConsent: !!profile?.accepted_terms_at,
    userId: data.user.id,
  })

  // Deactivated accounts are blocked at the gate — regardless of consent or approval status
  if (profile?.deleted_at) {
    console.warn('[auth/callback] → account deactivated, redirecting to /login', { userId: data.user.id })
    return NextResponse.redirect(`${origin}/login`)
  }

  // No consent yet → send to consent page
  if (!profile?.accepted_terms_at) {
    const dest = `${origin}/consent?next=${encodeURIComponent(next)}`
    console.log('[auth/callback] → consent required, redirecting to', dest)
    return NextResponse.redirect(dest)
  }

  // Consent done but still pending.
  if (profile.account_status === 'pending') {
    // Pending users CAN access the dashboard — they just can't publish listings or
    // create contracts until admin approves. Check if profile info is missing first.
    const { data: fullProfile } = await admin
      .from('profiles')
      .select('auth_provider, phone, national_id')
      .eq('id', data.user.id)
      .single()

    if (
      fullProfile?.auth_provider === 'google' &&
      (!fullProfile?.phone || !fullProfile?.national_id)
    ) {
      // Google user hasn't filled in required profile info yet — send to setup page.
      console.log('[auth/callback] → Google pending user missing profile, redirecting to /profile/setup')
      return NextResponse.redirect(`${origin}/profile/setup`)
    }
    // Profile complete — let them into the dashboard.
    console.log('[auth/callback] → pending user with complete profile, redirecting to dashboard')
  }

  if (profile.account_status === 'rejected') {
    console.warn('[auth/callback] → account rejected, redirecting to /login')
    return NextResponse.redirect(`${origin}/login`)
  }

  const dest = `${origin}${next}`
  console.log('[auth/callback] → redirecting to', dest)
  return NextResponse.redirect(dest)
}
