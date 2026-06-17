import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* no body is fine */ }

  const db = createAdminClient()

  // Upsert profile — creates it if trigger failed, updates if it exists
  const profilePayload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    ...body.profile as Record<string, unknown>,
  }
  const { error: profileErr } = await db
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })

  if (profileErr) {
    return NextResponse.json({ error: `Profile error: ${profileErr.message}` }, { status: 500 })
  }

  // Ensure wallet exists (ignore conflict — just don't overwrite existing balance)
  await db
    .from('wallets')
    .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id', ignoreDuplicates: true })

  return NextResponse.json({ ok: true })
}
