import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtp, hashOtp, normalizeNgPhone, maskPhone } from '@/lib/otp-utils'
import { sendTermiiSms } from '@/lib/termii'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const phone = String(body?.phone ?? '').trim()

  if (!phone) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })

  const db = createAdminClient()
  const normalized = normalizeNgPhone(phone)

  // Verify this phone belongs to an active staff member
  const { data: staffMember } = await db
    .from('staff_members')
    .select('id, owner_id, access_level')
    .eq('phone', phone)
    .eq('is_active', true)
    .maybeSingle()

  // Also try normalized format
  const { data: staffMemberNorm } = !staffMember ? await db
    .from('staff_members')
    .select('id, owner_id, access_level')
    .eq('phone', '+' + normalized)
    .eq('is_active', true)
    .maybeSingle() : { data: null }

  const staff = staffMember ?? staffMemberNorm
  if (!staff) {
    return NextResponse.json({ error: 'No active staff account found for this phone number. Contact your administrator.' }, { status: 404 })
  }

  const otp = generateOtp()
  const otpHash = hashOtp(otp)
  const sessionToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  // Expire any previous unused sessions for this phone
  await db.from('otp_sessions')
    .update({ used: true })
    .eq('phone', phone)
    .eq('used', false)
    .eq('identifier', staff.id)

  const { error: insertErr } = await db.from('otp_sessions').insert({
    session_token: sessionToken,
    otp_hash: otpHash,
    phone,
    phone_masked: maskPhone(phone),
    type: 'nin',        // reuse existing allowed type to avoid enum constraint
    identifier: staff.id,
    selected_channel: 'sms',
    used: false,
    attempts: 0,
    resend_count: 0,
    expires_at: expiresAt,
  })

  if (insertErr) {
    console.error('[staff/login/send] insert error:', insertErr)
    return NextResponse.json({ error: 'Failed to create session: ' + insertErr.message }, { status: 500 })
  }

  await sendTermiiSms(
    normalized,
    `Your DigitalReceipt.ng staff login code is: ${otp}. Valid for 10 minutes. Do not share.`
  )

  return NextResponse.json({ ok: true, sessionToken, masked: maskPhone(phone) })
}
