import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOrgToken } from '@/lib/org-auth'

const APP_URL = 'https://digitalreceipt.ng'

function fmtNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })
}

function buildEmailHtml({ senderDisplay, receipt, verifyUrl }: { senderDisplay: string; receipt: Record<string, unknown>; verifyUrl: string }) {
  const items = (receipt.items as Array<{ description: string; quantity: number; unit_price: number; total_price: number }>) ?? []
  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e8f0e9;font-size:13px;color:#1a2e1a;">${item.description}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e8f0e9;font-size:13px;color:#4a6b4a;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e8f0e9;font-size:13px;color:#4a6b4a;text-align:right;">${fmtNaira(item.unit_price)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e8f0e9;font-size:13px;color:#1a2e1a;text-align:right;font-weight:600;">${fmtNaira(item.total_price)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receipt from ${senderDisplay}</title></head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:#0d6b1e;border-radius:12px 12px 0 0;padding:24px 28px;">
          <img src="https://digitalreceipt.ng/Full%20Logo%20for%20Green%20Background.png" alt="DigitalReceipt.ng" style="height:38px;display:block;border:0;margin-bottom:16px;" />
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${senderDisplay}<br>sent you a receipt</h1>
        </td></tr>
        <tr><td style="background:#ffffff;padding:28px;">
          <p style="margin:0 0 20px 0;font-size:14px;color:#3a5a3a;line-height:1.6;">
            Hi <strong>${receipt.buyer_name as string}</strong>, you have received a verified digital receipt for your transaction.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5fbf5;border:1px solid #c8e6c8;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="font-size:11px;color:#4a6b4a;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding-bottom:12px;">Receipt Details</td></tr>
                <tr><td style="font-size:12px;color:#4a6b4a;padding:3px 0;">Receipt No.</td><td style="font-size:12px;color:#1a2e1a;font-weight:600;text-align:right;">${receipt.receipt_number as string}</td></tr>
                <tr><td style="font-size:12px;color:#4a6b4a;padding:3px 0;">Date</td><td style="font-size:12px;color:#1a2e1a;text-align:right;">${fmtDate(receipt.transaction_date as string)}</td></tr>
                <tr><td style="font-size:12px;color:#4a6b4a;padding:3px 0;">Payment Method</td><td style="font-size:12px;color:#1a2e1a;text-align:right;">${receipt.payment_method as string}</td></tr>
                ${receipt.reference_number ? `<tr><td style="font-size:12px;color:#4a6b4a;padding:3px 0;">Reference</td><td style="font-size:12px;color:#1a2e1a;text-align:right;">${receipt.reference_number as string}</td></tr>` : ''}
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 10px 0;font-size:11px;color:#4a6b4a;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Items Purchased</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr style="border-bottom:2px solid #c8e6c8;">
              <td style="font-size:11px;color:#4a6b4a;font-weight:700;padding-bottom:6px;">Description</td>
              <td style="font-size:11px;color:#4a6b4a;font-weight:700;text-align:center;padding-bottom:6px;">Qty</td>
              <td style="font-size:11px;color:#4a6b4a;font-weight:700;text-align:right;padding-bottom:6px;">Unit</td>
              <td style="font-size:11px;color:#4a6b4a;font-weight:700;text-align:right;padding-bottom:6px;">Total</td>
            </tr>
            ${itemRows}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${(receipt.discount as number) > 0 ? `<tr><td style="font-size:13px;color:#4a6b4a;padding:3px 0;">Discount</td><td style="font-size:13px;color:#1a2e1a;text-align:right;">−${fmtNaira(receipt.discount as number)}</td></tr>` : ''}
            ${(receipt.tax as number) > 0 ? `<tr><td style="font-size:13px;color:#4a6b4a;padding:3px 0;">Tax</td><td style="font-size:13px;color:#1a2e1a;text-align:right;">${fmtNaira(receipt.tax as number)}</td></tr>` : ''}
            <tr style="border-top:2px solid #0d6b1e;"><td style="font-size:15px;font-weight:700;color:#0d6b1e;padding-top:10px;">Total Amount</td><td style="font-size:18px;font-weight:700;color:#0d6b1e;text-align:right;padding-top:10px;">${fmtNaira(receipt.total_amount as number)}</td></tr>
            ${(receipt.balance_due as number) > 0 ? `<tr><td colspan="2" style="padding-top:10px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border:1px solid #ffc107;border-radius:6px;"><tr><td style="padding:10px 14px;font-size:14px;font-weight:700;color:#856404;">Outstanding Balance</td><td style="padding:10px 14px;font-size:16px;font-weight:700;color:#856404;text-align:right;">${fmtNaira(receipt.balance_due as number)}</td></tr></table></td></tr>` : ''}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${verifyUrl}" style="display:inline-block;background:#0d6b1e;color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Verify this Receipt</a>
            </td></tr>
            <tr><td align="center" style="padding-top:10px;">
              <a href="${verifyUrl}" style="font-size:12px;color:#0d6b1e;word-break:break-all;">${verifyUrl}</a>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5fbf5;border:1px solid #c8e6c8;border-radius:8px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0 0 4px 0;font-size:11px;color:#4a6b4a;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Issued By</p>
              <p style="margin:0;font-size:14px;color:#1a2e1a;font-weight:600;">${receipt.seller_name as string}</p>
              ${receipt.seller_phone ? `<p style="margin:2px 0 0 0;font-size:12px;color:#4a6b4a;">${receipt.seller_phone as string}</p>` : ''}
              ${receipt.seller_email ? `<p style="margin:2px 0 0 0;font-size:12px;color:#4a6b4a;">${receipt.seller_email as string}</p>` : ''}
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; receiptId: string }> }
) {
  const { orgSlug, receiptId } = await params

  const token = req.cookies.get(`org_session_${orgSlug}`)?.value
  const session = token ? await verifyOrgToken(token) : null
  if (!session || session.orgSlug !== orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const rawEmail: string = body?.email?.trim() ?? ''
  const overrideEmails = rawEmail
    ? rawEmail.split(',').map((e: string) => e.trim()).filter(Boolean).slice(0, 5)
    : []

  const admin = createAdminClient()
  const { data: receipt, error } = await admin
    .from('receipts')
    .select('*, items:receipt_items(*)')
    .eq('id', receiptId)
    .eq('user_id', session.ownerUserId)
    .single()

  if (error || !receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })

  const recipients = overrideEmails.length > 0 ? overrideEmails : [receipt.buyer_email].filter(Boolean)
  if (recipients.length === 0) return NextResponse.json({ error: 'No email address provided.' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Email service not configured.' }, { status: 503 })

  const resend = new Resend(apiKey)
  const verifyUrl = `${APP_URL}/r/${receipt.unique_identifier}`
  const senderDisplay = receipt.seller_name as string

  const { error: emailError } = await resend.emails.send({
    from: 'DigitalReceipt.ng <receipts@digitalreceipt.ng>',
    to: recipients,
    subject: `${senderDisplay} sent you a receipt`,
    html: buildEmailHtml({ senderDisplay, receipt, verifyUrl }),
  })

  if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 })
  return NextResponse.json({ ok: true, sentTo: recipients })
}
