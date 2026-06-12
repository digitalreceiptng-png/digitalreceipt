import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskPhone, maskEmail } from '@/lib/otp-utils'
import crypto from 'crypto'

const TOKEN_URL = 'https://api.qoreid.com/token'
const CAC_URL   = 'https://api.qoreid.com/v1/ng/identities/cac'

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

// Extract the phone from the shareholder/director with the highest share percentage
function extractHighestShareholderPhone(data: Record<string, unknown>): string {
  const lists = [
    data.directors,
    data.shareholders,
    data.members,
    data.proprietors,
  ].filter(Array.isArray) as Array<Array<Record<string, unknown>>>

  let bestPhone = ''
  let bestShares = -1

  for (const list of lists) {
    for (const person of list) {
      const shares = Number(
        person.shares ?? person.sharePercentage ?? person.shareHolding ??
        person.numSharesAlloted ?? person.sharesAlloted ?? 0
      )
      const phone = String(person.phone ?? person.phoneNumber ?? person.telephone ?? '').trim()

      if (phone && shares > bestShares) {
        bestShares = shares
        bestPhone = phone
      }

      // If no shares field but has a phone, use first one found as fallback
      if (phone && bestPhone === '') {
        bestPhone = phone
      }
    }
  }

  // Also check top-level phone fields
  if (!bestPhone) {
    bestPhone = String(data.phone ?? data.phoneNumber ?? data.telephone ?? '').trim()
  }

  return bestPhone
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('rc')?.trim() ?? ''

  let prefix = 'RC'
  let digits = raw

  if (/^BN\s*/i.test(raw)) {
    prefix = 'BN'
    digits = raw.replace(/^BN\s*/i, '')
  } else {
    digits = raw.replace(/^RC\s*/i, '')
  }

  if (!digits || !/^\d{5,8}$/.test(digits)) {
    return NextResponse.json({ error: 'Enter a valid RC or BN number (5–8 digits).' }, { status: 400 })
  }

  const rc = digits
  const regNumber = `${prefix}${digits}`

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
        Accept: 'application/json',
      },
      body: JSON.stringify({ regNumber }),
      cache: 'no-store',
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      let message: string
      if (res.status === 403) message = 'Verification service is temporarily busy. Please try again in a moment.'
      else if (res.status === 404) message = 'Company not found. Please check the RC or BN number and try again.'
      else if (res.status === 429) message = 'Too many requests. Please wait a few moments and try again.'
      else if (res.status >= 500) message = 'Verification service is experiencing issues. Please try again shortly.'
      else message = data?.message ?? 'Unable to verify business registration at this time. Please try again.'
      return NextResponse.json({ error: message }, { status: res.status === 404 ? 404 : 502 })
    }

    const c = data?.cac ?? {}

    const email: string = String(c.email ?? c.emailAddress ?? c.companyEmail ?? '').trim()
    const phone: string = extractHighestShareholderPhone(c)

    // Build OTP channels — email first (always available per CAC), then phone if present
    const channels: Array<{ type: 'sms' | 'email'; masked: string }> = []
    if (email) channels.push({ type: 'email', masked: maskEmail(email) })
    if (phone) channels.push({ type: 'sms', masked: maskPhone(phone) })

    if (channels.length === 0) {
      return NextResponse.json({
        error: 'No contact details found on the CAC record for this registration number. Please contact support.',
      }, { status: 422 })
    }

    // Store full contact data server-side in OTP session
    const sessionToken = crypto.randomUUID()
    const db = createAdminClient()

    const { error: insertErr } = await db.from('otp_sessions').insert({
      session_token: sessionToken,
      type: 'cac',
      identifier: regNumber,
      phone: phone || null,
      email: email || null,
      phone_masked: phone ? maskPhone(phone) : null,
      email_masked: email ? maskEmail(email) : null,
      person_data: {
        companyName:     c.companyName   ?? '',
        rcNumber:        c.rcNumber      ?? rc,
        type:            c.companyType   ?? '',
        status:          c.status        ?? '',
        dateRegistered:  c.registrationDate ?? '',
        address:         c.headOfficeAddress ?? c.branchAddress ?? '',
      },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

    if (insertErr) {
      return NextResponse.json({ error: 'Failed to initialise verification session.' }, { status: 500 })
    }

    // Return only session token + masked channel options
    return NextResponse.json({ sessionToken, channels })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `CAC lookup failed: ${message}` }, { status: 502 })
  }
}
