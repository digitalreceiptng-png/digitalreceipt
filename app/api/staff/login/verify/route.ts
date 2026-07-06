import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { hashOtp, normalizeNgPhone } from '@/lib/otp-utils'
import crypto from 'crypto'

function hashLoginCode(staffId: string, code: string): string {
  return crypto.createHash('sha256').update(`${staffId}:${code}`).digest('hex')
}

async function establishSession(db: any, staffId: string) {
  const { data: staff } = await db
    .from('staff_members')
    .select('id, staff_id, phone, access_level, owner_id')
    .eq('id', staffId)
    .single()

  if (!staff) return { error: 'Staff record not found.' }

  const normalized = normalizeNgPhone(staff.phone)
  const syntheticEmail = `staff_${normalized}@staff.digitalreceipt.ng`

  let authUserId = staff.staff_id

  if (!authUserId) {
    const { data: newUser, error: createErr } = await db.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      app_metadata: { is_staff: true, staff_member_id: staff.id, access_level: staff.access_level, owner_user_id: staff.owner_id },
    })

    if (createErr && !createErr.message.includes('already been registered')) {
      return { error: 'Could not create staff account.' }
    }

    const userId = newUser?.user?.id
    if (userId) {
      authUserId = userId
      await db.from('staff_members').update({ staff_id: userId }).eq('id', staff.id)
    } else {
      const { data: { users } } = await db.auth.admin.listUsers()
      const existing = users.find((u: any) => u.email === syntheticEmail)
      if (!existing) return { error: 'Could not resolve staff account.' }
      authUserId = existing.id
      await db.from('staff_members').update({ staff_id: authUserId }).eq('id', staff.id)
    }
  }

  await db.auth.admin.updateUserById(authUserId, {
    app_metadata: { is_staff: true, staff_member_id: staff.id, access_level: staff.access_level, owner_user_id: staff.owner_id },
  })

  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: syntheticEmail,
  })

  if (linkErr || !linkData?.properties?.hashed_token) {
    return { error: 'Could not generate login link.' }
  }

  // Use the Supabase JS SDK to verify the magic link token server-side.
  // This is more reliable than raw REST fetch and handles the publishable key format correctly.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return { error: 'Server configuration error.' }

  const publicClient = createPublicClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data: verifyData, error: verifyErr } = await publicClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyErr || !verifyData?.session) {
    console.error('[staff/verify] verifyOtp error:', verifyErr?.message, 'hasSession:', !!verifyData?.session)
    return { error: 'Could not establish session. Please try again.' }
  }

  const next = staff.access_level === 'generate_only'
    ? '/dashboard/receipts/new'
    : '/dashboard'

  return {
    accessToken: verifyData.session.access_token,
    refreshToken: verifyData.session.refresh_token,
    next,
    staffMemberId: staff.id,
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const type = String(body?.type ?? 'otp') // 'otp' | 'login_code'
  const code = String(body?.code ?? '').trim()
  const db = createAdminClient()

  // ── Login code flow (returning staff) ────────────────────────────────────────
  if (type === 'login_code') {
    const phone = String(body?.phone ?? '').trim()
    if (!phone) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    if (!code) return NextResponse.json({ error: 'Enter your login code.' }, { status: 400 })

    const normalized = normalizeNgPhone(phone)

    let staff: any = null
    const { data: s1 } = await db.from('staff_members')
      .select('id, login_code_hash, access_level, is_active')
      .eq('phone', phone).eq('is_active', true).maybeSingle()
    if (s1) { staff = s1 }
    else {
      const { data: s2 } = await db.from('staff_members')
        .select('id, login_code_hash, access_level, is_active')
        .eq('phone', '+' + normalized).eq('is_active', true).maybeSingle()
      staff = s2
    }

    if (!staff) return NextResponse.json({ error: 'No active staff account found.' }, { status: 404 })
    if (!staff.login_code_hash) return NextResponse.json({ error: 'No login code set. Contact your administrator.' }, { status: 400 })

    if (hashLoginCode(staff.id, code) !== staff.login_code_hash) {
      return NextResponse.json({ error: 'Incorrect login code.' }, { status: 400 })
    }

    const result = await establishSession(db, staff.id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ ok: true, accessToken: result.accessToken, refreshToken: result.refreshToken, next: result.next })
  }

  // ── OTP flow (first-time / forgot code) ──────────────────────────────────────
  const sessionToken = String(body?.sessionToken ?? '').trim()
  if (!sessionToken) return NextResponse.json({ error: 'Missing session token.' }, { status: 400 })
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the full 6-digit OTP.' }, { status: 400 })

  const { data: session } = await db
    .from('otp_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .eq('used', false)
    .eq('type', 'nin')
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

  await db.from('otp_sessions').update({ used: true }).eq('session_token', sessionToken)

  const result = await establishSession(db, session.identifier)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({
    ok: true,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    next: result.next,
    staffMemberId: result.staffMemberId,
    isFirstLogin: true,
  })
}
