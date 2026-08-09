import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueIdentifier, generateReceiptNumber } from '@/lib/generateIds'
import { deductWallet } from '@/lib/wallet'
import { logActivity } from '@/lib/activity'

type Db = ReturnType<typeof createAdminClient>

// Same flat fee record-payment charges for generating a linked payment receipt —
// marking an installment paid generates one the same way, so it costs the same.
const PAYMENT_RECEIPT_FEE = 200

// Reflect an installment payment on the receipt. delta is +amount when marking
// paid, -amount when un-marking. amount_paid/balance_due stay in sync.
// Returns the receipt's new totals so the caller can sync them without a refetch.
async function applyToReceipt(db: Db, receiptId: string, delta: number) {
  const { data: r } = await db
    .from('receipts')
    .select('amount_paid, total_amount')
    .eq('id', receiptId)
    .single()
  if (!r) return null
  const total = Number(r.total_amount ?? 0)
  const newPaid = Math.max(0, Number(r.amount_paid ?? 0) + delta)
  const newBalance = Math.max(0, total - newPaid)
  const overpaid = newPaid > total ? newPaid - total : 0
  await db.from('receipts').update({ amount_paid: newPaid, balance_due: newBalance, overpaid }).eq('id', receiptId)
  if (newBalance === 0) {
    await db.from('payment_reminders').update({ is_active: false }).eq('receipt_id', receiptId).eq('is_active', true)
  }
  return { amountPaid: newPaid, balanceDue: newBalance, overpaid }
}

async function uniqueId(db: Db): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = generateUniqueIdentifier()
    const { data } = await db.from('receipts').select('id').eq('unique_identifier', id).maybeSingle()
    if (!data) return id
  }
  throw new Error('Could not generate unique identifier')
}

async function uniqueReceiptNumber(db: Db): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const num = generateReceiptNumber()
    const { data } = await db.from('receipts').select('id').eq('receipt_number', num).maybeSingle()
    if (!data) return num
  }
  throw new Error('Could not generate unique receipt number')
}

// Generates the linked "payment receipt" for a paid installment — same shape
// record-payment produces, so it shows up in the same Payment History list.
async function createInstallmentPaymentReceipt(db: Db, parentReceipt: Record<string, unknown>, amount: number, label: string | null, newBalanceDue: number) {
  const unique_identifier = await uniqueId(db)
  const receipt_number = await uniqueReceiptNumber(db)
  const today = new Date().toISOString().split('T')[0]

  const { data: pr, error } = await db
    .from('receipts')
    .insert({
      user_id:            parentReceipt.user_id,
      parent_receipt_id:  parentReceipt.id,
      receipt_number,
      unique_identifier,
      receipt_type:       parentReceipt.receipt_type ?? 'standard',
      seller_name:        parentReceipt.seller_name,
      seller_phone:       parentReceipt.seller_phone ?? '',
      seller_email:       parentReceipt.seller_email,
      seller_address:     parentReceipt.seller_address,
      seller_rc_number:   parentReceipt.seller_rc_number,
      seller_nin:         parentReceipt.seller_nin,
      buyer_name:         parentReceipt.buyer_name,
      buyer_phone:        parentReceipt.buyer_phone ?? '',
      buyer_email:        parentReceipt.buyer_email ?? '',
      transaction_date:   today,
      payment_method:     parentReceipt.payment_method,
      notes:              `Installment payment — ${label || 'Installment'} (receipt ${parentReceipt.receipt_number})`,
      subtotal:           amount,
      discount:           0,
      tax:                0,
      total_amount:       amount,
      amount_paid:        amount,
      balance_due:        newBalanceDue,
      installment_amount: amount,
      charged_amount:     0,
      status:             'active',
      items_label:        parentReceipt.items_label ?? null,
    })
    .select()
    .single()

  if (error || !pr) return null

  await db.from('receipt_items').insert({
    receipt_id:  pr.id,
    description: label ? `Installment — ${label}` : 'Installment payment',
    quantity:    1,
    unit_price:  amount,
    total_price: amount,
    sort_order:  0,
  })

  return pr
}

// PATCH /api/installments/[id]/paid — toggle paid (also updates the receipt
// balance and, when marking paid, generates a linked payment receipt for ₦200)
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
    .select('amount, label, receipt_id, applied_to_balance, payment_receipt_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const amount = Number(current.amount)
  const isNewlyPaid = paid && !current.applied_to_balance
  const isNewlyUnpaid = !paid && current.applied_to_balance

  // Marking paid generates a new payment receipt — check the fee up front,
  // before mutating anything, same as a manually recorded payment.
  if (isNewlyPaid) {
    const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', user.id).single()
    const walletBalance = wallet?.balance ?? 0
    if (walletBalance < PAYMENT_RECEIPT_FEE) {
      return NextResponse.json({
        error: `Insufficient wallet balance. Marking this installment paid generates a receipt, which costs ₦${PAYMENT_RECEIPT_FEE}. Your balance is ₦${walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`,
        code: 'INSUFFICIENT_BALANCE',
      }, { status: 402 })
    }
  }

  const { data, error } = await db
    .from('installment_schedules')
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let totals: { amountPaid: number; balanceDue: number; overpaid: number } | null = null
  let paymentReceipt: { id: string; [key: string]: unknown } | null = null
  let removedPaymentReceiptId: string | null = null

  if (isNewlyPaid) {
    totals = await applyToReceipt(db, current.receipt_id, amount)

    const { data: parentReceipt } = await db.from('receipts').select('*').eq('id', current.receipt_id).single()
    if (parentReceipt) {
      paymentReceipt = await createInstallmentPaymentReceipt(db, parentReceipt, amount, current.label, totals?.balanceDue ?? 0)
    }

    await db.from('installment_schedules')
      .update({ applied_to_balance: true, payment_receipt_id: paymentReceipt?.id ?? null })
      .eq('id', id)

    // ₦200 fee for the generated receipt — charged once the receipt actually exists
    await deductWallet(user.id, PAYMENT_RECEIPT_FEE, `Installment Receipt — ${current.label || 'Installment'}`, current.receipt_id)
  } else if (isNewlyUnpaid) {
    totals = await applyToReceipt(db, current.receipt_id, -amount)

    // Remove the linked payment receipt — it no longer reflects a real payment.
    // The ₦200 fee already charged is not refunded.
    if (current.payment_receipt_id) {
      await db.from('receipt_items').delete().eq('receipt_id', current.payment_receipt_id)
      await db.from('receipts').delete().eq('id', current.payment_receipt_id)
      removedPaymentReceiptId = current.payment_receipt_id
    }

    await db.from('installment_schedules')
      .update({ applied_to_balance: false, payment_receipt_id: null, receipt_sent_at: null })
      .eq('id', id)
  }

  if (isNewlyPaid) {
    await logActivity({
      userId: user.id,
      type: 'installment_paid',
      title: `Installment marked as paid`,
      description: data.label ? `${data.label} · ₦${Number(data.amount).toLocaleString('en-NG')}` : `₦${Number(data.amount).toLocaleString('en-NG')}`,
      entityId: data.receipt_id,
      entityType: 'receipt',
      meta: { installment_id: id, amount: data.amount, payment_receipt_id: paymentReceipt?.id },
    })
  }

  return NextResponse.json({
    installment: { ...data, applied_to_balance: isNewlyPaid ? true : isNewlyUnpaid ? false : current.applied_to_balance, payment_receipt_id: isNewlyPaid ? (paymentReceipt?.id ?? null) : isNewlyUnpaid ? null : current.payment_receipt_id },
    paymentReceipt,
    removedPaymentReceiptId,
    ...totals,
  })
}
