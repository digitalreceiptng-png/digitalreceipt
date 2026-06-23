import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueIdentifier, generateReceiptNumber } from '@/lib/generateIds'
import { deductWallet } from '@/lib/wallet'
import { sendEmail } from '@/lib/email'
import { logActivity } from '@/lib/activity'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://digitalreceipt.ng'

async function uniqueId(db: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = generateUniqueIdentifier()
    const { data } = await db.from('receipts').select('id').eq('unique_identifier', id).maybeSingle()
    if (!data) return id
  }
  throw new Error('Could not generate unique identifier')
}

async function uniqueReceiptNumber(db: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const num = generateReceiptNumber()
    const { data } = await db.from('receipts').select('id').eq('receipt_number', num).maybeSingle()
    if (!data) return num
  }
  throw new Error('Could not generate unique receipt number')
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: submission } = await db
    .from('receipt_form_submissions')
    .select('*, form:receipt_forms(field_labels, vat_enabled, vat_rate)')
    .eq('id', id)
    .eq('issuer_id', user.id)
    .single()

  if (!submission) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (submission.status !== 'pending') return NextResponse.json({ error: 'Request already reviewed' }, { status: 409 })

  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const receiptType = 'gold'
  const freeType = null
  const chargedAmount = 200

  const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', user.id).single()
  const balance = wallet?.balance ?? 0
  if (balance < chargedAmount) {
    return NextResponse.json({
      error: 'Insufficient wallet balance. You need ₦200 to approve a receipt request.',
      code: 'INSUFFICIENT_BALANCE',
      required: chargedAmount,
      balance,
      shortfall: chargedAmount - balance,
    }, { status: 402 })
  }

  // Calculate VAT if enabled
  const form = submission.form as { field_labels: Record<string, string>; vat_enabled: boolean; vat_rate: number | null } | null
  const vatEnabled = form?.vat_enabled ?? false
  const vatRate = form?.vat_rate ?? 7.5
  const subtotal = Number(submission.total_amount ?? 0)
  const tax = vatEnabled ? Math.round(subtotal * (vatRate / 100) * 100) / 100 : 0
  const totalAmount = subtotal + tax

  // Build notes from submission context
  const noteParts: string[] = []
  if (submission.purpose_of_payment) noteParts.push(`Purpose: ${submission.purpose_of_payment}`)
  if (submission.unit_label && submission.unit_value) noteParts.push(`${submission.unit_label}: ${submission.unit_value}`)
  if (submission.additional_notes) noteParts.push(submission.additional_notes)
  const notes = noteParts.join('\n') || null

  const sellerName = profile.issuer_type === 'business'
    ? (profile.business_name || profile.full_name)
    : profile.full_name

  const unique_identifier = await uniqueId(db)
  const receipt_number = await uniqueReceiptNumber(db)

  const transactionDate = submission.payment_date ?? new Date().toISOString().split('T')[0]

  const { data: receipt, error: receiptError } = await db
    .from('receipts')
    .insert({
      user_id: user.id,
      receipt_number,
      unique_identifier,
      receipt_type: receiptType,
      seller_name: sellerName,
      seller_phone: profile.phone ?? '',
      seller_email: profile.email,
      seller_address: profile.address,
      seller_rc_number: profile.rc_number,
      seller_nin: profile.nin,
      buyer_name: submission.customer_name,
      buyer_phone: submission.customer_phone ?? '',
      buyer_email: submission.customer_email ?? '',
      transaction_date: transactionDate,
      payment_date: submission.payment_date ?? null,
      payment_method: submission.payment_method ?? 'Bank Transfer',
      notes,
      subtotal,
      discount: 0,
      tax,
      total_amount: totalAmount,
      charged_amount: chargedAmount,
      free_type: freeType,
    })
    .select()
    .single()

  if (receiptError) return NextResponse.json({ error: receiptError.message }, { status: 500 })

  // Insert line item if description provided
  if (submission.item_description) {
    const fieldLabels = form?.field_labels ?? {}
    const descLabel = fieldLabels.item_description || 'Item Description'
    await db.from('receipt_items').insert({
      receipt_id: receipt.id,
      description: submission.item_description,
      quantity: 1,
      unit_price: Number(submission.unit_price ?? submission.total_amount ?? 0),
      total_price: subtotal,
      sort_order: 0,
    })
    void descLabel // referenced in notes above
  }

  // Deduct wallet
  if (chargedAmount > 0) {
    await deductWallet(user.id, chargedAmount, `Receipt Request Approval — ${receipt_number}`, receipt.id)
  }

  // Update submission
  await db
    .from('receipt_form_submissions')
    .update({ status: 'confirmed', receipt_id: receipt.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)

  // Email receipt to customer
  if (submission.customer_email) {
    const verifyUrl = `${APP_URL}/r/${unique_identifier}`
    await sendEmail({
      to: submission.customer_email,
      subject: `${sellerName} sent you a receipt`,
      html: receiptConfirmedHtml({ sellerName, receipt, verifyUrl, submission, tax, totalAmount }),
    })
  }

  await logActivity({
    userId: user.id,
    type: 'request_approved',
    title: `Receipt request approved for ${submission.customer_name}`,
    description: `Receipt ${receipt_number} · ₦${totalAmount.toLocaleString('en-NG')}`,
    entityId: receipt.id,
    entityType: 'receipt',
    meta: { receipt_number, amount: totalAmount },
  })

  return NextResponse.json({ ok: true, receipt: { id: receipt.id, receipt_number, unique_identifier } })
}

function fmtNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}

function receiptConfirmedHtml({ sellerName, receipt, verifyUrl, submission, tax, totalAmount }: {
  sellerName: string
  receipt: Record<string, unknown>
  verifyUrl: string
  submission: Record<string, unknown>
  tax: number
  totalAmount: number
}) {
  const subtotal = Number(submission.total_amount ?? 0)
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f0f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:#0d6b1e;border-radius:12px 12px 0 0;padding:24px 28px;">
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.65);">DigitalReceipt.ng</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${sellerName}<br>sent you a receipt</h1>
        </td></tr>
        <tr><td style="background:#ffffff;padding:28px;">
          <p style="margin:0 0 20px 0;font-size:14px;color:#3a5a3a;line-height:1.6;">
            Hi <strong>${submission.customer_name as string}</strong>, your receipt has been approved and issued. You can verify its authenticity at any time using the link below.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5fbf5;border:1px solid #c8e6c8;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="font-size:11px;color:#4a6b4a;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px;">Receipt Details</td></tr>
                <tr>
                  <td style="font-size:12px;color:#4a6b4a;padding:3px 0;">Receipt No.</td>
                  <td style="font-size:12px;color:#1a2e1a;font-weight:600;text-align:right;">${receipt.receipt_number as string}</td>
                </tr>
                ${submission.purpose_of_payment ? `<tr><td style="font-size:12px;color:#4a6b4a;padding:3px 0;">Purpose</td><td style="font-size:12px;color:#1a2e1a;text-align:right;">${submission.purpose_of_payment as string}</td></tr>` : ''}
                ${submission.item_description ? `<tr><td style="font-size:12px;color:#4a6b4a;padding:3px 0;">Description</td><td style="font-size:12px;color:#1a2e1a;text-align:right;">${submission.item_description as string}</td></tr>` : ''}
                ${submission.unit_label && submission.unit_value ? `<tr><td style="font-size:12px;color:#4a6b4a;padding:3px 0;">${submission.unit_label as string}</td><td style="font-size:12px;color:#1a2e1a;text-align:right;">${submission.unit_value as string}</td></tr>` : ''}
                <tr>
                  <td style="font-size:12px;color:#4a6b4a;padding:3px 0;">Payment Method</td>
                  <td style="font-size:12px;color:#1a2e1a;text-align:right;">${submission.payment_method as string ?? 'Bank Transfer'}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${tax > 0 ? `<tr><td style="font-size:13px;color:#4a6b4a;padding:3px 0;">Subtotal</td><td style="font-size:13px;color:#1a2e1a;text-align:right;">${fmtNaira(subtotal)}</td></tr>
            <tr><td style="font-size:13px;color:#4a6b4a;padding:3px 0;">VAT</td><td style="font-size:13px;color:#1a2e1a;text-align:right;">${fmtNaira(tax)}</td></tr>` : ''}
            <tr style="border-top:2px solid #0d6b1e;">
              <td style="font-size:15px;font-weight:700;color:#0d6b1e;padding-top:10px;">Total Paid</td>
              <td style="font-size:18px;font-weight:700;color:#0d6b1e;text-align:right;padding-top:10px;">${fmtNaira(totalAmount)}</td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${verifyUrl}" style="display:inline-block;background:#0d6b1e;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Verify this Receipt</a>
            </td></tr>
            <tr><td align="center" style="padding-top:10px;">
              <a href="${verifyUrl}" style="font-size:12px;color:#0d6b1e;word-break:break-all;">${verifyUrl}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#e8f5ec;border-radius:0 0 12px 12px;padding:16px 28px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4a6b4a;">Issued and verified by <strong>DigitalReceipt.ng</strong> — Nigeria's Receipt Verification Infrastructure.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
