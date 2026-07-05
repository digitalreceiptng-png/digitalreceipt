import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtp, hashOtp, normalizeNgPhone, maskPhone } from '@/lib/otp-utils'
import { sendTermiiSms } from '@/lib/termii'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  // Verify ownership
  const { data: member } = await db.from('staff_members')
    .select('id, display_name, owner_id')
    .eq('id', id)
    .eq('is_active', true)
    .single()
  if (!member || member.owner_id !== user.id) {
    return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
  }

  // Get owner phone
  const { data: profile } = await db.from('profiles').select('phone').eq('id', user.id).single()
  const phone = (profile as any)?.phone
  if (!phone) {
    return NextResponse.json({ error: 'No phone number on your account. Add a phone in your profile first.' }, { status: 400 })
  }

  const normalized = normalizeNgPhone(phone)
  const otp = generateOtp()
  const sessionToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error: insertErr } = await db.from('otp_sessions').insert({
    session_token: sessionToken,
    otp_hash: hashOtp(otp),
    phone,
    phone_masked: maskPhone(phone),
    type: 'nin',
    identifier: `remove_staff:${id}`,
    selected_channel: 'sms',
    used: false,
    attempts: 0,
    resend_count: 0,
    expires_at: expiresAt,
  })

  if (insertErr) {
    return NextResponse.json({ error: 'Could not create session: ' + insertErr.message }, { status: 500 })
  }

  try {
    await sendTermiiSms(
      normalized,
      `DigitalReceipt.ng: Your code to remove staff member "${member.display_name ?? 'Unknown'}" is: ${otp}. Valid for 10 minutes. Do not share.`
    )
  } catch (smsErr: any) {
    await db.from('otp_sessions').update({ used: true }).eq('session_token', sessionToken)
    return NextResponse.json({ error: 'Could not send SMS: ' + (smsErr?.message ?? 'SMS error') }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sessionToken, masked: maskPhone(phone) })
}
