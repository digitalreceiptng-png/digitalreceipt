import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate, formatDateTime } from '@/lib/formatters'
import { adminHref } from '@/lib/admin-url'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  FileText,
  Shield,
  ChevronRight,
  BadgeCheck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getUserData(id: string) {
  const db = createAdminClient()

  const [{ data: profile }, { data: receipts, count: receiptCount }, { data: limitRequests }, { data: wallet }, { data: walletTxns }, { data: subAccounts }, { data: authUser }] =
    await Promise.all([
      db.from('profiles').select('*').eq('id', id).single(),
      db
        .from('receipts')
        .select('id, receipt_number, receipt_type, buyer_name, total_amount, transaction_date, status, created_at', {
          count: 'exact',
        })
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      db
        .from('limit_requests')
        .select('id, reason, requested_count, status, created_at, request_month')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
      db.from('wallets').select('balance, updated_at').eq('user_id', id).single(),
      db
        .from('wallet_transactions')
        .select('id, type, amount, description, balance_after, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      db
        .from('user_sub_accounts')
        .select('id, business_name, rc_number, logo_url, created_at')
        .eq('owner_user_id', id)
        .order('created_at', { ascending: false }),
      db.auth.admin.getUserById(id),
    ])

  // Email may be missing from profiles table (e.g. Google OAuth users) — fall back to auth email
  const email = profile?.email || authUser?.user?.email || null

  return {
    profile: profile ? { ...profile, email } : profile,
    receipts: receipts ?? [],
    receiptCount: receiptCount ?? 0,
    limitRequests: limitRequests ?? [],
    walletBalance: wallet?.balance ?? 0,
    walletTxns: walletTxns ?? [],
    subAccounts: subAccounts ?? [],
  }
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-ink-dim w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-ink flex-1 break-all min-w-0">{value}</span>
    </div>
  )
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile, receipts, receiptCount, limitRequests, walletBalance, walletTxns, subAccounts } = await getUserData(id)

  if (!profile) notFound()

  const totalSpend = receipts.reduce((sum: number, r: any) => sum + (r.total_amount ?? 0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Back + header */}
      <div>
        <Link
          href={adminHref('/users')}
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-forest transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Back to users
        </Link>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ background: 'oklch(0.42 0.18 145)' }}
          >
            {profile.full_name
              .split(' ')
              .slice(0, 2)
              .map((w: string) => w[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
                {profile.full_name}
              </h1>
              {profile.is_verified ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <BadgeCheck size={11} />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Clock size={11} />
                  Unverified
                </span>
              )}
              {profile.is_admin && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  <Shield size={11} />
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-ink-muted mt-0.5">{profile.email}</p>
            <p className="text-xs text-ink-dim mt-0.5">
              Joined {formatDateTime(profile.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — profile details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
                {receiptCount}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">Receipts</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="font-heading text-lg text-ink truncate" style={{ letterSpacing: '-0.02em' }}>
                {formatNaira(totalSpend)}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">Total issued</p>
            </div>
          </div>

          {/* Wallet */}
          <div
            className="rounded-xl p-4 text-white"
            style={{ background: 'linear-gradient(135deg, oklch(0.32 0.14 145), oklch(0.42 0.18 145))' }}
          >
            <p className="text-xs opacity-60 mb-1">Wallet Balance</p>
            <p className="font-heading text-2xl font-bold" style={{ letterSpacing: '-0.02em' }}>
              {formatNaira(walletBalance)}
            </p>
            {walletTxns.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/15 space-y-1.5">
                {walletTxns.slice(0, 3).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="opacity-60 truncate max-w-[140px]">{t.description}</span>
                    <span className={t.type === 'credit' ? 'text-green-300' : 'text-red-300'}>
                      {t.type === 'credit' ? '+' : '−'}{formatNaira(t.amount)}
                    </span>
                  </div>
                ))}
                {walletTxns.length > 3 && (
                  <p className="text-xs opacity-40 pt-0.5">{walletTxns.length - 3} more transactions</p>
                )}
              </div>
            )}
          </div>

          {/* Account details */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">
              Account Details
            </h2>
            <div>
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Phone" value={profile.phone} />
              <InfoRow label="Type" value={profile.issuer_type === 'business' ? 'Business' : 'Individual'} />
              <InfoRow label="Business name" value={profile.business_name} />
              <InfoRow label="Address" value={profile.address} />
              <InfoRow
                label="Limit override"
                value={profile.monthly_limit_override ? `${profile.monthly_limit_override} receipts/month` : null}
              />
            </div>
          </div>

          {/* Identity verification */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">
              Identity Verification
            </h2>
            {profile.nin || profile.rc_number ? (
              <div>
                {profile.nin && (
                  <div className="flex items-center gap-2 py-2">
                    <Shield size={14} className="text-forest shrink-0" />
                    <div>
                      <p className="text-xs text-ink-muted">NIN</p>
                      <p className="text-sm font-mono text-ink">
                        ••••••••{profile.nin.slice(-3)}
                      </p>
                    </div>
                  </div>
                )}
                {profile.rc_number && (
                  <div className="flex items-center gap-2 py-2">
                    <Building2 size={14} className="text-forest shrink-0" />
                    <div>
                      <p className="text-xs text-ink-muted">CAC / RC Number</p>
                      <p className="text-sm font-mono text-ink">{profile.rc_number}</p>
                    </div>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-border">
                  {profile.is_verified ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                      <CheckCircle2 size={12} />
                      Identity confirmed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
                      <Clock size={12} />
                      Verification pending
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-dim">No ID submitted yet</p>
            )}
          </div>

          {/* Limit requests */}
          {limitRequests.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-5">
              <h2 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">
                Limit Requests
              </h2>
              <div className="space-y-2">
                {limitRequests.map((lr: any) => (
                  <div key={lr.id} className="text-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-ink-muted">{lr.request_month}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full font-medium ${
                          lr.status === 'approved'
                            ? 'bg-green-50 text-green-700'
                            : lr.status === 'denied'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {lr.status}
                      </span>
                    </div>
                    <p className="text-ink-dim line-clamp-2">{lr.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Sister Companies */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 size={13} />
              Sister Companies
              <span className="text-ink-dim font-normal normal-case tracking-normal">({subAccounts.length})</span>
            </h2>
            {subAccounts.length === 0 ? (
              <p className="text-sm text-ink-dim">No sister companies added</p>
            ) : (
              <div className="space-y-2">
                {subAccounts.map((acc: any) => (
                  <div key={acc.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden">
                      {acc.logo_url ? (
                        <img src={acc.logo_url} alt={acc.business_name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 size={14} className="text-ink-dim" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink font-medium truncate">{acc.business_name}</p>
                      {acc.rc_number && (
                        <p className="text-xs text-ink-muted font-mono">RC {acc.rc_number}</p>
                      )}
                    </div>
                    <p className="text-xs text-ink-dim shrink-0">{formatDate(acc.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — receipts */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-forest" />
                <h2 className="font-semibold text-sm text-ink">
                  Receipts
                  <span className="ml-1.5 text-xs font-normal text-ink-dim">
                    ({receiptCount} total)
                  </span>
                </h2>
              </div>
              {receiptCount > 10 && (
                <Link
                  href={adminHref(`/receipts?user=${id}`)}
                  className="text-xs text-forest hover:underline"
                >
                  View all
                </Link>
              )}
            </div>

            {receipts.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={24} className="text-ink-dim mx-auto mb-2" />
                <p className="text-sm text-ink-muted">No receipts issued yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="text-xs font-medium text-ink-dim"
                      style={{ background: 'oklch(0.97 0.006 145)', borderBottom: '1px solid oklch(0.875 0.020 145)' }}
                    >
                      <th className="text-left px-5 py-3">Receipt No.</th>
                      <th className="text-left px-5 py-3">Customer</th>
                      <th className="text-right px-5 py-3">Amount</th>
                      <th className="text-left px-5 py-3">Date</th>
                      <th className="text-left px-5 py-3">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {receipts.map((r: any) => (
                      <tr key={r.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                          {r.receipt_number}
                        </td>
                        <td className="px-5 py-3 text-ink">{r.buyer_name}</td>
                        <td className="px-5 py-3 text-right font-medium text-ink">
                          {formatNaira(r.total_amount)}
                        </td>
                        <td className="px-5 py-3 text-xs text-ink-muted">
                          {formatDate(r.transaction_date)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                              r.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : r.status === 'cancelled'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={adminHref(`/receipts/${r.id}`)}
                            className="inline-flex items-center gap-1 text-xs text-forest hover:text-forest-bright"
                          >
                            View <ChevronRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
