import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ active: null })

  const jar = await cookies()
  const activeId = jar.get('active_sub_account')?.value

  if (!activeId) return NextResponse.json({ active: null })

  const db = createAdminClient()
  const { data } = await db
    .from('user_sub_accounts')
    .select('id, business_name, rc_number, logo_url, is_primary_profile')
    .eq('id', activeId)
    .eq('owner_user_id', user.id)
    .single()

  return NextResponse.json({ active: data ?? null })
}
