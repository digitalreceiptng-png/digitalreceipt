import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { creditFromReference } from '@/lib/wallet-credit'

export async function POST(req: NextRequest) {
  const db = createAdminClient()

  // Mobile sends a Bearer token; the website uses its cookie session.
  let user: { id: string } | null = null
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(authHeader.slice(7))
    user = data.user ?? null
  }
  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reference } = await req.json()
  if (!reference) return NextResponse.json({ error: 'Reference required' }, { status: 400 })

  const result = await creditFromReference(reference, user.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  if (result.already) {
    return NextResponse.json({ success: true, already_credited: true, balance: result.balance ?? 0 })
  }
  return NextResponse.json({ success: true, amount: result.amount, balance: result.balance })
}
