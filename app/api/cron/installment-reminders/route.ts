import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, installmentReminderHtml } from '@/lib/email'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const now = new Date()

  // Find all unpaid installments with auto_remind=true due within the next 24 hours
  // that haven't had a reminder sent yet today
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const { data: installments, error } = await db
    .from('installment_schedules')
    .select(`
      id, receipt_id, due_date, amount, label, remind_sent_at,
      receipts (
        receipt_number, unique_identifier, buyer_name, buyer_email,
        seller_name, profiles ( full_name, business_name, issuer_type )
      )
    `)
    .eq('auto_remind', true)
    .is('paid_at', null)
    .lte('due_date', tomorrow)
    .gte('due_date', now.toISOString())

  if (error) {
    console.error('[cron] installment-reminders error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0, skipped = 0, errors = 0

  for (const inst of installments ?? []) {
    // Skip if reminder already sent today
    if (inst.remind_sent_at && inst.remind_sent_at >= todayStart) {
      skipped++
      continue
    }

    const receipt = inst.receipts as unknown as Record<string, unknown> | null
    if (!receipt) { skipped++; continue }

    const buyerEmail = receipt.buyer_email as string | null
    if (!buyerEmail) { skipped++; continue }

    const profileArr = receipt.profiles as unknown as Record<string, unknown>[] | null
    const profile = Array.isArray(profileArr) ? profileArr[0] : profileArr as Record<string, unknown> | null
    const sellerName = ((profile?.issuer_type === 'business'
      ? profile?.business_name
      : profile?.full_name) as string | undefined) ?? (receipt.seller_name as string)

    const installmentLabel = (inst.label as string | null) ?? `Installment payment`

    const html = installmentReminderHtml({
      buyerName: (receipt.buyer_name as string) || 'Customer',
      sellerName,
      receiptNumber: receipt.receipt_number as string,
      installmentLabel,
      installmentAmount: Number(inst.amount),
      dueDate: inst.due_date as string,
      receiptUrl: `https://digitalreceipt.ng/r/${receipt.unique_identifier}`,
    })

    const ok = await sendEmail({
      to: buyerEmail,
      subject: `Payment due: ${installmentLabel} — ${sellerName}`,
      html,
    })

    if (ok) {
      await db.from('installment_schedules')
        .update({ remind_sent_at: now.toISOString() })
        .eq('id', inst.id)
      sent++
    } else {
      errors++
    }
  }

  console.log(`[cron] installment-reminders: sent=${sent} skipped=${skipped} errors=${errors}`)
  return NextResponse.json({ sent, skipped, errors })
}
