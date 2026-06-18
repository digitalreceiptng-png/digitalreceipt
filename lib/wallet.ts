import { createAdminClient } from '@/lib/supabase/admin'

export const TIER_PRICES: Record<string, number> = {
  silver: 100,
  gold: 200,
  diamond: 500,
  platinum: 1000,
  standard: 0,
  smart: 200,
}

// 5 free Silver receipts per calendar month (resets on the 1st of every month)
const MONTHLY_FREE_SILVER = 5

export type FreeType = 'lifetime' | 'monthly' | null

export interface ChargeResult {
  chargedAmount: number
  freeType: FreeType
}

export async function calculateCharge(
  userId: string,
  receiptType: string
): Promise<ChargeResult> {
  const db = createAdminClient()
  const price = TIER_PRICES[receiptType] ?? 100

  // Only Silver has free quotas
  if (receiptType !== 'silver') {
    return { chargedAmount: price, freeType: null }
  }

  // Count free Silver used this calendar month
  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString()

  const { count: monthlyUsed } = await db
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('receipt_type', 'silver')
    .eq('charged_amount', 0)
    .gte('created_at', firstOfMonth)

  if ((monthlyUsed ?? 0) < MONTHLY_FREE_SILVER) {
    return { chargedAmount: 0, freeType: 'monthly' }
  }

  return { chargedAmount: price, freeType: null }
}

export async function deductWallet(
  userId: string,
  amount: number,
  description: string,
  _receiptId?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const db = createAdminClient()

  // Read current balance
  const { data: wallet, error: walletError } = await db
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single()

  if (walletError || !wallet) return { success: false, error: 'Wallet not found' }

  const currentBalance = wallet.balance ?? 0
  if (currentBalance < amount) return { success: false, error: 'Insufficient balance' }

  const newBalance = parseFloat((currentBalance - amount).toFixed(2))

  // Update balance
  const { error: updateError } = await db
    .from('wallets')
    .update({ balance: newBalance })
    .eq('user_id', userId)

  if (updateError) return { success: false, error: updateError.message }

  // Record transaction
  await db.from('wallet_transactions').insert({
    user_id: userId,
    type: 'debit',
    amount,
    description,
    balance_after: newBalance,
  })

  checkAndSendLowBalanceAlert(userId, newBalance).catch(console.error)
  return { success: true, newBalance }
}

async function checkAndSendLowBalanceAlert(userId: string, balance: number): Promise<void> {
  const silver = TIER_PRICES.silver // 100
  // Only alert when balance can cover 1–2 Silver receipts (₦100–₦199)
  if (balance < silver || balance >= silver * 3) return

  const db = createAdminClient()

  const { data: wallet } = await db
    .from('wallets')
    .select('low_balance_notified_at')
    .eq('user_id', userId)
    .single()

  if (wallet?.low_balance_notified_at) {
    const daysSince = (Date.now() - new Date(wallet.low_balance_notified_at).getTime()) / 86_400_000
    if (daysSince < 7) return
  }

  const { data: profile } = await db
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()

  if (!profile?.email) return

  await db.from('wallets').update({ low_balance_notified_at: new Date().toISOString() }).eq('user_id', userId)

  const { sendEmail, lowBalanceHtml } = await import('@/lib/email')
  const name = profile.full_name?.split(' ')[0] || 'there'
  const receiptsLeft = Math.floor(balance / silver)
  await sendEmail({
    to: profile.email,
    subject: 'Your DigitalReceipt.ng wallet is running low',
    html: lowBalanceHtml({ name, balance, receiptsLeft }),
  })
}

export async function getWalletBalance(userId: string): Promise<number> {
  const db = createAdminClient()
  const { data } = await db
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single()
  return data?.balance ?? 0
}

export const MIN_TOPUP = {
  individual: 500,
  business: 1000,
}
