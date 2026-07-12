import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'

async function getUserId(req: NextRequest): Promise<string | null> {
  const db = createAdminClient()
  const auth = req.headers.get('authorization') ?? ''
  if (auth.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(auth.slice(7))
    if (data.user) return getEffectiveUserId(data.user)
  }
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ? getEffectiveUserId(data.user) : null
}

// Normalize the ?group= param: 'none'/empty → General (null), a UUID → that group.
function normGroup(v: string | null | undefined): string | null {
  return v && v !== 'none' ? String(v) : null
}

// GET — list the user's expenditures/taxes for the active group scope
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const group = normGroup(new URL(req.url).searchParams.get('group'))

  const db = createAdminClient()
  let q = db
    .from('user_expenditures')
    .select('id, label, value, type, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  q = group ? q.eq('group_id', group) : q.is('group_id', null)
  const { data } = await q

  return NextResponse.json({ expenditures: data ?? [] })
}

// POST — create a new expenditure/tax entry
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const label = String(body.label ?? 'Expenditure').trim() || 'Expenditure'
  const value = Number(body.value) || 0
  const type = body.type === 'percent' ? 'percent' : 'fixed'
  const sort_order = Number(body.sort_order) || 0
  const group_id = normGroup(body.group)

  const db = createAdminClient()
  const { data, error } = await db
    .from('user_expenditures')
    .insert({ user_id: userId, label, value, type, sort_order, group_id })
    .select('id, label, value, type, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expenditure: data })
}

// PATCH — update an existing entry (only the caller's own rows)
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (body.label !== undefined) patch.label = String(body.label).trim() || 'Expenditure'
  if (body.value !== undefined) patch.value = Number(body.value) || 0
  if (body.type !== undefined) patch.type = body.type === 'percent' ? 'percent' : 'fixed'

  const db = createAdminClient()
  const { data, error } = await db
    .from('user_expenditures')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, label, value, type, sort_order')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expenditure: data })
}

// DELETE — remove an entry (?id=...)
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db
    .from('user_expenditures')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
