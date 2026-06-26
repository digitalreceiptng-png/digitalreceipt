'use client'

import { useState } from 'react'
import { Download, FileText, Sheet } from 'lucide-react'

interface ReceiptRow {
  id: string
  receipt_number: string
  receipt_type?: string
  buyer_name: string
  buyer_phone?: string
  buyer_email?: string
  total_amount: number
  amount_paid?: number
  balance_due?: number
  tax: number
  transaction_date: string
  created_at: string
  status: string
  payment_method: string
  issued_by_staff_id?: string | null
  seller_name?: string
}

interface PaymentEntry { amount: number; created_at: string }
interface Expenditure { label: string; amount: number }

interface InstInfo { paidCount: number; total: number; hasOverdue: boolean }

interface Props {
  allReceipts: ReceiptRow[]
  paymentMap: Record<string, PaymentEntry[]>
  instMap?: Record<string, InstInfo>
  totalRevenue: number
  totalVat: number
  expenditures?: Expenditure[]
  receiptLabel?: string
  customerLabel?: string
  ownerDisplayName?: string
  staffNameMap?: Record<string, string>
}

const ALL_COLUMNS = [
  { key: 'receipt_number',  label: (rl: string) => rl },
  { key: 'buyer_name',      label: (_rl: string, cl: string) => cl },
  { key: 'buyer_phone',     label: () => 'Phone' },
  { key: 'buyer_email',     label: () => 'Email' },
  { key: 'amount',          label: () => 'Amount / Payments' },
  { key: 'date',            label: () => 'Date & Time' },
  { key: 'transaction_date',label: () => 'Txn Date' },
  { key: 'payment_method',  label: () => 'Payment Method' },
  { key: 'tax',             label: () => 'VAT' },
  { key: 'status',          label: () => 'Status' },
  { key: 'installments',    label: () => 'Installments' },
  { key: 'issued_by',       label: () => 'Issued By' },
] as const

type ColKey = typeof ALL_COLUMNS[number]['key']

const DEFAULT_COLS: ColKey[] = ['receipt_number', 'buyer_name', 'amount', 'date', 'transaction_date', 'payment_method', 'status', 'installments']

