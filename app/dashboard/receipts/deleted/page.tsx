import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DeletedReceiptsClient from './DeletedReceiptsClient'

export default async function DeletedReceiptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()

  const { data: staffRow } = await db.from('staff_members').select('owner_id').eq('staff_id', user.id).eq('is_active', true).maybeSingle()
  const viewingUserId = staffRow ? staffRow.owner_id : user.id

  const { data: receipts } = await db
    .from('receipts')
    .select('id, receipt_number, original_receipt_number, buyer_name, total_amount, transaction_date, deleted_at')
    .eq('user_id', viewingUserId)
    .eq('status', 'deleted')
    .order('deleted_at', { ascending: false })

  // Deleting frees up receipt_number for reuse, so the row's own receipt_number
  // is a mangled placeholder — show the real one it was known by.
  const displayReceipts = (receipts ?? []).map(r => ({ ...r, receipt_number: r.original_receipt_number || r.receipt_number }))

  return <DeletedReceiptsClient initialReceipts={displayReceipts} />
}
