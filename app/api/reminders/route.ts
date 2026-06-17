import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ReminderFrequency = 'daily' | 'every_3_days' | 'weekly' | 'biweekly' | 'monthly'

const FREQUENCY_DAYS: Record<ReminderFrequency, number> = {
  daily: 1,
  every_3_days: 3,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

function nextSendAt(frequency: ReminderFrequency): string {
  const days = FREQUENCY_DAYS[frequency]
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

// POST — create or replace a reminder for a receipt
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let receiptId = '', frequency = ''
  try {
    const body = await req.json()
    receiptId = String(body?.receiptId ?? '').trim()
    frequency = String(body?.frequency ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!receiptId) return NextResponse.json({ error: 'receiptId required.' }, { status: 400 })
  if (!Object.keys(FREQUENCY_DAYS).includes(frequency)) {
    return NextResponse.json({ error: 'Invalid frequency.' }, { status: 400 })
  }

  const db = createAdminClient()

  // Verify the receipt belongs to this user and has an outstanding balance
  const { data: receipt } = await db
    .from('receipts')
    .select('id, buyer_email, buyer_name, balance_due, user_id')
    .eq('id', receiptId)
    .eq('user_id', user.id)
    .single()

  if (!receipt) return NextResponse.json({ error: 'Receipt not found.' }, { status: 404 })
  if (!receipt.buyer_email) return NextResponse.json({ error: 'Receipt has no customer email address.' }, { status: 400 })
  if ((receipt.balance_due ?? 0) <= 0) return NextResponse.json({ error: 'No outstanding balance on this receipt.' }, { status: 400 })

  // Upsert: one reminder per receipt (replace if exists)
  const { data, error } = await db
    .from('payment_reminders')
    .upsert({
      receipt_id: receiptId,
      user_id: user.id,
      buyer_email: receipt.buyer_email,
      buyer_name: receipt.buyer_name ?? '',
      frequency,
      next_send_at: nextSendAt(frequency as ReminderFrequency),
      is_active: true,
      send_count: 0,
      last_sent_at: null,
    }, { onConflict: 'receipt_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminder: data })
}
