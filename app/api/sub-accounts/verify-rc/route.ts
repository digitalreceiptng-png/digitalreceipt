import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskPhone, maskEmail } from '@/lib/otp-utils'
import crypto from 'crypto'

const TOKEN_URL       = 'https://api.qoreid.com/token'
const CAC_PREMIUM_URL = 'https://api.qoreid.com/v1/ng/identities/cac-premium'
const CAC_BASIC_URL   = 'https://api.qoreid.com/v1/ng/identities/cac-basic'

async function getQoreToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: process.env.QOREID_CLIENT_ID, secret: process.env.QOREID_SECRET }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`QoreID auth failed (${res.status})`)
  const data = await res.json()
  const token = data.accessToken ?? data.access_token
  if (!token) throw new Error('QoreID: no token returned')
  return token
}

// POST { rc: string } — verifies RC exists via QoreID, then sends OTP to the USER's own phone/email
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rc } = await req.json()
  if (!rc?.trim()) return NextResponse.json({ error: 'RC number is required' }, { status: 400 })

  const raw = rc.trim()
  let prefix = 'RC', digits = raw
  if (/^BN\s*/i.test(raw)) { prefix = 'BN'; digits = raw.replace(/^BN\s*/i, '') }
  else digits = raw.replace(/^RC\s*/i, '')

  if (!digits || !/^\d{5,8}$/.test(digits)) {
    return NextResponse.json({ error: 'Enter a valid RC or BN number (5–8 digits).' }, { status: 400 })
  }

  const regNumber = `${prefix}${digits}`

  const db = createAdminClient()

  // Load user profile to get their verified phone/email
  const { data: profile } = await db.from('profiles').select('phone, email').eq('id', user.id).single()
  const userPhone = profile?.phone ?? ''
  const userEmail = profile?.email ?? user.email ?? ''

  if (!userPhone && !userEmail) {
    return NextResponse.json({ error: 'No contact details on your profile to send OTP to.' }, { status: 400 })
  }

  try {
    const token = await getQoreToken()
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    const body = JSON.stringify({ regNumber })

    // Confirm the company exists
    let res = await fetch(CAC_PREMIUM_URL, { method: 'POST', headers, body, cache: 'no-store' })
    if (!res.ok && [401, 403, 404].includes(res.status)) {
      res = await fetch(CAC_BASIC_URL, { method: 'POST', headers, body, cache: 'no-store' })
    }

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const message = res.status === 404
        ? 'Company not found. Please check the RC or BN number.'
        : data?.message ?? 'Unable to verify business registration. Please try again.'
      return NextResponse.json({ error: message }, { status: res.status === 404 ? 404 : 502 })
    }

    const c = data?.cac ?? {}
    const companyName = c.companyName ?? regNumber

    // Create OTP session using USER's own contact details (not the company's CAC phone)
    const sessionToken = crypto.randomUUID()
    await db.from('otp_sessions').insert({
      session_token: sessionToken,
      type: 'cac',
      identifier: regNumber,
      phone: userPhone || null,
      email: userEmail || null,
      phone_masked: userPhone ? maskPhone(userPhone) : null,
      email_masked: userEmail ? maskEmail(userEmail) : null,
      person_data: {
        companyName,
        rcNumber: c.rcNumber ?? digits,
        type: c.companyType ?? '',
        status: c.status ?? '',
      },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

    // Build channels from USER's contact info
    const channels: Array<{ type: 'sms' | 'email'; masked: string }> = []
    if (userPhone) channels.push({ type: 'sms', masked: maskPhone(userPhone) })
    if (userEmail) channels.push({ type: 'email', masked: maskEmail(userEmail) })

    return NextResponse.json({ sessionToken, channels, companyName })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `RC verification failed: ${message}` }, { status: 502 })
  }
}
