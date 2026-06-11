import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { title, slug, excerpt, category, content, read_time, published } = body
  if (!title || !slug || !excerpt || !content) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db.from('blog_posts').insert({
    title, slug, excerpt, category: category ?? 'Insights', content,
    read_time: read_time ?? '5 min read',
    published: !!published,
    published_at: published ? new Date().toISOString() : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data }, { status: 201 })
}