export default function ExportButton({
  allReceipts, paymentMap, instMap = {}, totalRevenue, totalVat, expenditures = [],
  receiptLabel = 'Receipt No.', customerLabel = 'Customer',
  ownerDisplayName = 'Admin', staffNameMap = {},
}: Props) {
  const [open, setOpen] = useState(false)
  const [selectedCols, setSelectedCols] = useState<ColKey[]>(DEFAULT_COLS)

  const netRevenue = totalRevenue - totalVat
  const totalExpenditure = expenditures.reduce((s, e) => s + e.amount, 0)
  const balance = netRevenue - totalExpenditure

  const fmt = (n: number) => '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })
  const fmtDT = (iso: string) =>
    new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })

  function toggleCol(key: ColKey) {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  function colLabel(col: typeof ALL_COLUMNS[number]) {
    return col.label(receiptLabel, customerLabel)
  }

  function getPayments(r: ReceiptRow) {
    const children = paymentMap[r.id] ?? []
    const childSum = children.reduce((s, p) => s + p.amount, 0)
    const initialPaid = (r.amount_paid ?? 0) - childSum
    return { initialPaid, children, balanceDue: r.balance_due ?? 0 }
  }

  function getCellValue(r: ReceiptRow, key: ColKey): string {
    const { initialPaid, children, balanceDue } = getPayments(r)
    const inst = instMap[r.id]
    switch (key) {
      case 'receipt_number': return r.receipt_number
      case 'buyer_name': return r.buyer_name
      case 'buyer_phone': return r.buyer_phone ?? ''
      case 'buyer_email': return r.buyer_email ?? ''
      case 'tax': return Number(r.tax) > 0 ? Number(r.tax).toFixed(2) : ''
      case 'transaction_date': return r.transaction_date
      case 'payment_method': return r.payment_method
      case 'issued_by': return r.issued_by_staff_id ? (staffNameMap[r.issued_by_staff_id] ?? 'Staff') : ownerDisplayName
      case 'status': return r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Active'
      case 'installments': {
        if (!inst || inst.total === 0) return ''
        const tag = inst.paidCount === inst.total ? 'Completed' : inst.hasOverdue ? 'OVERDUE' : 'In Progress'
        return `${inst.paidCount}/${inst.total} Paid — ${tag}`
      }
      case 'amount': {
        const parts: string[] = [`Total: ${Number(r.total_amount).toFixed(2)}`]
        if (balanceDue > 0) {
          if (initialPaid > 0) parts.push(`${initialPaid.toFixed(2)} paid`)
          children.forEach(p => parts.push(`${p.amount.toFixed(2)} paid`))
          parts.push(`${balanceDue.toFixed(2)} due`)
        } else {
          parts.push(`${Number(r.amount_paid ?? 0).toFixed(2)} paid`)
        }
        return parts.join(' | ')
      }
      case 'date': {
        const parts: string[] = [fmtDT(r.created_at)]
        if (balanceDue > 0) {
          if (initialPaid > 0) parts.push(fmtDT(r.created_at))
          children.forEach(p => parts.push(fmtDT(p.created_at)))
        }
        return parts.join(' | ')
      }
    }
  }

  function downloadCSV() {
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key))
    const date = new Date().toISOString().slice(0, 10)
    const rows: string[][] = [
      ['RECEIPTS'],
      cols.map(c => colLabel(c)),
      ...allReceipts.map(r => cols.map(c => getCellValue(r, c.key))),
      [],
      ['FINANCIAL SUMMARY'],
      ['Total Revenue Generated', totalRevenue.toFixed(2)],
      ['VAT Removed', (-totalVat).toFixed(2)],
      ['Revenue after VAT', netRevenue.toFixed(2)],
      ...expenditures.map(e => [e.label, (-e.amount).toFixed(2)]),
      ['Total Balance', balance.toFixed(2)],
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `receipts-export-${date}.csv`; a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  function downloadPDF() {
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key))
    const date = new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })

    const headers = cols.map(c => `<th${c.key === 'amount' ? ' class="right"' : ''}>${colLabel(c)}</th>`).join('')

    const receiptRows = allReceipts.map(r => {
      const { initialPaid, children, balanceDue } = getPayments(r)
      const inst = instMap[r.id]
      const isOverdue = inst?.hasOverdue
      const isCancelled = r.status === 'cancelled'
      const rowClass = isOverdue ? ' class="row-overdue"' : isCancelled ? ' class="row-cancelled"' : ''

      const cells = cols.map(c => {
        if (c.key === 'amount') {
          let html = `<div class="amt-total">${fmt(Number(r.total_amount))}</div>`
          if (balanceDue > 0) {
            if (initialPaid > 0) html += `<div class="amt-paid">${fmt(initialPaid)} paid</div>`
            children.forEach(p => { html += `<div class="amt-paid">${fmt(p.amount)} paid</div>` })
            html += `<div class="amt-due">${fmt(balanceDue)} due</div>`
          } else {
            html += `<div class="amt-paid">${fmt(Number(r.amount_paid ?? 0))} paid</div>`
          }
          return `<td class="right">${html}</td>`
        }
        if (c.key === 'date') {
          let html = `<div class="dt">${fmtDT(r.created_at)}</div>`
          if (balanceDue > 0) {
            if (initialPaid > 0) html += `<div class="dt-paid">${fmtDT(r.created_at)}</div>`
            children.forEach(p => { html += `<div class="dt-paid">${fmtDT(p.created_at)}</div>` })
          }
          return `<td>${html}</td>`
        }
        if (c.key === 'status') {
          const s = r.status ?? 'active'
          const cls = s === 'cancelled' ? 'badge-red' : s === 'expired' ? 'badge-gray' : 'badge-green'
          const label = s.charAt(0).toUpperCase() + s.slice(1)
          return `<td><span class="badge ${cls}">${label}</span></td>`
        }
        if (c.key === 'installments') {
          if (!inst || inst.total === 0) return `<td></td>`
          const cls = inst.paidCount === inst.total ? 'badge-green' : isOverdue ? 'badge-red' : 'badge-blue'
          const label = `${inst.paidCount}/${inst.total} Paid`
          const sub = inst.paidCount === inst.total ? 'Completed' : isOverdue ? 'OVERDUE' : 'In Progress'
          return `<td><span class="badge ${cls}">${label}</span><div class="inst-sub ${isOverdue ? 'inst-overdue' : ''}">${sub}</div></td>`
        }
        if (c.key === 'buyer_name') {
          return `<td>${r.buyer_name}</td>`
        }
        return `<td>${getCellValue(r, c.key)}</td>`
      }).join('')

      return `<tr${rowClass}>${cells}</tr>`
    }).join('')

    const printContent = `<!DOCTYPE html><html><head><title>Receipts Export</title>
      <style>
        @page { size: A4 landscape; margin: 12mm 10mm; }
        body { font-family: Arial, sans-serif; color: #0f1f13; font-size: 9px; }
        h1 { font-size: 15px; margin-bottom: 2px; }
        h2 { font-size: 11px; margin: 18px 0 7px; color: #1a6b2f; }
        .sub { font-size: 8px; color: #4a6b55; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f4faf6; text-align: left; padding: 5px 4px; font-size: 8px; color: #4a6b55; border-bottom: 2px solid #c8e6d0; white-space: nowrap; }
        th.right { text-align: right; }
        td { padding: 5px 4px; border-bottom: 1px solid #e0ede5; vertical-align: top; }
        .right { text-align: right; }
        .right div { text-align: right; }
        .amt-total { font-weight: 600; white-space: nowrap; }
        .amt-paid { color: #1a6b2f; font-size: 8px; white-space: nowrap; line-height: 1.6; }
        .amt-due  { color: #92400e; font-weight: 600; font-size: 8px; white-space: nowrap; line-height: 1.6; }
        .dt { font-size: 8px; white-space: nowrap; }
        .dt-paid { font-size: 8px; color: #1a6b2f; white-space: nowrap; line-height: 1.6; }
        .row-overdue   { background: #fff1f2 !important; }
        .row-cancelled { background: #fff7ed !important; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 20px; font-size: 7px; font-weight: 700; white-space: nowrap; border: 1px solid; }
        .badge-green { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
        .badge-red   { background: #fff1f2; color: #991b1b; border-color: #fecaca; }
        .badge-blue  { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
        .badge-gray  { background: #f3f4f6; color: #374151; border-color: #d1d5db; }
        .inst-sub    { font-size: 7px; color: #6b7280; margin-top: 2px; }
        .inst-overdue { color: #dc2626; font-weight: 700; }
        .summary td { padding: 6px 4px; font-size: 10px; }
        .summary td:last-child { text-align: right; font-weight: 600; }
        .summary-total { font-size: 11px; font-weight: bold; border-top: 2px solid #1a6b2f; }
        .green { color: #1a6b2f; } .red { color: #dc2626; }
      </style></head><body>
      <h1>Receipts Export</h1>
      <p class="sub">Generated on ${date} · ${allReceipts.length} receipt${allReceipts.length !== 1 ? 's' : ''}</p>
      <h2>All Receipts</h2>
      <table><thead><tr>${headers}</tr></thead><tbody>${receiptRows}</tbody></table>
      <h2>Financial Summary</h2>
      <table class="summary">
        <tr><td>Total Revenue Generated</td><td>${fmt(totalRevenue)}</td></tr>
        <tr><td class="dim">VAT Removed</td><td class="red">− ${fmt(totalVat)}</td></tr>
        <tr><td><strong>Revenue after VAT</strong></td><td><strong>${fmt(netRevenue)}</strong></td></tr>
        ${expenditures.map(e => `<tr><td>${e.label}</td><td class="red">− ${fmt(e.amount)}</td></tr>`).join('')}
        <tr class="summary-total"><td>Total Balance</td><td class="${balance < 0 ? 'red' : 'green'}">${balance < 0 ? '− ' : ''}${fmt(balance)}</td></tr>
      </table>
      <script>window.onload = function(){ window.print(); }<\/script>
      </body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open(); doc.write(printContent); doc.close()
    setTimeout(() => document.body.removeChild(iframe), 3000)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest bg-white transition-colors"
      >
        <Download size={15} />
        <span className="hidden sm:inline">Export</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden">
            {/* Column picker */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-ink mb-2">Select columns to include</p>
              <div className="space-y-1.5">
                {ALL_COLUMNS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedCols.includes(col.key)}
                      onChange={() => toggleCol(col.key)}
                      className="accent-forest w-3.5 h-3.5"
                    />
                    <span className="text-xs text-ink">{colLabel(col)}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Download buttons */}
            <button type="button" onClick={downloadPDF} disabled={selectedCols.length === 0} className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink hover:bg-surface transition-colors disabled:opacity-40">
              <FileText size={14} className="text-ink-dim" />
              Download as PDF
            </button>
            <button type="button" onClick={downloadCSV} disabled={selectedCols.length === 0} className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink hover:bg-surface transition-colors border-t border-border disabled:opacity-40">
              <Sheet size={14} className="text-ink-dim" />
              Download as CSV
            </button>
          </div>
        </>
      )}
    </div>
  )
}
