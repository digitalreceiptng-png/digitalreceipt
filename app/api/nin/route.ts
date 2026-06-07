import { NextRequest, NextResponse } from 'next/server'

const TOKEN_URL = 'https://api.qoreid.com/token'
const BASE_URL  = 'https://api.qoreid.com'

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
  if (!token) throw new Error(`QoreID auth: no token in response (keys: ${Object.keys(data).join(', ')})`)
  return token as string
}

export async function POST(req: NextRequest) {
  let nin = ''
  let firstname = ''
  let lastname = ''
  let dob = ''
  let phone = ''
  let gender = ''
  try {
    const body = await req.json()
    nin       = String(body?.nin       ?? '').trim()
    firstname = String(body?.firstname ?? '').trim()
    lastname  = String(body?.lastname  ?? '').trim()
    dob       = String(body?.dob       ?? '').trim()
    phone     = String(body?.phone     ?? '').trim()
    gender    = String(body?.gender    ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!/^\d{11}$/.test(nin)) {
    return NextResponse.json({ error: 'Enter a valid 11-digit NIN.' }, { status: 400 })
  }

  const clientId = process.env.QOREID_CLIENT_ID
  const secret   = process.env.QOREID_SECRET

  if (!clientId || !secret) {
    return NextResponse.json({ error: 'NIN_NOT_CONFIGURED' }, { status: 503 })
  }

  try {
    const token = await getToken()

    const res = await fetch(`${BASE_URL}/v1/ng/identities/nin/${nin}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; DigitalReceipt/1.0)',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ firstname, lastname, dob, phone, gender }),
      cache: 'no-store',
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const message = data?.message ?? data?.error ?? `Verification failed (${res.status})`
      return NextResponse.json({ error: message }, { status: res.status === 404 ? 404 : 502 })
    }

    const n = data?.nin ?? {}

    return NextResponse.json({
      person: {
        nin,
        firstName:   n.firstname  ?? '',
        lastName:    n.lastname   ?? '',
        middleName:  n.middlename ?? '',
        dateOfBirth: n.birthdate  ?? '',
        gender:      n.gender     ?? '',
        phone:       n.phone      ?? '',
        photo:       n.photo      ?? null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `NIN service error: ${message}` },
      { status: 502 }
    )
  }
}
