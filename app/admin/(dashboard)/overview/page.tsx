import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate, formatDateTime } from '@/lib/formatters'
import { adminHref } from '@/lib/admin-url'
import {
  Users,
  FileText,
  ShieldCheck,
  Eye,
  TrendingUp,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Wallet,
  Building2,
  Bell,
  MessageSquare,
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Overview | Admin Console' }

async function getStats() {
  const db = createAdminClient()
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: verifiedUsers },
    { count: totalReceipts },
    { count: receiptsThisMonth },
    { count: newUsersThisMonth },
    { count: verificationsToday },
    { count: totalVerifications },
    { data: recentReceipts },
    { data: recentSignups },
    { data: allWallets },
    { data: creditTxns },
    { data: recentTopups },
    { count: openSupportTickets },
  ] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true),
    db.from('receipts').select('id', { count: 'exact', head: true }),
    db.from('receipts').select('id', { count: 'exact', head: true }).gte('created_at', firstOfMonth),
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', firstOfMonth),
    db.from('verifications').select('id', { count: 'exact', head: true }).gte('verified_at', startOfDay),
    db.from('verifications').select('id', { count: 'exact', head: true }),
    db
      .from('receipts')
      .select('id, receipt_number, buyer_name, total_amount, created_at, status, user_id, profiles!receipts_user_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(8),
    db
      .from('profiles')
      .select('id, full_name, email, issuer_type, is_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    db.from('wallets').select('user_id, balance'),
    db.from('wallet_transactions').select('amount').eq('type', 'credit'),
    db
      .from('wallet_transactions')
      .select('id, user_id, amount, description, created_at')
      .eq('type', 'credit')
      .order('created_at', { ascending: false })
      .limit(8),
    db.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  const totalWalletBalance = allWallets?.reduce((s, w) => s + (w.balance ?? 0), 0) ?? 0
  const totalFunded = creditTxns?.reduce((s, t) => s + (t.amount ?? 0), 0) ?? 0
  const fundedWallets = allWallets?.filter(w => (w.balance ?? 0) > 0).length ?? 0

  // Fetch sub-accounts for recent signups
  const signupIds = (recentSignups ?? []).map((u: any) => u.id)
  const { data: recentSubAccounts } = signupIds.length > 0
    ? await db.from('user_sub_accounts').select('id, owner_user_id, business_name, rc_number, logo_url').in('owner_user_id', signupIds).order('created_at', { ascending: true })
    : { data: [] }
  const signupSubMap = new Map<string, any[]>()
  for (const s of recentSubAccounts ?? []) {
    if (!signupSubMap.has(s.owner_user_id)) signupSubMap.set(s.owner_user_id, [])
    signupSubMap.get(s.owner_user_id)!.push(s)
  }

  return {
    totalUsers: totalUsers ?? 0,
    verifiedUsers: verifiedUsers ?? 0,
    totalReceipts: totalReceipts ?? 0,
    receiptsThisMonth: receiptsThisMonth ?? 0,
    newUsersThisMonth: newUsersThisMonth ?? 0,
    verificationsToday: verificationsToday ?? 0,
    totalVerifications: totalVerifications ?? 0,
    recentReceipts: recentReceipts ?? [],
    recentSignups: recentSignups ?? [],
    signupSubMap,
    totalWalletBalance,
    totalFunded,
    fundedWallets,
    recentTopups: recentTopups ?? [],
    openSupportTickets: openSupportTickets ?? 0,
  }
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted font-medium mb-1">{label}</p>
          <p className="font-heading text-3xl text-ink leading-none" style={{ letterSpacing: '-0.02em' }}>
            {value}
          </p>
          {sub && <p className="text-xs text-ink-dim mt-1.5">{sub}</p>}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accent + '15' }}
        >
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
    </div>
  )
}

