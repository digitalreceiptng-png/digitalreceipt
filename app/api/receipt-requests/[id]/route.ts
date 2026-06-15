import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: submission, error } = await db
    .from('receipt_form_submissions')
    .select('*, form:receipt_forms(id, title, field_labels, vat_enabled, vat_rate), receipt:receipts(id, receipt_number, unique_identifier)')
    .eq('id', id)
    .eq('issuer_id', user.id)
    .single()

  if (error || !submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ submission })
}
