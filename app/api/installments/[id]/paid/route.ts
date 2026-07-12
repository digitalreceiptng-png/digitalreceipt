import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'

type Db = ReturnType<typeof createAdminClient>

// Reflect an installment payment on the receipt (no fee). delta is +amount when
// marking paid, -amount when un-marking. amount_paid/balance_due stay in sync.
async function applyToReceipt(db: Db, receiptId: string, delta: number) {
  const { data: r } = await db
    .from('receipts')
    .select('amount_paid, total_amount')
    .eq('id', receiptId)
    .single()
  if (!r) return
  const total = Number(r.total_amount ?? 0)
  const newPaid = Math.max(0, Number(r.amount_paid ?? 0) + delta)
  const newBalance = Math.max(0, total - newPaid)
  const overpaid = newPaid > total ? newPaid - total : 0
  await db.from('receipts').update({ amount_paid: newPaid, balance_due: newBalance, overpaid }).eq('id', receiptId)
  if (newBalance === 0) {
    await db.from('payment_reminders').update({ is_active: false }).eq('receipt_id', receiptId).eq('is_active', true)
  }
}

// PATCH /api/installments/[id]/paid — toggle paid (also updates the receipt balance)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { paid } = await req.json()

  const db = createAdminClient()

  // Current state (to keep the balance update idempotent via applied_to_balance)
  const { data: current } = await db
    .from('installment_schedules')
    .select('amount, receipt_id, applied_to_balance')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await db
    .from('installment_schedules')
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const amount = Number(current.amount)
  if (paid && !current.applied_to_balance) {
    await applyToReceipt(db, current.receipt_id, amount)
    await db.from('installment_schedules').update({ applied_to_balance: true }).eq('id', id)
  } else if (!paid && current.applied_to_balance) {
    await applyToReceipt(db, current.receipt_id, -amount)
    await db.from('installment_schedules').update({ applied_to_balance: false }).eq('id', id)
  }

  if (paid) {
    await logActivity({
      userId: user.id,
      type: 'installment_paid',
      title: `Installment marked as paid`,
      description: data.label ? `${data.label} · ₦${Number(data.amount).toLocaleString('en-NG')}` : `₦${Number(data.amount).toLocaleString('en-NG')}`,
      entityId: data.receipt_id,
      entityType: 'receipt',
      meta: { installment_id: id, amount: data.amount },
    })
  }

  return NextResponse.json({ installment: data })
}
