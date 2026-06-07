import { NextRequest, NextResponse } from 'next/server'

const TOKEN_URL = 'https://api.qoreid.com/token'
const CAC_URL   = 'https://api.qoreid.com/v1/ng/identities/cac-basic'

async function getToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.QOREID_CLIENT_ID,
      secret:   process.env.QOREID_SECRET,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`QoreID auth failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  const token = data.accessToken ?? data.access_token
  if (!token) throw new Error('QoreID auth: no token returned')
  return token as string
}

export async function GET(req: NextRequest) {
  const rc = req.nextUrl.searchParams.get('rc')?.trim()

  if (!rc || !/^\d{5,8}$/.test(rc)) {
    return NextResponse.json({ error: 'Enter a valid RC number (5–8 digits).' }, { status: 400 })
  }

  const clientId = process.env.QOREID_CLIENT_ID
  const secret   = process.env.QOREID_SECRET

  if (!clientId || !secret) {
    return NextResponse.json({ error: 'CAC API not configured.' }, { status: 503 })
  }

  try {
    const token = await getToken()

    const res = await fetch(CAC_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; DigitalReceipt/1.0)',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ regNumber: rc }),
      cache: 'no-store',
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const message = data?.message ?? 'Company not found. Check the RC number and try again.'
      return NextResponse.json({ error: message }, { status: res.status === 404 ? 404 : 502 })
    }

    const c = data?.cac ?? {}

    const company = {
      rcNumber:       c.rcNumber   ?? rc,
      name:           c.companyName        ?? '',
      type:           c.companyType        ?? '',
      status:         c.status             ?? '',
      dateRegistered: c.registrationDate   ?? '',
      address:        c.headOfficeAddress  ?? c.branchAddress ?? '',
    }

    return NextResponse.json({ company })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `CAC lookup failed: ${message}` }, { status: 502 })
  }
}
