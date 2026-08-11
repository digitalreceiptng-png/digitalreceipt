import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'

// POST — restore a soft-deleted receipt back to its status before deletion.
// No code required — restoring undoes a deletion, it isn't itself destructive.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = getEffectiveUserId(user)

  const { id } = await params
  const db = createAdminClient()

  const { data: receipt } = await db
    .from('receipts')
    .select('id, user_id, status, previous_status')
    .eq('id', id)
    .single()
  if (!receipt || receipt.user_id !== userId) {
    return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })
  }
  if (receipt.status !== 'deleted') {
    return NextResponse.json({ error: 'This receipt is not deleted.' }, { status: 400 })
  }

  const { error } = await db
    .from('receipts')
    .update({ status: receipt.previous_status ?? 'active', deleted_at: null, previous_status: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to restore receipt.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
