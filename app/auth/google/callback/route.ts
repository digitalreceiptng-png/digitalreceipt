import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const next = state ? decodeURIComponent(state) : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=google_denied`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const host = rawHost.replace(/^www\./, '')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const base = host.startsWith('localhost') ? `http://${host}` : `${proto}://${host}`
  const redirectUri = `${base}/auth/google/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokenRes.ok || !tokens.id_token) {
    return NextResponse.redirect(`${origin}/auth/login?error=google_token_failed`)
  }

  // Sign into Supabase using the Google ID token
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: tokens.id_token,
    access_token: tokens.access_token,
  })

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=google_signin_failed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
