import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = createAdminClient()

  const { data: invite } = await db
    .from('staff_invites')
    .select('id, status, role, can_create_receipts, can_view_all_receipts, can_view_wallet, expires_at, owner_id')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  const { data: ownerProfile } = await db.from('profiles').select('full_name, business_name, issuer_type').eq('id', invite.owner_id).single()

  const businessName = ownerProfile?.issuer_type === 'business'
    ? (ownerProfile.business_name || ownerProfile.full_name)
    : (ownerProfile?.full_name ?? 'Unknown')

  const expired = new Date(invite.expires_at) < new Date()
  const alreadyUsed = invite.status !== 'pending'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return NextResponse.json({
    businessName,
    role: invite.role,
    can_create_receipts: invite.can_create_receipts,
    can_view_all_receipts: invite.can_view_all_receipts,
    can_view_wallet: invite.can_view_wallet,
    expiresAt: invite.expires_at,
    expired,
    alreadyUsed,
    isLoggedIn: !!user,
  })
}
