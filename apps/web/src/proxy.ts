import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// All agent workspace routes under (protected)/
const AGENT_PREFIXES = [
  '/dashboard',
  '/stock',
  '/owners',
  '/customers',
  '/projects',
  '/contracts',
  '/calendar',
  '/commission',
  '/credits',
  '/billing',
  '/profile',
  '/consent',
  '/pending-approval',
]

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    AGENT_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths don't need auth validation — skip Supabase entirely.
  // getUser() makes a round-trip to Supabase auth server on every request,
  // which adds 500ms on Vercel and 20-40s on localhost. Skipping it for
  // public pages (listing, news, homepage, sign, etc.) is safe because
  // those pages use createServiceClient() directly and don't need a session.
  if (!isProtectedPath(pathname)) {
    return NextResponse.next({ request })
  }

  // supabaseResponse carries refreshed session cookies back to the browser.
  // ALL return paths must either return this object or copy its cookies onto
  // their own response — otherwise the browser never receives the new tokens
  // and the next request triggers another refresh cycle.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write new tokens into the request so downstream Server Components
          // see the refreshed session within this same request cycle.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Rebuild supabaseResponse so the Set-Cookie headers reach the browser.
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the JWT with the Supabase auth server (not just locally).
  // This is also what triggers the automatic access-token refresh when the
  // token is near expiry — do NOT replace with getSession() which is local-only.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Gate 1: must be authenticated ───────────────────────────────────────────
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve intended destination so login can redirect back after sign-in.
    // Login page reads `redirect` param — keep consistent with LoginClient.
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // ── Gate 2 & 3: profile checks (every protected path) ───────────────────────
  // Deactivation must be enforced on ALL protected routes — not just /admin —
  // otherwise a deactivated/banned user keeps a valid session and can still load
  // the agent workspace shell. One indexed lookup (~5ms on Vercel).
  {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, deleted_at')
      .eq('id', user.id)
      .single()

    // No profile row → treat as unauthenticated
    if (!profile) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Deactivated: clear session cookies so the browser doesn't hold stale tokens
    if (profile.deleted_at) {
      const loginUrl = new URL('/login', request.url)
      const redirect = NextResponse.redirect(loginUrl)
      request.cookies
        .getAll()
        .filter(c => c.name.startsWith('sb-'))
        .forEach(c => redirect.cookies.delete(c.name))
      return redirect
    }

    // Admin routes require role = 'admin'
    if (pathname.startsWith('/admin') && profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      const redirect = NextResponse.redirect(url)
      supabaseResponse.cookies
        .getAll()
        .forEach(c => redirect.cookies.set(c.name, c.value, { path: '/' }))
      return redirect
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on every path EXCEPT:
    //   - Next.js internal routes  (_next/static, _next/image)
    //   - Browser-level assets     (favicon.ico, manifests, icons, fonts)
    //   - Common static extensions (images, fonts, PDFs)
    // Public pages (/login, /listing, /sign, /news, etc.) ARE matched but
    // exit early via the isProtectedPath() check at the top.
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|pdf)$).*)',
  ],
}
