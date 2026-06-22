import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTermiiSms } from '@/lib/termii'
import { normalizeNgPhone } from '@/lib/otp-utils'

const APP_URL = 'https://digitalreceipt.ng'

// Max extra numbers (beyond customer's own) by receipt type
const EXTRA_LIMIT: Record<string, number> = {
  gold:     2,
  diamond:  5,
  platinum: 10,
}

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

  const admin = createAdminClient()
  const { data: receipt, error } = await admin
    .from('receipts')
    .select('receipt_type, unique_identifier, buyer_name, seller_name, buyer_phone, receipt_number')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })

  const receiptType: string = (receipt.receipt_type ?? 'silver').toLowerCase()

  if (receiptType === 'silver') {
    return NextResponse.json({ error: 'SMS is not available on Silver receipts.' }, { status: 403 })
  }

  const maxExtra = EXTRA_LIMIT[receiptType] ?? 0
  // First phone must be customer's number (or supplied); extras are beyond that
  const extraPhones = phones.slice(1) // phones[0] is always customer's
  if (extraPhones.length > maxExtra) {
    return NextResponse.json(
      { error: `${receiptType.charAt(0).toUpperCase() + receiptType.slice(1)} receipts allow at most ${maxExtra} extra number(s) in addition to the customer's.` },
      { status: 400 }
    )
  }

  if (phones.length === 0) {
    return NextResponse.json({ error: 'No phone number provided.' }, { status: 400 })
  }

  const verifyUrl = `${APP_URL}/r/${receipt.unique_identifier}`
  const message = `${receipt.seller_name} sent you a receipt. View & verify: ${verifyUrl}`

  const results: { phone: string; normalized: string; ok: boolean; error?: string }[] = []

  for (const raw of phones) {
    const normalized = normalizeNgPhone(raw)
    try {
      await sendTermiiSms(normalized, message)
      results.push({ phone: raw, normalized, ok: true })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[SMS Route] Failed for', normalized, errMsg)
      results.push({ phone: raw, normalized, ok: false, error: errMsg })
    }
  }

  const allFailed = results.every(r => !r.ok)
  if (allFailed) return NextResponse.json({ error: `Failed to send SMS. Details: ${results.map(r => r.error).join('; ')}`, results }, { status: 502 })

  const anyFailed = results.some(r => !r.ok)
  return NextResponse.json({ ok: true, results, warning: anyFailed ? 'Some numbers failed to receive SMS.' : undefined })
}
