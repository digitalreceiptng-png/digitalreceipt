import { NextRequest, NextResponse } from 'next/server'

// QoreID credentials — set these in Vercel environment variables:
//   QOREID_CLIENT_ID   your client ID from dashboard.qoreid.com
//   QOREID_SECRET      your client secret from dashboard.qoreid.com

const CLIENT_ID = process.env.QOREID_CLIENT_ID ?? ''
const SECRET    = process.env.QOREID_SECRET    ?? ''

const TOKEN_URL = 'https://api.qoreid.com/token'
const NIN_URL   = (nin: string) => `https://api.qoreid.com/v1/ng/identities/nin/${nin}`

// Module-level token cache — survives warm Lambda invocations
let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CLIENT_ID, secret: SECRET }),
    next: { revalidate: 0 },
  })

  if (!res.ok) throw new Error('QoreID auth failed')

  const data = await res.json()
  cachedToken = (data.accessToken ?? data.access_token) as string
  // cache for 50 minutes (tokens typically last 1 hour)
  tokenExpiresAt = Date.now() + 50 * 60 * 1000
  return cachedToken!
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const nin = String(body.nin ?? '').trim()

  if (!/^\d{11}$/.test(nin)) {
    return NextResponse.json({ error: 'Enter a valid 11-digit NIN.' }, { status: 400 })
  }

  if (!CLIENT_ID || !SECRET) {
    return NextResponse.json({ error: 'NIN_NOT_CONFIGURED' }, { status: 503 })
  }

  try {
    const token = await getToken()

    const res = await fetch(NIN_URL(nin), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message ?? 'NIN not found. Check the number and try again.' },
        { status: res.status }
      )
    }

    const data = await res.json()
    const n = data.nin ?? {}

    const person = {
      nin,
      firstName:   n.firstname   ?? '',
      lastName:    n.lastname    ?? '',
      middleName:  n.middlename  ?? '',
      dateOfBirth: n.birthdate   ?? '',
      gender:      n.gender      ?? '',
      phone:       n.phone       ?? '',
      photo:       n.photo       ?? null, // base64 JPEG from QoreID
    }

    return NextResponse.json({ person })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'QoreID auth failed') {
      return NextResponse.json({ error: 'NIN service authentication failed. Contact support.' }, { status: 502 })
    }
    return NextResponse.json({ error: 'Failed to reach NIN verification service. Please try again.' }, { status: 502 })
  }
}
