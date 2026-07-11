import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { deductWallet } from '@/lib/wallet'

// Charged to the company for each receipt-request alert.
const REQUEST_ALERT_FEE = 10

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://digitalreceipt.ng'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const { data: form } = await db
    .from('receipt_forms')
    .select('*, purposes:receipt_form_purposes(label, sort_order)')
    .eq('id', id)
    .single()

  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  if (!form.is_active) return NextResponse.json({ error: 'This form is no longer accepting submissions' }, { status: 410 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const customerName = String(body.customer_name ?? '').trim()
  if (!customerName) return NextResponse.json({ error: 'Full name is required' }, { status: 400 })

  const totalAmount = Number(body.total_amount)
  if (!totalAmount || totalAmount <= 0) return NextResponse.json({ error: 'Total amount must be greater than 0' }, { status: 400 })

  const { data: submission, error } = await db
    .from('receipt_form_submissions')
    .insert({
      form_id: id,
      issuer_id: form.user_id,
      customer_name: customerName,
      customer_email: String(body.customer_email ?? '').trim() || null,
      customer_phone: String(body.customer_phone ?? '').trim() || null,
      purpose_of_payment: String(body.purpose_of_payment ?? '').trim() || null,
      item_description: String(body.item_description ?? '').trim() || null,
      unit_label: String(body.unit_label ?? '').trim() || null,
      unit_value: String(body.unit_value ?? '').trim() || null,
      unit_price: body.unit_price ? Number(body.unit_price) : null,
      total_amount: totalAmount,
      payment_method: String(body.payment_method ?? '').trim() || 'Bank Transfer',
      payment_date: String(body.payment_date ?? '').trim() || null,
      additional_notes: String(body.additional_notes ?? '').trim() || null,
      payment_evidence_url: String(body.payment_evidence_url ?? '').trim() || null,
      payment_evidence_name: String(body.payment_evidence_name ?? '').trim() || null,
      form_snapshot: form.field_labels ?? {},
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch issuer profile (used by both notification emails)
  const { data: issuerProfile } = await db
    .from('profiles')
    .select('email, full_name, business_name')
    .eq('id', form.user_id)
    .single()

  // Notify customer
  const customerEmail = String(body.customer_email ?? '').trim()
  if (customerEmail) {
    const issuerName = issuerProfile?.business_name || issuerProfile?.full_name || 'the business'
    await sendEmail({
      to: customerEmail,
      subject: 'Your receipt request has been received',
      html: submissionConfirmationHtml({ customerName, issuerName, submissionId: submission.id }),
    })
  }

  // Notify issuer — each alert costs ₦10, deducted from the company's wallet.
  // deductWallet is atomic (only debits when funds exist), so if the balance
  // can't cover the fee we skip the alert entirely.
  if (issuerProfile?.email) {
    const charge = await deductWallet(
      form.user_id,
      REQUEST_ALERT_FEE,
      `Receipt request alert — ${customerName}`,
    )
    if (charge.success) {
      const formTitle = form.title || 'your form'
      await sendEmail({
        to: issuerProfile.email,
        subject: `New receipt request from ${customerName}`,
        html: newRequestNotificationHtml({
          issuerName: issuerProfile.full_name,
          customerName,
          totalAmount,
          formTitle,
          dashboardUrl: `${APP_URL}/dashboard/receipt-requests/${submission.id}`,
        }),
      })
    }
  }

  return NextResponse.json({ ok: true, submissionId: submission.id }, { status: 201 })
}

function submissionConfirmationHtml({ customerName, issuerName, submissionId }: {
  customerName: string
  issuerName: string
  submissionId: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f0f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background:#0d6b1e;border-radius:12px 12px 0 0;padding:24px 28px;">
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.65);">DigitalReceipt.ng</p>
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Request Received</h1>
        </td></tr>
        <tr><td style="background:#ffffff;padding:28px;">
          <p style="margin:0 0 16px 0;font-size:14px;color:#333;line-height:1.65;">
            Hi <strong>${customerName}</strong>, your receipt request has been submitted to <strong>${issuerName}</strong> and is currently awaiting review.
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;color:#555;line-height:1.65;">
            You will receive your official digital receipt by email once the request has been approved. Please allow some time for processing.
          </p>
          <p style="margin:0;font-size:12px;color:#888;">Reference: <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;">${submissionId.slice(0, 8).toUpperCase()}</code></p>
        </td></tr>
        <tr><td style="background:#e8f5ec;border-radius:0 0 12px 12px;padding:16px 28px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4a6b4a;">Powered by <strong>DigitalReceipt.ng</strong> — Nigeria's Verifiable Digital Receipt Platform.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function newRequestNotificationHtml({ issuerName, customerName, totalAmount, formTitle, dashboardUrl }: {
  issuerName: string
  customerName: string
  totalAmount: number
  formTitle: string
  dashboardUrl: string
}) {
  const amount = `₦${Number(totalAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f0f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background:#0d6b1e;border-radius:12px 12px 0 0;padding:24px 28px;">
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.65);">DigitalReceipt.ng</p>
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">New Receipt Request</h1>
        </td></tr>
        <tr><td style="background:#ffffff;padding:28px;">
          <p style="margin:0 0 16px 0;font-size:14px;color:#333;line-height:1.65;">
            Hi <strong>${issuerName}</strong>, you have received a new receipt request via <strong>${formTitle}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5fbf5;border:1px solid #c8e6c8;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 8px;font-size:12px;color:#4a6b4a;">Customer</p>
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#1a2e1a;">${customerName}</p>
              <p style="margin:0 0 4px;font-size:12px;color:#4a6b4a;">Amount</p>
              <p style="margin:0;font-size:18px;font-weight:700;color:#0d6b1e;">${amount}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${dashboardUrl}" style="display:inline-block;background:#0d6b1e;color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Review Request</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#e8f5ec;border-radius:0 0 12px 12px;padding:16px 28px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4a6b4a;">Powered by <strong>DigitalReceipt.ng</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
