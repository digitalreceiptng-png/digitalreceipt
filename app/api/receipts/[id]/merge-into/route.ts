import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'

// POST /api/receipts/[id]/merge-into
// Body: { targetReceiptId: string }
// Merges receipt [id] (a payment receipt) into targetReceiptId (the original receipt with balance)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetReceiptId } = await req.json()
  if (!targetReceiptId) return NextResponse.json({ error: 'targetReceiptId is required' }, { status: 400 })
  if (id === targetReceiptId) return NextResponse.json({ error: 'Cannot merge a receipt into itself' }, { status: 400 })

  const db = createAdminClient()

  // Load both receipts, verify ownership
  const [{ data: paymentReceipt }, { data: targetReceipt }] = await Promise.all([
    db.from('receipts').select('*').eq('id', id).eq('user_id', user.id).single(),
    db.from('receipts').select('*').eq('id', targetReceiptId).eq('user_id', user.id).single(),
  ])

  if (!paymentReceipt) return NextResponse.json({ error: 'Payment receipt not found' }, { status: 404 })
  if (!targetReceipt) return NextResponse.json({ error: 'Target receipt not found' }, { status: 404 })
  if (paymentReceipt.merged_into_id) return NextResponse.json({ error: 'This receipt has already been merged' }, { status: 409 })

  const paymentAmount = Number(paymentReceipt.total_amount ?? 0)
  const prevPaid = Number(targetReceipt.amount_paid ?? 0)
  const totalAmount = Number(targetReceipt.total_amount ?? 0)
  const newAmountPaid = Math.min(prevPaid + paymentAmount, totalAmount)
  const newBalanceDue = Math.max(totalAmount - newAmountPaid, 0)
  const newOverpaid = (prevPaid + paymentAmount) > totalAmount ? (prevPaid + paymentAmount) - totalAmount : 0

  // Update the target receipt's balance
  const { error: updateErr } = await db
    .from('receipts')
    .update({
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      overpaid: newOverpaid,
    })
    .eq('id', targetReceiptId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Link the payment receipt to the target, mark it merged
  await db.from('receipts').update({
    parent_receipt_id: targetReceiptId,
    merged_into_id: targetReceiptId,
    notes: `${paymentReceipt.notes ? paymentReceipt.notes + '\n' : ''}Merged into receipt ${targetReceipt.receipt_number}`,
  }).eq('id', id)

  // Stop any active reminder on target if fully paid
  if (newBalanceDue === 0) {
    await db.from('payment_reminders').update({ is_active: false }).eq('receipt_id', targetReceiptId).eq('is_active', true)
  }

  await logActivity({
    userId: user.id,
    type: 'receipt_merged',
    title: `Receipt merged into ${targetReceipt.receipt_number}`,
    description: `₦${paymentAmount.toLocaleString('en-NG')} applied · Balance now ₦${newBalanceDue.toLocaleString('en-NG')}`,
    entityId: targetReceiptId,
    entityType: 'receipt',
    meta: { payment_receipt_id: id, target_receipt_number: targetReceipt.receipt_number, balance_due: newBalanceDue },
  })

  return NextResponse.json({
    ok: true,
    targetReceiptId,
    amountPaid: newAmountPaid,
    balanceDue: newBalanceDue,
    overpaid: newOverpaid,
  })
}
