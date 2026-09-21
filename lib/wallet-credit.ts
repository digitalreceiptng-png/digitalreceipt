import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'

export type CreditResult =
  | { ok: true; already: boolean; userId: string; amount: number; balance: number | null }
  | { ok: false; error: string; status: number }

// Verifies a Paystack reference with Paystack itself, then credits the wallet
// exactly once. The user is taken from the verified transaction's metadata (set
// by our own /api/wallet/fund), never from the caller, so this is safe to run
// from a server redirect as well as from an authenticated request.
export async function creditFromReference(reference: string, expectedUserId?: string): Promise<CreditResult> {
  const db = createAdminClient()

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.status || data.data?.status !== 'success') {
    return { ok: false, error: 'Payment was not successful', status: 400 }
  }

  const userId: string | undefined = data.data.metadata?.user_id
  if (!userId || data.data.metadata?.purpose !== 'wallet_topup') {
    return { ok: false, error: 'Not a wallet top-up', status: 400 }
  }
  if (expectedUserId && userId !== expectedUserId) {
    return { ok: false, error: 'Reference does not belong to this account', status: 403 }
  }

  // Paystack: always confirm the amount matches what we asked to charge.
  const expectedKobo = data.data.metadata?.expected_amount_kobo
  if (expectedKobo !== undefined && Number(expectedKobo) !== Number(data.data.amount)) {
    return { ok: false, error: 'Amount does not match the requested top-up', status: 400 }
  }

  const amount = data.data.amount / 100
  const currentBalance = async () => {
    const { data: w } = await db.from('wallets').select('balance').eq('user_id', userId).single()
    return w?.balance ?? null
  }

  const { data: existing } = await db
    .from('wallet_transactions').select('id').eq('paystack_reference', reference).maybeSingle()
  if (existing) return { ok: true, already: true, userId, amount, balance: await currentBalance() }

  // Claim the reference BEFORE crediting so a repeat request finds it and stops.
  const { data: claim, error: claimErr } = await db
    .from('wallet_transactions')
    .insert({
      user_id: userId,
      type: 'credit',
      amount,
      description: `Wallet top-up via Paystack (ref: ${reference})`,
      balance_after: 0,
      paystack_reference: reference,
    })
    .select('id')
    .single()
  if (claimErr || !claim) {
    if (claimErr?.code === '23505') return { ok: true, already: true, userId, amount, balance: await currentBalance() }
    return { ok: false, error: 'Could not record the payment', status: 500 }
  }

  const { data: newBalance, error: creditError } = await db.rpc('credit_wallet', { p_user_id: userId, p_amount: amount })
  if (creditError) {
    await db.from('wallet_transactions').delete().eq('id', claim.id)
    return { ok: false, error: 'Failed to credit wallet', status: 500 }
  }

  await db.from('wallet_transactions').update({ balance_after: newBalance }).eq('id', claim.id)

  await logActivity({
    userId,
    type: 'wallet_topped_up',
    title: `Wallet funded with ₦${amount.toLocaleString('en-NG')}`,
    description: `New balance: ₦${Number(newBalance).toLocaleString('en-NG')} · Ref: ${reference}`,
    meta: { amount, balance: newBalance, reference },
  })

  return { ok: true, already: false, userId, amount, balance: newBalance }
}
