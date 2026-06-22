const FROM = 'DigitalReceipt.ng <noreply@digitalreceipt.ng>'

// Logo hosted on production — use the correct variant per background colour
const LOGO_LIGHT = 'https://digitalreceipt.ng/full%20logo%20for%20white%20background.png'
const LOGO_DARK  = 'https://digitalreceipt.ng/Full%20Logo%20for%20Green%20Background.png'

export function emailLogo(variant: 'light' | 'dark' = 'light') {
  const src = variant === 'dark' ? LOGO_DARK : LOGO_LIGHT
  return `<img src="${src}" alt="DigitalReceipt.ng" style="height:38px;display:block;border:0;" />`
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!res.ok) {
      console.error('[email] Resend error:', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (err) {
    console.error('[email] Send failed:', err)
    return false
  }
}

export function paymentReminderHtml({
  buyerName,
  sellerName,
  receiptNumber,
  totalAmount,
  amountPaid,
  balanceDue,
  transactionDate,
  paymentMethod,
  receiptUrl,
  sendCount,
}: {
  buyerName: string
  sellerName: string
  receiptNumber: string
  totalAmount: number
  amountPaid: number
  balanceDue: number
  transactionDate: string
  paymentMethod: string
  receiptUrl: string
  sendCount: number
}) {
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  const date = new Date(transactionDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })
  const ordinal = (n: number) => n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:540px;margin:0 auto;padding:24px 16px;background:#f9fafb;">
  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#1a3a1a;padding:24px 28px;">
      ${emailLogo('dark')}
      <h1 style="font-size:20px;color:#fff;margin:16px 0 0;font-weight:700;">Payment Reminder</h1>
    </div>

    <div style="padding:28px;">
      <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
        Hi <strong>${buyerName}</strong>, this is a${sendCount === 1 ? '' : ` ${ordinal(sendCount)}`} reminder from <strong>${sellerName}</strong> about an outstanding payment on your account.
      </p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center;">
        <p style="font-size:12px;color:#991b1b;margin:0 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Outstanding Balance</p>
        <p style="font-size:36px;font-weight:800;color:#dc2626;margin:0;letter-spacing:-1px;">${fmt(balanceDue)}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;">Receipt Number</td>
          <td style="padding:10px 0;text-align:right;font-family:monospace;color:#111827;font-weight:600;">${receiptNumber}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;">Transaction Date</td>
          <td style="padding:10px 0;text-align:right;color:#111827;">${date}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;">Payment Method</td>
          <td style="padding:10px 0;text-align:right;color:#111827;">${paymentMethod}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;">Total Amount</td>
          <td style="padding:10px 0;text-align:right;color:#111827;">${fmt(totalAmount)}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;">Amount Paid</td>
          <td style="padding:10px 0;text-align:right;color:#059669;font-weight:600;">${fmt(amountPaid)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#111827;font-weight:700;">Balance Due</td>
          <td style="padding:10px 0;text-align:right;color:#dc2626;font-weight:700;font-size:15px;">${fmt(balanceDue)}</td>
        </tr>
      </table>

      <a href="${receiptUrl}"
         style="display:block;text-align:center;background:#15803d;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:20px;">
        View Receipt
      </a>

      <p style="font-size:13px;color:#9ca3af;margin:0;text-align:center;line-height:1.6;">
        Please contact <strong style="color:#6b7280;">${sellerName}</strong> if you believe this is an error or if you have already made payment.<br/>
        This reminder was sent on behalf of ${sellerName} via DigitalReceipt.ng.
      </p>
    </div>
  </div>
</body>
</html>`
}

export function lowBalanceHtml({
  name,
  balance,
  receiptsLeft,
}: {
  name: string
  balance: number
  receiptsLeft: number
}) {
  const appUrl = 'https://digitalreceipt.ng'
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:520px;margin:0 auto;padding:24px 16px">
  ${emailLogo('light')}
  <h2 style="font-size:20px;margin:20px 0 12px">Your wallet is running low</h2>
  <p style="color:#444;line-height:1.65;margin:0 0 16px">
    Hi ${name}, your wallet balance is <strong>₦${balance.toLocaleString()}</strong>.
    You can issue <strong>${receiptsLeft} more receipt${receiptsLeft !== 1 ? 's' : ''}</strong> before it runs out.
  </p>
  <p style="margin:0 0 28px">
    <a href="${appUrl}/dashboard/wallet"
       style="display:inline-block;background:#2d7a3a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Top up wallet
    </a>
  </p>
  <p style="font-size:12px;color:#aaa;margin:0">
    You received this because your DigitalReceipt.ng wallet balance is low.
  </p>
</body>
</html>`
}

export function installmentReminderHtml({
  buyerName,
  sellerName,
  receiptNumber,
  installmentLabel,
  installmentAmount,
  dueDate,
  receiptUrl,
}: {
  buyerName: string
  sellerName: string
  receiptNumber: string
  installmentLabel: string
  installmentAmount: number
  dueDate: string
  receiptUrl: string
}) {
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
  const due = new Date(dueDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:540px;margin:0 auto;padding:24px 16px;background:#f9fafb;">
  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#1a3a1a;padding:24px 28px;">
      ${emailLogo('dark')}
      <h1 style="font-size:20px;color:#fff;margin:16px 0 0;font-weight:700;">Installment Payment Due</h1>
    </div>
    <div style="padding:28px;">
      <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
        Hi <strong>${buyerName}</strong>, this is a reminder from <strong>${sellerName}</strong> that an installment payment is due on your account.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center;">
        <p style="font-size:12px;color:#991b1b;margin:0 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Amount Due</p>
        <p style="font-size:36px;font-weight:800;color:#dc2626;margin:0 0 6px;letter-spacing:-1px;">${fmt(installmentAmount)}</p>
        <p style="font-size:13px;color:#b91c1c;margin:0;">${installmentLabel}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;">Receipt Number</td>
          <td style="padding:10px 0;text-align:right;font-family:monospace;color:#111827;font-weight:600;">${receiptNumber}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 0;color:#6b7280;">Due Date</td>
          <td style="padding:10px 0;text-align:right;color:#dc2626;font-weight:600;">${due}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280;">Seller</td>
          <td style="padding:10px 0;text-align:right;color:#111827;">${sellerName}</td>
        </tr>
      </table>
      <a href="${receiptUrl}" style="display:block;text-align:center;background:#15803d;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:20px;">
        View Receipt
      </a>
      <p style="font-size:13px;color:#9ca3af;margin:0;text-align:center;line-height:1.6;">
        Please contact <strong style="color:#6b7280;">${sellerName}</strong> if you have already made this payment.<br/>
        This reminder was sent on behalf of ${sellerName} via DigitalReceipt.ng.
      </p>
    </div>
  </div>
</body>
</html>`
}

