import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: forms, error } = await db
    .from('receipt_forms')
    .select('*, purposes:receipt_form_purposes(id, label, sort_order)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ forms })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const db = createAdminClient()

  const { data: form, error: formError } = await db
    .from('receipt_forms')
    .insert({
      user_id: user.id,
      title: body.title ?? null,
      is_active: true,
      vat_enabled: body.vat_enabled ?? false,
      vat_rate: body.vat_rate ?? null,
      require_payment_evidence: body.require_payment_evidence ?? false,
      additional_instructions: body.additional_instructions ?? null,
      purpose_type: body.purpose_type ?? 'fixed',
      fixed_purpose: body.fixed_purpose ?? null,
      field_labels: body.field_labels ?? {},
      field_config: body.field_config ?? {},
    })
    .select()
    .single()

  if (formError) return NextResponse.json({ error: formError.message }, { status: 500 })

  const purposes = body.purposes as Array<{ label: string; sort_order: number }> | undefined
  if (purposes?.length) {
    await db.from('receipt_form_purposes').insert(
      purposes.map(p => ({ form_id: form.id, label: p.label, sort_order: p.sort_order }))
    )
  }

  await logActivity({
    userId: user.id,
    type: 'form_created',
    title: `Receipt request form created${form.title ? `: ${form.title}` : ''}`,
    entityId: form.id,
    entityType: 'form',
  })

  return NextResponse.json({ form }, { status: 201 })
}
