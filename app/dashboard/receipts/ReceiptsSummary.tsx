'use client'

import { useState, useEffect } from 'react'
import { Pencil, Check } from 'lucide-react'

type EntryType = 'fixed' | 'percent'

interface Entry {
  id: string
  label: string
  value: number
  type: EntryType
}

interface Props {
  totalRevenue: number
  totalVat: number
}

export default function ReceiptsSummary({ totalRevenue, totalVat }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])

  // Load expenditures/taxes from the server so they sync across web + mobile.
  useEffect(() => {
    fetch('/api/expenditures')
      .then(r => (r.ok ? r.json() : { expenditures: [] }))
      .then(d => setEntries(Array.isArray(d.expenditures) ? d.expenditures : []))
      .catch(() => {})
  }, [])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editType, setEditType] = useState<EntryType>('fixed')

  const netRevenue = totalRevenue - totalVat

  const totalDeductions = entries.reduce((s, e) => {
    return s + (e.type === 'percent' ? (netRevenue * e.value) / 100 : e.value)
  }, 0)

  const balance = netRevenue - totalDeductions

  const fmt = (n: number) =>
    '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })

  function resolvedAmount(e: Entry) {
    return e.type === 'percent' ? (netRevenue * e.value) / 100 : e.value
  }

  function startEdit(e: Entry) {
    setEditingId(e.id)
    setEditLabel(e.label)
    setEditValue(String(e.value))
    setEditType(e.type)
  }

  function saveEdit(id: string) {
    const label = editLabel || 'Expenditure'
    const value = parseFloat(editValue) || 0
    const type = editType
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, label, value, type } : e)))
    setEditingId(null)
    fetch('/api/expenditures', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, label, value, type }),
    }).catch(() => {})
  }

  async function addEntry() {
    try {
      const res = await fetch('/api/expenditures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'New expenditure/tax', value: 0, type: 'fixed', sort_order: entries.length }),
      })
      if (!res.ok) return
      const { expenditure } = await res.json()
      setEntries(prev => [...prev, expenditure])
      startEdit(expenditure)
    } catch {}
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
    fetch(`/api/expenditures?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface">
        <h2 className="font-heading text-base text-ink">Financial Summary</h2>
        <p className="text-xs text-ink-dim mt-0.5">Based on all active receipts</p>
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
          <span className="text-sm font-semibold text-danger">− {fmt(totalRevenue - netRevenue)}</span>
        </div>

        {/* Revenue after VAT */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-surface/50">
          <span className="text-sm text-ink font-medium">Revenue after VAT</span>
          <span className="text-sm font-semibold text-ink">{fmt(netRevenue)}</span>
        </div>

        {/* Entries */}
        {entries.map(e => (
          <div key={e.id} className="flex items-center justify-between px-5 py-3 gap-2">
            {editingId === e.id ? (
              <>
                <input
                  value={editLabel}
                  onChange={ev => setEditLabel(ev.target.value)}
                  className="flex-1 text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-forest/60 text-ink min-w-0"
                  placeholder="Label"
                />
                {/* Toggle % / ₦ */}
                <button
                  onClick={() => setEditType(t => t === 'fixed' ? 'percent' : 'fixed')}
                  className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-forest-light transition-colors text-ink"
                >
                  {editType === 'percent' ? '%' : '₦'}
                </button>
                <input
                  type="number"
                  value={editValue}
                  onChange={ev => setEditValue(ev.target.value)}
                  className="w-24 text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-forest/60 text-right text-ink"
                  placeholder={editType === 'percent' ? '0' : '0.00'}
                  min="0"
                  step={editType === 'percent' ? '0.5' : '0.01'}
                />
                <button onClick={() => saveEdit(e.id)} className="p-1.5 rounded-lg bg-forest text-white hover:bg-forest-bright transition-colors shrink-0">
                  <Check size={13} />
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-ink-muted flex-1">{e.label}</span>
                <span className="text-xs text-ink-dim bg-surface border border-border rounded px-1.5 py-0.5 shrink-0">
                  {e.type === 'percent' ? `${e.value}%` : '₦'}
                </span>
                <span className="text-sm font-semibold text-warning shrink-0">− {fmt(resolvedAmount(e))}</span>
                <button onClick={() => startEdit(e)} className="p-1.5 rounded-lg text-ink-dim hover:text-forest hover:bg-surface transition-colors shrink-0">
                  <Pencil size={13} />
                </button>
                <button onClick={() => removeEntry(e.id)} className="text-xs text-ink-dim hover:text-danger transition-colors px-1 shrink-0">✕</button>
              </>
            )}
          </div>
        ))}

        {/* Add entry */}
        <div className="px-5 py-2.5">
          <button onClick={addEntry} className="text-xs text-forest/70 hover:text-forest font-medium transition-colors">
            + Add Expenditure/Tax
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
