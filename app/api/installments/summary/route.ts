import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getUser(req: NextRequest) {
  const db = createAdminClient()
  const auth = req.headers.get('authorization') ?? ''
  if (auth.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(auth.slice(7))
    if (data.user) return data.user
  }
  const supabase = await createClient()
  return (await supabase.auth.getUser()).data.user ?? null
}

// GET /api/installments/summary
// Returns { instMap: { [receiptId]: { total, paidCount, hasOverdue } } } for the user's receipts.
// Used by the mobile list to render the "payments / scheduled installments" badge.
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data } = await db
    .from('installment_schedules')
    .select('receipt_id, due_date, paid_at')
    .eq('user_id', user.id)

  const now = Date.now()
  const instMap: Record<string, { total: number; paidCount: number; hasOverdue: boolean }> = {}
  for (const inst of data ?? []) {
    const m = instMap[inst.receipt_id] ?? (instMap[inst.receipt_id] = { total: 0, paidCount: 0, hasOverdue: false })
    m.total++
    if (inst.paid_at) m.paidCount++
    else if (new Date(inst.due_date).getTime() < now) m.hasOverdue = true
  }

  return NextResponse.json({ instMap })
}
