import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'

export async function POST(req: NextRequest) {
  const db = createAdminClient()

  // Mobile sends a Bearer token; the website uses its cookie session.
  let user: { id: string } | null = null
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(authHeader.slice(7))
    user = data.user ?? null
  }
  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reference } = await req.json()
  if (!reference) return NextResponse.json({ error: 'Reference required' }, { status: 400 })

  // Idempotency: don't credit twice for the same reference
  const { data: existing } = await db
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('paystack_reference', reference)
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

  // Atomic credit — single DB operation, no race condition
  const { data: newBalance, error: creditError } = await db.rpc('credit_wallet', {
    p_user_id: user.id,
    p_amount: amount,
  })
  if (creditError) return NextResponse.json({ error: 'Failed to credit wallet' }, { status: 500 })

  await db.from('wallet_transactions').insert({
    user_id: user.id,
    type: 'credit',
    amount,
    description: `Wallet top-up via Paystack (ref: ${reference})`,
    balance_after: newBalance,
    paystack_reference: reference,
  })

  await logActivity({
    userId: user.id,
    type: 'wallet_topped_up',
    title: `Wallet funded with ₦${amount.toLocaleString('en-NG')}`,
    description: `New balance: ₦${newBalance.toLocaleString('en-NG')} · Ref: ${reference}`,
    meta: { amount, balance: newBalance, reference },
  })

  return NextResponse.json({ success: true, amount, balance: newBalance })
}
