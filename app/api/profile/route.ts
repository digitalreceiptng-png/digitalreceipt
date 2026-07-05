import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const effectiveUserId = getEffectiveUserId(user)
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', effectiveUserId)
    .single()

  return NextResponse.json({ profile, isStaffViewing: effectiveUserId !== user.id })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const effectiveUserId = getEffectiveUserId(user)

  // Only full-access staff or the owner themselves can update
  const isFullAccessStaff = user.app_metadata?.is_staff && user.app_metadata?.access_level === 'full'
  if (user.app_metadata?.is_staff && !isFullAccessStaff) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const admin = createAdminClient()
  const body = await request.json()

  const allowed = ['full_name', 'phone', 'address', 'business_name', 'issued_by_name']
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const { error } = await admin.from('profiles').update(updates).eq('id', effectiveUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
