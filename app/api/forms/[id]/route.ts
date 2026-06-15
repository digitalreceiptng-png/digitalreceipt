import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: form, error } = await db
    .from('receipt_forms')
    .select('*, purposes:receipt_form_purposes(id, label, sort_order)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  return NextResponse.json({ form })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const db = createAdminClient()

  const { data: form, error } = await db
    .from('receipt_forms')
    .update({
      title: body.title ?? null,
      vat_enabled: body.vat_enabled ?? false,
      vat_rate: body.vat_rate ?? null,
      require_payment_evidence: body.require_payment_evidence ?? false,
      additional_instructions: body.additional_instructions ?? null,
      purpose_type: body.purpose_type ?? 'fixed',
      fixed_purpose: body.fixed_purpose ?? null,
      field_labels: body.field_labels ?? {},
      field_config: body.field_config ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  // Replace purposes
  await db.from('receipt_form_purposes').delete().eq('form_id', id)
  const purposes = body.purposes as Array<{ label: string; sort_order: number }> | undefined
  if (purposes?.length) {
    await db.from('receipt_form_purposes').insert(
      purposes.map(p => ({ form_id: id, label: p.label, sort_order: p.sort_order }))
    )
  }

  return NextResponse.json({ form })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { error } = await db
    .from('receipt_forms')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
