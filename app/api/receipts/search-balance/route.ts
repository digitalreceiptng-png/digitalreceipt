import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/receipts/search-balance?buyerName=xxx&excludeId=xxx
// Returns receipts with outstanding balance matching the buyer name
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const buyerName = req.nextUrl.searchParams.get('buyerName')?.trim() ?? ''
  const excludeId = req.nextUrl.searchParams.get('excludeId') ?? ''

  const db = createAdminClient()

  let query = db
    .from('receipts')
    .select('id, receipt_number, buyer_name, total_amount, amount_paid, balance_due, transaction_date, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .is('parent_receipt_id', null)
    .is('merged_into_id', null)
    .gt('balance_due', 0)
    .order('transaction_date', { ascending: false })
    .limit(20)

  if (excludeId) query = query.neq('id', excludeId)
  if (buyerName) query = query.ilike('buyer_name', `%${buyerName}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ receipts: data ?? [] })
}
