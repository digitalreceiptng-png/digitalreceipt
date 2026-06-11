import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params
  const db = createAdminClient()

  const { data: invite } = await db
    .from('staff_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (!invite) return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })
  if (new Date(invite.expires_at) < new Date()) {
    await db.from('staff_invites').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }
  if (invite.owner_id === user.id) return NextResponse.json({ error: 'You cannot accept your own invite' }, { status: 400 })

  // Check for existing active membership
  const { data: existing } = await db.from('staff_members').select('id, is_active').eq('owner_id', invite.owner_id).eq('staff_id', user.id).maybeSingle()
  if (existing?.is_active) return NextResponse.json({ error: 'You are already a staff member for this account' }, { status: 400 })

  if (existing) {
    // Reactivate
    await db.from('staff_members').update({
      role: invite.role,
      can_create_receipts: invite.can_create_receipts,
      can_view_all_receipts: invite.can_view_all_receipts,
      can_view_wallet: invite.can_view_wallet,
      is_active: true,
      invite_id: invite.id,
    }).eq('id', existing.id)
  } else {
    await db.from('staff_members').insert({
      owner_id: invite.owner_id,
      staff_id: user.id,
      invite_id: invite.id,
      role: invite.role,
      can_create_receipts: invite.can_create_receipts,
      can_view_all_receipts: invite.can_view_all_receipts,
      can_view_wallet: invite.can_view_wallet,
    })
  }

  await db.from('staff_invites').update({ status: 'accepted' }).eq('id', invite.id)

  return NextResponse.json({ success: true })
}
