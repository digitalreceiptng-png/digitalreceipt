import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const url = request.nextUrl.clone()

  // ── Subdomain detection ────────────────────────────────────────────────────
  // admin.digitalreceipt.ng OR admin.localhost:3000
  const isAdminSubdomain =
    hostname.startsWith('admin.') ||
    hostname === 'admin.localhost' ||
    hostname.startsWith('admin.localhost:')

  // ── Subdomain routing ──────────────────────────────────────────────────────
  // On admin subdomain: rewrite /<path> → /admin/<path> so clean URLs work.
  // e.g. admin.digitalreceipt.ng/overview → serves app/admin/(dashboard)/overview
  if (isAdminSubdomain && !url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api')) {
    const newPath = url.pathname === '/' ? '/admin' : `/admin${url.pathname}`
    url.pathname = newPath
    return NextResponse.rewrite(url)
  }

  // ── Supabase session refresh ───────────────────────────────────────────────
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = url.pathname

  // ── Dashboard protection (existing users) ─────────────────────────────────
  if (!user && path.startsWith('/dashboard')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirectTo', path)
    return NextResponse.redirect(loginUrl)
  }

  // Auth guard for admin routes — redirect to admin login if not signed in
  // (actual admin table check happens in the dashboard layout server component)
  if (path.startsWith('/admin') && path !== '/admin/login' && !user) {
    const adminLogin = request.nextUrl.clone()
    adminLogin.pathname = '/admin/login'
    return NextResponse.redirect(adminLogin)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
