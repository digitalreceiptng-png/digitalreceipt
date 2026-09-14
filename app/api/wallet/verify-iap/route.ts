import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'

// Consumable wallet top-up products configured in App Store Connect.
// Amounts are in Naira and must match the product's App Store Connect price point.
const IAP_PRODUCTS: Record<string, number> = {
  wallet_topup_1000: 1000,
  wallet_topup_2000: 2000,
  wallet_topup_5000: 5000,
  wallet_topup_10000: 10000,
}

async function verifyWithApple(receiptData: string) {
  const body = JSON.stringify({
    'receipt-data': receiptData,
    password: process.env.APPLE_IAP_SHARED_SECRET,
    'exclude-old-transactions': true,
  })

  let res = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  let data = await res.json()

  // 21007: this is a sandbox receipt sent to the production endpoint — retry against sandbox.
  if (data.status === 21007) {
    res = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    data = await res.json()
  }

  return data
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiptData, transactionId } = await req.json()
  if (!receiptData || !transactionId) {
    return NextResponse.json({ error: 'receiptData and transactionId are required' }, { status: 400 })
  }

  const db = createAdminClient()
  const reference = `apple:${transactionId}`

  // Idempotency: don't credit twice for the same Apple transaction
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

  const verified = await verifyWithApple(receiptData)
  if (verified.status !== 0) {
    return NextResponse.json({ error: `Apple receipt verification failed (status ${verified.status})` }, { status: 400 })
  }

  const entries: any[] = verified.receipt?.in_app ?? verified.latest_receipt_info ?? []
  const match = entries.find((e) => e.transaction_id === transactionId)
  if (!match) {
    return NextResponse.json({ error: 'Transaction not found in verified receipt' }, { status: 400 })
  }

  const amount = IAP_PRODUCTS[match.product_id]
  if (!amount) {
    return NextResponse.json({ error: `Unknown product: ${match.product_id}` }, { status: 400 })
  }

  const { data: newBalance, error: creditError } = await db.rpc('credit_wallet', {
    p_user_id: user.id,
    p_amount: amount,
  })
  if (creditError) return NextResponse.json({ error: 'Failed to credit wallet' }, { status: 500 })

  await db.from('wallet_transactions').insert({
    user_id: user.id,
    type: 'credit',
    amount,
    description: `Wallet top-up via Apple In-App Purchase (${match.product_id})`,
    balance_after: newBalance,
    paystack_reference: reference,
  })

  await logActivity({
    userId: user.id,
    type: 'wallet_topped_up',
    title: `Wallet funded with ₦${amount.toLocaleString('en-NG')}`,
    description: `New balance: ₦${newBalance.toLocaleString('en-NG')} · Apple transaction: ${transactionId}`,
    meta: { amount, balance: newBalance, transactionId, productId: match.product_id },
  })

  return NextResponse.json({ success: true, amount, balance: newBalance })
}
