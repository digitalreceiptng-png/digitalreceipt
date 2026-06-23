import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('full_name, business_name, issuer_type').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json()
  const { name, email, role = 'sales_rep', can_create_receipts = true, can_view_all_receipts = false, can_view_wallet = false } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const db = createAdminClient()

  // Check if this email is already an active staff member
  const { data: existingProfile } = await db.from('profiles').select('id').eq('email', email.trim().toLowerCase()).single()
  if (existingProfile) {
    const { data: existingMember } = await db.from('staff_members').select('id').eq('owner_id', user.id).eq('staff_id', existingProfile.id).eq('is_active', true).maybeSingle()
    if (existingMember) return NextResponse.json({ error: 'This person is already a staff member' }, { status: 400 })
  }

  // Expire any existing pending invites for this email + owner combo
  await db.from('staff_invites').update({ status: 'expired' }).eq('owner_id', user.id).eq('email', email.toLowerCase()).eq('status', 'pending')

  const { data: invite, error } = await db.from('staff_invites').insert({
    owner_id: user.id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    can_create_receipts,
    can_view_all_receipts,
    can_view_wallet,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = 'https://digitalreceipt.ng'
  const inviteUrl = `${appUrl}/staff/accept/${invite.token}`
  const businessName = profile.issuer_type === 'business' ? (profile.business_name || profile.full_name) : profile.full_name

  await sendEmail({
    to: invite.email,
    subject: `You've been invited to join ${businessName} on DigitalReceipt.ng`,
    html: staffInviteHtml({ inviterName: businessName, inviteUrl, role, expiresAt: invite.expires_at }),
  })

  return NextResponse.json({ success: true, inviteId: invite.id })
}

function staffInviteHtml({ inviterName, inviteUrl, role, expiresAt }: { inviterName: string; inviteUrl: string; role: string; expiresAt: string }) {
  const roleLabel = role === 'sales_rep' ? 'Sales Representative' : role === 'cashier' ? 'Cashier' : 'Staff Member'
  const expiry = new Date(expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:520px;margin:0 auto;padding:24px 16px">
  <img src="https://digitalreceipt.ng/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" style="height:38px;display:block;border:0;margin-bottom:20px;" />
  <h2 style="font-size:20px;margin:0 0 12px">You have been invited to join ${inviterName}</h2>
  <p style="color:#444;line-height:1.65;margin:0 0 16px">
    <strong>${inviterName}</strong> has invited you to join their team on DigitalReceipt.ng as a <strong>${roleLabel}</strong>.
    You will be able to issue digital receipts on their behalf.
  </p>
  <p style="margin:0 0 8px">
    <a href="${inviteUrl}"
       style="display:inline-block;background:#2d7a3a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Accept Invitation
    </a>
  </p>
  <p style="font-size:12px;color:#aaa;margin:16px 0 0">This invitation expires on ${expiry}. If you did not expect this, you can ignore it.</p>
</body>
</html>`
}
