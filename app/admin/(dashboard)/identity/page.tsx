import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateTime } from '@/lib/formatters'
import { adminHref } from '@/lib/admin-url'
import { ShieldCheck, CheckCircle2, XCircle, Search, Building2, User } from 'lucide-react'
import RejectButton from './RejectButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Identity Queue | Admin Console' }

const PAGE_SIZE = 30

interface SearchParams {
  q?: string
  page?: string
  filter?: string
}

async function getVerifications(q: string, page: number, filter: string) {
  const db = createAdminClient()
  const offset = page * PAGE_SIZE

  let query = db
    .from('identity_verifications')
    .select(
      'id, type, identifier, verified_name, status, source, created_at, rejected_at, profiles!identity_verifications_user_id_fkey(id, full_name, email, business_name, issuer_type)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filter === 'approved') query = query.eq('status', 'approved')
  if (filter === 'rejected') query = query.eq('status', 'rejected')
  if (filter === 'nin') query = query.eq('type', 'nin')
  if (filter === 'cac') query = query.eq('type', 'cac')

  const { data, count } = await query
  return { verifications: data ?? [], total: count ?? 0 }
}

export default async function AdminIdentityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { page: pageStr = '0', filter = 'all' } = await searchParams
  const page = Math.max(0, parseInt(pageStr) || 0)

  const { verifications, total } = await getVerifications('', page, filter)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'nin', label: 'NIN' },
    { key: 'cac', label: 'CAC / BN' },
  ]

  function buildUrl(params: Record<string, string>) {
    const u = new URLSearchParams({ page: String(page), filter, ...params })
    return `${adminHref('/identity')}?${u}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
            Identity Queue
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {total.toLocaleString()} verification{total !== 1 ? 's' : ''} · auto-approved via qoreID
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 flex gap-1.5 flex-wrap">
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {verifications.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck size={28} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No verifications yet</p>
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
                    <th className="text-left px-5 py-3">Identifier</th>
                    <th className="text-left px-5 py-3">Verified Name</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {verifications.map((v: any) => {
                    const profile = v.profiles
                    return (
                      <tr key={v.id} className="hover:bg-surface/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                              style={{ background: 'oklch(0.42 0.18 145)' }}
                            >
                              {(profile?.full_name ?? '?')
                                .split(' ')
                                .slice(0, 2)
                                .map((w: string) => w[0])
                                .join('')
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={adminHref(`/users/${profile?.id}`)}
                                className="font-medium text-ink hover:text-forest transition-colors truncate block"
                              >
                                {profile?.full_name ?? '—'}
                              </Link>
                              <p className="text-xs text-ink-dim truncate">{profile?.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                            {v.type === 'nin' ? (
                              <><User size={12} /> NIN</>
                            ) : (
                              <><Building2 size={12} /> CAC / BN</>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-ink-muted">{v.identifier}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-ink">{v.verified_name || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {v.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              <XCircle size={10} />
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-ink-muted">
                          {v.status === 'rejected' && v.rejected_at
                            ? formatDateTime(v.rejected_at)
                            : formatDateTime(v.created_at)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {v.status === 'approved' && (
                            <RejectButton id={v.id} />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
                <p className="text-xs text-ink-dim">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
                </p>
                <div className="flex gap-2">
                  {page > 0 && (
                    <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 text-xs border border-border rounded-lg text-ink-muted hover:bg-surface transition-colors">
                      Previous
                    </Link>
                  )}
                  {page < totalPages - 1 && (
                    <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 text-xs bg-forest text-white rounded-lg hover:bg-forest-bright transition-colors">
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
