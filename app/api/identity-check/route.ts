import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return '***'
  const visible = name.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`
}

// Checks whether an NIN or RC/BN number is already registered to a different account.
// Called both during registration (before starting OTP verification) and before saving
// to profiles at final submit, to give a clear error instead of a DB constraint violation.
// Works for both authenticated users (final submit — excludes own account) and
// unauthenticated callers (registration lookup, before the user's email is verified).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await req.json()
  const { nin, rc_number } = body

  const db = createAdminClient()

  if (nin) {
    let query = db.from('profiles').select('id, email').eq('nin', nin)
    if (user) query = query.neq('id', user.id)
    const { data } = await query.maybeSingle()

    if (data) {
      const maskedEmail = data.email ? maskEmail(data.email) : null
      return NextResponse.json({
        conflict: true,
        field: 'nin',
        maskedEmail,
        message: maskedEmail
          ? `This NIN is already registered to an account with email ${maskedEmail}. Please sign in with that email instead.`
          : 'This NIN is already registered to another account. Please sign in instead, or contact support.',
      })
    }
  }

  if (rc_number) {
    let query = db.from('profiles').select('id, email').eq('rc_number', rc_number)
    if (user) query = query.neq('id', user.id)
    const { data } = await query.maybeSingle()

    if (data) {
      const maskedEmail = data.email ? maskEmail(data.email) : null
      return NextResponse.json({
        conflict: true,
        field: 'rc_number',
        maskedEmail,
        message: maskedEmail
          ? `This RC/BN number is already registered to an account with email ${maskedEmail}. Please sign in with that email instead.`
          : 'This RC/BN number is already registered to another account. Please sign in instead, or contact support.',
      })
    }
  }

  return NextResponse.json({ conflict: false })
}
