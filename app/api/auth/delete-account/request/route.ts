import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtp, hashOtp, maskEmail, maskPhone, normalizeNgPhone } from '@/lib/otp-utils'
import { sendTermiiSms } from '@/lib/termii'
import { Resend } from 'resend'
import crypto from 'crypto'

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .single()

  const email = profile?.email ?? user.email ?? ''
  const phone = profile?.phone ?? ''
  const name = profile?.full_name?.split(' ')[0] ?? 'there'

  if (!email) return NextResponse.json({ error: 'No email address on your account.' }, { status: 400 })
  if (!phone) return NextResponse.json({ error: 'No phone number on your account. Add one in Profile Settings first.' }, { status: 400 })

  const emailOtp = generateOtp()
  const smsOtp   = generateOtp()
  const sessionToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  // Store tokens in profiles.deletion_token column (avoids otp_sessions type constraint)
  const { error: updateErr } = await db.from('profiles').update({
    deletion_token: {
      token: sessionToken,
      email_otp_hash: hashOtp(emailOtp),
      sms_otp_hash:   hashOtp(smsOtp),
      expires_at:     expiresAt,
      attempts:       0,
    },
  }).eq('id', user.id)

  if (updateErr) {
    // deletion_token column may not exist yet — fall through with an inline note
    return NextResponse.json({ error: `Setup required: ${updateErr.message}` }, { status: 500 })
  }

  // Send email OTP
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: 'DigitalReceipt.ng <noreply@digitalreceipt.ng>',
      to: email,
      subject: `Account deletion code: ${emailOtp}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
          <p style="font-size:13px;color:#4a6b4a;margin:0 0 20px 0;font-weight:700;letter-spacing:1px;text-transform:uppercase;">DigitalReceipt.ng</p>
          <h1 style="font-size:22px;color:#1a2e1a;margin:0 0 8px 0;font-weight:700;">Account Deletion Request</h1>
          <p style="font-size:14px;color:#4a5568;margin:0 0 24px 0;">Hi ${name}, we received a request to permanently delete your DigitalReceipt.ng account. Use the code below to confirm. This action <strong>cannot be undone</strong>.</p>
          <div style="background:#fff5f5;border:1px solid #fed7d7;border-radius:10px;padding:20px 24px;text-align:center;margin-bottom:24px;">
            <p style="font-size:36px;font-weight:700;letter-spacing:10px;color:#c53030;margin:0;font-family:monospace;">${emailOtp}</p>
          </div>
          <p style="font-size:13px;color:#718096;margin:0 0 8px 0;">This code expires in <strong>15 minutes</strong>.</p>
          <p style="font-size:13px;color:#718096;margin:0;">If you did not request this, ignore this email — your account is safe.</p>
        </div>
      `,
    }).catch(console.error)
  }

  // Send SMS OTP
  const normalized = normalizeNgPhone(phone)
  await sendTermiiSms(
    normalized,
    `DigitalReceipt.ng account deletion code: ${smsOtp}. Valid 15 mins. Do NOT share this code.`
  ).catch(console.error)

  return NextResponse.json({
    sessionToken,
    emailMasked: maskEmail(email),
    phoneMasked: maskPhone(phone),
  })
}
