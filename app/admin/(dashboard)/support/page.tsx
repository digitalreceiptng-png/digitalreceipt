import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateTime } from '@/lib/formatters'
import { adminHref } from '@/lib/admin-url'
import Link from 'next/link'
import { MessageSquare, CheckCircle2, Clock, AlertCircle, Search } from 'lucide-react'
import SupportActions from './SupportActions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Support | Admin Console' }

const PAGE_SIZE = 25

const STATUS_STYLES: Record<string, string> = {
  open:        'bg-red-50 text-red-700 border-red-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved:    'bg-green-50 text-green-700 border-green-200',
  closed:      'bg-gray-100 text-gray-500 border-gray-200',
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>
}) {
  const { status = 'all', page: pageStr = '0', q = '' } = await searchParams
  const page = Math.max(0, parseInt(pageStr) || 0)
  const offset = page * PAGE_SIZE

  const db = createAdminClient()
  let query = db
    .from('support_tickets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (status !== 'all') query = query.eq('status', status)
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,subject.ilike.%${q}%`)

  const { data: tickets, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const { data: counts } = await db.from('support_tickets').select('status')
  const statusCounts = (counts ?? []).reduce((acc: Record<string, number>, t: any) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})

  const FILTERS = [
    { key: 'all',        label: 'All',         count: counts?.length ?? 0 },
    { key: 'open',       label: 'Open',        count: statusCounts.open ?? 0 },
    { key: 'in_progress',label: 'In Progress', count: statusCounts.in_progress ?? 0 },
    { key: 'resolved',   label: 'Resolved',    count: statusCounts.resolved ?? 0 },
    { key: 'closed',     label: 'Closed',      count: statusCounts.closed ?? 0 },
  ]

  function buildUrl(params: Record<string, string>) {
    return `${adminHref('/support')}?${new URLSearchParams({ status, page: String(page), q, ...params })}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>Support</h1>
        <p className="text-sm text-ink-muted mt-0.5">User support requests</p>
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {FILTERS.map(({ key, label, count }) => (
            <Link
              key={key}
              href={buildUrl({ status: key, page: '0' })}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              style={
                status === key
                  ? { background: 'oklch(0.42 0.18 145)', color: 'white' }
                  : { background: 'oklch(0.97 0.006 145)', color: 'oklch(0.40 0.058 145)', border: '1px solid oklch(0.875 0.020 145)' }
              }
            >
              {label}
              {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${status === key ? 'bg-white/20' : 'bg-black/8'}`}>{count}</span>}
            </Link>
          ))}
        </div>
        <form action={adminHref('/support')} method="GET" className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
            <input name="q" defaultValue={q} placeholder="Search…" className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 w-44" />
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {!tickets?.length ? (
          <div className="py-14 text-center">
            <MessageSquare size={28} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No tickets found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-ink-dim" style={{ background: 'oklch(0.97 0.006 145)', borderBottom: '1px solid oklch(0.875 0.020 145)' }}>
                    <th className="text-left px-5 py-3">From</th>
                    <th className="text-left px-5 py-3">Subject</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(tickets as any[]).map(ticket => (
                    <tr key={ticket.id} className="hover:bg-surface/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink text-sm">{ticket.name}</p>
                        <p className="text-xs text-ink-dim">{ticket.email}</p>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="text-sm text-ink truncate">{ticket.subject}</p>
                        <p className="text-xs text-ink-dim truncate mt-0.5">{ticket.message.slice(0, 80)}…</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_STYLES[ticket.status] ?? STATUS_STYLES.open}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-muted whitespace-nowrap">{formatDateTime(ticket.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <SupportActions ticket={ticket} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
                <p className="text-xs text-ink-dim">{count} ticket{count !== 1 ? 's' : ''}</p>
                <div className="flex gap-2">
                  {page > 0 && <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 text-xs border border-border rounded-lg text-ink-muted hover:bg-surface">Previous</Link>}
                  {page < totalPages - 1 && <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 text-xs bg-forest text-white rounded-lg hover:bg-forest-bright">Next</Link>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
