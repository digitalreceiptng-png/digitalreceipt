import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin-auth'

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, role, full_name } = await req.json()
  if (!email?.trim() || !role) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
  }

  const db = createAdminClient()

  // Create auth user with random password (they'll use magic link to log in)
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: full_name || email },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  // Upsert profile
  await db.from('profiles').upsert({ id: userId, email, full_name: full_name || email }, { onConflict: 'id' })

  // Insert into admins table
  const { error: adminError } = await db.from('admins').insert({ id: userId, role })
  if (adminError) return NextResponse.json({ error: adminError.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: userId })
}
