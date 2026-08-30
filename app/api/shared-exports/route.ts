import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function makeToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
}

// Resolve owner + staff status the same way the receipts list does — any active
// staff_members row means owner's data is what's shown, regardless of access level.
// (getEffectiveUserId() only redirects to the owner for access_level 'full', which
// left partial-access staff generating share links scoped to their own — receiptless
// — user id, so the exported page always came back with 0 receipts.)
async function resolveOwner(db: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: staffRow } = await db
    .from('staff_members')
    .select('owner_id')
    .eq('staff_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  return { ownerUserId: staffRow ? staffRow.owner_id : userId, isStaff: !!staffRow }
}

// GET — list the user's share links
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { ownerUserId } = await resolveOwner(db, user.id)

  const { data } = await db
    .from('shared_exports')
    .select('id, token, group_id, title, revoked, created_at')
    .eq('user_id', ownerUserId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ links: data ?? [] })
}

// POST — create a share link for the current profile + group
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { ownerUserId, isStaff } = await resolveOwner(db, user.id)

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
  const includeFinancials = body.includeFinancials !== false

  const jar = await cookies()
  const subAccountId = !isStaff ? (jar.get('active_sub_account')?.value ?? null) : null

  const token = makeToken()
  const { data, error } = await db.from('shared_exports').insert({
    token, user_id: ownerUserId, sub_account_id: subAccountId, group_id: group, title, columns, labels, expires_at: expiresAt,
    include_financials: includeFinancials,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token, id: data.id, expiresAt })
}

// DELETE — revoke a link (?id=...)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { ownerUserId } = await resolveOwner(db, user.id)

  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await db
    .from('shared_exports')
    .update({ revoked: true })
    .eq('id', id)
    .eq('user_id', ownerUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
