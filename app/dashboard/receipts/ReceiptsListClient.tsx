'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Pencil, Check, X } from 'lucide-react'
import ReceiptGroups from './ReceiptGroups'
import ExportButton from './ExportButton'

interface Group { id: string; name: string; color: string }
interface InstInfo { paidCount: number; total: number; hasOverdue: boolean }

interface Receipt {
  id: string
  receipt_number: string
  buyer_name: string
  total_amount: number
  amount_paid: number | null
  balance_due: number
  transaction_date: string
  created_at: string
  status: string
  issued_by_staff_id: string | null
  group_id: string | null
  profiles?: { full_name: string } | { full_name: string }[] | null
}

interface Props {
  receipts: Receipt[]
  groups: Group[]
  instMap: Record<string, InstInfo>
  paymentMap: Record<string, { amount: number; created_at: string }[]>
  isStaff: boolean
  count: number
  currentPage: number
  totalPages: number
  search: string
  sort?: string
  activeGroup: string | null
  allReceipts: any[]
  totalRevenue: number
  totalVat: number
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

function fmtAmount(n: number) {
  return '₦' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ReceiptsListClient({
  receipts, groups, instMap, paymentMap, isStaff, count, currentPage, totalPages, search, sort, activeGroup, allReceipts, totalRevenue, totalVat,
}: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('Customer')
  const [editingReceiptLabel, setEditingReceiptLabel] = useState(false)
  const [receiptLabelDraft, setReceiptLabelDraft] = useState('Receipt No.')

  const groupKey = `customer_label_${activeGroup ?? 'general'}`
  const receiptLabelKey = `receipt_label_${activeGroup ?? 'general'}`

  const [customerLabel, setCustomerLabelState] = useState('Customer')
  const [receiptLabel, setReceiptLabelState] = useState('Receipt No.')

  useEffect(() => {
    const saved = localStorage.getItem(groupKey)
    setCustomerLabelState(saved || 'Customer')
    setEditingLabel(false)
    const savedR = localStorage.getItem(receiptLabelKey)
    setReceiptLabelState(savedR || 'Receipt No.')
    setEditingReceiptLabel(false)
  }, [groupKey, receiptLabelKey])

  function setCustomerLabel(label: string) {
    localStorage.setItem(groupKey, label)
    setCustomerLabelState(label)
  }

  function setReceiptLabel(label: string) {
    localStorage.setItem(receiptLabelKey, label)
    setReceiptLabelState(label)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    if (selectedIds.length === receipts.length) setSelectedIds([])
    else setSelectedIds(receipts.map(r => r.id))
  }

  function navigate(params: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    if (params.q) p.set('q', params.q)
    if (params.sort) p.set('sort', params.sort)
    if (params.page) p.set('page', params.page)
    if (params.group) p.set('group', params.group)
    router.push(`/dashboard/receipts?${p.toString()}`)
  }

  function handleGroupChange(groupId: string | null) {
    navigate({ q: search || undefined, sort, group: groupId === null ? undefined : groupId })
  }

  return (
    <div className="space-y-3">
      {/* Group tabs */}
      <ReceiptGroups
        groups={groups}
        activeGroupId={activeGroup}
        selectedIds={selectedIds}
        onGroupChange={handleGroupChange}
      />

      {/* Search + sort */}
      <form method="GET" className="flex gap-2 flex-wrap sm:flex-nowrap">
        {activeGroup && <input type="hidden" name="group" value={activeGroup} />}
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
        <button type="submit" className="px-4 py-2.5 bg-white border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors">
          Search
        </button>
        <ExportButton
          allReceipts={allReceipts}
          totalRevenue={totalRevenue}
          totalVat={totalVat}
          receiptLabel={receiptLabel}
          customerLabel={customerLabel}
        />
        {(search || sort || activeGroup) && (
          <Link href="/dashboard/receipts" className="px-4 py-2.5 text-sm text-ink-dim hover:text-danger transition-colors">
            Clear
          </Link>
        )}
      </form>

      {/* Receipt list */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {!receipts.length ? (
          <div className="py-16 text-center">
            <FileText size={32} className="text-ink-dim mx-auto mb-3" />
            <p className="text-ink-muted">
              {search ? `No receipts matching "${search}"` : 'No receipts in this group.'}
            </p>
            {!search && (
              <Link href="/dashboard/receipts/new" className="inline-block mt-3 text-sm text-forest font-medium hover:underline">
                Generate your first receipt →
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {receipts.map(r => {
                const inst = instMap[r.id]
                const overdue = inst?.hasOverdue
                const selected = selectedIds.includes(r.id)
                return (
                  <div key={r.id} className={`flex items-start gap-3 px-4 py-4 transition-colors ${overdue ? 'bg-red-50' : selected ? 'bg-blue-50' : 'hover:bg-surface/60'}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleSelect(r.id)} className="mt-1 shrink-0 accent-forest" />
                    <Link href={`/dashboard/receipts/${r.id}`} className="flex-1 flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{r.buyer_name}</p>
                        <p className="font-mono text-xs text-ink-dim mt-0.5">{r.receipt_number}</p>
                        <p className="text-xs text-ink-muted mt-1">{formatDate(r.transaction_date)} · {new Date(r.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                        {inst && inst.total > 0 && (
                          <span className={`inline-flex items-center text-xs font-semibold mt-1.5 px-2 py-0.5 rounded-full border ${
                            inst.paidCount === inst.total ? 'bg-green-50 border-green-200 text-green-700' : overdue ? 'bg-red-100 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}>
                            {inst.paidCount}/{inst.total} Installment{inst.total !== 1 ? 's' : ''} Paid
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-ink">{fmtAmount(r.total_amount)}</p>
                        {r.balance_due > 0 && (() => {
                          const childSum = (paymentMap[r.id] ?? []).reduce((s, p) => s + p.amount, 0)
                          const initialPaid = (r.amount_paid ?? 0) - childSum
                          return (
                            <>
                              {initialPaid > 0 && (
                                <p className="text-xs font-medium mt-0.5 text-green-700">
                                  {fmtAmount(initialPaid)} · {new Date(r.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })} {new Date(r.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                              )}
                              {(paymentMap[r.id] ?? []).map((p, i) => (
                                <p key={i} className="text-xs font-medium mt-0.5 text-green-700">
                                  {fmtAmount(p.amount)} · {new Date(p.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })} {new Date(p.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                              ))}
                              <p className="text-xs font-semibold mt-0.5" style={{ color: '#856404' }}>{fmtAmount(r.balance_due)} due</p>
                            </>
                          )
                        })()}
                        <div className="mt-1"><StatusBadge status={r.status} /></div>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-ink-dim text-xs border-b border-border">
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.length === receipts.length && receipts.length > 0} onChange={toggleAll} className="accent-forest" />
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      <div className="flex items-center gap-1 group/rlabel">
                        {editingReceiptLabel ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={receiptLabelDraft}
                              onChange={e => setReceiptLabelDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { setReceiptLabel(receiptLabelDraft || 'Receipt No.'); setEditingReceiptLabel(false) }
                                if (e.key === 'Escape') setEditingReceiptLabel(false)
                              }}
                              className="px-1.5 py-0.5 text-xs border border-forest/40 rounded focus:outline-none w-24 bg-white text-ink font-medium"
                            />
                            <button onClick={() => { setReceiptLabel(receiptLabelDraft || 'Receipt No.'); setEditingReceiptLabel(false) }} className="text-forest"><Check size={11} /></button>
                            <button onClick={() => setEditingReceiptLabel(false)} className="text-ink-dim"><X size={11} /></button>
                          </div>
                        ) : (
                          <>
                            {receiptLabel}
                            <button onClick={() => { setReceiptLabelDraft(receiptLabel); setEditingReceiptLabel(true) }} className="opacity-0 group-hover/rlabel:opacity-100 transition-opacity text-ink-dim hover:text-forest p-0.5">
                              <Pencil size={10} />
                            </button>
                          </>
                        )}
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      <div className="flex items-center gap-1 group/label">
                        {editingLabel ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={labelDraft}
                              onChange={e => setLabelDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { setCustomerLabel(labelDraft || 'Customer'); setEditingLabel(false) }
                                if (e.key === 'Escape') setEditingLabel(false)
                              }}
                              className="px-1.5 py-0.5 text-xs border border-forest/40 rounded focus:outline-none w-24 bg-white text-ink font-medium"
                            />
                            <button onClick={() => { setCustomerLabel(labelDraft || 'Customer'); setEditingLabel(false) }} className="text-forest"><Check size={11} /></button>
                            <button onClick={() => setEditingLabel(false)} className="text-ink-dim"><X size={11} /></button>
                          </div>
                        ) : (
                          <>
                            {customerLabel}
                            <button onClick={() => { setLabelDraft(customerLabel); setEditingLabel(true) }} className="opacity-0 group-hover/label:opacity-100 transition-opacity text-ink-dim hover:text-forest p-0.5">
                              <Pencil size={10} />
                            </button>
                          </>
                        )}
                      </div>
                    </th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 font-medium">Date &amp; Time</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    {!isStaff && <th className="text-left px-4 py-3 font-medium">Issued By</th>}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map(r => {
                    const inst = instMap[r.id]
                    const overdue = inst?.hasOverdue
                    const selected = selectedIds.includes(r.id)
                    return (
                      <tr key={r.id} className={`transition-colors ${overdue ? 'bg-red-50 hover:bg-red-100' : selected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-surface/60'}`}>
                        <td className="px-4 py-3.5">
                          <input type="checkbox" checked={selected} onChange={() => toggleSelect(r.id)} className="accent-forest" />
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">{r.receipt_number}</td>
                        <td className="px-4 py-3.5 text-ink">
                          <span>{r.buyer_name}</span>
                          {inst && inst.total > 0 && (
                            <span className={`ml-2 inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              inst.paidCount === inst.total ? 'bg-green-50 border-green-200 text-green-700' : overdue ? 'bg-red-100 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                            }`}>
                              {inst.paidCount}/{inst.total} Paid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right align-top">
                          <span className="block h-5 leading-5 font-medium text-ink text-sm">{fmtAmount(r.total_amount)}</span>
                          {r.balance_due > 0 && (() => {
                            const childSum = (paymentMap[r.id] ?? []).reduce((s, p) => s + p.amount, 0)
                            const initialPaid = (r.amount_paid ?? 0) - childSum
                            return (
                              <>
                                {initialPaid > 0 && (
                                  <span className="block h-5 leading-5 text-xs font-medium text-green-700">{fmtAmount(initialPaid)} paid</span>
                                )}
                                {(paymentMap[r.id] ?? []).map((p, i) => (
                                  <span key={i} className="block h-5 leading-5 text-xs font-medium text-green-700">{fmtAmount(p.amount)} paid</span>
                                ))}
                                <span className="block h-5 leading-5 text-xs font-semibold" style={{ color: '#856404' }}>{fmtAmount(r.balance_due)} due</span>
                              </>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-3.5 text-ink-muted align-top">
                          <span className="block h-5 leading-5 text-xs">{formatDate(r.transaction_date)} {new Date(r.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          {r.balance_due > 0 && (() => {
                            const childSum = (paymentMap[r.id] ?? []).reduce((s, p) => s + p.amount, 0)
                            const initialPaid = (r.amount_paid ?? 0) - childSum
                            return (
                              <>
                                {initialPaid > 0 && (
                                  <span className="block h-5 leading-5 text-xs text-green-700">
                                    {new Date(r.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(r.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                )}
                                {(paymentMap[r.id] ?? []).map((p, i) => (
                                  <span key={i} className="block h-5 leading-5 text-xs text-green-700">
                                    {new Date(p.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(p.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                ))}
                              </>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                        {!isStaff && (
                          <td className="px-4 py-3.5 text-xs text-ink-muted">
                            {r.issued_by_staff_id ? (Array.isArray(r.profiles) ? r.profiles[0]?.full_name : (r.profiles as any)?.full_name) ?? 'Staff' : <span className="text-ink-dim">Admin</span>}
                          </td>
                        )}
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/dashboard/receipts/${r.id}`} className="text-forest/70 text-xs font-medium hover:text-forest transition-colors">View</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm">
                <p className="text-ink-dim">{count} receipt{count !== 1 ? 's' : ''} total</p>
                <div className="flex gap-2">
                  {currentPage > 1 && (
                    <Link href={`/dashboard/receipts?${new URLSearchParams({ ...(search ? { q: search } : {}), ...(sort ? { sort } : {}), ...(activeGroup ? { group: activeGroup } : {}), page: String(currentPage - 1) })}`}
                      className="px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest transition-colors">
                      Previous
                    </Link>
                  )}
                  <span className="px-3 py-1.5 text-ink-dim">{currentPage} / {totalPages}</span>
                  {currentPage < totalPages && (
                    <Link href={`/dashboard/receipts?${new URLSearchParams({ ...(search ? { q: search } : {}), ...(sort ? { sort } : {}), ...(activeGroup ? { group: activeGroup } : {}), page: String(currentPage + 1) })}`}
                      className="px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest transition-colors">
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
