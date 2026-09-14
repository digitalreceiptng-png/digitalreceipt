import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { makeAppleClientSecret } from '@/lib/apple-auth'

// Apple posts the result here as x-www-form-urlencoded (response_mode=form_post),
// not as a redirect with a query string like Google's simpler code flow.
export async function POST(req: NextRequest) {
  const { origin } = new URL(req.url)
  const form = await req.formData()
  const code = form.get('code') as string | null
  const state = form.get('state') as string | null
  const next = state ? decodeURIComponent(state) : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=apple_denied`, { status: 303 })
  }

  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const host = rawHost.replace(/^www\./, '')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const base = host.startsWith('localhost') ? `http://${host}` : `${proto}://${host}`
  const redirectUri = `${base}/auth/apple/callback`

  let clientSecret: string
  try {
    clientSecret = await makeAppleClientSecret()
  } catch (err) {
    console.error('[apple callback] client secret error:', err)
    return NextResponse.redirect(`${origin}/auth/login?error=apple_not_configured`, { status: 303 })
  }

  const clientId = process.env.APPLE_CLIENT_ID!

  // Exchange the authorization code for tokens
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
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
    console.error('[apple callback] token exchange failed:', tokens)
    return NextResponse.redirect(`${origin}/auth/login?error=apple_token_failed`, { status: 303 })
  }

  // Sign into Supabase using the Apple ID token
  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: tokens.id_token,
    access_token: tokens.access_token,
  })

  if (error || !authData.user) {
    console.error('[apple callback] supabase sign-in failed:', error?.message)
    return NextResponse.redirect(`${origin}/auth/login?error=apple_signin_failed`, { status: 303 })
  }

  // Check if this user has completed their profile setup (has a full_name)
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', authData.user.id)
    .maybeSingle()

  // New user or profile incomplete — send to registration form to complete setup
  if (!profile?.full_name) {
    return NextResponse.redirect(`${origin}/auth/register?from=apple`, { status: 303 })
  }

  return NextResponse.redirect(`${origin}${next}`, { status: 303 })
}
