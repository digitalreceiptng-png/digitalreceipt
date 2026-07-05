import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const effectiveUserId = getEffectiveUserId(user)
  const db = createAdminClient()
  const { data } = await db
    .from('user_sub_accounts')
    .select('*')
    .eq('owner_user_id', effectiveUserId)
    .eq('is_primary_profile', false)
    .order('created_at', { ascending: true })

  return NextResponse.json({ accounts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_name, rc_number } = await req.json()
  if (!business_name?.trim() || !rc_number?.trim()) {
    return NextResponse.json({ error: 'Business name and RC number are required' }, { status: 400 })
  }

  const db = createAdminClient()

  // Check RC not already used
  const { data: existing } = await db
    .from('user_sub_accounts')
    .select('id')
    .eq('rc_number', rc_number.trim())
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'This RC number is already registered.' }, { status: 409 })

  const { data, error } = await db
    .from('user_sub_accounts')
    .insert({
      owner_user_id: user.id,
      business_name: business_name.trim(),
      rc_number: rc_number.trim(),
      is_verified: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}
