import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const base = host.startsWith('localhost') ? `http://${host}` : `${proto}://${host}`

  const strippedHost = host.replace(/^www\./, '')
  const strippedBase = host.startsWith('localhost') ? `http://${strippedHost}` : `${proto}://${strippedHost}`

  return NextResponse.json({
    url: req.url,
    rawHost: host,
    strippedHost,
    proto,
    redirectUriActual: `${strippedBase}/auth/google/callback`,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    xForwardedHost: req.headers.get('x-forwarded-host'),
  })
}
