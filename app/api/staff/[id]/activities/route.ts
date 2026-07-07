import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = createAdminClient()
  let user: any = null
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(authHeader.slice(7))
    user = data.user ?? null
  }
  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: member } = await db.from('staff_members').select('owner_id').eq('id', id).single()
  if (!member || member.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const { data: receipts } = await db
    .from('receipts')
    .select('id, receipt_number, buyer_name, total_amount, currency, created_at, unique_identifier')
    .eq('issued_by_staff_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ receipts: receipts ?? [] })
}
