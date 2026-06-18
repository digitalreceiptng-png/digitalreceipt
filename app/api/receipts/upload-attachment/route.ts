import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // JPG only, max 3MB
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 3 MB)' }, { status: 400 })
  if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG/JPEG images are allowed' }, { status: 400 })
  }

  const path = `receipt-attachments/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await db.storage
    .from('payment-evidence')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from('payment-evidence').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
