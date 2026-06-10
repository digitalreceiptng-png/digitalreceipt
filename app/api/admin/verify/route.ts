import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called after Supabase sign-in to confirm the user is in the admins table.
// Uses service role so it can read the admins table (protected by RLS).
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    const db = createAdminClient()
    const { data: admin } = await db
      .from('admins')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!admin) {
      return NextResponse.json({ isAdmin: false }, { status: 403 })
    }

    return NextResponse.json({ isAdmin: true, role: admin.role })
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}
