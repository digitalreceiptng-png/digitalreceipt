import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { getStaffScopes, isScopeAccessible } from '@/lib/staff-scopes'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ active: null })

  const jar = await cookies()
  const activeId = jar.get('active_sub_account')?.value
  if (!activeId || activeId === 'main') return NextResponse.json({ active: null })

  const db = createAdminClient()

  // Staff act on behalf of an owner — resolve the owner and enforce assigned scopes.
  const { data: staffRow } = await db
    .from('staff_members')
    .select('owner_id, manage_all_profiles, managed_scopes')
    .eq('staff_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  const ownerId = staffRow?.owner_id ?? user.id

  if (staffRow) {
    const scopes = await getStaffScopes(db, staffRow, ownerId)
    if (!isScopeAccessible(scopes, activeId)) return NextResponse.json({ active: null })
  }

  const { data } = await db
    .from('user_sub_accounts')
    .select('id, business_name, rc_number, logo_url, is_primary_profile')
    .eq('id', activeId)
    .eq('owner_user_id', ownerId)
    .single()

  return NextResponse.json({ active: data ?? null })
}
