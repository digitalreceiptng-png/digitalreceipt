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
}

interface PaymentEntry { amount: number; created_at: string }

interface Expenditure {
  label: string
  amount: number
}

interface Props {
  allReceipts: ReceiptRow[]
  paymentMap: Record<string, PaymentEntry[]>
  totalRevenue: number
  totalVat: number
  expenditures?: Expenditure[]
  receiptLabel?: string
  customerLabel?: string
}

export default function ExportButton({
  allReceipts, paymentMap, totalRevenue, totalVat, expenditures = [],
  receiptLabel = 'Receipt No.', customerLabel = 'Customer',
}: Props) {
  const [open, setOpen] = useState(false)

  const netRevenue = totalRevenue - totalVat
  const totalExpenditure = expenditures.reduce((s, e) => s + e.amount, 0)
  const balance = netRevenue - totalExpenditure

  const fmt = (n: number) =>
    '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })

  function getPayments(r: ReceiptRow) {
    const children = paymentMap[r.id] ?? []
    const childSum = children.reduce((s, p) => s + p.amount, 0)
    const initialPaid = (r.amount_paid ?? 0) - childSum
    return { initialPaid, children, balanceDue: r.balance_due ?? 0 }
  }

  function downloadCSV() {
    const date = new Date().toISOString().slice(0, 10)
    const rows: string[][] = [
      ['RECEIPTS'],
      [receiptLabel, customerLabel, 'Phone', 'Email', 'Total Amount (₦)', 'Payment', 'Payment Date', 'Balance Due (₦)', 'VAT (₦)', 'Date', 'Payment Method'],
    ]

    for (const r of allReceipts) {
      const { initialPaid, children, balanceDue } = getPayments(r)
      const baseRow = [
        r.receipt_number,
        r.buyer_name,
        r.buyer_phone ?? '',
        r.buyer_email ?? '',
        Number(r.total_amount).toFixed(2),
      ]

      if (balanceDue > 0) {
        // First row: initial payment
        if (initialPaid > 0) {
          rows.push([...baseRow, `${initialPaid.toFixed(2)} paid`, fmtDate(r.created_at), balanceDue.toFixed(2), Number(r.tax).toFixed(2), r.transaction_date, r.payment_method])
        } else {
          rows.push([...baseRow, '', '', balanceDue.toFixed(2), Number(r.tax).toFixed(2), r.transaction_date, r.payment_method])
        }
        // Subsequent payments (continuation rows — blank the repeated fields)
        for (const p of children) {
          rows.push(['', '', '', '', '', `${p.amount.toFixed(2)} paid`, fmtDate(p.created_at), '', '', '', ''])
        }
      } else {
        // Fully paid — single row
        rows.push([...baseRow, Number(r.amount_paid ?? 0).toFixed(2), fmtDate(r.created_at), '0.00', Number(r.tax).toFixed(2), r.transaction_date, r.payment_method])
      }
    }

    rows.push([], ['FINANCIAL SUMMARY'])
    rows.push(['Total Revenue Generated', totalRevenue.toFixed(2)])
    rows.push(['VAT Removed', (-totalVat).toFixed(2)])
    rows.push(['Revenue after VAT', netRevenue.toFixed(2)])
    for (const e of expenditures) rows.push([e.label, (-e.amount).toFixed(2)])
    rows.push(['Total Balance', balance.toFixed(2)])

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `receipts-export-${date}.csv`; a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  function downloadPDF() {
    const date = new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })

    const receiptRows = allReceipts.map(r => {
      const { initialPaid, children, balanceDue } = getPayments(r)

      let amountCell = `<div class="amt-total">${fmt(Number(r.total_amount))}</div>`
      let dateCell = `<div class="dt">${fmtDate(r.created_at)}</div>`

      if (balanceDue > 0) {
        if (initialPaid > 0) {
          amountCell += `<div class="amt-paid">${fmt(initialPaid)} paid</div>`
          dateCell += `<div class="dt-paid">${fmtDate(r.created_at)}</div>`
        }
        for (const p of children) {
          amountCell += `<div class="amt-paid">${fmt(p.amount)} paid</div>`
          dateCell += `<div class="dt-paid">${fmtDate(p.created_at)}</div>`
        }
        amountCell += `<div class="amt-due">${fmt(balanceDue)} due</div>`
      } else {
        amountCell += `<div class="amt-paid">${fmt(Number(r.amount_paid ?? 0))} paid</div>`
        dateCell += `<div class="dt-paid">${fmtDate(r.created_at)}</div>`
      }

      return `<tr>
        <td class="mono">${r.receipt_number}</td>
        <td>${r.buyer_name}</td>
        <td>${r.buyer_phone ?? '—'}</td>
        <td>${r.buyer_email ?? '—'}</td>
        <td class="right">${amountCell}</td>
        <td>${dateCell}</td>
        <td class="dim">${Number(r.tax) > 0 ? fmt(Number(r.tax)) : '—'}</td>
        <td>${r.transaction_date}</td>
        <td>${r.payment_method}</td>
      </tr>`
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
        td { padding: 5px 4px; border-bottom: 1px solid #e0ede5; vertical-align: top; }
        .right { text-align: right; }
        .mono { font-family: monospace; font-size: 8px; color: #4a6b55; }
        .dim { color: #4a6b55; }
        .amt-total { font-weight: 600; white-space: nowrap; }
        .amt-paid { color: #1a6b2f; font-size: 8px; white-space: nowrap; line-height: 1.6; }
        .amt-due  { color: #92400e; font-weight: 600; font-size: 8px; white-space: nowrap; line-height: 1.6; }
        .dt { font-size: 8px; white-space: nowrap; }
        .dt-paid { font-size: 8px; color: #1a6b2f; white-space: nowrap; line-height: 1.6; }
        .summary td { padding: 6px 4px; font-size: 10px; }
        .summary td:last-child { text-align: right; font-weight: 600; }
        .summary-total { font-size: 11px; font-weight: bold; border-top: 2px solid #1a6b2f; }
        .green { color: #1a6b2f; }
        .red { color: #dc2626; }
      </style></head><body>
      <h1>Receipts Export</h1>
      <p class="sub">Generated on ${date} · ${allReceipts.length} receipt${allReceipts.length !== 1 ? 's' : ''}</p>
      <h2>All Receipts</h2>
      <table>
        <thead><tr>
          <th>${receiptLabel}</th>
          <th>${customerLabel}</th>
          <th>Phone</th>
          <th>Email</th>
          <th class="right">Amount / Payments</th>
          <th>Date &amp; Time</th>
          <th>VAT</th>
          <th>Txn Date</th>
          <th>Payment Method</th>
        </tr></thead>
        <tbody>${receiptRows}</tbody>
      </table>
      <h2>Financial Summary</h2>
      <table class="summary">
        <tr><td>Total Revenue Generated</td><td>${fmt(totalRevenue)}</td></tr>
        <tr><td class="dim">VAT Removed</td><td class="red">− ${fmt(totalVat)}</td></tr>
        <tr><td><strong>Revenue after VAT</strong></td><td><strong>${fmt(netRevenue)}</strong></td></tr>
        ${expenditures.map(e => `<tr><td class="dim">${e.label}</td><td class="red">− ${fmt(e.amount)}</td></tr>`).join('')}
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
    setTimeout(() => { document.body.removeChild(iframe) }, 3000)
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
