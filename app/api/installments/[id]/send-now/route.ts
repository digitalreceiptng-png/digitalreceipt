import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, installmentReminderHtml } from '@/lib/email'
import { sendTermiiSms } from '@/lib/termii'
import { normalizeNgPhone } from '@/lib/otp-utils'
import { deductWallet } from '@/lib/wallet'

const APP_URL = 'https://digitalreceipt.ng'
const SMS_COST = 10 // ₦10 per SMS

// POST /api/installments/[id]/send-now — send an installment payment reminder
// immediately (on demand), separate from the recurring auto-remind schedule.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let channel: 'email' | 'sms' | 'both' = 'email'
  let overrideEmail = ''
  let overridePhone = ''
  try {
    const body = await req.json()
    channel = body?.channel === 'sms' ? 'sms' : body?.channel === 'both' ? 'both' : 'email'
    overrideEmail = String(body?.overrideEmail ?? '').trim()
    overridePhone = String(body?.overridePhone ?? '').trim()
  } catch { /* no body */ }

  const db = createAdminClient()

  const { data: inst, error: instErr } = await db
    .from('installment_schedules')
    .select('id, receipt_id, due_date, amount, label')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (instErr || !inst) return NextResponse.json({ error: 'Installment not found.' }, { status: 404 })

  const { data: receipt, error: receiptErr } = await db
    .from('receipts')
    .select('*')
    .eq('id', inst.receipt_id)
    .eq('user_id', user.id)
    .single()

  if (receiptErr || !receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })

  const { data: profile } = await db
    .from('profiles')
    .select('full_name, business_name, issuer_type')
    .eq('id', user.id)
    .maybeSingle()
  const sellerName = ((profile?.issuer_type === 'business' ? profile?.business_name : profile?.full_name) as string | undefined)
    ?? receipt.seller_name

  const installmentLabel = inst.label ?? 'Installment payment'
  const receiptUrl = `${APP_URL}/r/${receipt.unique_identifier}`

  let sentEmail = false
  let sentSms = false
  const errors: string[] = []

  if (channel === 'email' || channel === 'both') {
    const buyerEmail = receipt.buyer_email || overrideEmail
    if (!buyerEmail) {
      errors.push('No customer email on this receipt.')
    } else {
      const html = installmentReminderHtml({
        buyerName: receipt.buyer_name || 'Customer',
        sellerName,
        receiptNumber: receipt.receipt_number,
        installmentLabel,
        installmentAmount: Number(inst.amount),
        dueDate: inst.due_date,
        receiptUrl,
      })
      const ok = await sendEmail({
        to: buyerEmail,
        subject: `Payment due: ${installmentLabel} — ${sellerName}`,
        html,
      })
      if (ok) sentEmail = true
      else errors.push('Failed to send email.')
    }
  }

  if (channel === 'sms' || channel === 'both') {
    const buyerPhone = receipt.buyer_phone || overridePhone
    if (!buyerPhone) {
      errors.push('No customer phone number on this receipt.')
    } else {
      const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', user.id).single()
      const walletBalance = wallet?.balance ?? 0
      if (walletBalance < SMS_COST) {
        errors.push(`Insufficient wallet balance. SMS costs ₦${SMS_COST}, your balance is ₦${walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`)
      } else {
        try {
          const normalized = normalizeNgPhone(buyerPhone)
          await sendTermiiSms(normalized, `Reminder: Your payment of ₦${Number(inst.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })} to ${sellerName} (${installmentLabel}) is due. View receipt: ${receiptUrl}`)
          await deductWallet(user.id, SMS_COST, `SMS Installment Reminder — ${receipt.receipt_number}`, inst.receipt_id)
          sentSms = true
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          errors.push(`Failed to send SMS. ${errMsg}`)
        }
      }
    }
  }

  if (!sentEmail && !sentSms) {
    return NextResponse.json({ error: errors.join(' ') || 'Failed to send reminder.' }, { status: 502 })
  }

  await db.from('installment_schedules')
    .update({ remind_sent_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true, sentEmail, sentSms, warning: errors.length > 0 ? errors.join(' ') : undefined })
}
