import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function getUser(req: NextRequest) {
  const db = createAdminClient()
  const auth = req.headers.get('authorization') ?? ''
  if (auth.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(auth.slice(7))
    if (data.user) return data.user
  }
  const supabase = await createClient()
  return (await supabase.auth.getUser()).data.user ?? null
}

// The active company profile is stored in the `active_sub_account` cookie (web
// profile switcher). Validate it belongs to the user and return its id, else null.
// Mobile sends no cookie, so it always resolves to the main profile (null).
async function getActiveSubAccountId(
  db: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string | null> {
  const jar = await cookies()
  const activeSubId = jar.get('active_sub_account')?.value ?? null
  if (!activeSubId) return null
  const { data } = await db
    .from('user_sub_accounts')
    .select('id')
    .eq('id', activeSubId)
    .eq('owner_user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const subAccountId = await getActiveSubAccountId(db, user.id)

  let query = db
    .from('receipt_groups')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  query = subAccountId
    ? query.eq('sub_account_id', subAccountId)
    : query.is('sub_account_id', null)

  const { data } = await query
  return NextResponse.json({ groups: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const db = createAdminClient()
  const subAccountId = await getActiveSubAccountId(db, user.id)

  const { data, error } = await db
    .from('receipt_groups')
    .insert({ user_id: user.id, name: name.trim(), color: color ?? '#1a5c2a', sub_account_id: subAccountId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ group: data })
}
