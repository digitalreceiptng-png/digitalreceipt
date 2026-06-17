import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashOtp } from '@/lib/otp-utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let sessionToken = '', emailCode = '', smsCode = ''
  try {
    const body = await req.json()
    sessionToken = String(body?.sessionToken ?? '').trim()
    emailCode    = String(body?.emailCode ?? '').replace(/\D/g, '').trim()
    smsCode      = String(body?.smsCode  ?? '').replace(/\D/g, '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!sessionToken || emailCode.length !== 6 || smsCode.length !== 6) {
    return NextResponse.json({ error: 'Both 6-digit codes are required.' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('deletion_token')
    .eq('id', user.id)
    .single()

  const dt = profile?.deletion_token as {
    token: string
    email_otp_hash: string
    sms_otp_hash: string
    expires_at: string
    attempts: number
  } | null

  if (!dt || dt.token !== sessionToken) {
    return NextResponse.json({ error: 'Session expired or invalid. Please request new codes.' }, { status: 400 })
  }
  if (new Date(dt.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Codes have expired. Please request new ones.' }, { status: 400 })
  }
  if ((dt.attempts ?? 0) >= 5) {
    return NextResponse.json({ error: 'Too many failed attempts. Please request new codes.' }, { status: 429 })
  }

  const emailMatch = hashOtp(emailCode) === dt.email_otp_hash
  const smsMatch   = hashOtp(smsCode)   === dt.sms_otp_hash

  if (!emailMatch || !smsMatch) {
    await db.from('profiles').update({
      deletion_token: { ...dt, attempts: (dt.attempts ?? 0) + 1 },
    }).eq('id', user.id)
    const which = !emailMatch && !smsMatch ? 'Both codes are' : !emailMatch ? 'Email code is' : 'SMS code is'
    return NextResponse.json({ error: `${which} incorrect. Please try again.` }, { status: 400 })
  }

  // Codes verified — delete everything
  await db.from('receipts').delete().eq('user_id', user.id)
  await db.from('wallets').delete().eq('user_id', user.id)
  await db.from('profiles').delete().eq('id', user.id)
  await db.auth.admin.deleteUser(user.id)

  return NextResponse.json({ ok: true })
}
