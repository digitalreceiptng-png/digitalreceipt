import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const effectiveUserId = getEffectiveUserId(user)
  const db = createAdminClient()

  const [{ data: wallet }, { data: transactions }, { data: profile }] = await Promise.all([
    db.from('wallets').select('balance, updated_at').eq('user_id', effectiveUserId).single(),
    db
      .from('wallet_transactions')
      .select('id, type, amount, description, balance_after, created_at, receipt_id')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(200),
    db.from('profiles').select('is_verified, issuer_type').eq('id', effectiveUserId).single(),
  ])

  return NextResponse.json({
    balance: wallet?.balance ?? 0,
    transactions: transactions ?? [],
    is_verified: profile?.is_verified ?? false,
    issuer_type: profile?.issuer_type ?? 'individual',
  })
}
