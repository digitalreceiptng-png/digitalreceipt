import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashOtp, normalizeNgPhone } from '@/lib/otp-utils'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const sessionToken = String(body?.sessionToken ?? '').trim()
  const code = String(body?.code ?? '').trim()

  if (!sessionToken) return NextResponse.json({ error: 'Missing session token.' }, { status: 400 })
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the full 6-digit code.' }, { status: 400 })

  const db = createAdminClient()

  const { data: session } = await db
    .from('otp_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .eq('used', false)
    .eq('type', 'staff_login')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'Session expired. Please request a new code.' }, { status: 400 })

  if (session.attempts >= 3) {
    return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 })
  }

  if (hashOtp(code) !== session.otp_hash) {
    await db.from('otp_sessions').update({ attempts: session.attempts + 1 }).eq('session_token', sessionToken)
    const remaining = Math.max(0, 2 - session.attempts)
    return NextResponse.json({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` }, { status: 400 })
  }

  // Mark session used
  await db.from('otp_sessions').update({ used: true }).eq('session_token', sessionToken)

  // Get the staff member record
  const { data: staff } = await db
    .from('staff_members')
    .select('id, staff_id, phone, access_level, owner_id')
    .eq('id', session.identifier)
    .single()

  if (!staff) return NextResponse.json({ error: 'Staff record not found.' }, { status: 404 })

  // Derive a synthetic email for this phone-based staff member
  const normalized = normalizeNgPhone(staff.phone)
  const syntheticEmail = `staff_${normalized}@staff.digitalreceipt.ng`

  let authUserId = staff.staff_id

  if (!authUserId) {
    // First login — create a Supabase auth user for this staff member
    const { data: newUser, error: createErr } = await db.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      user_metadata: { is_staff: true, staff_member_id: staff.id },
    })

    if (createErr && !createErr.message.includes('already been registered')) {
      return NextResponse.json({ error: 'Could not create staff account.' }, { status: 500 })
    }

    // If user already exists, fetch by email
    const userId = newUser?.user?.id
    if (userId) {
      authUserId = userId
      await db.from('staff_members').update({ staff_id: userId }).eq('id', staff.id)
    } else {
      // User already existed — look them up
      const { data: { users } } = await db.auth.admin.listUsers()
      const existing = users.find((u: any) => u.email === syntheticEmail)
      if (!existing) return NextResponse.json({ error: 'Could not resolve staff account.' }, { status: 500 })
      authUserId = existing.id
      await db.from('staff_members').update({ staff_id: authUserId }).eq('id', staff.id)
    }
  }

  // Generate a magic link so the browser gets a real Supabase session
  const redirectTo = staff.access_level === 'generate_only'
    ? 'https://digitalreceipt.ng/dashboard/receipts/create'
    : 'https://digitalreceipt.ng/dashboard'

  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: syntheticEmail,
    options: { redirectTo },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: 'Could not generate login link.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, redirectUrl: linkData.properties.action_link })
}
