import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, paymentReminderHtml } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let overrideEmail = ''
  try { const body = await req.json(); overrideEmail = String(body?.overrideEmail ?? '').trim() } catch { /* no body */ }

  const db = createAdminClient()

  // Resolve owner for staff members
  const { data: staffRow } = await db
    .from('staff_members')
    .select('owner_id')
    .eq('staff_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  const ownerUserId = staffRow ? staffRow.owner_id : user.id

  const { data: receipt } = await db
    .from('receipts')
    .select('*, profiles(full_name, business_name, issuer_type)')
    .eq('id', receiptId)
    .eq('user_id', ownerUserId)
    .single()

  if (!receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })

  const buyerEmail = receipt.buyer_email || overrideEmail
  if (!buyerEmail) return NextResponse.json({ error: 'No customer email on this receipt.' }, { status: 400 })

  const balanceDue = Number(receipt.balance_due ?? (Number(receipt.total_amount) - Number(receipt.amount_paid ?? 0)))
  if (balanceDue <= 0) return NextResponse.json({ error: 'No outstanding balance.' }, { status: 400 })

  const profile = Array.isArray(receipt.profiles) ? receipt.profiles[0] : receipt.profiles as Record<string, unknown> | null
  const sellerName = ((profile?.issuer_type === 'business' ? profile?.business_name : profile?.full_name) as string | undefined)
    ?? receipt.seller_name

  // Get send count from active reminder if one exists
  const { data: reminder } = await db
    .from('payment_reminders')
    .select('send_count')
    .eq('receipt_id', receiptId)
    .eq('user_id', user.id)
    .maybeSingle()

  const html = paymentReminderHtml({
    buyerName:      receipt.buyer_name ?? 'Customer',
    sellerName,
    receiptNumber:  receipt.receipt_number,
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

  // If there's an active reminder, increment its send count
  if (reminder) {
    await db.from('payment_reminders')
      .update({ send_count: (reminder.send_count ?? 0) + 1, last_sent_at: new Date().toISOString() })
      .eq('receipt_id', receiptId)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
