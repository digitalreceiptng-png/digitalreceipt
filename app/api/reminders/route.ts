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

  let receiptId = '', frequency = '', startDate = '', overrideEmail = ''
  try {
    const body = await req.json()
    receiptId     = String(body?.receiptId     ?? '').trim()
    frequency     = String(body?.frequency     ?? '').trim()
    startDate     = String(body?.startDate     ?? '').trim()
    overrideEmail = String(body?.overrideEmail ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!receiptId) return NextResponse.json({ error: 'receiptId required.' }, { status: 400 })
  if (!Object.keys(FREQUENCY_DAYS).includes(frequency)) {
    return NextResponse.json({ error: 'Invalid frequency.' }, { status: 400 })
  }

  const db = createAdminClient()

  // Resolve the owner: staff members act on behalf of an owner
  const { data: staffRow } = await db
    .from('staff_members')
    .select('owner_id')
    .eq('staff_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  const ownerUserId = staffRow ? staffRow.owner_id : user.id

  // Use select('*') so missing optional columns (balance_due, amount_paid)
  // don't cause a PostgREST column-not-found error that looks like "not found"
  const { data: receipt, error: receiptErr } = await db
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .eq('user_id', ownerUserId)
    .single()

  if (receiptErr || !receipt) {
    return NextResponse.json({ error: receiptErr?.message ?? 'Receipt not found.' }, { status: 404 })
  }
  const buyerEmail = receipt.buyer_email || overrideEmail
  if (!buyerEmail) return NextResponse.json({ error: 'No customer email address. Please provide one.' }, { status: 400 })

  // balance_due column may not exist yet — fall back to total_amount - amount_paid
  const balanceDue = Number(receipt.balance_due ?? (Number(receipt.total_amount) - Number(receipt.amount_paid ?? 0)))
  if (balanceDue <= 0) return NextResponse.json({ error: 'No outstanding balance on this receipt.' }, { status: 400 })

  // Use provided startDate if valid, otherwise default to one interval from now
  let firstSend: string
  if (startDate && !isNaN(Date.parse(startDate))) {
    firstSend = new Date(startDate).toISOString()
  } else {
    firstSend = nextSendAt(frequency as ReminderFrequency)
  }

  // Upsert: one reminder per receipt (replace if exists)
  const { data, error } = await db
    .from('payment_reminders')
    .upsert({
      receipt_id: receiptId,
      user_id: ownerUserId,
      buyer_email: buyerEmail,
      buyer_name: receipt.buyer_name ?? '',
      frequency,
      next_send_at: firstSend,
      is_active: true,
      send_count: 0,
      last_sent_at: null,
    }, { onConflict: 'receipt_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminder: data })
}
