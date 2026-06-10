import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate, formatDateTime } from '@/lib/formatters'
import { adminHref } from '@/lib/admin-url'
import { CreditCard, Search, ChevronRight, TrendingUp, ArrowUpCircle, FileText, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Subscriptions | Admin Console' }

const PAGE_SIZE = 25
const SILVER_PRICE = 100

interface SearchParams {
  q?: string
  page?: string
  sort?: string
}

async function getSubscriptions(q: string, page: number, sort: string) {
  const db = createAdminClient()
  const offset = page * PAGE_SIZE

  let query = db
    .from('profiles')
    .select('id, full_name, email, issuer_type, business_name, is_verified', { count: 'exact' })
    .range(offset, offset + PAGE_SIZE - 1)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,business_name.ilike.%${q}%`)
  }

  query = query.order('created_at', { ascending: false })

  const { data: profiles, count } = await query
  const users = profiles ?? []
  const userIds = users.map((u: any) => u.id)

  if (userIds.length === 0) return { users: [], total: count ?? 0 }

  const [
    { data: wallets },
    { data: txns },
    { data: receipts },
  ] = await Promise.all([
    db.from('wallets').select('user_id, balance, low_balance_notified_at').in('user_id', userIds),
    db.from('wallet_transactions').select('user_id, type, amount, created_at').in('user_id', userIds),
    db.from('receipts').select('user_id, charged_amount').in('user_id', userIds),
  ])

  // Build aggregation maps
  const walletMap = new Map((wallets ?? []).map((w: any) => [w.user_id, w]))

  const creditMap = new Map<string, number>()
  const debitMap = new Map<string, number>()
  const lastTopupMap = new Map<string, string>()
  for (const t of txns ?? []) {
    if ((t as any).type === 'credit') {
      creditMap.set(t.user_id, (creditMap.get(t.user_id) ?? 0) + ((t as any).amount ?? 0))
      const existing = lastTopupMap.get(t.user_id)
      if (!existing || t.created_at > existing) lastTopupMap.set(t.user_id, t.created_at)
    } else {
      debitMap.set(t.user_id, (debitMap.get(t.user_id) ?? 0) + ((t as any).amount ?? 0))
    }
  }

  const receiptCountMap = new Map<string, number>()
  for (const r of receipts ?? []) {
    receiptCountMap.set(r.user_id, (receiptCountMap.get(r.user_id) ?? 0) + 1)
  }

  const enriched = users.map((u: any) => {
    const wallet = walletMap.get(u.id)
    const balance = wallet?.balance ?? 0
    return {
      ...u,
      balance,
      totalFunded: creditMap.get(u.id) ?? 0,
      totalSpent: debitMap.get(u.id) ?? 0,
      receiptCount: receiptCountMap.get(u.id) ?? 0,
      lastTopup: lastTopupMap.get(u.id) ?? null,
      lowBalanceAlert: balance > 0 && balance < SILVER_PRICE * 3,
    }
  })

  if (sort === 'balance_desc') enriched.sort((a: any, b: any) => b.balance - a.balance)
  else if (sort === 'balance_asc') enriched.sort((a: any, b: any) => a.balance - b.balance)
  else if (sort === 'spent_desc') enriched.sort((a: any, b: any) => b.totalSpent - a.totalSpent)
  else if (sort === 'receipts_desc') enriched.sort((a: any, b: any) => b.receiptCount - a.receiptCount)

  return { users: enriched, total: count ?? 0 }
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q = '', page: pageStr = '0', sort = 'default' } = await searchParams
  const page = Math.max(0, parseInt(pageStr) || 0)

  const { users, total } = await getSubscriptions(q, page, sort)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const SORTS = [
    { key: 'default', label: 'Newest' },
    { key: 'balance_desc', label: 'Balance ↓' },
    { key: 'spent_desc', label: 'Most spent' },
    { key: 'receipts_desc', label: 'Most receipts' },
  ]

  function buildUrl(params: Record<string, string>) {
    const u = new URLSearchParams({ q, page: String(page), sort, ...params })
    return `${adminHref('/subscriptions')}?${u}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
          Subscriptions
        </h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Wallet activity and usage per issuer
        </p>
      </div>

      {/* Search + Sort */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-col sm:flex-row gap-3">
        <form action={adminHref('/subscriptions')} method="GET" className="flex-1">
          <input type="hidden" name="sort" value={sort} />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name, email, or business…"
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors"
            />
          </div>
        </form>
        <div className="flex gap-1.5 flex-wrap">
          {SORTS.map(({ key, label }) => (
            <Link
              key={key}
              href={buildUrl({ sort: key, page: '0' })}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={
                sort === key
                  ? { background: 'oklch(0.42 0.18 145)', color: 'white' }
                  : { background: 'oklch(0.97 0.006 145)', color: 'oklch(0.40 0.058 145)', border: '1px solid oklch(0.875 0.020 145)' }
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard size={28} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-xs font-medium text-ink-dim"
                    style={{ background: 'oklch(0.97 0.006 145)', borderBottom: '1px solid oklch(0.875 0.020 145)' }}
                  >
                    <th className="text-left px-5 py-3">Issuer</th>
                    <th className="text-right px-5 py-3">Balance</th>
                    <th className="text-right px-5 py-3">Total Funded</th>
                    <th className="text-right px-5 py-3">Total Spent</th>
                    <th className="text-right px-5 py-3">Receipts</th>
                    <th className="text-left px-5 py-3">Last Top-up</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-surface/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: 'oklch(0.42 0.18 145)' }}
                            >
                              {u.full_name
                                .split(' ')
                                .slice(0, 2)
                                .map((w: string) => w[0])
                                .join('')
                                .toUpperCase()}
                            </div>
                            {u.lowBalanceAlert && (
                              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                                <AlertTriangle size={7} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink truncate">{u.full_name}</p>
                            <p className="text-xs text-ink-dim truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: u.balance > 0 ? 'oklch(0.42 0.18 145)' : undefined }}
                        >
                          {formatNaira(u.balance)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm tabular-nums text-ink-muted">
                          {u.totalFunded > 0 ? formatNaira(u.totalFunded) : <span className="text-ink-dim">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm tabular-nums text-ink-muted">
                          {u.totalSpent > 0 ? formatNaira(u.totalSpent) : <span className="text-ink-dim">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm tabular-nums text-ink">{u.receiptCount.toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-muted">
                        {u.lastTopup ? formatDate(u.lastTopup) : <span className="text-ink-dim">Never</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={adminHref(`/users/${u.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-forest-bright transition-colors"
                        >
                          View <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-5 py-3 border-t border-border flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                  <AlertTriangle size={6} className="text-white" />
                </div>
                <span className="text-xs text-ink-dim">Low wallet balance (under ₦300)</span>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
                <p className="text-xs text-ink-dim">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{' '}
                  {total.toLocaleString()}
                </p>
                <div className="flex gap-2">
                  {page > 0 && (
                    <Link
                      href={buildUrl({ page: String(page - 1) })}
                      className="px-3 py-1.5 text-xs border border-border rounded-lg text-ink-muted hover:bg-surface transition-colors"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages - 1 && (
                    <Link
                      href={buildUrl({ page: String(page + 1) })}
                      className="px-3 py-1.5 text-xs bg-forest text-white rounded-lg hover:bg-forest-bright transition-colors"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
