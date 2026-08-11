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
    .select('id, receipt_number, buyer_name, total_amount, transaction_date, deleted_at')
    .eq('user_id', viewingUserId)
    .eq('status', 'deleted')
    .order('deleted_at', { ascending: false })

  return <DeletedReceiptsClient initialReceipts={receipts ?? []} />
}
