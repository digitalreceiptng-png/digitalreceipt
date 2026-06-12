import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashOtp } from '@/lib/otp-utils'

export async function POST(req: NextRequest) {
  let sessionToken = ''
  let code = ''
  try {
    const body = await req.json()
    sessionToken = String(body?.sessionToken ?? '').trim()
    code         = String(body?.code ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!sessionToken) return NextResponse.json({ error: 'Missing session token.' }, { status: 400 })
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the full 6-digit code.' }, { status: 400 })

  const db = createAdminClient()
  const { data: session } = await db
    .from('otp_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'Session expired. Please start the verification again.' }, { status: 400 })
  if (!session.otp_hash) return NextResponse.json({ error: 'No code has been sent yet.' }, { status: 400 })
  if (session.attempts >= 3) {
    return NextResponse.json({ error: 'Too many incorrect attempts. Please start over.' }, { status: 429 })
  }

  const inputHash = hashOtp(code)

  if (inputHash !== session.otp_hash) {
    await db.from('otp_sessions')
      .update({ attempts: session.attempts + 1 })
      .eq('session_token', sessionToken)
    const remaining = Math.max(0, 2 - session.attempts)
    return NextResponse.json({
      error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    }, { status: 400 })
  }

  // Mark session used — prevents replay
  await db.from('otp_sessions').update({ used: true }).eq('session_token', sessionToken)

  return NextResponse.json({
    ok: true,
    type: session.type as 'nin' | 'cac',
    identifier: session.identifier as string,
    person: session.person_data,
  })
}
