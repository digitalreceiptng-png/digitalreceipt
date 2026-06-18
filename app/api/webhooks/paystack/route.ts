import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const { reference, amount: amountKobo, metadata } = event.data
  const userId = metadata?.user_id

  if (!userId || metadata?.purpose !== 'wallet_topup') {
    return NextResponse.json({ received: true })
  }

  // Webhook is acknowledgment only — wallet crediting happens in /api/wallet/verify
  // (which authenticates the user before crediting, preventing race conditions)
  return NextResponse.json({ received: true })
}
