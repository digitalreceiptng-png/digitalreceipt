import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/receipts/assign-group — assign one or more receipts to a group
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiptIds, groupId } = await req.json()
  if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
    return NextResponse.json({ error: 'No receipts selected' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('receipts')
    .update({ group_id: groupId ?? null })
    .in('id', receiptIds)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
