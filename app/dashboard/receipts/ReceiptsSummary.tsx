'use client'

import { useState } from 'react'
import { Pencil, Check, Download, FileText, Sheet } from 'lucide-react'

interface Expenditure {
  id: string
  label: string
  amount: number
}

interface ReceiptRow {
  receipt_number: string
  buyer_name: string
  total_amount: number
  tax: number
  transaction_date: string
  status: string
  payment_method: string
}

interface Props {
  totalRevenue: number
  totalVat: number
  allReceipts: ReceiptRow[]
}

export default function ReceiptsSummary({ totalRevenue, totalVat, allReceipts }: Props) {
  const [expenditures, setExpenditures] = useState<Expenditure[]>([
    { id: '1', label: 'Expenditure', amount: 0 },
  ])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [showDownload, setShowDownload] = useState(false)

  const totalExpenditure = expenditures.reduce((s, e) => s + e.amount, 0)
  const netRevenue = totalRevenue - totalVat
  const balance = netRevenue - totalExpenditure

  const fmt = (n: number) =>
    '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })

  function startEdit(e: Expenditure) {
    setEditingId(e.id)
    setEditLabel(e.label)
    setEditAmount(String(e.amount))
  }

  function saveEdit(id: string) {
    setExpenditures(prev =>
      prev.map(e =>
        e.id === id
          ? { ...e, label: editLabel || e.label, amount: parseFloat(editAmount) || 0 }
          : e
      )
    )
    setEditingId(null)
  }

  function addExpenditure() {
    const id = Date.now().toString()
    setExpenditures(prev => [...prev, { id, label: 'New expenditure', amount: 0 }])
    setEditingId(id)
    setEditLabel('New expenditure')
    setEditAmount('0')
  }

  function removeExpenditure(id: string) {
    setExpenditures(prev => prev.filter(e => e.id !== id))
  }

  function downloadCSV() {
    const date = new Date().toISOString().slice(0, 10)
    const rows: string[][] = [
      ['RECEIPTS'],
      ['Receipt No.', 'Customer', 'Amount (₦)', 'VAT (₦)', 'Date', 'Payment Method', 'Status'],
      ...allReceipts.map(r => [
        r.receipt_number,
        r.buyer_name,
        Number(r.total_amount).toFixed(2),
        Number(r.tax).toFixed(2),
        r.transaction_date,
        r.payment_method,
        r.status,
      ]),
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
    a.href = url
    a.download = `receipts-export-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowDownload(false)
  }

  function downloadPDF() {
    const date = new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })
    const receiptRows = allReceipts.map(r => `
      <tr>
        <td class="mono">${r.receipt_number}</td>
        <td>${r.buyer_name}</td>
        <td class="right">${fmt(Number(r.total_amount))}</td>
        <td class="right red">${Number(r.tax) > 0 ? fmt(Number(r.tax)) : '—'}</td>
        <td>${r.transaction_date}</td>
        <td>${r.payment_method}</td>
      </tr>`).join('')

    const printContent = `
      <html><head><title>Receipts Export</title>
      <style>
        body { font-family: Georgia, serif; padding: 40px; color: #0f1f13; font-size: 13px; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; margin: 32px 0 12px; color: #1a6b2f; }
        .sub { font-size: 12px; color: #4a6b55; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th { background: #f4faf6; text-align: left; padding: 8px 6px; font-size: 11px; color: #4a6b55; border-bottom: 2px solid #c8e6d0; }
        td { padding: 8px 6px; border-bottom: 1px solid #e0ede5; }
        .right { text-align: right; }
        .mono { font-family: monospace; font-size: 11px; color: #4a6b55; }
        .summary td { padding: 10px 4px; font-size: 14px; }
        .summary td:last-child { text-align: right; font-weight: 600; }
        .summary-total { font-size: 15px; font-weight: bold; border-top: 2px solid #1a6b2f; }
        .green { color: #1a6b2f; }
        .red { color: #dc2626; }
      </style></head><body>
      <h1>Receipts Export</h1>
      <p class="sub">Generated on ${date} · ${allReceipts.length} receipt${allReceipts.length !== 1 ? 's' : ''}</p>

      <h2>All Receipts</h2>
      <table>
        <thead><tr>
          <th>Receipt No.</th><th>Customer</th><th class="right">Amount</th>
          <th class="right">VAT</th><th>Date</th><th>Payment</th>
        </tr></thead>
        <tbody>${receiptRows}</tbody>
      </table>

      <h2>Financial Summary</h2>
      <table class="summary">
        <tr><td>Total Revenue Generated</td><td>${fmt(totalRevenue)}</td></tr>
        <tr><td style="color:#4a6b55">VAT Removed</td><td class="red">− ${fmt(totalVat)}</td></tr>
        <tr><td><strong>Revenue after VAT</strong></td><td><strong>${fmt(netRevenue)}</strong></td></tr>
        ${expenditures.map(e => `<tr><td style="color:#4a6b55">${e.label}</td><td class="red">− ${fmt(e.amount)}</td></tr>`).join('')}
        <tr class="summary-total"><td>Total Balance</td><td class="${balance < 0 ? 'red' : 'green'}">${balance < 0 ? '− ' : ''}${fmt(balance)}</td></tr>
      </table>
      </body></html>
    `
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(printContent)
    win.document.close()
    win.focus()
    win.print()
    setShowDownload(false)
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base text-ink">Financial Summary</h2>
          <p className="text-xs text-ink-dim mt-0.5">Based on all active receipts</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDownload(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest bg-white transition-colors"
          >
            <Download size={13} />
            Export
          </button>
          {showDownload && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-border rounded-xl shadow-lg z-10 overflow-hidden">
              <button onClick={downloadPDF} className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink hover:bg-surface transition-colors">
                <FileText size={14} className="text-ink-dim" />
                Download as PDF
              </button>
              <button onClick={downloadCSV} className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink hover:bg-surface transition-colors border-t border-border">
                <Sheet size={14} className="text-ink-dim" />
                Download as CSV
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        {/* Total Revenue */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-sm text-ink-muted">Total Revenue Generated</span>
          <span className="text-sm font-semibold text-ink">{fmt(totalRevenue)}</span>
        </div>

        {/* VAT Removed */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-sm text-ink-muted">VAT Removed</span>
          <span className="text-sm font-semibold text-danger">− {fmt(totalVat)}</span>
        </div>

        {/* Revenue after VAT */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-surface/50">
          <span className="text-sm text-ink font-medium">Revenue after VAT</span>
          <span className="text-sm font-semibold text-ink">{fmt(netRevenue)}</span>
        </div>

        {/* Expenditures */}
        {expenditures.map(e => (
          <div key={e.id} className="flex items-center justify-between px-5 py-3 gap-3">
            {editingId === e.id ? (
              <>
                <input
                  value={editLabel}
                  onChange={ev => setEditLabel(ev.target.value)}
                  className="flex-1 text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-forest/60 text-ink"
                  placeholder="Label"
                />
                <input
                  type="number"
                  value={editAmount}
                  onChange={ev => setEditAmount(ev.target.value)}
                  className="w-32 text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-forest/60 text-right text-ink"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <button onClick={() => saveEdit(e.id)} className="p-1.5 rounded-lg bg-forest text-white hover:bg-forest-bright transition-colors">
                  <Check size={13} />
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-ink-muted flex-1">{e.label}</span>
                <span className="text-sm font-semibold text-warning">− {fmt(e.amount)}</span>
                <button onClick={() => startEdit(e)} className="p-1.5 rounded-lg text-ink-dim hover:text-forest hover:bg-surface transition-colors">
                  <Pencil size={13} />
                </button>
                {expenditures.length > 1 && (
                  <button onClick={() => removeExpenditure(e.id)} className="text-xs text-ink-dim hover:text-danger transition-colors px-1">✕</button>
                )}
              </>
            )}
          </div>
        ))}

        {/* Add expenditure */}
        <div className="px-5 py-2.5">
          <button onClick={addExpenditure} className="text-xs text-forest/70 hover:text-forest font-medium transition-colors">
            + Add expenditure
          </button>
        </div>

        {/* Total Balance */}
        <div className="flex items-center justify-between px-5 py-4 bg-surface">
          <span className="text-sm font-bold text-ink">Total Balance</span>
          <span className={`text-base font-bold font-heading ${balance < 0 ? 'text-danger' : 'text-forest'}`}>
            {balance < 0 ? '− ' : ''}{fmt(balance)}
          </span>
        </div>
      </div>
    </div>
  )
}
