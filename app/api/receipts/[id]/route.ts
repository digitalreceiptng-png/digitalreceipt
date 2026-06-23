import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('*, items:receipt_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch linked payment receipts (children)
  const admin = createAdminClient()
  const { data: paymentReceipts } = await admin
    .from('receipts')
    .select('*, items:receipt_items(*)')
    .eq('parent_receipt_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // If this is a child payment receipt, fetch the parent for total context
  let parentReceipt = null
  if (receipt.parent_receipt_id) {
    const { data: parent } = await admin
      .from('receipts')
      .select('id, total_amount, receipt_number')
      .eq('id', receipt.parent_receipt_id)
      .single()
    parentReceipt = parent ?? null
  }

  return NextResponse.json({ receipt, paymentReceipts: paymentReceipts ?? [], parentReceipt })
}
