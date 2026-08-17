import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import { generateOtp, hashOtp, maskEmail, maskPhone, normalizeNgPhone } from '@/lib/otp-utils'
import { sendTermiiSms } from '@/lib/termii'
import { Resend } from 'resend'

// POST — sends independent codes to the company profile's email and phone,
// required before an already-generated receipt's Amount Paid can change.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = getEffectiveUserId(user)

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const amountPaid = Number(body?.amountPaid)
  if (!isFinite(amountPaid) || amountPaid < 0) {
    return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: receipt } = await db
    .from('receipts')
    .select('id, user_id, amount_paid')
    .eq('id', id)
    .single()
  if (!receipt || receipt.user_id !== userId) {
    return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })
  }
  if (Number(receipt.amount_paid ?? 0) === amountPaid) {
    return NextResponse.json({ error: 'Enter a different amount.' }, { status: 400 })
  }

  const { data: profile } = await db
    .from('profiles')
    .select('email, phone, full_name')
    .eq('id', userId)
    .single()

  const email = profile?.email ?? user.email ?? ''
  const phone = profile?.phone ?? ''
  if (!email && !phone) {
    return NextResponse.json({ error: 'No email or phone on the company profile to send a code to.' }, { status: 400 })
  }

  // Independent codes per channel — knowing one doesn't help guess the other.
  const emailCode = email ? generateOtp() : null
  const phoneCode = phone ? generateOtp() : null
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await db.from('receipt_amount_edit_otps').delete().eq('user_id', userId).eq('receipt_id', id)
  const { error: insertErr } = await db.from('receipt_amount_edit_otps').insert({
    user_id: userId,
    receipt_id: id,
    new_amount_paid: amountPaid,
    email_code_hash: emailCode ? hashOtp(emailCode) : null,
    phone_code_hash: phoneCode ? hashOtp(phoneCode) : null,
    expires_at,
  })
  // Fail before sending anything — codes nobody can ever confirm are worse than none.
  if (insertErr) {
    console.error('[amount-paid edit-request] failed to save pending edit:', insertErr)
    return NextResponse.json({ error: 'Could not start the edit request. Please try again.' }, { status: 500 })
  }

  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  let emailSent = false, smsSent = false

  if (email && emailCode) {
    try {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) throw new Error('Email service not configured.')
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'DigitalReceipt.ng <noreply@digitalreceipt.ng>',
        to: email,
        subject: `Confirm Amount Paid change: ${emailCode}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
            <img src="https://digitalreceipt.ng/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" style="height:38px;display:block;border:0;margin-bottom:20px;" />
            <h1 style="font-size:22px;color:#1a2e1a;margin:0 0 8px 0;font-weight:700;">Confirm Amount Paid change</h1>
            <p style="font-size:14px;color:#4a5568;margin:0 0 24px 0;">Hi ${name}, use the code below to change this receipt's Amount Paid to "<strong>${fmt(amountPaid)}</strong>". A second code was sent by SMS — you'll need both.</p>
            <div style="background:#f5fbf5;border:1px solid #c8e6c8;border-radius:10px;padding:20px 24px;text-align:center;margin-bottom:24px;">
              <p style="font-size:36px;font-weight:700;letter-spacing:10px;color:#0d6b1e;margin:0;font-family:monospace;">${emailCode}</p>
            </div>
            <p style="font-size:13px;color:#718096;margin:0 0 8px 0;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="font-size:13px;color:#718096;margin:0;">If you did not request this, ignore this email — nothing will change.</p>
          </div>
        `,
      })
      emailSent = true
    } catch (err) {
      console.error('[amount-paid edit-request] email failed:', err)
    }
  }

  if (phone && phoneCode) {
    try {
      await sendTermiiSms(
        normalizeNgPhone(phone),
        `Your DigitalReceipt.ng code to confirm an Amount Paid change is: ${phoneCode}. A second code was emailed — you'll need both. Valid for 10 minutes. Do not share this code.`
      )
      smsSent = true
    } catch (err) {
      console.error('[amount-paid edit-request] SMS failed:', err)
    }
  }

  if (!emailSent && !smsSent) {
    return NextResponse.json({ error: 'Failed to send the code. Please try again.' }, { status: 502 })
  }

  // Only the channels that actually got a code are required to confirm.
  if (email && !emailSent) await db.from('receipt_amount_edit_otps').update({ email_code_hash: null }).eq('user_id', userId).eq('receipt_id', id)
  if (phone && !smsSent) await db.from('receipt_amount_edit_otps').update({ phone_code_hash: null }).eq('user_id', userId).eq('receipt_id', id)

  return NextResponse.json({
    ok: true,
    channels: {
      ...(emailSent ? { email: maskEmail(email) } : {}),
      ...(smsSent ? { phone: maskPhone(phone) } : {}),
    },
  })
}
