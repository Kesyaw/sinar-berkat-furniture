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

  // Refresh session — JANGAN hapus baris ini
  const { data: { user } } = await supabase.auth.getUser()

  // Protect admin routes
  const isAdminRoute = request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/')
  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
      return NextResponse.redirect(loginUrl)
    }
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
      return NextResponse.redirect(loginUrl)
    }

    // Skip expensive backend DB check for prefetch requests to optimize performance
    const isPrefetch = request.headers.get('purpose') === 'prefetch' || request.headers.has('x-middleware-prefetch')
    if (isPrefetch) {
      return supabaseResponse
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
        return NextResponse.redirect(loginUrl)
      }
      const profile = await res.json()
      if (profile?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch (error) {
      console.error('Error checking admin role in middleware:', error)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect account routes
  const isAccountRoute = request.nextUrl.pathname === '/account' || request.nextUrl.pathname.startsWith('/account/')
  if (isAccountRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect ke home kalau sudah login tapi akses /login
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}