import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const base = host.startsWith('localhost') ? `http://${host}` : `${proto}://${host}`

  return NextResponse.json({
    url: req.url,
    host,
    proto,
    base,
    redirectUri: `${base}/auth/google/callback`,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    xForwardedHost: req.headers.get('x-forwarded-host'),
    xForwardedProto: req.headers.get('x-forwarded-proto'),
    headerHost: req.headers.get('host'),
  })
}
