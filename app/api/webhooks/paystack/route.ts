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

  const db = createAdminClient()

  // Idempotency: webhook may fire more than once
  const { data: existing } = await db
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', userId)
    .ilike('description', `%${reference}%`)
    .maybeSingle()

  if (existing) return NextResponse.json({ received: true })

  const amount = amountKobo / 100
  const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', userId).single()
  const newBalance = (wallet?.balance ?? 0) + amount

  await Promise.all([
    db.from('wallets').update({ balance: newBalance }).eq('user_id', userId),
    db.from('wallet_transactions').insert({
      user_id: userId,
      type: 'credit',
      amount,
      description: `Wallet top-up via Paystack (ref: ${reference})`,
      balance_after: newBalance,
    }),
  ])

  return NextResponse.json({ received: true })
}
