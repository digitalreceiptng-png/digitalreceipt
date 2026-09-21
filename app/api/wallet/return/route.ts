import { NextRequest, NextResponse } from 'next/server'
import { creditFromReference } from '@/lib/wallet-credit'

// Paystack sends the mobile app's payment page back here. The server confirms
// and credits the payment itself, so the wallet is funded even if the app is
// slow to resume, then hands control back to the app through its deep link.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reference = searchParams.get('reference') ?? searchParams.get('trxref')

  let status = 'failed'
  if (reference) {
    try {
      const result = await creditFromReference(reference)
      if (result.ok) status = 'success'
    } catch (err) {
      console.error('[wallet return] credit failed:', err)
    }
  }

  const link = `digitalreceipt://wallet?status=${status}`
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Returning to app</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:48px 24px;color:#1a2e22}a{display:inline-block;margin-top:20px;padding:14px 28px;background:#1a3728;color:#fff;border-radius:10px;text-decoration:none;font-weight:600}</style></head>
<body><h2>${status === 'success' ? 'Payment received' : 'Payment not completed'}</h2><p>Returning you to DigitalReceipt.ng…</p>
<a href="${link}">Return to app</a>
<script>window.location.replace(${JSON.stringify(link)})</script></body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
