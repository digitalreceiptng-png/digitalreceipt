const FROM = 'DigitalReceipt.ng <noreply@digitalreceipt.ng>'

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
  <p style="font-size:13px;color:#888;margin-bottom:20px">DigitalReceipt.ng</p>
  <h2 style="font-size:20px;margin:0 0 12px">Your wallet is running low</h2>
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
