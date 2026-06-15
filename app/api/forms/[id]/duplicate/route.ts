import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: source } = await db
    .from('receipt_forms')
    .select('*, purposes:receipt_form_purposes(label, sort_order)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!source) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  const { data: copy, error } = await db
    .from('receipt_forms')
    .insert({
      user_id: user.id,
      title: source.title ? `${source.title} (Copy)` : null,
      is_active: false,
      vat_enabled: source.vat_enabled,
      vat_rate: source.vat_rate,
      require_payment_evidence: source.require_payment_evidence,
      additional_instructions: source.additional_instructions,
      purpose_type: source.purpose_type,
      fixed_purpose: source.fixed_purpose,
      field_labels: source.field_labels,
      field_config: source.field_config,
    })
    .select()
    .single()

  if (error || !copy) return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })

  if (source.purposes?.length) {
    await db.from('receipt_form_purposes').insert(
      source.purposes.map((p: { label: string; sort_order: number }) => ({
        form_id: copy.id,
        label: p.label,
        sort_order: p.sort_order,
      }))
    )
  }

  return NextResponse.json({ form: copy }, { status: 201 })
}
