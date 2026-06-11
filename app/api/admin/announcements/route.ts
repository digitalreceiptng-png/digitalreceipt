import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin-auth'

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, message, type, link_text, link_url, expires_at } = await req.json()
  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('announcements')
    .insert({ title, message, type: type ?? 'info', link_text: link_text || null, link_url: link_url || null, expires_at: expires_at || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcement: data })
}
