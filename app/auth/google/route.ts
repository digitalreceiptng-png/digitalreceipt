import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const next = searchParams.get('next') ?? '/dashboard'

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return NextResponse.redirect(`${origin}/auth/login?error=google_not_configured`)

  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const host = rawHost.replace(/^www\./, '')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const base = host.startsWith('localhost') ? `http://${host}` : `${proto}://${host}`
  const redirectUri = `${base}/auth/google/callback`
  const state = encodeURIComponent(next)

  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleUrl.searchParams.set('client_id', clientId)
  googleUrl.searchParams.set('redirect_uri', redirectUri)
  googleUrl.searchParams.set('response_type', 'code')
  googleUrl.searchParams.set('scope', 'openid email profile')
  googleUrl.searchParams.set('access_type', 'offline')
  googleUrl.searchParams.set('prompt', 'select_account')
  googleUrl.searchParams.set('state', state)

  return NextResponse.redirect(googleUrl.toString())
}
