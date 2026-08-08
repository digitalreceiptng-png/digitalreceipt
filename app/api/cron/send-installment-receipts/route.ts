import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, installmentReceiptHtml } from '@/lib/email'

const APP_URL = 'https://digitalreceipt.ng'

// Runs daily. For every paid installment whose payment receipt hasn't been
// emailed yet, auto-sends it once its due (schedule) date has arrived.
// Email only — never auto-sends SMS, since that auto-debits the wallet.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const now = new Date()

  const { data: installments, error } = await db
    .from('installment_schedules')
    .select('id, due_date, label, payment_receipt_id')
    .not('paid_at', 'is', null)
    .is('receipt_sent_at', null)
    .not('payment_receipt_id', 'is', null)
    .lte('due_date', now.toISOString())

  if (error) {
    console.error('[cron] send-installment-receipts error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0, skipped = 0, errors = 0

  if (installments && installments.length > 0) {
    const receiptIds = [...new Set(installments.map(i => i.payment_receipt_id).filter(Boolean))] as string[]
    const { data: paymentReceipts } = await db
      .from('receipts')
      .select('id, unique_identifier, receipt_number, buyer_name, buyer_email, seller_name, user_id, total_amount')
      .in('id', receiptIds)
    const prMap = new Map((paymentReceipts ?? []).map(pr => [pr.id, pr]))

    const ownerIds = [...new Set((paymentReceipts ?? []).map(pr => pr.user_id))]
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name, business_name, issuer_type')
      .in('id', ownerIds)
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    for (const inst of installments) {
      const pr = inst.payment_receipt_id ? prMap.get(inst.payment_receipt_id) : null
      if (!pr || !pr.buyer_email) { skipped++; continue }

      const profile = profileMap.get(pr.user_id)
      const sellerName = ((profile?.issuer_type === 'business' ? profile?.business_name : profile?.full_name) as string | undefined) || pr.seller_name

      const html = installmentReceiptHtml({
        buyerName: pr.buyer_name || 'Customer',
        sellerName,
        receiptNumber: pr.receipt_number,
        installmentLabel: inst.label ?? 'Installment payment',
        amount: Number(pr.total_amount),
        dueDate: inst.due_date,
        receiptUrl: `${APP_URL}/r/${pr.unique_identifier}`,
      })

      const ok = await sendEmail({
        to: pr.buyer_email,
        subject: `Receipt for your payment — ${sellerName}`,
        html,
      })

      if (ok) {
        await db.from('installment_schedules').update({ receipt_sent_at: now.toISOString() }).eq('id', inst.id)
        sent++
      } else {
        errors++
      }
    }
  }

  console.log(`[cron] send-installment-receipts: sent=${sent} skipped=${skipped} errors=${errors}`)
  return NextResponse.json({ sent, skipped, errors })
}
