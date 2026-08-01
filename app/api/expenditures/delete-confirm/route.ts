import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import { hashOtp } from '@/lib/otp-utils'

async function getUser(req: NextRequest) {
  const db = createAdminClient()
  const auth = req.headers.get('authorization') ?? ''
  if (auth.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(auth.slice(7))
    if (data.user) return data.user
  }
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

// POST — verify the emailed code, then delete the expenditure/tax entry
// (or just clear its attachment) for real.
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = getEffectiveUserId(user)

  const body = await req.json().catch(() => ({}))
  const expenditureId = String(body.id ?? '')
  const action = body.action === 'remove_attachment' ? 'remove_attachment' : 'delete_entry'
  const code = String(body.code ?? '').replace(/\D/g, '').trim()
  if (!expenditureId || code.length !== 6) {
    return NextResponse.json({ error: 'A 6-digit code is required.' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: otp } = await db
    .from('expenditure_delete_otps')
    .select('*')
    .eq('user_id', userId)
    .eq('expenditure_id', expenditureId)
    .eq('action', action)
    .maybeSingle()

  if (!otp) return NextResponse.json({ error: 'Code expired or not requested. Please try again.' }, { status: 400 })

  if (new Date(otp.expires_at) < new Date()) {
    await db.from('expenditure_delete_otps').delete().eq('id', otp.id)
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
  }
  if (otp.attempts >= 5) {
    return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 429 })
  }

  if (hashOtp(code) !== otp.code_hash) {
    await db.from('expenditure_delete_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
    return NextResponse.json({ error: 'Incorrect code.' }, { status: 400 })
  }

  if (action === 'remove_attachment') {
    await db.from('user_expenditures').update({ attachment_url: null }).eq('id', expenditureId).eq('user_id', userId)
  } else {
    await db.from('user_expenditures').delete().eq('id', expenditureId).eq('user_id', userId)
  }
  await db.from('expenditure_delete_otps').delete().eq('id', otp.id)

  return NextResponse.json({ ok: true })
}
