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
  // Columns the owner ticked in the export picker — the public view renders exactly these.
  const columns = Array.isArray(body.columns)
    ? body.columns.filter((c: unknown) => typeof c === 'string').slice(0, 20)
    : null
  // Their (possibly customized) header titles, keyed by column — { receipt_number: 'Invoice No.' }.
  const labels = body.labels && typeof body.labels === 'object' && !Array.isArray(body.labels)
    ? Object.fromEntries(
        Object.entries(body.labels as Record<string, unknown>)
          .filter(([, v]) => typeof v === 'string')
          .map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 80)])
          .slice(0, 20)
      )
    : null
  // Active period: the link stops working this many days after creation. 0 / missing = never expires.
  const days = Math.min(3650, Math.max(0, Math.floor(Number(body.expiresInDays) || 0)))
  const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null

  const jar = await cookies()
  const isStaff = !!user.app_metadata?.is_staff
  const subAccountId = !isStaff ? (jar.get('active_sub_account')?.value ?? null) : null

  const token = makeToken()
  const db = createAdminClient()
  const { data, error } = await db.from('shared_exports').insert({
    token, user_id: userId, sub_account_id: subAccountId, group_id: group, title, columns, labels, expires_at: expiresAt,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token, id: data.id, expiresAt })
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
