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

  const formData = await request.formData()
  const name = String(formData.get('name') ?? '').trim()
  const website_url = String(formData.get('website_url') ?? '').trim() || null
  const sort_order = Number(formData.get('sort_order') ?? 0)
  const file = formData.get('logo') as File | null

  if (!name || !file) return NextResponse.json({ error: 'Name and logo image are required' }, { status: 400 })

  const db = createAdminClient()

  // Upload logo to Supabase Storage
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `partners/${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}.${ext}`
  const { error: uploadErr } = await db.storage.from('public-assets').upload(path, file, { contentType: file.type, upsert: true })
  if (uploadErr) return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from('public-assets').getPublicUrl(path)

  const { data, error } = await db.from('partners').insert({ name, logo_url: publicUrl, website_url, sort_order }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partner: data }, { status: 201 })
}
