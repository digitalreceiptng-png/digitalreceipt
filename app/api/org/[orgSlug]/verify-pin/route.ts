import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPin, signOrgToken } from '@/lib/org-auth'
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/org-rate-limit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rateLimitKey = `pin:${orgSlug}:${ip}`

  // Check rate limit before doing anything
  const { allowed, lockedUntil } = checkRateLimit(rateLimitKey)
  if (!allowed) {
    const minutes = Math.ceil(((lockedUntil ?? Date.now()) - Date.now()) / 60000)
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` },
      { status: 429 }
    )
  }

  let body: { pin?: string } = {}
  try { body = await req.json() } catch { /* empty body */ }

  if (!body.pin || !/^\d{6}$/.test(body.pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 6 digits.' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: org } = await db
    .from('user_sub_accounts')
    .select('id, owner_user_id, staff_pin_hash')
    .eq('slug', orgSlug)
    .single()

  if (!org || !org.staff_pin_hash) {
    return NextResponse.json({ error: 'Organisation not found or PIN not configured.' }, { status: 404 })
  }

  const valid = await verifyPin(body.pin, org.id, org.staff_pin_hash)

  if (!valid) {
    const { attemptsLeft, locked, lockedUntil: until } = recordFailedAttempt(rateLimitKey)
    if (locked) {
      return NextResponse.json(
        { error: 'Too many failed attempts. You are locked out for 15 minutes.' },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: `Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.` },
      { status: 401 }
    )
  }

  // Correct PIN — reset rate limit and issue staff session cookie
  resetAttempts(rateLimitKey)
  const token = await signOrgToken({
    orgSlug,
    subAccountId: org.id,
    ownerUserId: org.owner_user_id,
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(`org_session_${orgSlug}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 3600,
    path: '/',
  })
  return res
}
