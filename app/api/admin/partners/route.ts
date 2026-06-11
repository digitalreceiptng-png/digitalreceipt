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
  const { name, logo_url, website_url, sort_order } = body
  if (!name || !logo_url) return NextResponse.json({ error: 'Name and logo URL are required' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db.from('partners').insert({ name, logo_url, website_url: website_url || null, sort_order: sort_order ?? 0 }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partner: data }, { status: 201 })
}
