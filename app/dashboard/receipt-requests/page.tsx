import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClipboardList } from 'lucide-react'
import { formatNaira, formatDate } from '@/lib/formatters'

const PAGE_SIZE = 20

export default async function ReceiptRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const { q, status, page } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const currentPage = Math.max(1, parseInt(page ?? '1'))
  const offset = (currentPage - 1) * PAGE_SIZE
  const search = q?.trim() ?? ''
  const statusFilter = status && ['pending', 'confirmed', 'rejected'].includes(status) ? status : ''

  let query = db
    .from('receipt_form_submissions')
    .select('id, customer_name, customer_email, purpose_of_payment, total_amount, submitted_at, status, payment_evidence_url, form:receipt_forms(id, title)', { count: 'exact' })
    .eq('issuer_id', user.id)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (search) query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,purpose_of_payment.ilike.%${search}%`)

  const { data: submissions, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Rejected', value: 'rejected' },
  ]

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    if (search) p.set('q', search)
    if (statusFilter) p.set('status', statusFilter)
    p.set('page', '1')
    Object.entries(overrides).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k) })
    return `/dashboard/receipt-requests?${p}`
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl text-ink">Receipt Requests</h1>
        <Link
          href="/dashboard/forms"
          className="text-sm text-forest font-medium hover:text-forest-bright transition-colors"
        >
          Manage Forms →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <Link
            key={tab.value}
            href={buildHref({ status: tab.value, page: '1' })}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              statusFilter === tab.value
                ? 'border-forest text-forest'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search by customer name, email or purpose…"
          className="flex-1 px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white"
        />
        <button type="submit" className="px-4 py-2.5 bg-white border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors">
          Search
        </button>
        {search && (
          <Link href={buildHref({ q: '' })} className="px-4 py-2.5 text-sm text-ink-dim hover:text-danger transition-colors">
            Clear
          </Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {!submissions?.length ? (
          <div className="py-16 text-center">
            <ClipboardList size={32} className="text-ink-dim mx-auto mb-3" />
            <p className="text-ink-muted">
              {search || statusFilter ? 'No requests match your filters.' : 'No receipt requests yet.'}
            </p>
            {!search && !statusFilter && (
              <Link href="/dashboard/forms" className="inline-block mt-3 text-sm text-forest font-medium hover:underline">
                Create a form link to get started →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-ink-dim text-xs border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">Customer</th>
                    <th className="text-left px-5 py-3 font-medium">Purpose</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-left px-5 py-3 font-medium">Submitted</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.map(s => (
                    <tr key={s.id} className="hover:bg-surface/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-ink font-medium">{s.customer_name}</p>
                        {s.customer_email && <p className="text-xs text-ink-dim mt-0.5">{s.customer_email}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted">
                        {s.purpose_of_payment || <span className="text-ink-dim">—</span>}
                        {s.payment_evidence_url && <span className="ml-2 text-xs text-amber-600">📎</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-ink">
                        {s.total_amount ? formatNaira(s.total_amount) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted text-xs">
                        {formatDate(s.submitted_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/dashboard/receipt-requests/${s.id}`} className="text-forest/70 text-xs font-medium hover:text-forest transition-colors">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm">
                <p className="text-ink-dim">{count} request{count !== 1 ? 's' : ''} total</p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link href={buildHref({ page: String(currentPage - 1) })} className="px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest transition-colors">
                      Previous
                    </Link>
                  )}
                  <span className="px-3 py-1.5 text-ink-dim">{currentPage} / {totalPages}</span>
                  {currentPage < totalPages && (
                    <Link href={buildHref({ page: String(currentPage + 1) })} className="px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest transition-colors">
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs border font-medium capitalize ${map[status] ?? map.pending}`}>
      {status}
    </span>
  )
}
