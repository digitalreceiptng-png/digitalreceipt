import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? ''
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const PAGE_SIZE = 20
  const offset = (page - 1) * PAGE_SIZE

  const db = createAdminClient()

  let query = db
    .from('receipt_form_submissions')
    .select('id, customer_name, customer_email, purpose_of_payment, total_amount, payment_method, submitted_at, status, payment_evidence_url, receipt_id, form:receipt_forms(id, title)', { count: 'exact' })
    .eq('issuer_id', user.id)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (status && ['pending', 'confirmed', 'rejected'].includes(status)) {
    query = query.eq('status', status)
  }

  if (q) {
    query = query.or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,purpose_of_payment.ilike.%${q}%`)
  }

  const { data: submissions, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ submissions, count, page, pageSize: PAGE_SIZE })
}
