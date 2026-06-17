import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let amount = 0
  try {
    const body = await req.json()
    amount = Number(body?.amount ?? 0)
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Enter a valid payment amount.' }, { status: 400 })

  const db = createAdminClient()

  const { data: receipt, error: fetchErr } = await db
    .from('receipts')
    .select('id, total_amount, amount_paid, balance_due, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })

  const totalAmount  = Number(receipt.total_amount)
  const prevPaid     = Number(receipt.amount_paid ?? 0)
  const newAmountPaid = Math.min(prevPaid + amount, totalAmount)
  const newBalanceDue = Math.max(totalAmount - newAmountPaid, 0)
  const newOverpaid   = newAmountPaid > totalAmount ? newAmountPaid - totalAmount : 0

  const { error: updateErr } = await db
    .from('receipts')
    .update({
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      overpaid:    newOverpaid,
    })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // If fully paid, deactivate any active reminder
  if (newBalanceDue === 0) {
    await db.from('payment_reminders')
      .update({ is_active: false })
      .eq('receipt_id', id)
      .eq('is_active', true)
  }

  return NextResponse.json({ ok: true, amountPaid: newAmountPaid, balanceDue: newBalanceDue, overpaid: newOverpaid })
}
