import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  let body: {
    to: string
    businessName: string
    clientName: string
    invoiceNo: string
    date: string
    currency: string
    items: { description: string; qty: number; price: number }[]
    subtotal: number
    bankName?: string
    accountName?: string
    accountNumber?: string
    paymentMethods?: string[]
    notes?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { to, businessName, clientName, invoiceNo, date, currency, items, subtotal, bankName, accountName, accountNumber, paymentMethods, notes } = body

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'A valid recipient email is required.' }, { status: 400 })
  }

  const itemRows = items
    .filter(i => i.description)
    .map(i => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e8e0d0;font-size:13px;color:#1a1a1a">${i.description}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e8e0d0;font-size:13px;color:#555;text-align:center">${i.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e8e0d0;font-size:13px;color:#1a1a1a;text-align:right;font-weight:600">${currency}${(i.qty * i.price).toLocaleString()}</td>
      </tr>
    `).join('')

  const hasBankDetails = bankName || accountName || accountNumber
  const paymentBlock = hasBankDetails || (paymentMethods && paymentMethods.length > 0) ? `
    <div style="margin-top:20px;padding:16px;background:#f8f5ef;border-radius:8px">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#888;margin:0 0 10px">Payment Details</p>
      ${bankName ? `<p style="font-size:13px;color:#555;margin:3px 0">Bank: <strong style="color:#1a1a1a">${bankName}</strong></p>` : ''}
      ${accountName ? `<p style="font-size:13px;color:#555;margin:3px 0">Account Name: <strong style="color:#1a1a1a">${accountName}</strong></p>` : ''}
      ${accountNumber ? `<p style="font-size:13px;color:#555;margin:3px 0">Account No: <strong style="color:#1a1a1a">${accountNumber}</strong></p>` : ''}
      ${paymentMethods && paymentMethods.length ? `<p style="font-size:13px;color:#555;margin:3px 0">Accepted: <strong style="color:#1a1a1a">${paymentMethods.join(', ')}</strong></p>` : ''}
    </div>
  ` : ''

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px 16px;background:#f8f5ef">
  <div style="background:#1a5c2a;border-radius:12px 12px 0 0;padding:28px 28px 22px">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin:0 0 6px">DigitalReceipt.ng</p>
    <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0;line-height:1.3">
      ${businessName || 'Someone'} sent you an invoice
    </h1>
  </div>

  <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px;border:1px solid #e8e0d0;border-top:none">
    <p style="font-size:14px;color:#444;line-height:1.65;margin:0 0 20px">
      Hi <strong>${clientName || 'there'}</strong>, please find your invoice details below.
    </p>

    <div style="background:#f8f5ef;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#888;margin:0 0 8px">Invoice Details</p>
      <p style="font-size:13px;color:#555;margin:3px 0">Invoice No: <strong style="color:#1a1a1a">${invoiceNo}</strong></p>
      <p style="font-size:13px;color:#555;margin:3px 0">Date: <strong style="color:#1a1a1a">${date}</strong></p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
      <thead>
        <tr>
          <th style="text-align:left;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;padding-bottom:8px;border-bottom:2px solid #e8e0d0">Item</th>
          <th style="text-align:center;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;padding-bottom:8px;border-bottom:2px solid #e8e0d0">Qty</th>
          <th style="text-align:right;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;padding-bottom:8px;border-bottom:2px solid #e8e0d0">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-top:2px solid #1a1a1a;margin-top:4px">
      <span style="font-size:15px;font-weight:700;color:#1a1a1a">Total</span>
      <span style="font-size:18px;font-weight:800;color:#1a5c2a">${currency}${subtotal.toLocaleString()}</span>
    </div>

    ${paymentBlock}
    ${notes ? `<div style="margin-top:20px;border-top:1px dashed #e8e0d0;padding-top:16px"><p style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#888;margin:0 0 6px">Notes</p><p style="font-size:13px;color:#555;line-height:1.65;margin:0">${notes}</p></div>` : ''}
  </div>

  <p style="text-align:center;font-size:11px;color:#aaa;margin-top:20px">
    Issued via <strong style="color:#1a5c2a">DigitalReceipt.ng</strong> — Nigeria's Receipt Verification Infrastructure
  </p>
</body>
</html>`

  const sent = await sendEmail({
    to,
    subject: `Invoice ${invoiceNo} from ${businessName || 'DigitalReceipt.ng'}`,
    html,
  })

  if (!sent) {
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
