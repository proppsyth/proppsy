import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes — ไม่ต้อง auth
  const publicPaths = ['/', '/login', '/register', '/about', '/contact', '/how-to', '/news', '/listing', '/agent', '/services', '/reset-password', '/forgot-password', '/auth', '/help', '/sign']
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  // ถ้าไม่มี user และเข้า protected route → redirect to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // ถ้ามี user แล้วเข้า login/register → redirect to dashboard
  // ข้าม server action calls (Next-Action header) เพราะ redirect จะทำให้ fetchServerAction crash
  const isServerAction = request.headers.has('next-action')
  if (user && (pathname === '/login' || pathname === '/register') && !isServerAction) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
