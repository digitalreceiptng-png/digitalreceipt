import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const { data: form } = await db
    .from('receipt_forms')
    .select('id, is_active')
    .eq('id', id)
    .single()

  if (!form || !form.is_active) {
    return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 })
  }

  const formData = await (req.formData() as any).catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const maxSize = 10 * 1024 * 1024 // 10 MB
  if (file.size > maxSize) return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WebP, or PDF files are allowed' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await db.storage
    .from('payment-evidence')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from('payment-evidence').getPublicUrl(path)

  return NextResponse.json({ url: publicUrl, name: file.name })
}
