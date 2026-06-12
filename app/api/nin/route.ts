import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskPhone } from '@/lib/otp-utils'
import crypto from 'crypto'

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
  try {
    const body = await req.json()
    nin = String(body?.nin ?? '').trim()
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
        Accept: 'application/json',
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      let message: string
      if (res.status === 403) message = 'Verification service is temporarily busy. Please try again in a moment.'
      else if (res.status === 404) message = 'NIN not found. Please check the number and try again.'
      else if (res.status === 429) message = 'Too many requests. Please wait a few moments and try again.'
      else if (res.status >= 500) message = 'Verification service is experiencing issues. Please try again shortly.'
      else message = data?.message ?? data?.error ?? 'Unable to verify NIN at this time. Please try again.'
      return NextResponse.json({ error: message }, { status: res.status === 404 ? 404 : 502 })
    }

    const n = data?.nin ?? {}
    const phone: string = (n.phone ?? '').trim()

    // Build available OTP channels from NIMC data only — never from user input
    const channels: Array<{ type: 'sms'; masked: string }> = []
    if (phone) {
      channels.push({ type: 'sms', masked: maskPhone(phone) })
    }

    if (channels.length === 0) {
      return NextResponse.json({
        error: 'No phone number is registered with this NIN on the NIMC database. Please visit a NIMC enrollment centre to update your records, or contact support.',
      }, { status: 422 })
    }

    // Create OTP session — person data is stored server-side, never sent to client yet
    const sessionToken = crypto.randomUUID()
    const db = createAdminClient()

    const { error: insertErr } = await db.from('otp_sessions').insert({
      session_token: sessionToken,
      type: 'nin',
      identifier: nin,
      phone: phone || null,
      phone_masked: phone ? maskPhone(phone) : null,
      person_data: {
        firstName:   n.firstname  ?? '',
        lastName:    n.lastname   ?? '',
        middleName:  n.middlename ?? '',
        dateOfBirth: n.birthdate  ?? '',
        gender:      n.gender     ?? '',
        photo:       n.photo      ?? null,
      },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

    if (insertErr) {
      return NextResponse.json({ error: 'Failed to initialise verification session.' }, { status: 500 })
    }

    // Return only the session token + masked channel options — no personal data
    return NextResponse.json({ sessionToken, channels })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `NIN service error: ${message}` }, { status: 502 })
  }
}
