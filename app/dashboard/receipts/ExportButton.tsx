'use client'

import { useState } from 'react'
import { Download, FileText, Sheet } from 'lucide-react'

interface ReceiptRow {
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
  status: string
  payment_method: string
}

interface Expenditure {
  label: string
  amount: number
}

interface Props {
  allReceipts: ReceiptRow[]
  totalRevenue: number
  totalVat: number
  expenditures?: Expenditure[]
  receiptLabel?: string
  customerLabel?: string
}

export default function ExportButton({
  allReceipts, totalRevenue, totalVat, expenditures = [],
  receiptLabel = 'Receipt No.', customerLabel = 'Customer',
}: Props) {
  const [open, setOpen] = useState(false)

  const netRevenue = totalRevenue - totalVat
  const totalExpenditure = expenditures.reduce((s, e) => s + e.amount, 0)
  const balance = netRevenue - totalExpenditure

  const fmt = (n: number) =>
    '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })

  function downloadCSV() {
    const date = new Date().toISOString().slice(0, 10)
    const rows: string[][] = [
      ['RECEIPTS'],
      [receiptLabel, 'Type', customerLabel, 'Phone', 'Email', 'Amount (₦)', 'Paid (₦)', 'Balance Due (₦)', 'VAT (₦)', 'Date', 'Payment Method', 'Status'],
      ...allReceipts.map(r => [
        r.receipt_number,
        r.receipt_type ?? '',
        r.buyer_name,
        r.buyer_phone ?? '',
        r.buyer_email ?? '',
        Number(r.total_amount).toFixed(2),
        Number(r.amount_paid ?? 0).toFixed(2),
        Number(r.balance_due ?? 0).toFixed(2),
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
    setOpen(false)
  }

  function downloadPDF() {
    const date = new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })
    const receiptRows = allReceipts.map(r => `
      <tr>
        <td class="mono">${r.receipt_number}</td>
        <td class="cap">${r.receipt_type ?? ''}</td>
        <td>${r.buyer_name}</td>
        <td>${r.buyer_phone ?? '—'}</td>
        <td>${r.buyer_email ?? '—'}</td>
        <td class="right">${fmt(Number(r.total_amount))}</td>
        <td class="right green">${Number(r.amount_paid ?? 0) > 0 ? fmt(Number(r.amount_paid)) : '—'}</td>
        <td class="right ${Number(r.balance_due ?? 0) > 0 ? 'red' : ''}">${Number(r.balance_due ?? 0) > 0 ? fmt(Number(r.balance_due)) : '—'}</td>
        <td class="right dim">${Number(r.tax) > 0 ? fmt(Number(r.tax)) : '—'}</td>
        <td>${r.transaction_date}</td>
        <td>${r.payment_method}</td>
        <td class="cap">${r.status}</td>
      </tr>`).join('')

    const printContent = `<!DOCTYPE html><html><head><title>Receipts Export</title>
      <style>
        @page { size: A4 landscape; margin: 15mm 10mm; }
        body { font-family: Arial, sans-serif; color: #0f1f13; font-size: 9px; }
        h1 { font-size: 16px; margin-bottom: 2px; }
        h2 { font-size: 12px; margin: 20px 0 8px; color: #1a6b2f; }
        .sub { font-size: 9px; color: #4a6b55; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th { background: #f4faf6; text-align: left; padding: 5px 4px; font-size: 8px; color: #4a6b55; border-bottom: 2px solid #c8e6d0; white-space: nowrap; }
        td { padding: 5px 4px; border-bottom: 1px solid #e0ede5; vertical-align: top; word-break: break-word; }
        .right { text-align: right; white-space: nowrap; }
        .mono { font-family: monospace; font-size: 8px; color: #4a6b55; }
        .cap { text-transform: capitalize; }
        .green { color: #1a6b2f; }
        .red { color: #dc2626; }
        .dim { color: #4a6b55; }
        .summary td { padding: 7px 4px; font-size: 11px; }
        .summary td:last-child { text-align: right; font-weight: 600; }
        .summary-total { font-size: 12px; font-weight: bold; border-top: 2px solid #1a6b2f; }
      </style></head><body>
      <h1>Receipts Export</h1>
      <p class="sub">Generated on ${date} · ${allReceipts.length} receipt${allReceipts.length !== 1 ? 's' : ''}</p>
      <h2>All Receipts</h2>
      <table>
        <thead><tr>
          <th>${receiptLabel}</th><th>Type</th><th>${customerLabel}</th>
          <th>Phone</th><th>Email</th>
          <th class="right">Amount</th><th class="right">Paid</th>
          <th class="right">Balance</th><th class="right">VAT</th>
          <th>Date</th><th>Payment</th><th>Status</th>
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
      <script>window.onload = function(){ window.print(); }<\/script>
      </body></html>`

    // Use a hidden iframe so browser popup blockers don't interfere
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open(); doc.write(printContent); doc.close()
    setTimeout(() => { document.body.removeChild(iframe) }, 2000)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest bg-white transition-colors"
      >
        <Download size={15} />
        <span className="hidden sm:inline">Export</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden">
            <button type="button" onClick={downloadPDF} className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink hover:bg-surface transition-colors">
              <FileText size={14} className="text-ink-dim" />
              Download as PDF
            </button>
            <button type="button" onClick={downloadCSV} className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink hover:bg-surface transition-colors border-t border-border">
              <Sheet size={14} className="text-ink-dim" />
              Download as CSV
            </button>
          </div>
        </>
      )}
    </div>
  )
}
