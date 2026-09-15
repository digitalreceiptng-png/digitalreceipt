import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import { hashOtp } from '@/lib/otp-utils'

// POST — verify the code, then apply the pending description change for real.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, itemId } = await params
  const body = await req.json().catch(() => ({}))
  const emailCode = String(body?.emailCode ?? '').replace(/\D/g, '').trim()
  const phoneCode = String(body?.phoneCode ?? '').replace(/\D/g, '').trim()

  const db = createAdminClient()
  const userId = await getEffectiveUserId(db, user)

  const { data: otp } = await db
    .from('receipt_item_edit_otps')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle()

  if (!otp) return NextResponse.json({ error: 'Code expired or not requested. Please try again.' }, { status: 400 })

  if (new Date(otp.expires_at) < new Date()) {
    await db.from('receipt_item_edit_otps').delete().eq('id', otp.id)
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
  }
  if (otp.attempts >= 5) {
    return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 429 })
  }

  // Only channels that actually received a code (email_code_hash / phone_code_hash
  // set) are required — each one that's required must match independently.
  const needsEmail = !!otp.email_code_hash
  const needsPhone = !!otp.phone_code_hash
  if (needsEmail && emailCode.length !== 6) return NextResponse.json({ error: 'Enter the 6-digit code sent to your email.' }, { status: 400 })
  if (needsPhone && phoneCode.length !== 6) return NextResponse.json({ error: 'Enter the 6-digit code sent to your phone.' }, { status: 400 })

  const emailOk = !needsEmail || hashOtp(emailCode) === otp.email_code_hash
  const phoneOk = !needsPhone || hashOtp(phoneCode) === otp.phone_code_hash

  if (!emailOk || !phoneOk) {
    await db.from('receipt_item_edit_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
    const which = !emailOk && !phoneOk ? 'codes' : !emailOk ? 'email code' : 'phone code'
    return NextResponse.json({ error: `Incorrect ${which}.` }, { status: 400 })
  }

  const newQuantity = Number(otp.new_quantity)
  const newUnitPrice = Number(otp.new_unit_price)
  const { data: updated, error } = await db
    .from('receipt_items')
    .update({
      description: otp.new_description,
      quantity: newQuantity,
      unit_price: newUnitPrice,
      total_price: newQuantity * newUnitPrice,
    })
    .eq('id', itemId)
    .eq('receipt_id', id)
    .select()
    .single()

  if (error || !updated) return NextResponse.json({ error: 'Item not found.' }, { status: 404 })

  // Item totals feed the receipt's stored totals — recompute them here rather
  // than relying on a DB trigger, matching how totals are set on receipt creation.
  const { data: receipt } = await db
    .from('receipts')
    .select('discount, tax, amount_paid')
    .eq('id', id)
    .single()

  let receiptTotals: { subtotal: number; total_amount: number; balance_due: number; overpaid: number } | null = null
  if (receipt) {
    const { data: items } = await db.from('receipt_items').select('total_price').eq('receipt_id', id)
    const subtotal = (items ?? []).reduce((s, i) => s + Number(i.total_price ?? 0), 0)
    const total_amount = subtotal - Number(receipt.discount ?? 0) + Number(receipt.tax ?? 0)
    const amountPaid = Number(receipt.amount_paid ?? 0)
    const balance_due = Math.max(0, total_amount - amountPaid)
    const overpaid = Math.max(0, amountPaid - total_amount)
    await db.from('receipts').update({ subtotal, total_amount, balance_due, overpaid }).eq('id', id)
    receiptTotals = { subtotal, total_amount, balance_due, overpaid }
  }

  await db.from('receipt_item_edit_otps').delete().eq('id', otp.id)

  return NextResponse.json({ ok: true, item: updated, receipt: receiptTotals })
}
