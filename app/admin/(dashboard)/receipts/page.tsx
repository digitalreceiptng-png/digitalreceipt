import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate } from '@/lib/formatters'
import { adminHref } from '@/lib/admin-url'
import { FileText, Search, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Receipts | Admin Console' }

const PAGE_SIZE = 25

interface SearchParams {
  q?: string
  page?: string
  status?: string
  user?: string
}

async function getReceipts(q: string, page: number, status: string, userId: string) {
  const db = createAdminClient()
  const offset = page * PAGE_SIZE

  let query = db
    .from('receipts')
    .select(
      'id, receipt_number, unique_identifier, buyer_name, total_amount, payment_method, transaction_date, status, created_at, user_id, profiles!receipts_user_id_fkey(full_name, email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (q) {
    query = query.or(`receipt_number.ilike.%${q}%,unique_identifier.ilike.%${q}%,buyer_name.ilike.%${q}%`)
  }
  if (status && status !== 'all') query = query.eq('status', status)
  if (userId) query = query.eq('user_id', userId)

  const { data, count } = await query
  return { receipts: data ?? [], total: count ?? 0 }
}

export default async function AdminReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q = '', page: pageStr = '0', status = 'all', user: userId = '' } = await searchParams
  const page = Math.max(0, parseInt(pageStr) || 0)

  const { receipts, total } = await getReceipts(q, page, status, userId)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATUSES = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'expired', label: 'Expired' },
  ]

  function buildUrl(params: Record<string, string>) {
    const u = new URLSearchParams({ q, page: String(page), status, user: userId, ...params })
    return `${adminHref('/receipts')}?${u}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
            Receipts
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {total.toLocaleString()} receipt{total !== 1 ? 's' : ''}
            {userId && ' for this issuer'}
          </p>
        </div>
        {userId && (
          <Link
            href={adminHref('/receipts')}
            className="text-xs text-ink-muted hover:text-forest transition-colors"
          >
            ← Show all receipts
          </Link>
        )}
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-col sm:flex-row gap-3">
        <form action={adminHref('/receipts')} method="GET" className="flex-1">
          <input type="hidden" name="status" value={status} />
          {userId && <input type="hidden" name="user" value={userId} />}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none"
            />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by receipt number, ID, or customer…"
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors"
            />
          </div>
        </form>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(({ key, label }) => (
            <Link
              key={key}
              href={buildUrl({ status: key, page: '0' })}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={
                status === key
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
        {receipts.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={28} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No receipts found</p>
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
                    <th className="text-left px-5 py-3">Receipt</th>
                    <th className="text-left px-5 py-3">Issuer</th>
                    <th className="text-left px-5 py-3">Customer</th>
                    <th className="text-right px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map((r: any) => (
                    <tr key={r.id} className="hover:bg-surface/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs text-ink-muted">{r.receipt_number}</p>
                        <p className="font-mono text-xs text-ink-dim mt-0.5">{r.unique_identifier}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={adminHref(`/users/${r.user_id}`)}
                          className="text-sm text-forest hover:underline"
                        >
                          {r.profiles?.full_name ?? '—'}
                        </Link>
                        <p className="text-xs text-ink-dim mt-0.5">{r.profiles?.email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-ink text-sm">{r.buyer_name}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-ink">
                        {formatNaira(r.total_amount)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-muted">
                        {formatDate(r.transaction_date)}
                      </td>
                      <td className="px-5 py-3.5">
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
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={adminHref(`/receipts/${r.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-forest-bright"
                        >
                          View <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
