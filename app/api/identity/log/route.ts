import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let type: string, identifier: string, verified_name: string
  try {
    const body = await req.json()
    type = String(body.type ?? '')
    identifier = String(body.identifier ?? '').trim()
    verified_name = String(body.verified_name ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!['nin', 'cac'].includes(type) || !identifier) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const db = createAdminClient()

  await db.from('identity_verifications').insert({
    user_id: user.id,
    type,
    identifier,
    verified_name,
    status: 'approved',
    source: 'qoreid',
  })

  await db.from('profiles').update({ is_verified: true }).eq('id', user.id)

  return NextResponse.json({ success: true })
}
