import { NextRequest, NextResponse } from 'next/server'
import { creditFromReference } from '@/lib/wallet-credit'
import { createHmac } from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature')

  const hash = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true })
  }

  const { reference, metadata } = event.data
  const userId = metadata?.user_id

  if (!userId || metadata?.purpose !== 'wallet_topup') {
    return NextResponse.json({ received: true })
  }

  // Credit from the webhook as Paystack recommends, so a top-up lands even if the
  // user closes the app mid-payment. Verified with Paystack and credited once.
  try {
    await creditFromReference(reference)
  } catch (err) {
    console.error('[paystack webhook] credit failed:', err)
  }
  return NextResponse.json({ received: true })
}
