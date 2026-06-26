import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin-auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()

  const { id } = await params

  // Fetch the verification to get the user_id
  const { data: verification } = await db
    .from('identity_verifications')
    .select('id, user_id, status')
    .eq('id', id)
    .single()

  if (!verification) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (verification.status === 'rejected') return NextResponse.json({ error: 'Already rejected' }, { status: 409 })

  await db
    .from('identity_verifications')
    .update({ status: 'rejected', rejected_at: new Date().toISOString(), rejected_by: user.id })
    .eq('id', id)

  // Check if user has other approved verifications; if not, revoke is_verified
  const { count } = await db
    .from('identity_verifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', verification.user_id)
    .eq('status', 'approved')

  if ((count ?? 0) === 0) {
    await db.from('profiles').update({ is_verified: false }).eq('id', verification.user_id)
  }

  return NextResponse.json({ success: true })
}
