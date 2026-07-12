import { createAdminClient } from '@/lib/supabase/admin'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })
const fmtDT = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
  new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })

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

  // Receipts in scope (owner + profile + group)
  let q = db.from('receipts')
    .select('id, receipt_number, buyer_name, total_amount, amount_paid, balance_due, tax, transaction_date, created_at')
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

  // Descriptions, child payments, paid installments
  const [{ data: items }, { data: children }, { data: insts }] = await Promise.all([
    ids.length ? db.from('receipt_items').select('receipt_id, description, sort_order').in('receipt_id', ids).order('sort_order', { ascending: true }) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from('receipts').select('parent_receipt_id, total_amount, created_at').in('parent_receipt_id', ids).order('created_at', { ascending: true }) : Promise.resolve({ data: [] as any[] }),
    ids.length ? db.from('installment_schedules').select('receipt_id, amount, paid_at').in('receipt_id', ids).not('paid_at', 'is', null) : Promise.resolve({ data: [] as any[] }),
  ])
  const descMap: Record<string, string> = {}
  for (const it of (items ?? [])) { const d = String(it.description ?? '').trim(); if (d) descMap[it.receipt_id] = descMap[it.receipt_id] ? `${descMap[it.receipt_id]}, ${d}` : d }
  const payMap: Record<string, number[]> = {}
  for (const c of (children ?? [])) { (payMap[c.parent_receipt_id] ??= []).push(Number(c.total_amount)) }
  const instMap: Record<string, number[]> = {}
  for (const i of (insts ?? [])) { (instMap[i.receipt_id] ??= []).push(Number(i.amount)) }

  // Financial summary
  const totalRevenue = receipts.reduce((s, r) => s + Number(r.total_amount || 0), 0)
  const totalVat = receipts.reduce((s, r) => s + Number(r.tax || 0), 0)
  const netRevenue = totalRevenue - totalVat
  const { data: exps } = await db.from('user_expenditures').select('label, value, type').eq('user_id', shared.user_id)
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

  return (
    <main className="min-h-screen bg-gray-100 py-6">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div className="mx-auto max-w-4xl bg-white p-6 shadow print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b pb-3">
          <div>
            <h1 className="text-xl font-bold text-[#0f1f13]">{title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">Receipts export · {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} · Shared via DigitalReceipt.ng</p>
          </div>
          <PrintButton />
        </div>

        <table className="w-full mt-4 text-xs border-collapse">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 border-b-2 border-green-100">Receipt No.</th>
              <th className="py-2 border-b-2 border-green-100">Customer</th>
              <th className="py-2 border-b-2 border-green-100">Description</th>
              <th className="py-2 border-b-2 border-green-100 text-right">Amount</th>
              <th className="py-2 border-b-2 border-green-100">Date</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map(r => {
              const childSum = (payMap[r.id] ?? []).reduce((s, a) => s + a, 0)
              const instSum = (instMap[r.id] ?? []).reduce((s, a) => s + a, 0)
              const initialPaid = Number(r.amount_paid ?? 0) - childSum - instSum
              return (
                <tr key={r.id} className="align-top">
                  <td className="py-2 border-b border-gray-100 font-mono text-gray-600">{r.receipt_number}</td>
                  <td className="py-2 border-b border-gray-100">{r.buyer_name}</td>
                  <td className="py-2 border-b border-gray-100 text-gray-500">{descMap[r.id] ?? '—'}</td>
                  <td className="py-2 border-b border-gray-100 text-right">
                    <div className="font-semibold">{fmt(Number(r.total_amount))}</div>
                    {initialPaid > 0 && <div className="text-green-700">{fmt(initialPaid)} paid</div>}
                    {(instMap[r.id] ?? []).map((a, i) => <div key={'i' + i} className="text-green-700">{fmt(a)} paid</div>)}
                    {(payMap[r.id] ?? []).map((a, i) => <div key={'p' + i} className="text-green-700">{fmt(a)} paid</div>)}
                    {r.balance_due > 0
                      ? <div className="text-amber-700 font-semibold">{fmt(r.balance_due)} due</div>
                      : <div className="text-green-700 font-semibold">Fully paid</div>}
                  </td>
                  <td className="py-2 border-b border-gray-100 text-gray-600">{fmtDT(r.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

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
