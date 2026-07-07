import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const db = createAdminClient()
  let user: any = null
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(authHeader.slice(7))
    user = data.user ?? null
  }
  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: members } = await db
    .from('staff_members')
    .select('id, display_name, phone, role, access_level, is_active, created_at, login_code_hash')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ members: members ?? [] })
}
