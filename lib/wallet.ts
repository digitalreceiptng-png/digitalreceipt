import { createAdminClient } from '@/lib/supabase/admin'

export const TIER_PRICES: Record<string, number> = {
  silver: 100,
  gold: 200,
  diamond: 500,
  platinum: 1000,
  standard: 0,
  smart: 200,
}

// 5 lifetime free Silver receipts, then 2 free Silver per calendar month
const LIFETIME_FREE_SILVER = 5
const MONTHLY_FREE_SILVER = 2

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

  // Count lifetime free Silver used (all time, charged_amount = 0, free_type = 'lifetime')
  const { count: lifetimeUsed } = await db
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('receipt_type', 'silver')
    .eq('free_type', 'lifetime')

  if ((lifetimeUsed ?? 0) < LIFETIME_FREE_SILVER) {
    return { chargedAmount: 0, freeType: 'lifetime' }
  }

  // Count monthly free Silver used this calendar month
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
    .eq('free_type', 'monthly')
    .gte('created_at', firstOfMonth)

  if ((monthlyUsed ?? 0) < MONTHLY_FREE_SILVER) {
    return { chargedAmount: 0, freeType: 'monthly' }
  }

  return { chargedAmount: price, freeType: null }
}

// Atomically deduct wallet balance via RPC (prevents race conditions)
export async function deductWallet(
  userId: string,
  amount: number,
  description: string,
  receiptId?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const db = createAdminClient()
  const { data, error } = await db.rpc('deduct_wallet_balance', {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
    p_receipt_id: receiptId ?? null,
  })

  if (error) return { success: false, error: error.message }
  if (!data?.success) return { success: false, error: data?.error ?? 'Deduction failed' }
  return { success: true, newBalance: data.new_balance }
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
