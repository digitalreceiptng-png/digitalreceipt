import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()
  await db.from('user_sub_accounts').delete().eq('id', id).eq('owner_user_id', user.id)

  // If this was the active profile, clear it
  const jar = await cookies()
  if (jar.get('active_sub_account')?.value === id) {
    jar.delete('active_sub_account')
  }

  return NextResponse.json({ ok: true })
}
