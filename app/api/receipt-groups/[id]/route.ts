import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { name, color } = await req.json()

  const db = createAdminClient()
  const { data, error } = await db
    .from('receipt_groups')
    .update({ ...(name ? { name } : {}), ...(color ? { color } : {}) })
    .eq('id', id).eq('user_id', user.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ group: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(_req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()
  // Ungroup all receipts in this group first
  await db.from('receipts').update({ group_id: null }).eq('group_id', id)
  await db.from('receipt_groups').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
