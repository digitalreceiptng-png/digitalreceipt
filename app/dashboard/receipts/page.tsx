import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatDate } from '@/lib/formatters'
import { PlusCircle, FileText, FilePlus2 } from 'lucide-react'

const PAGE_SIZE = 20

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q, page } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const currentPage = Math.max(1, parseInt(page ?? '1'))
  const offset = (currentPage - 1) * PAGE_SIZE
  const search = q?.trim() ?? ''

  let query = supabase
    .from('receipts')
    .select('id, receipt_number, buyer_name, total_amount, transaction_date, status', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (search) {
    query = query.or(`receipt_number.ilike.%${search}%,buyer_name.ilike.%${search}%`)
  }

  const { data: receipts, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl text-ink">Receipts</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/free-invoice"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-border text-ink-muted hover:border-forest/40 hover:text-forest bg-white"
          >
            <FilePlus2 size={15} />
            Free Invoice
          </Link>
          <Link
            href="/dashboard/receipts/new"
            className="flex items-center gap-2 bg-forest text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
          >
            <PlusCircle size={16} />
            New Receipt
          </Link>
        </div>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search by receipt number or customer name…"
          className="flex-1 px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-white border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors"
        >
          Search
        </button>
        {search && (
          <Link href="/dashboard/receipts" className="px-4 py-2.5 text-sm text-ink-dim hover:text-danger transition-colors">
            Clear
          </Link>
        )}
      </form>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {!receipts?.length ? (
          <div className="py-16 text-center">
            <FileText size={32} className="text-ink-dim mx-auto mb-3" />
            <p className="text-ink-muted">
              {search ? `No receipts matching &ldquo;${search}&rdquo;` : 'No receipts yet.'}
            </p>
            {!search && (
              <Link href="/dashboard/receipts/new" className="inline-block mt-3 text-sm text-forest font-medium hover:underline">
                Generate your first receipt →
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-ink-dim text-xs border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">Receipt No.</th>
                    <th className="text-left px-5 py-3 font-medium">Customer</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map(r => (
                    <tr key={r.id} className="hover:bg-surface/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-ink-muted">{r.receipt_number}</td>
                      <td className="px-5 py-3.5 text-ink">{r.buyer_name}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-ink">{formatNaira(r.total_amount)}</td>
                      <td className="px-5 py-3.5 text-ink-muted">{formatDate(r.transaction_date)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/dashboard/receipts/${r.id}`} className="text-forest/70 text-xs font-medium hover:text-forest transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm">
                <p className="text-ink-dim">{count} receipt{count !== 1 ? 's' : ''} total</p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link
                      href={`/dashboard/receipts?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(currentPage - 1) })}`}
                      className="px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest transition-colors"
                    >
                      Previous
                    </Link>
                  )}
                  <span className="px-3 py-1.5 text-ink-dim">{currentPage} / {totalPages}</span>
                  {currentPage < totalPages && (
                    <Link
                      href={`/dashboard/receipts?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(currentPage + 1) })}`}
                      className="px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest transition-colors"
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    expired: 'bg-gray-100 text-gray-500 border-gray-200',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs border font-medium capitalize ${map[status] ?? map.active}`}>
      {status}
    </span>
  )
}
