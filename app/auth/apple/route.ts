import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const next = searchParams.get('next') ?? '/dashboard'

  const clientId = process.env.APPLE_CLIENT_ID
  if (!clientId) return NextResponse.redirect(`${origin}/auth/login?error=apple_not_configured`)

  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const host = rawHost.replace(/^www\./, '')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const base = host.startsWith('localhost') ? `http://${host}` : `${proto}://${host}`
  const redirectUri = `${base}/auth/apple/callback`
  const state = encodeURIComponent(next)

  const appleUrl = new URL('https://appleid.apple.com/auth/authorize')
  appleUrl.searchParams.set('client_id', clientId)
  appleUrl.searchParams.set('redirect_uri', redirectUri)
  appleUrl.searchParams.set('response_type', 'code')
  appleUrl.searchParams.set('scope', 'name email')
  // Apple only allows form_post as the response mode when requesting scopes
  // beyond the bare id token — it POSTs the result to our callback instead
  // of redirecting with a query string.
  appleUrl.searchParams.set('response_mode', 'form_post')
  appleUrl.searchParams.set('state', state)

  return NextResponse.redirect(appleUrl.toString())
}
