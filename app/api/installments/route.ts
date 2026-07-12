import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/installments?receiptId=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const receiptId = req.nextUrl.searchParams.get('receiptId')
  if (!receiptId) return NextResponse.json({ error: 'Missing receiptId' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('installment_schedules')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('due_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ installments: data ?? [] })
}

// POST /api/installments — create one installment
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { receiptId, dueDate, amount, label, autoRemind, remindChannel, remindDaysBefore, remindDaysAfter, paidAt, appliedToBalance } = body
  if (!receiptId || !dueDate || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('installment_schedules')
    .insert({
      receipt_id: receiptId,
      user_id: user.id,
      due_date: dueDate,
      amount: parseFloat(amount),
      label: label || null,
      paid_at: paidAt ?? null,
      // The initial-payment entry is already counted in the receipt's amount_paid,
      // so mark it applied to avoid re-applying it if toggled later.
      applied_to_balance: !!appliedToBalance,
      auto_remind: !!autoRemind,
      remind_channel: remindChannel ?? 'email',
      remind_days_before: remindDaysBefore ?? 0,
      remind_days_after: remindDaysAfter ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ installment: data })
}

// PATCH /api/installments — toggle auto_remind
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, autoRemind } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('installment_schedules')
    .update({ auto_remind: !!autoRemind })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ installment: data })
}

// DELETE /api/installments?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from('installment_schedules').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
