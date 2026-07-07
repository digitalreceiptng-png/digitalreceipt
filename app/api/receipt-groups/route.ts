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

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data } = await db
    .from('receipt_groups')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ groups: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('receipt_groups')
    .insert({ user_id: user.id, name: name.trim(), color: color ?? '#1a5c2a' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ group: data })
}
