import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Checks whether an NIN or RC/BN number is already registered to a different account.
// Called before saving to profiles to give a clear error instead of a DB constraint violation.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { nin, rc_number } = body

  const db = createAdminClient()

  if (nin) {
    const { data } = await db
      .from('profiles')
      .select('id')
      .eq('nin', nin)
      .neq('id', user.id)
      .maybeSingle()

    if (data) {
      return NextResponse.json({
        conflict: true,
        field: 'nin',
        message: 'This NIN is already registered to another account. If this is your NIN, contact support.',
      })
    }
  }

  if (rc_number) {
    const { data } = await db
      .from('profiles')
      .select('id')
      .eq('rc_number', rc_number)
      .neq('id', user.id)
      .maybeSingle()

    if (data) {
      return NextResponse.json({
        conflict: true,
        field: 'rc_number',
        message: 'This RC/BN number is already registered to another account. If this is your business, contact support.',
      })
    }
  }

  return NextResponse.json({ conflict: false })
}
