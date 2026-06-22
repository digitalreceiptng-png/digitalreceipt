import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, installmentReminderHtml } from '@/lib/email'
import { sendTermiiSms } from '@/lib/termii'
import { normalizeNgPhone } from '@/lib/otp-utils'

const APP_URL = 'https://digitalreceipt.ng'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // Fetch all unpaid installments with auto_remind=true
  // that haven't had a reminder sent today
  const { data: installments, error } = await db
    .from('installment_schedules')
    .select(`
      id, receipt_id, due_date, amount, label, remind_sent_at,
      remind_channel, remind_days_before, remind_days_direction,
      receipts (
        receipt_number, unique_identifier, buyer_name, buyer_email, buyer_phone,
        seller_name, profiles ( full_name, business_name, issuer_type )
      )
    `)
    .eq('auto_remind', true)
    .is('paid_at', null)

  if (error) {
    console.error('[cron] installment-reminders error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0, skipped = 0, errors = 0

  for (const inst of installments ?? []) {
    // Skip if reminder already sent today
    if (inst.remind_sent_at && inst.remind_sent_at >= todayStart) { skipped++; continue }

    const days = inst.remind_days_before ?? 0
    const direction = (inst.remind_days_direction ?? 'before') as 'before' | 'after'
    const channel = (inst.remind_channel ?? 'email') as 'email' | 'sms' | 'both'

    // Calculate the day the reminder should fire
    const dueDate = new Date(inst.due_date)
    const reminderDate = new Date(dueDate)
    reminderDate.setDate(dueDate.getDate() + (direction === 'before' ? -days : days))

    // Only send if today is the reminder date (match year/month/day)
    const reminderDay = reminderDate.toISOString().slice(0, 10)
    const today = now.toISOString().slice(0, 10)
    if (reminderDay !== today) { skipped++; continue }

    const receipt = inst.receipts as unknown as Record<string, unknown> | null
    if (!receipt) { skipped++; continue }

    const profileArr = receipt.profiles as unknown as Record<string, unknown>[] | null
    const profile = Array.isArray(profileArr) ? profileArr[0] : profileArr as Record<string, unknown> | null
    const sellerName = ((profile?.issuer_type === 'business'
      ? profile?.business_name
      : profile?.full_name) as string | undefined) ?? (receipt.seller_name as string)

    const installmentLabel = (inst.label as string | null) ?? 'Installment payment'
    const receiptUrl = `${APP_URL}/r/${receipt.unique_identifier}`

    let didSend = false

    // Email
    if (channel === 'email' || channel === 'both') {
      const buyerEmail = receipt.buyer_email as string | null
      if (buyerEmail) {
        const html = installmentReminderHtml({
          buyerName: (receipt.buyer_name as string) || 'Customer',
          sellerName,
          receiptNumber: receipt.receipt_number as string,
          installmentLabel,
          installmentAmount: Number(inst.amount),
          dueDate: inst.due_date as string,
          receiptUrl,
        })
        const ok = await sendEmail({
          to: buyerEmail,
          subject: `Payment due${days === 0 ? ' today' : direction === 'before' ? ` in ${days} day${days > 1 ? 's' : ''}` : ` — ${days} day${days > 1 ? 's' : ''} overdue`}: ${installmentLabel} — ${sellerName}`,
          html,
        })
        if (ok) didSend = true
        else errors++
      }
    }

    // SMS
    if (channel === 'sms' || channel === 'both') {
      const buyerPhone = receipt.buyer_phone as string | null
      if (buyerPhone) {
        try {
          const normalized = normalizeNgPhone(buyerPhone)
          const daysText = days === 0 ? ' today' : direction === 'before' ? ` in ${days} day${days > 1 ? 's' : ''}` : ` (${days} day${days > 1 ? 's' : ''} overdue)`
          await sendTermiiSms(normalized, `Reminder: Your payment of ₦${Number(inst.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })} to ${sellerName} is due${daysText}. View receipt: ${receiptUrl}`)
          didSend = true
        } catch (err) {
          console.error('[cron] SMS reminder failed:', err)
          errors++
        }
      }
    }

    if (didSend) {
      await db.from('installment_schedules')
        .update({ remind_sent_at: now.toISOString() })
        .eq('id', inst.id)
      sent++
    } else {
      skipped++
    }
  }

  console.log(`[cron] installment-reminders: sent=${sent} skipped=${skipped} errors=${errors}`)
  return NextResponse.json({ sent, skipped, errors })
}
