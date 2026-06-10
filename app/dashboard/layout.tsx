import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const [{ data: profile }, { data: wallet }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    db.from('wallets').select('balance').eq('user_id', user.id).single(),
  ])

  const balance = wallet?.balance ?? 0

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar profile={profile} walletBalance={balance} />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Wallet top bar — always visible */}
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
