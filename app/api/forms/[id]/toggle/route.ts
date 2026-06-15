import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: form } = await db
    .from('receipt_forms')
    .select('is_active')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  const { data: updated } = await db
    .from('receipt_forms')
    .update({ is_active: !form.is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  return NextResponse.json({ form: updated })
}
