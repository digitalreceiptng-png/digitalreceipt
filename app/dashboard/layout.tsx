import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const [{ data: profile }, { data: wallet }, { data: staffRow }] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).single(),
    db.from('wallets').select('balance').eq('user_id', user.id).single(),
    db.from('staff_members').select('id, owner_id, role, can_create_receipts, can_view_all_receipts, can_view_wallet').eq('staff_id', user.id).eq('is_active', true).maybeSingle(),
  ])

  // Safety net: if trigger failed and no profile exists, create a minimal one
  if (!profile) {
    await db.from('profiles').upsert(
      { id: user.id, email: user.email ?? '', is_verified: false },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    await db.from('wallets').upsert(
      { user_id: user.id, balance: 0 },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
  }

  let staffContext: { ownerName: string; ownerBusinessName: string | null; role: string; permissions: { can_create_receipts: boolean; can_view_all_receipts: boolean; can_view_wallet: boolean } } | null = null
  if (staffRow) {
    const { data: ownerProfile } = await db.from('profiles').select('full_name, business_name, issuer_type').eq('id', staffRow.owner_id).single()
    if (ownerProfile) {
      staffContext = {
        ownerName: ownerProfile.full_name,
        ownerBusinessName: ownerProfile.issuer_type === 'business' ? (ownerProfile.business_name ?? null) : null,
        role: staffRow.role,
        permissions: {
          can_create_receipts: staffRow.can_create_receipts,
          can_view_all_receipts: staffRow.can_view_all_receipts,
          can_view_wallet: staffRow.can_view_wallet,
        },
      }
    }
  }

  const balance = wallet?.balance ?? 0

  // Active company sub-account (profile switcher)
  const jar = await cookies()
  const activeSubId = !staffRow ? (jar.get('active_sub_account')?.value ?? null) : null
  let activeSubAccount: { business_name: string; rc_number: string } | null = null
  if (activeSubId) {
    const { data: sub } = await db.from('user_sub_accounts').select('business_name, rc_number').eq('id', activeSubId).eq('owner_user_id', user.id).single()
    activeSubAccount = sub ?? null
  }

  const ROLES: Record<string, string> = { sales_rep: 'Sales Representative', cashier: 'Cashier', manager: 'Manager' }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar profile={profile} walletBalance={balance} activeSubAccount={activeSubAccount} />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Active company profile banner */}
        {activeSubAccount && (
          <div className="flex items-center gap-2.5 px-5 py-2.5 text-xs font-medium" style={{ background: 'oklch(0.25 0.08 270)', color: 'rgba(255,255,255,0.92)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Issuing as <strong>{activeSubAccount.business_name}</strong> · RC {activeSubAccount.rc_number}</span>
            <a href="/dashboard/profile" className="ml-auto text-white/60 hover:text-white underline underline-offset-2 transition-colors">Switch profile</a>
          </div>
        )}

        {/* Staff banner */}
        {staffContext && (
          <div className="flex items-center gap-2.5 px-5 py-2.5 text-xs font-medium" style={{ background: 'oklch(0.30 0.14 145)', color: 'rgba(255,255,255,0.90)' }}>
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg width="9" height="9" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z"/></svg>
            </div>
            <span>
              Acting as <strong>{ROLES[staffContext.role] ?? staffContext.role}</strong> for{' '}
              <strong>{staffContext.ownerBusinessName ?? staffContext.ownerName}</strong>
            </span>
          </div>
        )}
        {/* Wallet top bar */}
        <div
          className="sticky top-0 z-30 flex items-center justify-end gap-3 px-5 py-2 border-b"
          style={{ background: 'white', borderColor: 'oklch(0.92 0.01 145)' }}
        >
          <span className="text-xs text-ink-dim">Wallet balance</span>
          <a
            href="/dashboard/wallet"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'oklch(0.96 0.02 145)', color: 'oklch(0.35 0.16 145)', border: '1px solid oklch(0.87 0.04 145)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </a>
        </div>
        <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
