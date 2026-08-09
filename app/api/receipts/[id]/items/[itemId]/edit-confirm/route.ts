import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEffectiveUserId } from '@/lib/effective-user'
import { hashOtp } from '@/lib/otp-utils'

// POST — verify the code, then apply the pending description change for real.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = getEffectiveUserId(user)

  const { id, itemId } = await params
  const body = await req.json().catch(() => ({}))
  const code = String(body?.code ?? '').replace(/\D/g, '').trim()
  if (code.length !== 6) return NextResponse.json({ error: 'A 6-digit code is required.' }, { status: 400 })

  const db = createAdminClient()

  const { data: otp } = await db
    .from('receipt_item_edit_otps')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle()

  if (!otp) return NextResponse.json({ error: 'Code expired or not requested. Please try again.' }, { status: 400 })

  if (new Date(otp.expires_at) < new Date()) {
    await db.from('receipt_item_edit_otps').delete().eq('id', otp.id)
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
  }
  if (otp.attempts >= 5) {
    return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 429 })
  }
  if (hashOtp(code) !== otp.code_hash) {
    await db.from('receipt_item_edit_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
    return NextResponse.json({ error: 'Incorrect code.' }, { status: 400 })
  }

  const { data: updated, error } = await db
    .from('receipt_items')
    .update({ description: otp.new_description })
    .eq('id', itemId)
    .eq('receipt_id', id)
    .select()
    .single()

  if (error || !updated) return NextResponse.json({ error: 'Item not found.' }, { status: 404 })

  await db.from('receipt_item_edit_otps').delete().eq('id', otp.id)

  return NextResponse.json({ ok: true, item: updated })
}
