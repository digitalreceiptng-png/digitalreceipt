import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import { generateOtp, hashOtp, maskEmail } from '@/lib/otp-utils'
import { InsufficientFundsError } from '@/lib/provider-errors'
import { Resend } from 'resend'

async function getUser(req: NextRequest) {
  const db = createAdminClient()
  const auth = req.headers.get('authorization') ?? ''
  if (auth.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(auth.slice(7))
    if (data.user) return data.user
  }
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

// POST — email a verification code required to delete an expenditure/tax
// entry, or to remove its attached document, from the Financial Summary.
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = getEffectiveUserId(user)

  const body = await req.json().catch(() => ({}))
  const expenditureId = String(body.id ?? '')
  const action = body.action === 'remove_attachment' ? 'remove_attachment' : 'delete_entry'
  if (!expenditureId) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const db = createAdminClient()
  const { data: entry } = await db
    .from('user_expenditures')
    .select('id, label')
    .eq('id', expenditureId)
    .eq('user_id', userId)
    .single()
  if (!entry) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 })

  const { data: profile } = await db
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  const email = profile?.email ?? user.email ?? ''
  if (!email) return NextResponse.json({ error: 'No email address on your account.' }, { status: 400 })

  const code = generateOtp()
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await db.from('expenditure_delete_otps').delete()
    .eq('user_id', userId).eq('expenditure_id', expenditureId).eq('action', action)
  await db.from('expenditure_delete_otps').insert({
    user_id: userId, expenditure_id: expenditureId, action, code_hash: hashOtp(code), expires_at,
  })

  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const actionLabel = action === 'remove_attachment' ? 'remove the attachment from' : 'delete'

  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('Email service not configured.')
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: 'DigitalReceipt.ng <noreply@digitalreceipt.ng>',
      to: email,
      subject: `Confirm deletion in Financial Summary: ${code}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
          <img src="https://digitalreceipt.ng/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" style="height:38px;display:block;border:0;margin-bottom:20px;" />
          <h1 style="font-size:22px;color:#1a2e1a;margin:0 0 8px 0;font-weight:700;">Confirm deletion</h1>
          <p style="font-size:14px;color:#4a5568;margin:0 0 24px 0;">Hi ${name}, use the code below to ${actionLabel} "<strong>${entry.label}</strong>" in your Financial Summary.</p>
          <div style="background:#fff5f5;border:1px solid #fed7d7;border-radius:10px;padding:20px 24px;text-align:center;margin-bottom:24px;">
            <p style="font-size:36px;font-weight:700;letter-spacing:10px;color:#c53030;margin:0;font-family:monospace;">${code}</p>
          </div>
          <p style="font-size:13px;color:#718096;margin:0 0 8px 0;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="font-size:13px;color:#718096;margin:0;">If you did not request this, ignore this email — nothing will be deleted.</p>
        </div>
      `,
    })
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json({ error: 'Error 401: Service temporarily unavailable. Please try again later or contact support.' }, { status: 503 })
    }
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Failed to send code: ${message}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, masked: maskEmail(email) })
}
