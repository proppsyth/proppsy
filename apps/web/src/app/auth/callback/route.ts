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
    .select('accepted_terms_at, account_status')
    .eq('id', data.user.id)
    .single()

  console.log('[auth/callback] consent check:', {
    profileError: consentErr?.message,
    account_status: profile?.account_status,
    hasConsent: !!profile?.accepted_terms_at,
    userId: data.user.id,
  })

  // No consent yet → send to consent page
  if (!profile?.accepted_terms_at) {
    const dest = `${origin}/consent?next=${encodeURIComponent(next)}`
    console.log('[auth/callback] → consent required, redirecting to', dest)
    return NextResponse.redirect(dest)
  }

  // Recovery: consent timestamps exist but account_status is still 'pending'.
  // This happens when the saveConsent() approval update previously failed silently.
  // Fix it in-place so the user isn't stuck in a redirect loop.
  if (profile.account_status === 'pending') {
    console.warn('[auth/callback] recovery: approving pending user who already consented', {
      userId: data.user.id,
    })
    const { error: approveErr } = await admin
      .from('profiles')
      .update({ account_status: 'approved' })
      .eq('id', data.user.id)
      .eq('account_status', 'pending')
    if (approveErr) {
      console.error('[auth/callback] recovery approval failed:', approveErr.message)
    } else {
      console.log('[auth/callback] recovery: account approved successfully')
    }
  }

  if (profile.account_status === 'rejected') {
    console.warn('[auth/callback] → account rejected, redirecting to /login')
    return NextResponse.redirect(`${origin}/login`)
  }

  const dest = `${origin}${next}`
  console.log('[auth/callback] → redirecting to', dest)
  return NextResponse.redirect(dest)
}
