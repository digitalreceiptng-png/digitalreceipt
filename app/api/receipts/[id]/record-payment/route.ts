import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueIdentifier, generateReceiptNumber } from '@/lib/generateIds'
import { logActivity } from '@/lib/activity'

async function uniqueId(db: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = generateUniqueIdentifier()
    const { data } = await db.from('receipts').select('id').eq('unique_identifier', id).maybeSingle()
    if (!data) return id
  }
  throw new Error('Could not generate unique identifier')
}

async function uniqueReceiptNumber(db: ReturnType<typeof createAdminClient>, stateCode: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const num = generateReceiptNumber(stateCode)
    const { data } = await db.from('receipts').select('id').eq('receipt_number', num).maybeSingle()
    if (!data) return num
  }
  throw new Error('Could not generate unique receipt number')
}

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
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })

  const totalAmount   = Number(receipt.total_amount)
  const prevPaid      = Number(receipt.amount_paid ?? 0)
  const installment   = Math.min(amount, totalAmount - prevPaid)
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

  // Stop reminder if fully paid
  if (newBalanceDue === 0) {
    await db.from('payment_reminders')
      .update({ is_active: false })
      .eq('receipt_id', id)
      .eq('is_active', true)
  }

  // Generate a linked payment receipt
  let paymentReceipt = null
  try {
    const unique_identifier = await uniqueId(db)
    const receipt_number    = await uniqueReceiptNumber(db, 'NG')

    const today = new Date().toISOString().split('T')[0]

    const { data: pr } = await db
      .from('receipts')
      .insert({
        user_id:           receipt.user_id,
        parent_receipt_id: id,
        receipt_number,
        unique_identifier,
        receipt_type:      receipt.receipt_type ?? 'standard',
        seller_name:       receipt.seller_name,
        seller_phone:      receipt.seller_phone ?? '',
        seller_email:      receipt.seller_email,
        seller_address:    receipt.seller_address,
        seller_rc_number:  receipt.seller_rc_number,
        seller_nin:        receipt.seller_nin,
        buyer_name:        receipt.buyer_name,
        buyer_phone:       receipt.buyer_phone ?? '',
        buyer_email:       receipt.buyer_email ?? '',
        transaction_date:  today,
        payment_method:    receipt.payment_method,
        notes:             `Payment update for receipt ${receipt.receipt_number}`,
        subtotal:          installment,
        discount:          0,
        tax:               0,
        total_amount:      installment,
        amount_paid:       installment,
        balance_due:       newBalanceDue,
        installment_amount: installment,
        charged_amount:    0,
        status:            'active',
      })
      .select()
      .single()

    if (pr) {
      // Single line item for the payment
      await db.from('receipt_items').insert({
        receipt_id:   pr.id,
        description:  `Payment received (ref: ${receipt.receipt_number})`,
        quantity:     1,
        unit_price:   installment,
        total_price:  installment,
        sort_order:   0,
      })
      paymentReceipt = pr
    }
  } catch (e) {
    // Non-critical — payment was already recorded, just log
    console.error('Failed to generate payment receipt:', e)
  }

  await logActivity({
    userId: user.id,
    type: 'payment_recorded',
    title: `Payment of ₦${amount.toLocaleString('en-NG')} recorded`,
    description: `For ${receipt.buyer_name} · Balance now ₦${newBalanceDue.toLocaleString('en-NG')}`,
    entityId: id,
    entityType: 'receipt',
    meta: { amount, receipt_number: receipt.receipt_number, balance_due: newBalanceDue },
  })

  return NextResponse.json({
    ok: true,
    amountPaid:     newAmountPaid,
    balanceDue:     newBalanceDue,
    overpaid:       newOverpaid,
    paymentReceipt,
  })
}
