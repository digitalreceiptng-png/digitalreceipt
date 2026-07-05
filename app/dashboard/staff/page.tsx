import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/formatters'
import { Users } from 'lucide-react'
import StaffManager from './StaffManager'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()

  const { data: ownerProfile } = await db.from('profiles').select('full_name, email, logo_url, issued_by_name, phone').eq('id', user.id).single()

  const [{ data: members }, { data: invites }] = await Promise.all([
    db.from('staff_members')
      .select('id, role, display_name, phone, otp_validity_minutes, can_create_receipts, can_view_all_receipts, can_view_wallet, access_level, is_active, created_at, staff_id, profiles!staff_members_staff_id_fkey(id, full_name, email)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    db.from('staff_invites')
      .select('id, email, role, status, can_create_receipts, can_view_all_receipts, can_view_wallet, expires_at, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const activeMembers = (members ?? []).filter((m: any) => m.is_active)
  const pendingInvites = (invites ?? []).filter((i: any) => i.status === 'pending' && new Date(i.expires_at) > new Date())

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-ink">Staff Accounts</h1>
          <p className="text-sm text-ink-muted mt-0.5">Invite team members to issue receipts on your behalf</p>
        </div>
      </div>

      <StaffManager
        ownerProfile={{
          full_name: (ownerProfile as any)?.full_name ?? '',
          email: (ownerProfile as any)?.email ?? '',
          logo_url: (ownerProfile as any)?.logo_url ?? null,
          issued_by_name: (ownerProfile as any)?.issued_by_name ?? '',
          phone: (ownerProfile as any)?.phone ?? null,
        }}
        members={activeMembers.map((m: any) => ({
          id: m.id,
          staff_id: m.staff_id,
          role: m.role,
          can_create_receipts: m.can_create_receipts,
          can_view_all_receipts: m.can_view_all_receipts,
          can_view_wallet: m.can_view_wallet,
          access_level: m.access_level ?? 'full',
          display_name: m.display_name ?? null,
          otp_validity_minutes: m.otp_validity_minutes ?? 10,
          is_active: m.is_active,
          created_at: m.created_at,
          staff_profile: m.profiles,
        }))}
        pendingInvites={pendingInvites.map((i: any) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          status: i.status,
          can_create_receipts: i.can_create_receipts,
          can_view_all_receipts: i.can_view_all_receipts,
          can_view_wallet: i.can_view_wallet,
          expires_at: i.expires_at,
          created_at: i.created_at,
        }))}
      />
    </div>
  )
}
