import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, paymentReminderHtml } from '@/lib/email'

const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  every_3_days: 3,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

export async function GET(req: NextRequest) {
  // Vercel sets Authorization header with CRON_SECRET on cron invocations
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const now = new Date().toISOString()

  // Load all active reminders due for sending
  const { data: due, error } = await db
    .from('payment_reminders')
    .select(`
      id, receipt_id, user_id, buyer_email, buyer_name,
      frequency, send_count,
      receipts (
        receipt_number, unique_identifier, seller_name,
        total_amount, amount_paid, balance_due,
        transaction_date, payment_method, notes,
        profiles ( full_name, business_name, issuer_type, phone, email )
      )
    `)
    .eq('is_active', true)
    .lte('next_send_at', now)

  if (error) {
    console.error('[cron] Failed to load reminders:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0, skipped = 0, errors = 0

  for (const reminder of due ?? []) {
    const receipt = reminder.receipts as unknown as Record<string, unknown> | null
    if (!receipt) { skipped++; continue }

    const balanceDue = Number(receipt.balance_due ?? 0)

    // Auto-stop: balance has been cleared
    if (balanceDue <= 0) {
      await db.from('payment_reminders').update({ is_active: false }).eq('id', reminder.id)
      skipped++
      continue
    }

    const profileArr = receipt.profiles as unknown as Record<string, unknown>[] | null
    const profile = Array.isArray(profileArr) ? profileArr[0] : profileArr as Record<string, unknown> | null
    const sellerName = ((profile?.issuer_type === 'business'
      ? profile?.business_name
      : profile?.full_name) as string | undefined) ?? (receipt.seller_name as string)

    const html = paymentReminderHtml({
      buyerName:     reminder.buyer_name || 'Customer',
      sellerName,
      receiptNumber: receipt.receipt_number as string,
      totalAmount:   Number(receipt.total_amount),
      amountPaid:    Number(receipt.amount_paid ?? 0),
      balanceDue,
      transactionDate: receipt.transaction_date as string,
      paymentMethod: receipt.payment_method as string,
      receiptUrl:    `https://digitalreceipt.ng/r/${receipt.unique_identifier}`,
      sendCount:     reminder.send_count + 1,
    })

    const ok = await sendEmail({
      to: reminder.buyer_email,
      subject: `Payment reminder from ${sellerName} — ₦${balanceDue.toLocaleString('en-NG')} outstanding`,
      html,
    })

    if (ok) {
      const days = FREQUENCY_DAYS[reminder.frequency] ?? 7
      const nextSend = new Date(Date.now() + days * 86_400_000).toISOString()
      await db.from('payment_reminders').update({
        last_sent_at: now,
        send_count:   reminder.send_count + 1,
        next_send_at: nextSend,
      }).eq('id', reminder.id)
      sent++
    } else {
      errors++
    }
  }

  console.log(`[cron] send-reminders: sent=${sent} skipped=${skipped} errors=${errors}`)
  return NextResponse.json({ sent, skipped, errors })
}
