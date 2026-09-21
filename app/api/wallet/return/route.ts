import { NextRequest, NextResponse } from 'next/server'
import { creditFromReference } from '@/lib/wallet-credit'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const reference = url.searchParams.get('reference') ?? url.searchParams.get('trxref')
  let status = 'failed'
  if (reference) {
    try {
      if ((await creditFromReference(reference)).ok) status = 'success'
    } catch (error) {
      console.error('[wallet return] credit failed:', error)
    }
  }
  const link = `digitalreceipt://wallet?status=${status}`
  const html = `<!doctype html><html><body><h2>${status === 'success' ? 'Payment received' : 'Payment not completed'}</h2><p>Returning to DigitalReceipt...</p><a href="${link}">Return to app</a><script>window.location.replace(${JSON.stringify(link)})</script></body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}