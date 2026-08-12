import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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
    .select('id, user_id, status, previous_status, original_receipt_number')
    .eq('id', id)
    .single()
  if (!receipt || receipt.user_id !== userId) {
    return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })
  }
  if (receipt.status !== 'deleted') {
    return NextResponse.json({ error: 'This receipt is not deleted.' }, { status: 400 })
  }

  const restorePayload: Record<string, unknown> = {
    status: receipt.previous_status ?? 'active',
    deleted_at: null,
    previous_status: null,
  }
  // Reclaim the original receipt number — unless something else has taken it
  // in the meantime (e.g. a new receipt reused the same house number).
  if (receipt.original_receipt_number) {
    const { data: taken } = await db
      .from('receipts')
      .select('id')
      .eq('receipt_number', receipt.original_receipt_number)
      .neq('id', id)
      .maybeSingle()
    if (taken) {
      return NextResponse.json({
        error: `Can't restore — receipt number "${receipt.original_receipt_number}" is already in use by another receipt. Rename that one first, or contact support.`,
      }, { status: 409 })
    }
    restorePayload.receipt_number = receipt.original_receipt_number
    restorePayload.original_receipt_number = null
  }

  const { error } = await db
    .from('receipts')
    .update(restorePayload)
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to restore receipt.' }, { status: 500 })

  revalidatePath('/dashboard/receipts')
  revalidatePath('/dashboard/receipts/deleted')
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/receipts/${id}`)

  return NextResponse.json({ ok: true })
}
