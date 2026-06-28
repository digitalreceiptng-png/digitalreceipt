import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Fields the client is allowed to set on their own profile at registration.
// is_verified, is_admin, and any billing/wallet fields are NOT in this list —
// they must be set server-side or via trusted admin routes only.
const SAFE_PROFILE_FIELDS = [
  'issuer_type', 'full_name', 'phone', 'nin', 'rc_number',
  'business_name', 'address', 'issued_by_name',
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* no body is fine */ }

  const db = createAdminClient()

  const raw = (body.profile ?? {}) as Record<string, unknown>

  // Allowlist: only safe fields accepted from the client — prevents mass-assignment
  // of is_verified, is_admin, wallet fields, etc. via admin-client upsert.
  const safeProfile: Record<string, unknown> = {}
  for (const field of SAFE_PROFILE_FIELDS) {
    if (raw[field] !== undefined) safeProfile[field] = raw[field]
  }

  // is_verified is derived server-side from NIN/RC presence, never from client input.
  const hasNin = Boolean(safeProfile.nin)
  const hasRc  = Boolean(safeProfile.rc_number)
  const isVerified = hasNin || hasRc

  // Upsert profile — creates it if trigger failed, updates if it exists
  const profilePayload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    ...safeProfile,
    ...(isVerified ? { is_verified: true } : {}),
  }
  const { error: profileErr } = await db
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })

  if (profileErr) {
    return NextResponse.json({ error: `Profile error: ${profileErr.message}` }, { status: 500 })
  }

  // Ensure wallet exists (ignore conflict — just don't overwrite existing balance)
  await db
    .from('wallets')
    .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id', ignoreDuplicates: true })

  // If user verified identity at registration, log it to identity_verifications
  // so they appear correctly in the admin identity queue.
  // Uses upsert (ON CONFLICT DO NOTHING) to avoid TOCTOU race from concurrent calls.
  if (isVerified) {
    const isIndividual = safeProfile.issuer_type === 'individual'
    const type = isIndividual ? 'nin' : 'cac'
    const identifier = isIndividual
      ? (hasNin ? `****${String(safeProfile.nin).slice(-4)}` : 'verified')
      : (hasRc  ? String(safeProfile.rc_number)              : 'verified')
    const verified_name = String(safeProfile.full_name ?? safeProfile.business_name ?? '')

    const { error: verifErr } = await db.from('identity_verifications').upsert(
      { user_id: user.id, type, identifier, verified_name, status: 'approved', source: 'registration' },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
    if (verifErr) {
      console.error('identity_verifications upsert failed for', user.id, verifErr.message)
    }
  }

  return NextResponse.json({ ok: true })
}
