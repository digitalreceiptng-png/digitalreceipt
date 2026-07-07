import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getUser(req: NextRequest) {
  const db = createAdminClient()
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(authHeader.slice(7))
    if (data.user) return { user: data.user, db }
  }
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return { user: data.user ?? null, db }
}

export async function GET(req: NextRequest) {
  const { user, db } = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? ''
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const PAGE_SIZE = 20
  const offset = (page - 1) * PAGE_SIZE

  let query = db
    .from('receipt_form_submissions')
    .select(
      'id, customer_name, customer_email, customer_phone, purpose_of_payment, total_amount, payment_method, submitted_at, status, payment_evidence_url, payment_evidence_name, item_description, unit_price, payment_date, additional_notes, rejection_reason, form:receipt_forms(id, title)',
      { count: 'exact' }
    )
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

export async function PATCH(req: NextRequest) {
  const { user, db } = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, rejection_reason } = await req.json()
  if (!id || !['confirmed', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: existing } = await db
    .from('receipt_form_submissions')
    .select('id, status')
    .eq('id', id)
    .eq('issuer_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'pending') return NextResponse.json({ error: 'Already actioned' }, { status: 409 })

  const update: any = { status }
  if (status === 'rejected' && rejection_reason) update.rejection_reason = rejection_reason

  await db.from('receipt_form_submissions').update(update).eq('id', id)
  return NextResponse.json({ ok: true })
}
