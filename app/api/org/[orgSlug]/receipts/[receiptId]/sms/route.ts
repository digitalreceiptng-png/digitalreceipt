import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOrgToken } from '@/lib/org-auth'
import { sendTermiiSms } from '@/lib/termii'
import { normalizeNgPhone } from '@/lib/otp-utils'
import { deductWallet } from '@/lib/wallet'

const APP_URL = 'https://digitalreceipt.ng'
const SMS_COST = 10

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; receiptId: string }> }
) {
  const { orgSlug, receiptId } = await params

  const token = req.cookies.get(`org_session_${orgSlug}`)?.value
  const session = token ? await verifyOrgToken(token) : null
  if (!session || session.orgSlug !== orgSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const phones: string[] = (body?.phones ?? []).map((p: string) => p.trim()).filter(Boolean)
  if (phones.length === 0) return NextResponse.json({ error: 'No phone number provided.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: receipt, error } = await admin
    .from('receipts')
    .select('receipt_type, unique_identifier, buyer_name, seller_name, buyer_phone, receipt_number')
    .eq('id', receiptId)
    .eq('user_id', session.ownerUserId)
    .single()

  if (error || !receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })

  const totalCost = phones.length * SMS_COST
  const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', session.ownerUserId).single()
  const walletBalance = wallet?.balance ?? 0
  if (walletBalance < totalCost) {
    return NextResponse.json({
      error: `Insufficient wallet balance. Sending to ${phones.length} number${phones.length > 1 ? 's' : ''} costs ₦${totalCost}. Balance: ₦${walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`,
      code: 'INSUFFICIENT_BALANCE',
    }, { status: 402 })
  }

  const verifyUrl = `${APP_URL}/r/${receipt.unique_identifier}`
  const message = `${receipt.seller_name} sent you a receipt. View & verify: ${verifyUrl}\n\nVerification Code: ${receipt.unique_identifier}`

  const results: { phone: string; normalized: string; ok: boolean; error?: string }[] = []
  for (const raw of phones) {
    const normalized = normalizeNgPhone(raw)
    try {
      await sendTermiiSms(normalized, message)
      results.push({ phone: raw, normalized, ok: true })
    } catch (err) {
      results.push({ phone: raw, normalized, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  const sentCount = results.filter(r => r.ok).length
  if (sentCount === 0) {
    return NextResponse.json({ error: `Failed to send SMS. ${results.map(r => r.error).join('; ')}`, results }, { status: 502 })
  }

  await deductWallet(session.ownerUserId, sentCount * SMS_COST, `SMS Receipt — ${receipt.receipt_number} (${sentCount} number${sentCount > 1 ? 's' : ''})`, receiptId)

  return NextResponse.json({ ok: true, results, warning: results.some(r => !r.ok) ? 'Some numbers failed.' : undefined })
}
