import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffScopes, resolveStaffRow } from '@/lib/staff-scopes'

// GET — the company profiles the current user may issue receipts under (main account + any
// assigned/owned sub-accounts). Used by the mobile app to render a profile switcher and to
// show which company is currently active. Supports both cookie sessions (web) and Bearer
// tokens (mobile), matching the auth pattern in app/api/receipts/route.ts.
export async function GET(request: NextRequest) {
  const db = createAdminClient()

  let user: any = null
  const authHeader = request.headers.get('authorization') ?? ''
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

  const staffRow = await resolveStaffRow(db, user, 'owner_id, manage_all_profiles, managed_scopes')
  const ownerId = staffRow?.owner_id ?? user.id

  const { data: ownerProfile } = await db
    .from('profiles')
    .select('full_name, business_name, issuer_type, logo_url')
    .eq('id', ownerId)
    .maybeSingle()
  const ownerName = ownerProfile?.issuer_type === 'business'
    ? (ownerProfile?.business_name ?? ownerProfile?.full_name ?? '')
    : (ownerProfile?.full_name ?? '')
  const ownerLogoUrl = ownerProfile?.logo_url ?? null

  // Staff are limited to their assigned scopes. A non-staff owner always has access to their
  // own main account + every one of their own company profiles — reuse getStaffScopes with
  // manage_all_profiles:true to enumerate that the same way.
  const assignment = staffRow ?? { manage_all_profiles: true, managed_scopes: ['main'] }
  const scopes = await getStaffScopes(db, assignment, ownerId, ownerName, ownerLogoUrl)

  return NextResponse.json({ scopes, isStaff: !!staffRow })
}
