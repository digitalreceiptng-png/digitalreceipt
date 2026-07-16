import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { logActivity } from '@/lib/activity'
import { getStaffScopes, isScopeAccessible } from '@/lib/staff-scopes'

// POST { id: string | null } — switch active profile (null = main account)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const jar = await cookies()
  const db = createAdminClient()

  // If the caller is a staff member, they may only activate a profile they're assigned to.
  const { data: staffRow } = await db
    .from('staff_members')
    .select('owner_id, manage_all_profiles, managed_scopes')
    .eq('staff_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (staffRow) {
    const scopes = await getStaffScopes(db, staffRow, staffRow.owner_id)
    if (!isScopeAccessible(scopes, id ?? null)) {
      return NextResponse.json({ error: 'You are not assigned to this profile' }, { status: 403 })
    }
  }

  if (id) {
    jar.set('active_sub_account', id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
    const { data: sub } = await db.from('user_sub_accounts').select('business_name').eq('id', id).single()
    await logActivity({
      userId: user.id,
      type: 'profile_switched',
      title: `Switched to ${sub?.business_name ?? 'company profile'}`,
      entityId: id,
      entityType: 'sub_account',
    })
  } else {
    jar.delete('active_sub_account')
    await logActivity({ userId: user.id, type: 'profile_switched', title: 'Switched back to main account' })
  }

  return NextResponse.json({ ok: true })
}
