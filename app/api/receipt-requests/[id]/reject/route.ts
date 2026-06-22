import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { reason?: string } = {}
  try { body = await req.json() } catch { /* reason is optional */ }

  const db = createAdminClient()

  const { data: submission } = await db
    .from('receipt_form_submissions')
    .select('id, customer_name, customer_email, status, issuer_id')
    .eq('id', id)
    .eq('issuer_id', user.id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (submission.status !== 'pending') return NextResponse.json({ error: 'Request already reviewed' }, { status: 409 })

  await db
    .from('receipt_form_submissions')
    .update({
      status: 'rejected',
      rejection_reason: body.reason?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Notify customer
  if (submission.customer_email) {
    const { data: profile } = await db
      .from('profiles')
      .select('full_name, business_name, issuer_type')
      .eq('id', user.id)
      .single()

    const issuerName = profile?.issuer_type === 'business'
      ? (profile?.business_name || profile?.full_name)
      : profile?.full_name ?? 'the issuer'

    await sendEmail({
      to: submission.customer_email,
      subject: 'Update on your receipt request',
      html: rejectionHtml({
        customerName: submission.customer_name,
        issuerName,
        reason: body.reason?.trim() || null,
      }),
    })
  }

  await logActivity({
    userId: user.id,
    type: 'request_rejected',
    title: `Receipt request rejected for ${submission.customer_name}`,
    description: body.reason?.trim() || undefined,
    entityType: 'submission',
    entityId: id,
  })

  return NextResponse.json({ ok: true })
}

function rejectionHtml({ customerName, issuerName, reason }: {
  customerName: string
  issuerName: string
  reason: string | null
}) {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f0f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background:#b91c1c;border-radius:12px 12px 0 0;padding:24px 28px;">
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.65);">DigitalReceipt.ng</p>
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Receipt Request Not Approved</h1>
        </td></tr>
        <tr><td style="background:#ffffff;padding:28px;">
          <p style="margin:0 0 16px 0;font-size:14px;color:#333;line-height:1.65;">
            Hi <strong>${customerName}</strong>, we regret to inform you that your receipt request submitted to <strong>${issuerName}</strong> could not be approved at this time.
          </p>
          ${reason ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:16px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0 0 4px 0;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Reason</p>
              <p style="margin:0;font-size:13px;color:#7f1d1d;">${reason}</p>
            </td></tr>
          </table>` : ''}
          <p style="margin:0;font-size:14px;color:#555;line-height:1.65;">
            If you believe this is an error or would like to resubmit, please contact <strong>${issuerName}</strong> directly.
          </p>
        </td></tr>
        <tr><td style="background:#fef2f2;border-radius:0 0 12px 12px;padding:16px 28px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#991b1b;">This notification was sent via <strong>DigitalReceipt.ng</strong>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