export default async function AdminOverviewPage() {
  const stats = await getStats()
  const verifiedPct =
    stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
            Overview
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">Platform health at a glance</p>
        </div>
        {stats.openSupportTickets > 0 && (
          <Link
            href={adminHref('/support')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors shrink-0"
          >
            <div className="relative">
              <Bell size={16} className="text-red-600" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {stats.openSupportTickets > 9 ? '9+' : stats.openSupportTickets}
              </span>
            </div>
            <span className="text-xs font-semibold text-red-700">
              {stats.openSupportTickets} open support {stats.openSupportTickets === 1 ? 'ticket' : 'tickets'}
            </span>
            <MessageSquare size={13} className="text-red-500" />
          </Link>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Issuers"
          value={stats.totalUsers.toLocaleString()}
          sub={`${stats.newUsersThisMonth} new this month`}
          icon={Users}
          accent="oklch(0.42 0.18 145)"
        />
        <StatCard
          label="Verified Issuers"
          value={stats.verifiedUsers.toLocaleString()}
          sub={`${verifiedPct}% of all issuers`}
          icon={ShieldCheck}
          accent="oklch(0.38 0.14 155)"
        />
        <StatCard
          label="Total Receipts"
          value={stats.totalReceipts.toLocaleString()}
          sub={`${stats.receiptsThisMonth} this month`}
          icon={FileText}
          accent="oklch(0.50 0.20 145)"
        />
        <StatCard
          label="Platform Wallet Balance"
          value={formatNaira(stats.totalWalletBalance)}
          sub={`${stats.fundedWallets} wallets with funds`}
          icon={Wallet}
          accent="oklch(0.42 0.18 145)"
        />
        <StatCard
          label="Total Funded (All Time)"
          value={formatNaira(stats.totalFunded)}
          sub="sum of all top-ups"
          icon={TrendingUp}
          accent="oklch(0.38 0.14 155)"
        />
        <StatCard
          label="Verifications Today"
          value={stats.verificationsToday.toLocaleString()}
          sub={`${stats.totalVerifications.toLocaleString()} all time`}
          icon={Eye}
          accent="oklch(0.65 0.15 62)"
        />
      </div>

      {/* Two-column tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Receipts */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-forest" />
              <h2 className="font-semibold text-sm text-ink">Recent Receipts</h2>
            </div>
            <Link
              href={adminHref('/receipts')}
              className="text-xs text-forest hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recentReceipts.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">No receipts yet</p>
            ) : (
              stats.recentReceipts.map((r: any) => (
                <Link
                  key={r.id}
                  href={adminHref(`/receipts/${r.id}`)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-ink-muted truncate">{r.receipt_number}</p>
                    <p className="text-sm text-ink truncate mt-0.5">{r.buyer_name}</p>
                    <p className="text-xs text-ink-dim truncate">
                      {r.profiles?.full_name ?? '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-ink">{formatNaira(r.total_amount)}</p>
                    <p className="text-xs text-ink-dim mt-0.5">{formatDate(r.created_at)}</p>
                  </div>
                  <ArrowRight
                    size={13}
                    className="text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Signups */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus size={15} className="text-forest" />
              <h2 className="font-semibold text-sm text-ink">Recent Signups</h2>
            </div>
            <Link
              href={adminHref('/users')}
              className="text-xs text-forest hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recentSignups.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">No users yet</p>
            ) : (
              stats.recentSignups.map((u: any) => {
                const subs = stats.signupSubMap.get(u.id) ?? []
                return (
                  <div key={u.id}>
                    <Link
                      href={adminHref(`/users/${u.id}`)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-surface transition-colors group"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                        style={{ background: 'oklch(0.42 0.18 145)' }}
                      >
                        {u.full_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink truncate font-medium">{u.full_name}</p>
                        <p className="text-xs text-ink-dim truncate">{u.email}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {u.is_verified ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 size={10} />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-ink-dim bg-surface border border-border px-1.5 py-0.5 rounded-full">
                            <Clock size={10} />
                            Pending
                          </span>
                        )}
                        <ArrowRight size={13} className="text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                    {subs.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 pl-14 pr-5 py-2 bg-surface/40 border-l-2" style={{ borderLeftColor: 'oklch(0.42 0.18 145 / 0.25)' }}>
                        <div className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden">
                          {s.logo_url
                            ? <img src={s.logo_url} alt={s.business_name} className="w-full h-full object-cover" />
                            : <Building2 size={11} className="text-ink-dim" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink-muted truncate">{s.business_name}</p>
                          {s.rc_number && <p className="text-xs text-ink-dim font-mono">RC {s.rc_number}</p>}
                        </div>
                        <span className="text-xs text-ink-dim px-1.5 py-0.5 bg-white border border-border rounded-full shrink-0">Sister Co.</span>
                      </div>
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Top-ups */}
      {stats.recentTopups.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Wallet size={15} className="text-forest" />
            <h2 className="font-semibold text-sm text-ink">Recent Wallet Top-ups</h2>
          </div>
          <div className="divide-y divide-border">
            {stats.recentTopups.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{t.description}</p>
                  <p className="text-xs text-ink-dim mt-0.5">{formatDateTime(t.created_at)}</p>
                </div>
                <p className="text-sm font-semibold shrink-0" style={{ color: 'oklch(0.42 0.18 145)' }}>
                  +{formatNaira(t.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats strip */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-forest" />
          <h2 className="font-semibold text-sm text-ink">Platform Summary</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Unverified Issuers', value: (stats.totalUsers - stats.verifiedUsers).toLocaleString(), color: 'text-amber-600' },
            { label: 'Receipts This Month', value: stats.receiptsThisMonth.toLocaleString(), color: 'text-forest' },
            { label: 'New Users (30 days)', value: stats.newUsersThisMonth.toLocaleString(), color: 'text-forest' },
            { label: 'All-Time Verifications', value: stats.totalVerifications.toLocaleString(), color: 'text-ink' },
            { label: 'Wallets with Funds', value: stats.fundedWallets.toLocaleString(), color: 'text-forest' },
            { label: 'Revenue (Wallet Top-ups)', value: formatNaira(stats.totalFunded), color: 'text-ink' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs text-ink-muted mb-0.5">{label}</p>
              <p className={`font-heading text-xl ${color}`} style={{ letterSpacing: '-0.02em' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
