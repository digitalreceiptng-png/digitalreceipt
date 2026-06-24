import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTermiiSms } from '@/lib/termii'
import { normalizeNgPhone } from '@/lib/otp-utils'
import { deductWallet } from '@/lib/wallet'

const APP_URL = 'https://digitalreceipt.ng'
const SMS_COST = 10 // ₦10 per SMS

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const phones: string[] = (body?.phones ?? []).map((p: string) => p.trim()).filter(Boolean)

  if (phones.length === 0) {
    return NextResponse.json({ error: 'No phone number provided.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: receipt, error } = await admin
    .from('receipts')
    .select('receipt_type, unique_identifier, buyer_name, seller_name, buyer_phone, receipt_number')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })

  // Check wallet balance — ₦10 per SMS number
  const totalCost = phones.length * SMS_COST
  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', user.id).single()
  const walletBalance = wallet?.balance ?? 0
  if (walletBalance < totalCost) {
    return NextResponse.json({
      error: `Insufficient wallet balance. Sending SMS to ${phones.length} number${phones.length > 1 ? 's' : ''} costs ₦${totalCost.toLocaleString('en-NG')}. Your balance is ₦${walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`,
      code: 'INSUFFICIENT_BALANCE',
    }, { status: 402 })
  }

  const verifyUrl = `${APP_URL}/r/${receipt.unique_identifier}`
  const message = `${receipt.seller_name} sent you a receipt. View & verify: ${verifyUrl}\n\nHere is your receipt Verification Code:\n${receipt.unique_identifier}`

  const results: { phone: string; normalized: string; ok: boolean; termiiResponse?: unknown; error?: string }[] = []

  for (const raw of phones) {
    const normalized = normalizeNgPhone(raw)
    try {
      const termiiResponse = await sendTermiiSms(normalized, message)
      console.log('[SMS Route] Termii raw response for', normalized, JSON.stringify(termiiResponse))
      results.push({ phone: raw, normalized, ok: true, termiiResponse })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[SMS Route] Failed for', normalized, errMsg)
      results.push({ phone: raw, normalized, ok: false, error: errMsg })
    }
  }

  const sentCount = results.filter(r => r.ok).length
  const allFailed = sentCount === 0

  if (allFailed) {
    return NextResponse.json({ error: `Failed to send SMS. Details: ${results.map(r => r.error).join('; ')}`, results }, { status: 502 })
  }

  // Deduct ₦10 per successfully sent SMS
  if (sentCount > 0) {
    await deductWallet(user.id, sentCount * SMS_COST, `SMS Receipt — ${receipt.receipt_number} (${sentCount} number${sentCount > 1 ? 's' : ''})`, id)
  }

  const anyFailed = results.some(r => !r.ok)
  return NextResponse.json({ ok: true, results, warning: anyFailed ? 'Some numbers failed to receive SMS.' : undefined })
}
