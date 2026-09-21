import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'

export async function creditFromReference(reference: string) {
  const db = createAdminClient()
  let data: any
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: 'no-store',
    })
    data = await res.json()
    if (data.status && data.data?.status === 'success') break
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1500))
  }

  let metadata = data.data?.metadata
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata) } catch { metadata = null }
  }
  const userId = metadata?.user_id
  if (!data.status || data.data?.status !== 'success' || !userId) return { ok: false }

  const { data: existing } = await db.from('wallet_transactions').select('id').eq('user_id', userId).eq('paystack_reference', reference).maybeSingle()
  if (existing) return { ok: true, alreadyCredited: true }

  const amount = data.data.amount / 100
  const { data: newBalance, error } = await db.rpc('credit_wallet', { p_user_id: userId, p_amount: amount })
  if (error) throw error
  await db.from('wallet_transactions').insert({
    user_id: userId,
    type: 'credit',
    amount,
    description: `Wallet top-up via Paystack (ref: ${reference})`,
    balance_after: newBalance,
    paystack_reference: reference,
  })
  await logActivity({
    userId,
    type: 'wallet_topped_up',
    title: `Wallet funded with ₦${amount.toLocaleString('en-NG')}`,
    description: `New balance: ₦${newBalance.toLocaleString('en-NG')} · Ref: ${reference}`,
    meta: { amount, balance: newBalance, reference },
  })
  return { ok: true, amount, balance: newBalance }
}