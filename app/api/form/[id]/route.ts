import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const { data: form, error } = await db
    .from('receipt_forms')
    .select('*, purposes:receipt_form_purposes(id, label, sort_order), issuer:profiles!receipt_forms_user_id_fkey(full_name, business_name, issuer_type)')
    .eq('id', id)
    .single()

  if (error || !form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  return NextResponse.json({ form })
}
