import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import { hashOtp } from '@/lib/otp-utils'

// POST — verify both codes, then soft-delete the receipt (restorable).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = getEffectiveUserId(user)

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const emailCode = String(body?.emailCode ?? '').replace(/\D/g, '').trim()
  const phoneCode = String(body?.phoneCode ?? '').replace(/\D/g, '').trim()

  const db = createAdminClient()

  const { data: otp } = await db
    .from('receipt_delete_otps')
    .select('*')
    .eq('user_id', userId)
    .eq('receipt_id', id)
    .maybeSingle()

  if (!otp) return NextResponse.json({ error: 'Code expired or not requested. Please try again.' }, { status: 400 })

  if (new Date(otp.expires_at) < new Date()) {
    await db.from('receipt_delete_otps').delete().eq('id', otp.id)
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
  }
  if (otp.attempts >= 5) {
    return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 429 })
  }

  const needsEmail = !!otp.email_code_hash
  const needsPhone = !!otp.phone_code_hash
  if (needsEmail && emailCode.length !== 6) return NextResponse.json({ error: 'Enter the 6-digit code sent to your email.' }, { status: 400 })
  if (needsPhone && phoneCode.length !== 6) return NextResponse.json({ error: 'Enter the 6-digit code sent to your phone.' }, { status: 400 })

  const emailOk = !needsEmail || hashOtp(emailCode) === otp.email_code_hash
  const phoneOk = !needsPhone || hashOtp(phoneCode) === otp.phone_code_hash

  if (!emailOk || !phoneOk) {
    await db.from('receipt_delete_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
    const which = !emailOk && !phoneOk ? 'codes' : !emailOk ? 'email code' : 'phone code'
    return NextResponse.json({ error: `Incorrect ${which}.` }, { status: 400 })
  }

  const { data: receipt } = await db
    .from('receipts')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (!receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })

  const { error } = await db
    .from('receipts')
    .update({ status: 'deleted', deleted_at: new Date().toISOString(), previous_status: receipt.status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to delete receipt.' }, { status: 500 })

  await db.from('payment_reminders').update({ is_active: false }).eq('receipt_id', id).eq('is_active', true)
  await db.from('receipt_delete_otps').delete().eq('id', otp.id)

  return NextResponse.json({ ok: true })
}
