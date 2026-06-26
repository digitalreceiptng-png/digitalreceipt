import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// This endpoint must only be called server-side after a real QoreID OTP
// verification completes — it should NOT be callable by clients directly.
// We validate that a pending OTP session exists before logging the result.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let type: string, identifier: string, verified_name: string, session_token: string
  try {
    const body = await req.json()
    type = String(body.type ?? '')
    identifier = String(body.identifier ?? '').trim()
    verified_name = String(body.verified_name ?? '').trim()
    session_token = String(body.session_token ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!['nin', 'cac'].includes(type) || !identifier || !session_token) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const db = createAdminClient()

  // Validate that a real QoreID OTP session exists for this user + identifier
  // The session must be in 'verified' state (set server-side by /api/otp/verify)
  const { data: session } = await db
    .from('verify_sessions')
    .select('id, status, type, identifier')
    .eq('user_id', user.id)
    .eq('session_token', session_token)
    .eq('status', 'verified')
    .eq('type', type)
    .eq('identifier', identifier)
    .maybeSingle()

  if (!session) {
    return NextResponse.json({ error: 'No valid verification session found' }, { status: 403 })
  }

  // Consume the session so it can't be reused
  await db.from('verify_sessions').update({ status: 'used' }).eq('id', session.id)

  await db.from('identity_verifications').insert({
    user_id: user.id,
    type,
    identifier,
    verified_name,
    status: 'approved',
    source: 'qoreid',
  })

  await db.from('profiles').update({ is_verified: true }).eq('id', user.id)

  return NextResponse.json({ success: true })
}
