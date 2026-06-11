import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin-auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { role } = await req.json()

  const db = createAdminClient()
  const { error } = await db.from('admins').update({ role }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (id === admin.id) {
    return NextResponse.json({ error: 'You cannot remove your own account' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('admins').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
