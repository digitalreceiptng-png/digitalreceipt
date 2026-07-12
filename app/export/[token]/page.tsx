import { createAdminClient } from '@/lib/supabase/admin'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })
const fmtDT = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
  new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })
const fmtDate = (v: string) =>
  v ? new Date(v).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Canonical column order + labels — mirrors the export column picker in ExportButton.
const COL_ORDER = [
  'receipt_number', 'buyer_name', 'description', 'buyer_phone', 'buyer_email',
  'amount', 'date', 'transaction_date', 'payment_method', 'tax', 'installments', 'issued_by',
] as const
type ColKey = typeof COL_ORDER[number]
const COL_LABEL: Record<ColKey, string> = {
  receipt_number: 'Receipt No.',
  buyer_name: 'Customer',
  description: 'Description',
  buyer_phone: 'Phone',
  buyer_email: 'Email',
  amount: 'Amount',
  date: 'Date & Time',
  transaction_date: 'Txn Date',
  payment_method: 'Payment Method',
  tax: 'VAT',
  installments: 'Installments',
  issued_by: 'Issued By',
}
const DEFAULT_COLS: ColKey[] = ['receipt_number', 'buyer_name', 'description', 'amount', 'date', 'transaction_date', 'payment_method', 'installments']

export default async function SharedExportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = createAdminClient()

  const { data: shared } = await db.from('shared_exports').select('*').eq('token', token).maybeSingle()

  if (!shared || shared.revoked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-800">This link is no longer available</h1>
          <p className="mt-2 text-sm text-gray-500">The owner has ended this shared export, or the link is invalid.</p>
        </div>
      </main>
    )
  }

  // Which columns to show — exactly what the owner ticked when generating the link.
  const savedCols: string[] = Array.isArray(shared.columns) && shared.columns.length ? shared.columns : DEFAULT_COLS
  const cols: ColKey[] = COL_ORDER.filter(k => savedCols.includes(k))
  const has = (k: ColKey) => cols.includes(k)
  // Header titles as they appeared in the export (owner may have renamed e.g. "Receipt No.").
  const savedLabels: Record<string, string> = (shared.labels && typeof shared.labels === 'object') ? shared.labels : {}
  const labelFor = (k: ColKey) => savedLabels[k] || COL_LABEL[k]

  // Receipts in scope (owner + profile + group)
  let q = db.from('receipts')
    .select('id, receipt_number, buyer_name, buyer_phone, buyer_email, total_amount, amount_paid, balance_due, tax, transaction_date, created_at, payment_method, status, issued_by_staff_id')
    .eq('user_id', shared.user_id)
    .eq('status', 'active')
    .is('parent_receipt_id', null)
    .order('transaction_date', { ascending: false })
  if (shared.sub_account_id) q = q.eq('sub_account_id', shared.sub_account_id)
  else q = q.is('sub_account_id', null)
  if (shared.group_id) q = q.eq('group_id', shared.group_id)
  const { data: receiptsData } = await q
  const receipts = receiptsData ?? []
  const ids = receipts.map(r => r.id)

  // Descriptions, child payments, installments
  const [{ data: items }, { data: children }, { data: insts }] = await Promise.all([
    ids.length ? db.from('receipt_items').select('receipt_id, description, sort_order').in('receipt_id', ids).order('sort_order', { ascending: true }) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from('receipts').select('parent_receipt_id, total_amount, created_at').in('parent_receipt_id', ids).order('created_at', { ascending: true }) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from('installment_schedules').select('receipt_id, amount, paid_at, due_date').in('receipt_id', ids) : Promise.resolve({ data: [] as any[] }),
  ])

  const descMap: Record<string, string> = {}
  for (const it of (items ?? [])) { const d = String(it.description ?? '').trim(); if (d) descMap[it.receipt_id] = descMap[it.receipt_id] ? `${descMap[it.receipt_id]}, ${d}` : d }

  const payMap: Record<string, { amount: number; created_at: string }[]> = {}
  for (const c of (children ?? [])) { (payMap[c.parent_receipt_id] ??= []).push({ amount: Number(c.total_amount), created_at: c.created_at }) }

  // Paid installment amounts (for the amount breakdown) + status (paid/total/overdue) per receipt
  const instPaidMap: Record<string, { amount: number; created_at: string }[]> = {}
  const instStat: Record<string, { paid: number; total: number; overdue: boolean }> = {}
  const now = Date.now()
  for (const i of (insts ?? [])) {
    const s = (instStat[i.receipt_id] ??= { paid: 0, total: 0, overdue: false })
    s.total++
    if (i.paid_at) { s.paid++; (instPaidMap[i.receipt_id] ??= []).push({ amount: Number(i.amount), created_at: i.paid_at }) }
    else if (i.due_date && new Date(i.due_date).getTime() < now) s.overdue = true
  }
  for (const id in instPaidMap) instPaidMap[id].sort((a, b) => a.created_at.localeCompare(b.created_at))

  // Staff names (only if the Issued By column is shown)
  const staffNameMap: Record<string, string> = {}
  let ownerName = 'Admin'
  if (has('issued_by')) {
    const staffIds = [...new Set(receipts.map(r => r.issued_by_staff_id).filter(Boolean))] as string[]
    if (staffIds.length) {
      const { data: staffRows } = await db.from('staff_members').select('staff_id, display_name').eq('owner_id', shared.user_id).in('staff_id', staffIds)
      for (const s of (staffRows ?? [])) { if (s.display_name) staffNameMap[s.staff_id] = s.display_name }
    }
    const { data: op } = await db.from('profiles').select('issued_by_name').eq('id', shared.user_id).maybeSingle()
    ownerName = (op as any)?.issued_by_name || 'Admin'
  }

  // Financial summary
  const totalRevenue = receipts.reduce((s, r) => s + Number(r.total_amount || 0), 0)
  const totalVat = receipts.reduce((s, r) => s + Number(r.tax || 0), 0)
  const netRevenue = totalRevenue - totalVat
  // Expenditures for this link's group scope (General = group_id null).
  let expQ = db.from('user_expenditures').select('label, value, type').eq('user_id', shared.user_id)
  expQ = shared.group_id ? expQ.eq('group_id', shared.group_id) : expQ.is('group_id', null)
  const { data: exps } = await expQ
  const resolvedExps = (exps ?? [])
    .map(e => ({ label: e.label || 'Expenditure', amount: e.type === 'percent' ? (netRevenue * (Number(e.value) || 0)) / 100 : (Number(e.value) || 0) }))
    .filter(e => e.amount > 0)
  const balance = netRevenue - resolvedExps.reduce((s, e) => s + e.amount, 0)

  // Title
  let title = shared.title as string | null
  if (!title) {
    if (shared.sub_account_id) {
      const { data: sub } = await db.from('user_sub_accounts').select('business_name').eq('id', shared.sub_account_id).maybeSingle()
      title = sub?.business_name ?? null
    }
    if (!title) {
      const { data: p } = await db.from('profiles').select('business_name, full_name').eq('id', shared.user_id).maybeSingle()
      title = p?.business_name || p?.full_name || 'DigitalReceipt'
    }
  }

  const rightAligned = (k: ColKey) => k === 'amount' || k === 'tax'

  return (
    <main className="min-h-screen bg-gray-100 py-6">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div className="mx-auto max-w-5xl bg-white p-6 shadow print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b pb-3">
          <div>
            <h1 className="text-xl font-bold text-[#0f1f13]">{title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">Receipts export · {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} · Shared via DigitalReceipt.ng</p>
          </div>
          <PrintButton />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full mt-4 text-xs border-collapse">
            <thead>
              <tr className="text-left text-gray-500">
                {cols.map(k => (
                  <th key={k} className={`py-2 px-2 border-b-2 border-green-100 whitespace-nowrap ${rightAligned(k) ? 'text-right' : ''}`}>{labelFor(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receipts.map(r => {
                const childList = payMap[r.id] ?? []
                const instList = instPaidMap[r.id] ?? []
                const childSum = childList.reduce((s, a) => s + a.amount, 0)
                const instSum = instList.reduce((s, a) => s + a.amount, 0)
                const initialPaid = Number(r.amount_paid ?? 0) - childSum - instSum
                const st = instStat[r.id]
                return (
                  <tr key={r.id} className="align-top">
                    {cols.map(k => {
                      switch (k) {
                        case 'receipt_number':
                          return <td key={k} className="py-2 px-2 border-b border-gray-100 font-mono text-gray-600 whitespace-nowrap">{r.receipt_number}</td>
                        case 'buyer_name':
                          return <td key={k} className="py-2 px-2 border-b border-gray-100">{r.buyer_name}</td>
                        case 'description':
                          return <td key={k} className="py-2 px-2 border-b border-gray-100 text-gray-500">{descMap[r.id] ?? '—'}</td>
                        case 'buyer_phone':
                          return <td key={k} className="py-2 px-2 border-b border-gray-100 text-gray-600 whitespace-nowrap">{r.buyer_phone || '—'}</td>
                        case 'buyer_email':
                          return <td key={k} className="py-2 px-2 border-b border-gray-100 text-gray-600">{r.buyer_email || '—'}</td>
                        case 'payment_method':
                          return <td key={k} className="py-2 px-2 border-b border-gray-100 text-gray-600 whitespace-nowrap capitalize">{r.payment_method || '—'}</td>
                        case 'transaction_date':
                          return <td key={k} className="py-2 px-2 border-b border-gray-100 text-gray-600 whitespace-nowrap">{fmtDate(r.transaction_date)}</td>
                        case 'tax':
                          return <td key={k} className="py-2 px-2 border-b border-gray-100 text-right text-gray-600">{Number(r.tax) > 0 ? fmt(Number(r.tax)) : '—'}</td>
                        case 'issued_by':
                          return <td key={k} className="py-2 px-2 border-b border-gray-100 text-gray-600 whitespace-nowrap">{r.issued_by_staff_id ? (staffNameMap[r.issued_by_staff_id] ?? 'Staff') : ownerName}</td>
                        case 'installments':
                          return (
                            <td key={k} className="py-2 px-2 border-b border-gray-100 whitespace-nowrap">
                              {!st || st.total === 0 ? '—' : (
                                <>
                                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.paid === st.total ? 'bg-green-50 text-green-700 border-green-200' : st.overdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{st.paid}/{st.total} Paid</span>
                                  <div className={`text-[10px] mt-0.5 ${st.overdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>{st.paid === st.total ? 'Completed' : st.overdue ? 'OVERDUE' : 'In Progress'}</div>
                                </>
                              )}
                            </td>
                          )
                        case 'amount':
                          return (
                            <td key={k} className="py-2 px-2 border-b border-gray-100 text-right whitespace-nowrap">
                              <div className="font-semibold">{fmt(Number(r.total_amount))}</div>
                              {initialPaid > 0 && <div className="text-green-700">{fmt(initialPaid)} paid</div>}
                              {instList.map((p, i) => <div key={'i' + i} className="text-green-700">{fmt(p.amount)} paid</div>)}
                              {childList.map((p, i) => <div key={'p' + i} className="text-green-700">{fmt(p.amount)} paid</div>)}
                              {Number(r.balance_due) > 0
                                ? <div className="text-amber-700 font-semibold">{fmt(Number(r.balance_due))} due</div>
                                : <div className="text-green-700 font-semibold">Fully paid</div>}
                            </td>
                          )
                        case 'date':
                          return (
                            <td key={k} className="py-2 px-2 border-b border-gray-100 text-gray-600 whitespace-nowrap">
                              <div>{fmtDT(r.created_at)}</div>
                              {initialPaid > 0 && <div className="text-green-700">{fmtDT(r.created_at)}</div>}
                              {instList.map((p, i) => <div key={'i' + i} className="text-green-700">{fmtDT(p.created_at)}</div>)}
                              {childList.map((p, i) => <div key={'p' + i} className="text-green-700">{fmtDT(p.created_at)}</div>)}
                            </td>
                          )
                        default:
                          return <td key={k} className="py-2 px-2 border-b border-gray-100" />
                      }
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <h2 className="text-sm font-bold text-green-700 mt-6 mb-2">Financial Summary</h2>
        <table className="w-full text-xs">
          <tbody>
            <tr><td className="py-1">Total Revenue</td><td className="py-1 text-right">{fmt(totalRevenue)}</td></tr>
            <tr><td className="py-1 text-gray-500">VAT Removed</td><td className="py-1 text-right text-red-600">− {fmt(totalVat)}</td></tr>
            <tr><td className="py-1 font-semibold">Revenue after VAT</td><td className="py-1 text-right font-semibold">{fmt(netRevenue)}</td></tr>
            {resolvedExps.map((e, i) => <tr key={i}><td className="py-1">{e.label}</td><td className="py-1 text-right text-red-600">− {fmt(e.amount)}</td></tr>)}
            <tr className="border-t-2 border-green-600 font-bold"><td className="py-1.5">Total Balance</td><td className={`py-1.5 text-right ${balance < 0 ? 'text-red-600' : 'text-green-700'}`}>{balance < 0 ? '− ' : ''}{fmt(balance)}</td></tr>
          </tbody>
        </table>
      </div>
    </main>
  )
}
