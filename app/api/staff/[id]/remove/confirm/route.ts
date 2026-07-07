import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashOtp } from '@/lib/otp-utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = createAdminClient()
  let user: any = null
  const authHeader = req.headers.get('authorization') ?? ''
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

  const { id } = await params
  const { sessionToken, code } = await req.json()

  if (!sessionToken || !code) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  // Verify ownership
  const { data: member } = await db.from('staff_members')
    .select('id, staff_id, owner_id')
    .eq('id', id)
    .eq('is_active', true)
    .single()
  if (!member || member.owner_id !== user.id) {
    return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
  }

  // Verify OTP
  const { data: session } = await db.from('otp_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .eq('used', false)
    .eq('type', 'nin')
    .eq('identifier', `remove_staff:${id}`)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'Code expired. Please resend.' }, { status: 400 })

  if (session.attempts >= 3) {
    return NextResponse.json({ error: 'Too many incorrect attempts. Please resend.' }, { status: 429 })
  }

  if (hashOtp(code) !== session.otp_hash) {
    await db.from('otp_sessions').update({ attempts: session.attempts + 1 }).eq('session_token', sessionToken)
    const remaining = Math.max(0, 2 - session.attempts)
    return NextResponse.json({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` }, { status: 400 })
  }

  await db.from('otp_sessions').update({ used: true }).eq('session_token', sessionToken)

  // Deactivate staff member
  await db.from('staff_members').update({ is_active: false, status: 'inactive' }).eq('id', id)

  // Revoke all Supabase sessions for this staff user
  if (member.staff_id) {
    await db.auth.admin.signOut(member.staff_id, 'global')
  }

  return NextResponse.json({ ok: true })
}
