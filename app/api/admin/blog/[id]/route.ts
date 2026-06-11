import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return getAdminUser()
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const allowed = ['title', 'slug', 'excerpt', 'category', 'content', 'read_time', 'published']
  const update: Record<string, unknown> = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  update.updated_at = new Date().toISOString()

  if ('published' in update) {
    if (update.published && !body.published_at) update.published_at = new Date().toISOString()
    if (!update.published) update.published_at = null
  }

  const db = createAdminClient()
  const { data, error } = await db.from('blog_posts').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const db = createAdminClient()
  const { error } = await db.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
