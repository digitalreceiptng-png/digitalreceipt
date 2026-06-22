import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate } from '@/lib/formatters'
import { PlusCircle, FileText, FilePlus2 } from 'lucide-react'
import ReceiptsSummary from './ReceiptsSummary'
import ExportButton from './ExportButton'

const PAGE_SIZE = 20

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>
}) {
  const { q, page, sort } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()

  // If this user is a staff member, show owner's receipts (filtered by permissions)
  const { data: staffRow } = await db.from('staff_members').select('owner_id, can_view_all_receipts').eq('staff_id', user.id).eq('is_active', true).maybeSingle()
  const viewingUserId = staffRow ? staffRow.owner_id : user.id
  const isStaff = !!staffRow

  const currentPage = Math.max(1, parseInt(page ?? '1'))
  const offset = (currentPage - 1) * PAGE_SIZE
  const search = q?.trim() ?? ''

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    recent:     { column: 'created_at',       ascending: false },
    date_asc:   { column: 'transaction_date', ascending: true  },
    date_desc:  { column: 'transaction_date', ascending: false },
    amount_asc: { column: 'total_amount',     ascending: true  },
    amount_desc:{ column: 'total_amount',     ascending: false },
  }
  const activeSort = sortMap[sort ?? ''] ?? sortMap.recent

  let query = db
    .from('receipts')
    .select('id, receipt_number, buyer_name, total_amount, balance_due, transaction_date, status, issued_by_staff_id, profiles!receipts_issued_by_staff_id_fkey(full_name)', { count: 'exact' })
    .eq('user_id', viewingUserId)
    .is('parent_receipt_id', null)
    .order(activeSort.column, { ascending: activeSort.ascending })
    .range(offset, offset + PAGE_SIZE - 1)

  // Staff with view_all=false only see receipts they created
  if (isStaff && !staffRow.can_view_all_receipts) {
    query = query.eq('issued_by_staff_id', user.id)
  }

  if (search) {
    query = query.or(`receipt_number.ilike.%${search}%,buyer_name.ilike.%${search}%`)
  }

  const { data: receipts, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Fetch all receipts for summary + export (not paginated)
  const { data: allReceipts } = await db
    .from('receipts')
    .select('receipt_number, buyer_name, total_amount, tax, transaction_date, status, payment_method')
    .eq('user_id', viewingUserId)
    .eq('status', 'active')
    .is('parent_receipt_id', null)
    .order('transaction_date', { ascending: false })

  const totalRevenue = allReceipts?.reduce((s, r) => s + (Number(r.total_amount) || 0), 0) ?? 0
  const totalVat = allReceipts?.reduce((s, r) => s + (Number(r.tax) || 0), 0) ?? 0

  // Fetch installment schedules for visible receipts to show overdue / paid indicators
  const receiptIds = receipts?.map(r => r.id) ?? []
  const { data: installments } = receiptIds.length > 0
    ? await db.from('installment_schedules').select('receipt_id, due_date, paid_at').in('receipt_id', receiptIds)
    : { data: [] }

  const now = new Date(); now.setHours(0, 0, 0, 0)

  // Map: receiptId → { paidCount, total, hasOverdue }
  const instMap: Record<string, { paidCount: number; total: number; hasOverdue: boolean }> = {}
  for (const inst of (installments ?? [])) {
    if (!instMap[inst.receipt_id]) instMap[inst.receipt_id] = { paidCount: 0, total: 0, hasOverdue: false }
    instMap[inst.receipt_id].total++
    if (inst.paid_at) instMap[inst.receipt_id].paidCount++
    else if (new Date(inst.due_date) < now) instMap[inst.receipt_id].hasOverdue = true
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-ink">Receipts</h1>
        <div className="flex items-center gap-2">
          <ExportButton allReceipts={allReceipts ?? []} totalRevenue={totalRevenue} totalVat={totalVat} />
          <Link
            href="/free-invoice"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-border text-ink-muted hover:border-forest/40 hover:text-forest bg-white"
          >
            <FilePlus2 size={15} />
            <span className="hidden sm:inline">Free Invoice</span>
            <span className="sm:hidden">Invoice</span>
          </Link>
          <Link
            href="/dashboard/receipts/new"
            className="flex items-center gap-2 bg-forest text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
          >
            <PlusCircle size={16} />
            <span className="hidden sm:inline">New Receipt</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      <form method="GET" className="flex gap-2 flex-wrap sm:flex-nowrap">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search by receipt number or customer name…"
          className="flex-1 min-w-0 px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white"
        />
        <select
          name="sort"
          defaultValue={sort ?? 'recent'}
          className="px-3 py-2.5 border border-border rounded-lg text-sm text-ink bg-white focus:outline-none focus:border-forest/60 transition-colors cursor-pointer"
        >
          <option value="recent">Most Recent</option>
          <option value="date_desc">Date (Newest)</option>
          <option value="date_asc">Date (Oldest)</option>
          <option value="amount_desc">Amount (High–Low)</option>
          <option value="amount_asc">Amount (Low–High)</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2.5 bg-white border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors"
        >
          Search
        </button>
        {(search || sort) && (
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
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {receipts.map(r => {
                const inst = instMap[r.id]
                const rowOverdue = inst?.hasOverdue
                return (
                <Link key={r.id} href={`/dashboard/receipts/${r.id}`} className={`flex items-start justify-between gap-3 px-5 py-4 active:bg-surface transition-colors ${rowOverdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-surface/60'}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{r.buyer_name}</p>
                    <p className="font-mono text-xs text-ink-dim mt-0.5">{r.receipt_number}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <p className="text-xs text-ink-muted">{formatDate(r.transaction_date)}</p>
                      {!isStaff && (r as any).issued_by_staff_id && (
                        <span className="text-xs text-ink-dim">· {((r as any).profiles as any)?.full_name ?? 'Staff'}</span>
                      )}
                    </div>
                    {inst && inst.total > 0 && (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-1.5 px-2 py-0.5 rounded-full border ${
                        inst.paidCount === inst.total
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : rowOverdue
                          ? 'bg-red-100 border-red-200 text-red-700'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                        {inst.paidCount}/{inst.total} Installment{inst.total > 1 ? 's' : ''} Paid
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-ink">{formatNaira(r.total_amount)}</p>
                    {(r as any).balance_due > 0 && (
                      <p className="text-xs font-semibold mt-0.5" style={{ color: '#856404' }}>
                        ₦{Number((r as any).balance_due).toLocaleString('en-NG', { minimumFractionDigits: 2 })} due
                      </p>
                    )}
                    <div className="mt-1"><StatusBadge status={r.status} /></div>
                  </div>
                </Link>
              )})}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-ink-dim text-xs border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">Receipt No.</th>
                    <th className="text-left px-5 py-3 font-medium">Customer</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    {!isStaff && <th className="text-left px-5 py-3 font-medium">Issued By</th>}
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map(r => {
                    const inst = instMap[r.id]
                    const rowOverdue = inst?.hasOverdue
                    return (
                    <tr key={r.id} className={`transition-colors ${rowOverdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-surface/60'}`}>
                      <td className="px-5 py-3.5 font-mono text-xs text-ink-muted">{r.receipt_number}</td>
                      <td className="px-5 py-3.5 text-ink">
                        <span>{r.buyer_name}</span>
                        {inst && inst.total > 0 && (
                          <span className={`ml-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            inst.paidCount === inst.total
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : rowOverdue
                              ? 'bg-red-100 border-red-200 text-red-700'
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}>
                            {inst.paidCount}/{inst.total} Paid
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-medium text-ink">{formatNaira(r.total_amount)}</span>
                        {(r as any).balance_due > 0 && (
                          <span className="block text-xs font-semibold mt-0.5" style={{ color: '#856404' }}>
                            ₦{Number((r as any).balance_due).toLocaleString('en-NG', { minimumFractionDigits: 2 })} due
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted">{formatDate(r.transaction_date)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                      {!isStaff && (
                        <td className="px-5 py-3.5 text-xs text-ink-muted">
                          {(r as any).issued_by_staff_id ? ((r as any).profiles as any)?.full_name ?? 'Staff' : <span className="text-ink-dim">Owner</span>}
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/dashboard/receipts/${r.id}`} className="text-forest/70 text-xs font-medium hover:text-forest transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  )})}
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

      <ReceiptsSummary totalRevenue={totalRevenue} totalVat={totalVat} />
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
