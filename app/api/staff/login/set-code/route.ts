import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

function hashLoginCode(staffId: string, code: string): string {
  return crypto.createHash('sha256').update(`${staffId}:${code}`).digest('hex')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffMemberId = user.app_metadata?.staff_member_id
  if (!staffMemberId) return NextResponse.json({ error: 'Not a staff account.' }, { status: 403 })

  const { code } = await req.json()
  if (!code || code.length < 4) {
    return NextResponse.json({ error: 'Login code must be at least 4 characters.' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('staff_members')
    .update({ login_code_hash: hashLoginCode(staffMemberId, code) })
    .eq('id', staffMemberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
