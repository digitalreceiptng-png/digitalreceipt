import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtp, hashOtp, normalizeNgPhone } from '@/lib/otp-utils'
import { sendTermiiSms } from '@/lib/termii'
import { InsufficientFundsError } from '@/lib/provider-errors'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  let sessionToken = ''
  let channel = ''
  try {
    const body = await req.json()
    sessionToken = String(body?.sessionToken ?? '').trim()
    channel      = String(body?.channel ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!sessionToken) return NextResponse.json({ error: 'Missing session token.' }, { status: 400 })
  if (channel !== 'sms' && channel !== 'email') return NextResponse.json({ error: 'Invalid channel.' }, { status: 400 })

  const db = createAdminClient()
  const { data: session } = await db
    .from('otp_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'Session expired or invalid. Please start over.' }, { status: 400 })
  if (session.resend_count >= 20) return NextResponse.json({ error: 'Too many resend attempts. Please start over.' }, { status: 429 })
  if (channel === 'sms' && !session.phone) return NextResponse.json({ error: 'No phone number on this record.' }, { status: 400 })
  if (channel === 'email' && !session.email) return NextResponse.json({ error: 'No email on this record.' }, { status: 400 })

  // Reuse the same OTP code for the full 24-hour session — avoids re-charging QoreID.
  // Generate a new one only on the very first send.
  const otp: string     = session.otp_plain ?? generateOtp()
  const otpHash: string = session.otp_plain ? session.otp_hash : hashOtp(otp)

  // Update OTP hash + channel; preserve the original expires_at (24-hour window from session creation)
  await db.from('otp_sessions').update({
    otp_hash: otpHash,
    otp_plain: otp,
    selected_channel: channel,
    resend_count: session.resend_count + 1,
    attempts: 0,
  }).eq('session_token', sessionToken)

  try {
    if (channel === 'sms') {
      const normalized = normalizeNgPhone(session.phone)
      await sendTermiiSms(
        normalized,
        `Your DigitalReceipt.ng verification code is: ${otp}. Valid for 24 hours. Do not share this code with anyone.`
      )
    } else {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) throw new Error('Email service not configured.')
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from: 'DigitalReceipt.ng <noreply@digitalreceipt.ng>',
        to: session.email,
        subject: `Your verification code: ${otp}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
            <img src="https://digitalreceipt.ng/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" style="height:38px;display:block;border:0;margin-bottom:20px;" />
            <h1 style="font-size:22px;color:#1a2e1a;margin:0 0 8px 0;font-weight:700;">Your verification code</h1>
            <p style="font-size:14px;color:#4a5568;margin:0 0 24px 0;">Use the code below to verify your business registration on DigitalReceipt.ng.</p>
            <div style="background:#f0f7f0;border:1px solid #c8e6c8;border-radius:10px;padding:20px 24px;text-align:center;margin-bottom:24px;">
              <p style="font-size:36px;font-weight:700;letter-spacing:10px;color:#0d6b1e;margin:0;font-family:monospace;">${otp}</p>
            </div>
            <p style="font-size:13px;color:#718096;margin:0 0 8px 0;">This code is valid for <strong>24 hours</strong>.</p>
            <p style="font-size:13px;color:#718096;margin:0;">Do not share this code with anyone. DigitalReceipt.ng staff will never ask for it.</p>
          </div>
        `,
      })
    }
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json({ error: 'Error 401: Service temporarily unavailable. Please try again later or contact support.' }, { status: 503 })
    }
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Failed to send code: ${message}` }, { status: 502 })
  }

  const masked = channel === 'sms' ? session.phone_masked : session.email_masked
  return NextResponse.json({ ok: true, masked })
}
