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
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const db = createAdminClient()

  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    // Edit form with optional logo replacement
    const fd = await request.formData()
    const name = String(fd.get('name') ?? '').trim()
    const website_url = String(fd.get('website_url') ?? '').trim() || null
    const file = fd.get('logo') as File | null

    const update: Record<string, unknown> = { name, website_url }

    if (file && file.size > 0) {
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `partners/${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}.${ext}`
      const { error: uploadErr } = await db.storage.from('assets').upload(path, file, { contentType: file.type, upsert: true })
      if (uploadErr) return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 })
      const { data: { publicUrl } } = db.storage.from('assets').getPublicUrl(path)
      update.logo_url = publicUrl
    }

    const { data: partner, error } = await db.from('partners').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ partner })
  }

  // JSON patch (toggle active, sort order, etc.)
  const body = await request.json()
  const allowed = ['name', 'logo_url', 'website_url', 'is_active', 'sort_order']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  const { error } = await db.from('partners').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const db = createAdminClient()
  const { error } = await db.from('partners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
