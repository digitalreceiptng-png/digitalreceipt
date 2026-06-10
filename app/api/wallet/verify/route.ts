import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reference } = await req.json()
  if (!reference) return NextResponse.json({ error: 'Reference required' }, { status: 400 })

  const db = createAdminClient()

  // Idempotency: don't credit twice for the same reference
  const { data: existing } = await db
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', user.id)
    .ilike('description', `%${reference}%`)
    .maybeSingle()

  if (existing) {
    const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', user.id).single()
    return NextResponse.json({ success: true, already_credited: true, balance: wallet?.balance ?? 0 })
  }

  // Verify with Paystack
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  })
  const data = await res.json()

  if (!data.status || data.data?.status !== 'success') {
    return NextResponse.json({ error: 'Payment was not successful' }, { status: 400 })
  }

  // Confirm metadata matches this user
  if (data.data.metadata?.user_id !== user.id) {
    return NextResponse.json({ error: 'Reference does not belong to this account' }, { status: 403 })
  }

  const amount = data.data.amount / 100

  // Credit wallet atomically
  const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', user.id).single()
  const newBalance = (wallet?.balance ?? 0) + amount

  await Promise.all([
    db.from('wallets').update({ balance: newBalance }).eq('user_id', user.id),
    db.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'credit',
      amount,
      description: `Wallet top-up via Paystack (ref: ${reference})`,
      balance_after: newBalance,
    }),
  ])

  return NextResponse.json({ success: true, amount, balance: newBalance })
}
