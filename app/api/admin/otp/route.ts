import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, emailLogo } from '@/lib/email'
import crypto from 'crypto'

const ADMIN_EMAIL = 'ayvicola@gmail.com'
const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

function generateOtp() {
  return String(Math.floor(100000 + crypto.randomInt(900000)))
}

// POST /api/admin/otp — generate and send OTP
export async function POST() {
  const otp = generateOtp()
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()
  const hash = crypto.createHash('sha256').update(otp).digest('hex')

  const db = createAdminClient()
  // Store hashed OTP in a dedicated table row (upsert by purpose key)
  const { error } = await db.from('admin_otps').upsert(
    { purpose: 'login', otp_hash: hash, expires_at: expiresAt },
    { onConflict: 'purpose' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: 'Your Admin Login OTP — DigitalReceipt.ng',
    html: `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:480px;margin:0 auto;padding:24px 16px;background:#f9fafb;">
  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#1a2e22;padding:24px 28px;">
      ${emailLogo('dark')}
      <h1 style="font-size:18px;color:#fff;margin:16px 0 0;font-weight:700;">Admin Login Verification</h1>
    </div>
    <div style="padding:28px;text-align:center;">
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">Someone is attempting to log into the DigitalReceipt.ng Admin Console. Use the code below to complete login.</p>
      <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:14px;padding:24px;margin-bottom:24px;">
        <p style="font-size:11px;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;">Your OTP Code</p>
        <p style="font-size:44px;font-weight:800;color:#1a2e22;letter-spacing:10px;margin:0;font-family:monospace;">${otp}</p>
      </div>
      <p style="font-size:13px;color:#6b7280;margin:0;">This code expires in <strong>10 minutes</strong>. If you did not attempt to log in, your password may be compromised.</p>
    </div>
  </div>
</body>
</html>`,
  })

  return NextResponse.json({ success: true })
}

const MAX_ATTEMPTS = 5

// PUT /api/admin/otp — verify OTP
export async function PUT(request: NextRequest) {
  const { otp } = await request.json()
  if (!otp) return NextResponse.json({ error: 'OTP required' }, { status: 400 })

  const hash = crypto.createHash('sha256').update(String(otp)).digest('hex')
  const db = createAdminClient()

  const { data } = await db
    .from('admin_otps')
    .select('otp_hash, expires_at, failed_attempts')
    .eq('purpose', 'login')
    .single()

  if (!data) return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 400 })
  if (new Date(data.expires_at) < new Date()) {
    await db.from('admin_otps').delete().eq('purpose', 'login')
    return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 })
  }

  const attempts = (data.failed_attempts ?? 0)
  if (attempts >= MAX_ATTEMPTS) {
    await db.from('admin_otps').delete().eq('purpose', 'login')
    return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 429 })
  }

  if (data.otp_hash !== hash) {
    const newAttempts = attempts + 1
    if (newAttempts >= MAX_ATTEMPTS) {
      await db.from('admin_otps').delete().eq('purpose', 'login')
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 429 })
    }
    await db.from('admin_otps').update({ failed_attempts: newAttempts }).eq('purpose', 'login')
    return NextResponse.json({ error: `Invalid OTP. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.` }, { status: 400 })
  }

  // Invalidate OTP after use
  await db.from('admin_otps').delete().eq('purpose', 'login')

  return NextResponse.json({ success: true })
}
