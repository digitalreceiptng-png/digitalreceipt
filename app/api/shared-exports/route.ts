import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'

function makeToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
}

// GET — list the user's share links
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = getEffectiveUserId(user)

  const db = createAdminClient()
  const { data } = await db
    .from('shared_exports')
    .select('id, token, group_id, title, revoked, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ links: data ?? [] })
}

// POST — create a share link for the current profile + group
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = getEffectiveUserId(user)

  const body = await req.json().catch(() => ({}))
  const group = body.group && body.group !== 'none' ? String(body.group) : null
  const title = body.title ? String(body.title) : null

  const jar = await cookies()
  const isStaff = !!user.app_metadata?.is_staff
  const subAccountId = !isStaff ? (jar.get('active_sub_account')?.value ?? null) : null

  const token = makeToken()
  const db = createAdminClient()
  const { data, error } = await db.from('shared_exports').insert({
    token, user_id: userId, sub_account_id: subAccountId, group_id: group, title,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token, id: data.id })
}

// DELETE — revoke a link (?id=...)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = getEffectiveUserId(user)

  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db
    .from('shared_exports')
    .update({ revoked: true })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
