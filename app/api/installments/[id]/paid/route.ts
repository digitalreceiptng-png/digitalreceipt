import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'

// PATCH /api/installments/[id]/paid — toggle paid
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { paid } = await req.json()

  const db = createAdminClient()
  const { data, error } = await db
    .from('installment_schedules')
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (paid) {
    void logActivity({
      userId: user.id,
      type: 'installment_paid',
      title: `Installment marked as paid`,
      description: data.label ? `${data.label} · ₦${Number(data.amount).toLocaleString('en-NG')}` : `₦${Number(data.amount).toLocaleString('en-NG')}`,
      entityId: data.receipt_id,
      entityType: 'receipt',
      meta: { installment_id: id, amount: data.amount },
    })
  }

  return NextResponse.json({ installment: data })
}
