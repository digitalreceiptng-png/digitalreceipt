import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, paymentReminderHtml } from '@/lib/email'
import { sendTermiiSms } from '@/lib/termii'
import { normalizeNgPhone } from '@/lib/otp-utils'
import { deductWallet } from '@/lib/wallet'

const SMS_COST = 10 // ₦10 per SMS

export async function POST(req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let overrideEmail = ''
  let overridePhone = ''
  let channel: 'email' | 'sms' = 'email'
  try {
    const body = await req.json()
    overrideEmail = String(body?.overrideEmail ?? '').trim()
    overridePhone = String(body?.overridePhone ?? '').trim()
    channel = body?.channel === 'sms' ? 'sms' : 'email'
  } catch { /* no body */ }

  const db = createAdminClient()

  // Resolve owner for staff members
  const { data: staffRow } = await db
    .from('staff_members')
    .select('owner_id')
    .eq('staff_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  const ownerUserId = staffRow ? staffRow.owner_id : user.id

  const { data: receipt, error: receiptErr } = await db
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .eq('user_id', ownerUserId)
    .single()

  if (receiptErr || !receipt) {
    return NextResponse.json({ error: receiptErr?.message ?? 'Receipt not found.' }, { status: 404 })
  }

  const balanceDue = Number(receipt.balance_due ?? (Number(receipt.total_amount) - Number(receipt.amount_paid ?? 0)))
  if (balanceDue <= 0) return NextResponse.json({ error: 'No outstanding balance.' }, { status: 400 })

  const { data: profile } = await db
    .from('profiles')
    .select('full_name, business_name, issuer_type')
    .eq('id', ownerUserId)
    .maybeSingle()
  const sellerName = ((profile?.issuer_type === 'business' ? profile?.business_name : profile?.full_name) as string | undefined)
    ?? receipt.seller_name

  // Receipts can have a custom reference number/label (e.g. "House No.") in place
  // of the default receipt number — match VerificationCard's label logic.
  const receiptLabel = receipt.reference_number && receipt.reference_number === receipt.receipt_number
    ? ((receipt.reference_label as string) || 'Receipt No.')
    : 'Receipt No.'

  // Get send count from active reminder if one exists
  const { data: reminder } = await db
    .from('payment_reminders')
    .select('send_count')
    .eq('receipt_id', receiptId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (channel === 'sms') {
    const buyerPhone = receipt.buyer_phone || overridePhone
    if (!buyerPhone) return NextResponse.json({ error: 'No customer phone number on this receipt.' }, { status: 400 })

    const walletBalance = await (async () => {
      const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', user.id).single()
      return wallet?.balance ?? 0
    })()
    if (walletBalance < SMS_COST) {
      return NextResponse.json({
        error: `Insufficient wallet balance. Sending an SMS reminder costs ₦${SMS_COST}. Your balance is ₦${walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`,
        code: 'INSUFFICIENT_BALANCE',
      }, { status: 402 })
    }

    const normalized = normalizeNgPhone(buyerPhone)
    const message = `Payment reminder from ${sellerName}: ₦${balanceDue.toLocaleString('en-NG')} is still outstanding on ${receiptLabel} ${receipt.receipt_number}. View: https://digitalreceipt.ng/r/${receipt.unique_identifier}`

    try {
      await sendTermiiSms(normalized, message)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Failed to send SMS. ${errMsg}` }, { status: 502 })
    }

    await deductWallet(user.id, SMS_COST, `Payment reminder SMS — ${receipt.receipt_number}`, receiptId)
  } else {
    const buyerEmail = receipt.buyer_email || overrideEmail
    if (!buyerEmail) return NextResponse.json({ error: 'No customer email on this receipt.' }, { status: 400 })

    const html = paymentReminderHtml({
      buyerName:      receipt.buyer_name ?? 'Customer',
      sellerName,
      receiptNumber:  receipt.receipt_number,
      receiptLabel,
      totalAmount:    Number(receipt.total_amount),
      amountPaid:     Number(receipt.amount_paid ?? 0),
      balanceDue,
      transactionDate: receipt.transaction_date,
      paymentMethod:  receipt.payment_method,
      receiptUrl:     `https://digitalreceipt.ng/r/${receipt.unique_identifier}`,
      sendCount:      (reminder?.send_count ?? 0) + 1,
    })

    const ok = await sendEmail({
      to: buyerEmail,
      subject: `Payment reminder from ${sellerName} — ₦${balanceDue.toLocaleString('en-NG')} outstanding`,
      html,
    })

    if (!ok) return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 502 })
  }

  // If there's an active reminder, increment its send count
  if (reminder) {
    await db.from('payment_reminders')
      .update({ send_count: (reminder.send_count ?? 0) + 1, last_sent_at: new Date().toISOString() })
      .eq('receipt_id', receiptId)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
