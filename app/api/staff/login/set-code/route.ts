import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

function hashLoginCode(staffId: string, code: string): string {
  return crypto.createHash('sha256').update(`${staffId}:${code}`).digest('hex')
}

export async function POST(req: NextRequest) {
  let user: any = null

  // Try cookie-based auth first (web), then Bearer token (mobile)
  const supabase = await createClient()
  const { data: cookieAuth } = await supabase.auth.getUser()
  if (cookieAuth.user) {
    user = cookieAuth.user
  } else {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (token) {
      const db = createAdminClient()
      const { data: tokenAuth } = await db.auth.getUser(token)
      if (tokenAuth.user) user = tokenAuth.user
    }
  }

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
