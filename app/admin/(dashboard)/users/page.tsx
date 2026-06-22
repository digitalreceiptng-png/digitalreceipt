import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate, formatNaira } from '@/lib/formatters'
import { adminHref } from '@/lib/admin-url'
import { Users, Search, ChevronRight, CheckCircle2, Clock, Building2, User } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Users | Admin Console' }

const PAGE_SIZE = 25

interface SearchParams {
  q?: string
  page?: string
  filter?: string
}

async function getUsers(q: string, page: number, filter: string) {
  const db = createAdminClient()
  const offset = page * PAGE_SIZE

  let query = db
    .from('profiles')
    .select('id, full_name, email, phone, issuer_type, is_verified, created_at, business_name', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,business_name.ilike.%${q}%`)
  }

  if (filter === 'verified') query = query.eq('is_verified', true)
  if (filter === 'unverified') query = query.eq('is_verified', false)
  if (filter === 'business') query = query.eq('issuer_type', 'business')
  if (filter === 'individual') query = query.eq('issuer_type', 'individual')

  const { data, count } = await query
  const users = data ?? []

  // Fetch wallet balances for this page of users
  const userIds = users.map((u: any) => u.id)
  const { data: wallets } = userIds.length > 0
    ? await db.from('wallets').select('user_id, balance').in('user_id', userIds)
    : { data: [] }
  const walletMap = new Map((wallets ?? []).map((w: any) => [w.user_id, w.balance ?? 0]))

  // Fetch sister companies for this page of users
  const { data: subAccounts } = userIds.length > 0
    ? await db.from('user_sub_accounts').select('id, owner_user_id, business_name, rc_number, logo_url, created_at').in('owner_user_id', userIds).order('created_at', { ascending: true })
    : { data: [] }
  const subAccountMap = new Map<string, any[]>()
  for (const s of subAccounts ?? []) {
    if (!subAccountMap.has(s.owner_user_id)) subAccountMap.set(s.owner_user_id, [])
    subAccountMap.get(s.owner_user_id)!.push(s)
  }

  return { users, walletMap, subAccountMap, total: count ?? 0 }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q = '', page: pageStr = '0', filter = 'all' } = await searchParams
  const page = Math.max(0, parseInt(pageStr) || 0)

  const { users, walletMap, subAccountMap, total } = await getUsers(q, page, filter)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'verified', label: 'Verified' },
    { key: 'unverified', label: 'Unverified' },
    { key: 'business', label: 'Business' },
    { key: 'individual', label: 'Individual' },
  ]

  function buildUrl(params: Record<string, string>) {
    const u = new URLSearchParams({ q, page: String(page), filter, ...params })
    return `${adminHref('/users')}?${u}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
            Users
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {total.toLocaleString()} registered issuer{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form action={adminHref('/users')} method="GET" className="flex-1">
          <input type="hidden" name="filter" value={filter} />
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none"
            />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name, email, or business name…"
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors"
            />
          </div>
        </form>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <Link
              key={key}
              href={buildUrl({ filter: key, page: '0' })}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={
                filter === key
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
            <Users size={28} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No users found</p>
            {q && (
              <Link href={adminHref('/users')} className="text-sm text-forest hover:underline mt-2 block">
                Clear search
              </Link>
            )}
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
                    <th className="text-left px-5 py-3">Type</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-right px-5 py-3">Wallet</th>
                    <th className="text-left px-5 py-3">Joined</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u: any) => {
                    const subs = subAccountMap.get(u.id) ?? []
                    return (
                      <>
                        <tr key={u.id} className="hover:bg-surface/60 transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                                style={{ background: 'oklch(0.42 0.18 145)' }}
                              >
                                {u.full_name
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((w: string) => w[0])
                                  .join('')
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-ink truncate">{u.full_name}</p>
                                <p className="text-xs text-ink-dim truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                              {u.issuer_type === 'business' ? (
                                <>
                                  <Building2 size={12} />
                                  {u.business_name ? (
                                    <span className="truncate max-w-[120px]">{u.business_name}</span>
                                  ) : (
                                    'Business'
                                  )}
                                </>
                              ) : (
                                <>
                                  <User size={12} />
                                  Individual
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {u.is_verified ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={10} />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <Clock size={10} />
                                Unverified
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="text-sm font-medium tabular-nums" style={{ color: (walletMap.get(u.id) ?? 0) > 0 ? 'oklch(0.42 0.18 145)' : undefined }}>
                              {formatNaira(walletMap.get(u.id) ?? 0)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-ink-muted text-xs">{formatDate(u.created_at)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              href={adminHref(`/users/${u.id}`)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-forest-bright transition-colors"
                            >
                              View <ChevronRight size={13} />
                            </Link>
                          </td>
                        </tr>
                        {subs.map((s: any) => (
                          <tr key={s.id} className="bg-surface/40 border-l-2" style={{ borderLeftColor: 'oklch(0.42 0.18 145 / 0.25)' }}>
                            <td className="pl-14 pr-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                  {s.logo_url
                                    ? <img src={s.logo_url} alt={s.business_name} className="w-full h-full object-cover" />
                                    : <Building2 size={11} className="text-ink-dim" />}
                                </div>
                                <p className="text-xs text-ink-muted truncate">{s.business_name}</p>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="flex items-center gap-1 text-xs text-ink-dim">
                                <Building2 size={11} />
                                {s.rc_number ? `RC ${s.rc_number}` : 'Sister Company'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs text-ink-dim px-2 py-0.5 bg-white border border-border rounded-full">Sister Co.</span>
                            </td>
                            <td className="px-5 py-3.5" />
                            <td className="px-5 py-3.5 text-ink-muted text-xs">{formatDate(s.created_at)}</td>
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
                      </>
                    )
                  })}
                </tbody>
              </table>
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
