import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskPhone, maskEmail } from '@/lib/otp-utils'
import crypto from 'crypto'

const TOKEN_URL       = 'https://api.qoreid.com/token'
const NIN_PREMIUM_URL = 'https://api.qoreid.com/v1/ng/identities/nin-premium'
const NIN_BASIC_URL   = 'https://api.qoreid.com/v1/ng/identities/nin'

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
  if (!token) throw new Error(`QoreID auth: no token in response`)
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
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; DigitalReceipt/1.0)',
      Accept: 'application/json',
    }

    const callBasic = async () => fetch(`${NIN_BASIC_URL}/${nin}`, {
      method: 'POST', headers, body: JSON.stringify({}), cache: 'no-store',
    })

    // Try premium first — richer data including email, fields at root level.
    let premiumPerson: Record<string, unknown> | null = null
    const premiumRes = await fetch(`${NIN_PREMIUM_URL}/${nin}`, {
      method: 'POST', headers, body: JSON.stringify({}), cache: 'no-store',
    })
    if (premiumRes.ok) {
      const d = await premiumRes.json().catch(() => null)
      if (d && (d.firstname || d.nin)) premiumPerson = d
    }

    // Always also call basic — guaranteed to have phone when registered
    const basicRes = await callBasic()
    const basicData = await basicRes.json().catch(() => null)

    if (!basicRes.ok && !premiumPerson) {
      // Both failed — surface a user-friendly error
      let message: string
      if (basicRes.status === 404) message = 'NIN not found. Please check the number and try again.'
      else if (basicRes.status === 403) message = 'Verification service is temporarily busy. Please try again in a moment.'
      else if (basicRes.status === 429) message = 'Too many requests. Please wait a few moments and try again.'
      else message = basicData?.message ?? basicData?.error ?? 'Unable to verify NIN at this time. Please try again.'
      return NextResponse.json({ error: message }, { status: basicRes.status === 404 ? 404 : 502 })
    }

    // Merge: premium fields first, fall back to basic fields for anything missing
    const basicPerson: Record<string, unknown> = basicData?.nin ?? {}
    const merged = { ...basicPerson, ...( premiumPerson ?? {}) }

    const phone: string = String(merged.phone ?? '').trim()
    const email: string = String(merged.email ?? '').trim()

    // Build OTP channels from registry data only — never from user input
    const channels: Array<{ type: 'sms' | 'email'; masked: string }> = []
    if (phone) channels.push({ type: 'sms',   masked: maskPhone(phone) })
    if (email) channels.push({ type: 'email', masked: maskEmail(email) })

    if (channels.length === 0) {
      return NextResponse.json({
        error: 'No contact details are registered with this NIN. Please visit a NIMC centre to update your records, or contact support.',
      }, { status: 422 })
    }

    // Store person data server-side — never sent to client until OTP is verified
    const sessionToken = crypto.randomUUID()
    const db = createAdminClient()

    const { error: insertErr } = await db.from('otp_sessions').insert({
      session_token: sessionToken,
      type: 'nin',
      identifier: nin,
      phone: phone || null,
      email: email || null,
      phone_masked: phone ? maskPhone(phone) : null,
      email_masked: email ? maskEmail(email) : null,
      person_data: {
        firstName:   merged.firstname  ?? '',
        lastName:    merged.lastname   ?? '',
        middleName:  merged.middlename ?? '',
        dateOfBirth: merged.birthdate  ?? '',
        gender:      merged.gender     ?? '',
        photo:       merged.photo      ?? null,
      },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

    if (insertErr) {
      return NextResponse.json({ error: 'Failed to initialise verification session.' }, { status: 500 })
    }

    return NextResponse.json({ sessionToken, channels })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `NIN service error: ${message}` }, { status: 502 })
  }
}
