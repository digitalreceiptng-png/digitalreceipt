import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function resolveOwner(db: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await db
    .from('staff_members')
    .select('owner_id')
    .eq('staff_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  return data ? data.owner_id : userId
}

// GET — fetch active reminder for a receipt
export async function GET(_req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const ownerUserId = await resolveOwner(db, user.id)

  const { data } = await db
    .from('payment_reminders')
    .select('*')
    .eq('receipt_id', receiptId)
    .eq('user_id', ownerUserId)
    .maybeSingle()

  return NextResponse.json({ reminder: data })
}

// DELETE — cancel (deactivate) a reminder
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const ownerUserId = await resolveOwner(db, user.id)

  const { error } = await db
    .from('payment_reminders')
    .update({ is_active: false })
    .eq('receipt_id', receiptId)
    .eq('user_id', ownerUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
