'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Check, Trash2, Loader2, CheckCircle2, Bell, BellOff, Split } from 'lucide-react'

interface Installment {
  id: string
  receipt_id: string
  due_date: string
  amount: number
  label: string | null
  paid_at: string | null
  auto_remind: boolean
}

interface Props {
  receiptId: string
  balanceDue: number
  onClose: () => void
}

export default function InstallmentSchedule({ receiptId, balanceDue, onClose }: Props) {
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // New entry form
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newAutoRemind, setNewAutoRemind] = useState(false)
  const [togglingRemindId, setTogglingRemindId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Split payment form
  type SplitRow = { amount: string; date: string; time: string; label: string; autoRemind: boolean }
  const [showSplit, setShowSplit] = useState(false)
  const [splitRows, setSplitRows] = useState<SplitRow[]>([
    { amount: '', date: '', time: '', label: '', autoRemind: false },
    { amount: '', date: '', time: '', label: '', autoRemind: false },
  ])
  const [splitSaving, setSplitSaving] = useState(false)
  const [splitError, setSplitError] = useState('')
  const [sameMonthDay, setSameMonthDay] = useState(false)
  const [splitCount, setSplitCount] = useState('')

  useEffect(() => {
    fetch(`/api/installments?receiptId=${receiptId}`)
      .then(r => r.json())
      .then(d => setInstallments(d.installments ?? []))
      .finally(() => setLoading(false))
  }, [receiptId])

  async function addInstallment() {
    if (!newDate || !newAmount) { setError('Date and amount are required.'); return }
    setError('')
    setSaving(true)
    // Append WAT offset (+01:00) so Postgres stores the correct UTC time
    const dueDateTime = newTime ? `${newDate}T${newTime}:00+01:00` : `${newDate}T00:00:00+01:00`
    const res = await fetch('/api/installments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId, dueDate: dueDateTime, amount: newAmount, label: newLabel || null, autoRemind: newAutoRemind }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }
    setInstallments(prev => [...prev, data.installment].sort((a, b) => a.due_date.localeCompare(b.due_date)))
    setNewDate('')
    setNewTime('')
    setNewAmount('')
    setNewLabel('')
    setNewAutoRemind(false)
    setShowForm(false)
  }

  async function togglePaid(inst: Installment) {
    setTogglingId(inst.id)
    const res = await fetch(`/api/installments/${inst.id}/paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: !inst.paid_at }),
    })
    const data = await res.json()
    setTogglingId(null)
    if (res.ok) {
      setInstallments(prev => prev.map(i => i.id === inst.id ? data.installment : i))
    }
  }

  async function deleteInstallment(id: string) {
    setDeletingId(id)
    await fetch(`/api/installments?id=${id}`, { method: 'DELETE' })
    setInstallments(prev => prev.filter(i => i.id !== id))
    setDeletingId(null)
  }

  async function toggleAutoRemind(inst: Installment) {
    setTogglingRemindId(inst.id)
    const res = await fetch('/api/installments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inst.id, autoRemind: !inst.auto_remind }),
    })
    const data = await res.json()
    setTogglingRemindId(null)
    if (res.ok) {
      setInstallments(prev => prev.map(i => i.id === inst.id ? data.installment : i))
    }
  }

  function updateSplitRow(idx: number, field: keyof SplitRow, value: string | boolean) {
    setSplitRows(prev => {
      const updated = prev.map((r, i) => i === idx ? { ...r, [field]: value } : r)
      // If changing date of first row and sameMonthDay is on, cascade dates
      if (field === 'date' && idx === 0 && sameMonthDay && typeof value === 'string' && value) {
        const base = new Date(value + 'T00:00:00')
        return updated.map((r, i) => {
          if (i === 0) return r
          const d = new Date(base)
          d.setMonth(base.getMonth() + i)
          return { ...r, date: d.toISOString().slice(0, 10) }
        })
      }
      return updated
    })
    setSplitError('')
  }

  function applySameMonthDay(rows: SplitRow[], firstDate: string): SplitRow[] {
    if (!firstDate) return rows
    const base = new Date(firstDate + 'T00:00:00')
    return rows.map((r, i) => {
      if (i === 0) return r
      const d = new Date(base)
      d.setMonth(base.getMonth() + i)
      return { ...r, date: d.toISOString().slice(0, 10) }
    })
  }

  async function saveSplit() {
    const valid = splitRows.filter(r => r.amount && r.date)
    if (valid.length < 2) { setSplitError('Add at least 2 splits with amount and date.'); return }
    const totalSplit = valid.reduce((s, r) => s + parseFloat(r.amount.replace(/,/g, '') || '0'), 0)
    if (Math.round(totalSplit * 100) > Math.round(balanceDue * 100)) {
      setSplitError(`Total split (${fmt(totalSplit)}) exceeds outstanding balance (${fmt(balanceDue)}).`)
      return
    }
    setSplitSaving(true)
    setSplitError('')
    const results: Installment[] = []
    for (const row of valid) {
      const dueDateTime = row.time ? `${row.date}T${row.time}:00+01:00` : `${row.date}T00:00:00+01:00`
      const res = await fetch('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId, dueDate: dueDateTime, amount: row.amount.replace(/,/g, ''), label: row.label || null, autoRemind: row.autoRemind }),
      })
      const data = await res.json()
      if (res.ok) results.push(data.installment)
    }
    setSplitSaving(false)
    if (results.length === 0) { setSplitError('Failed to save splits.'); return }
    setInstallments(prev => [...prev, ...results].sort((a, b) => a.due_date.localeCompare(b.due_date)))
    setShowSplit(false)
    setSplitCount('')
    setSameMonthDay(false)
    setSplitRows([
      { amount: '', date: '', time: '', label: '', autoRemind: false },
      { amount: '', date: '', time: '', label: '', autoRemind: false },
    ])
  }

  const paidCount = installments.filter(i => i.paid_at).length
  const totalScheduled = installments.reduce((s, i) => s + i.amount, 0)
  const now = new Date()

  function isOverdue(inst: Installment) {
    if (inst.paid_at) return false
    return new Date(inst.due_date) < now
  }

  const fmt = (n: number) => '₦' + (Math.round(Math.abs(n) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (d: string) => {
    const dt = new Date(d)
    const date = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const hasTime = d.includes('T')
    if (!hasTime) return date
    const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${date} · ${time}`
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink flex items-center gap-2">
            Installment Schedule
            {paidCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">
                {paidCount}/{installments.length} paid
              </span>
            )}
          </p>
          <p className="text-xs text-ink-muted mt-0.5">
            Outstanding balance: <strong>{fmt(balanceDue)}</strong>
          </p>
        </div>
        <button onClick={onClose} className="text-ink-dim hover:text-ink transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Summary bar */}
      {installments.length > 0 && (
        <div className="flex items-center gap-4 bg-surface rounded-lg px-4 py-2.5 text-xs text-ink-muted">
          <span>Scheduled: <strong className="text-ink">{fmt(totalScheduled)}</strong></span>
          <span>·</span>
          <span>Paid: <strong className="text-green-700">{paidCount}</strong> of <strong className="text-ink">{installments.length}</strong></span>
          <span>·</span>
          <span>Overdue: <strong className="text-danger">{installments.filter(isOverdue).length}</strong></span>
        </div>
      )}

      {/* Installment list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted py-2">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : installments.length === 0 ? (
        <p className="text-sm text-ink-dim text-center py-4">No installments scheduled yet.</p>
      ) : (
        <div className="space-y-2">
          {installments.map((inst, idx) => {
            const overdue = isOverdue(inst)
            const paid = !!inst.paid_at
            return (
              <div
                key={inst.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-colors ${
                  paid
                    ? 'bg-green-50 border-green-200'
                    : overdue
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-border'
                }`}
              >
                {/* Index */}
                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  paid ? 'bg-green-600 text-white' : overdue ? 'bg-red-500 text-white' : 'bg-surface border border-border text-ink-muted'
                }`}>
                  {idx + 1}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${paid ? 'text-green-800 line-through' : overdue ? 'text-red-800' : 'text-ink'}`}>
                    {inst.label || `Installment ${idx + 1}`}
                  </p>
                  <p className={`text-xs mt-0.5 ${paid ? 'text-green-600' : overdue ? 'text-red-600' : 'text-ink-muted'}`}>
                    {fmtDate(inst.due_date)}{overdue && !paid ? ' · Overdue' : ''}{paid ? ` · Paid ${fmtDate(inst.paid_at!)}` : ''}
                  </p>
                </div>

                {/* Amount */}
                <span className={`font-semibold shrink-0 ${paid ? 'text-green-700' : overdue ? 'text-red-700' : 'text-ink'}`}>
                  {fmt(inst.amount)}
                </span>

                {/* Mark paid button */}
                <button
                  onClick={() => togglePaid(inst)}
                  disabled={togglingId === inst.id}
                  title={paid ? 'Mark unpaid' : 'Mark as paid'}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors disabled:opacity-50 ${
                    paid
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                      : 'bg-white border border-border text-ink-muted hover:border-green-400 hover:text-green-700'
                  }`}
                >
                  {togglingId === inst.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : paid
                    ? <><CheckCircle2 size={12} /> Paid</>
                    : <><Check size={12} /> Mark paid</>
                  }
                </button>

                {/* Auto-remind toggle */}
                {!paid && (
                  <button
                    onClick={() => toggleAutoRemind(inst)}
                    disabled={togglingRemindId === inst.id}
                    title={inst.auto_remind ? 'Auto-remind ON — click to turn off' : 'Auto-remind OFF — click to enable email reminder'}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors disabled:opacity-50 ${
                      inst.auto_remind
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        : 'bg-white border border-border text-ink-dim hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {togglingRemindId === inst.id
                      ? <Loader2 size={11} className="animate-spin" />
                      : inst.auto_remind
                      ? <><Bell size={11} /> Remind</>
                      : <><BellOff size={11} /> Remind</>
                    }
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => deleteInstallment(inst.id)}
                  disabled={deletingId === inst.id}
                  className="text-ink-dim hover:text-danger transition-colors disabled:opacity-50 shrink-0"
                >
                  {deletingId === inst.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add installment form */}
      {showForm && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-surface/50">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">New installment</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-ink-muted mb-1">Due date</label>
              <input type="date" value={newDate} onChange={e => { setNewDate(e.target.value); setError('') }}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1">Time (optional)</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1">Amount (₦)</label>
              <input type="number" value={newAmount} onChange={e => { setNewAmount(e.target.value); setError('') }}
                placeholder="0.00" min="0" step="0.01"
                className={`w-full px-3 py-2 border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white ${Math.round(parseFloat(newAmount) * 100) > Math.round(balanceDue * 100) && balanceDue > 0 ? 'border-red-400' : 'border-border'}`} />
              {Math.round(parseFloat(newAmount) * 100) > Math.round(balanceDue * 100) && balanceDue > 0 && (
                <p className="text-xs text-danger mt-1">Exceeds balance by {fmt((Math.round(parseFloat(newAmount) * 100) - Math.round(balanceDue * 100)) / 100)}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Label (optional)</label>
            <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. First payment, Balance, etc."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={newAutoRemind} onChange={e => setNewAutoRemind(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" />
            <span className="text-sm text-ink"><span className="font-medium">Auto-remind recipient</span><span className="text-ink-muted ml-1 text-xs">— sends an email reminder on the due date</span></span>
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button onClick={addInstallment} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button onClick={() => { setShowForm(false); setError('') }}
              className="px-4 py-2 border border-border rounded-lg text-sm text-ink-muted hover:text-ink transition-colors bg-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Split payment form */}
      {showSplit && (
        <div className="border border-forest/30 rounded-lg p-4 space-y-4 bg-surface/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink uppercase tracking-wide">Split Payment</p>
              <p className="text-xs text-ink-muted mt-0.5">Define multiple payment amounts and due dates at once.</p>
            </div>
            <button onClick={() => { setShowSplit(false); setSplitError('') }} className="text-ink-dim hover:text-ink transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Number of splits */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-ink-muted mb-1">Number of splits</label>
              <input
                type="number"
                min="2"
                max="60"
                value={splitCount}
                onChange={e => {
                  const n = parseInt(e.target.value)
                  setSplitCount(e.target.value)
                  if (!isNaN(n) && n >= 2 && n <= 60) {
                    const perSplit = Math.floor((balanceDue / n) * 100) / 100
                    const remainder = Math.round((balanceDue - perSplit * n) * 100) / 100
                    setSplitRows(prev => {
                      const firstDate = prev[0]?.date ?? ''
                      const firstTime = prev[0]?.time ?? ''
                      const firstRemind = prev[0]?.autoRemind ?? false
                      const globalRemind = prev.length > 0 && prev.every(r => r.autoRemind)
                      const rows: SplitRow[] = Array.from({ length: n }, (_, i) => ({
                        amount: i === n - 1 ? String(perSplit + remainder) : String(perSplit),
                        date: firstDate,
                        time: firstTime,
                        label: '',
                        autoRemind: globalRemind || firstRemind,
                      }))
                      return sameMonthDay && firstDate ? applySameMonthDay(rows, firstDate) : rows
                    })
                  }
                }}
                placeholder="e.g. 3"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white"
              />
            </div>
            <p className="text-xs text-ink-muted pb-2">Balance <strong>{fmt(balanceDue)}</strong> will be divided equally</p>
          </div>

          {/* Global toggles row */}
          <div className="flex flex-wrap gap-2">

          {/* Auto-remind all */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none bg-surface border border-border rounded-lg px-3 py-2.5 flex-1">
            <input
              type="checkbox"
              checked={splitRows.length > 0 && splitRows.every(r => r.autoRemind)}
              ref={el => { if (el) el.indeterminate = splitRows.some(r => r.autoRemind) && !splitRows.every(r => r.autoRemind) }}
              onChange={e => setSplitRows(prev => prev.map(r => ({ ...r, autoRemind: e.target.checked })))}
              className="w-4 h-4 accent-blue-600 rounded shrink-0"
            />
            <span className="text-sm text-ink"><Bell size={12} className="inline mr-1 text-blue-500" /><span className="font-semibold">Auto-remind all</span><span className="text-ink-muted ml-1 text-xs">— email reminder on each due date</span></span>
          </label>

          {/* Same day every month toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex-1">
            <input
              type="checkbox"
              checked={sameMonthDay}
              onChange={e => {
                const on = e.target.checked
                setSameMonthDay(on)
                if (on) setSplitRows(prev => applySameMonthDay(prev, prev[0]?.date ?? ''))
              }}
              className="w-4 h-4 accent-blue-600 rounded shrink-0"
            />
            <span className="text-sm text-blue-800">
              <span className="font-semibold">Same day every month</span>
              <span className="text-blue-600 ml-1 text-xs">— set the first date and all others auto-fill monthly</span>
            </span>
          </label>

          </div>{/* end global toggles */}

          {/* Running total */}
          {(() => {
            const total = splitRows.reduce((s, r) => s + parseFloat(r.amount.replace(/,/g, '') || '0'), 0)
            const over = total > balanceDue + 0.001
            return total > 0 ? (
              <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border ${over ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <span>Total split: <strong>{fmt(total)}</strong></span>
                <span>{over ? `Over by ${fmt(total - balanceDue)}` : `Remaining: ${fmt(balanceDue - total)}`}</span>
              </div>
            ) : null
          })()}

          <div className="space-y-3">
            {splitRows.map((row, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-muted">Split {idx + 1}</span>
                  {splitRows.length > 2 && (
                    <button onClick={() => setSplitRows(prev => prev.filter((_, i) => i !== idx))} className="text-ink-dim hover:text-danger transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs text-ink-muted mb-1">Amount (₦)</label>
                    <input type="number" value={row.amount} onChange={e => updateSplitRow(idx, 'amount', e.target.value)}
                      placeholder="0.00" min="0" step="0.01"
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-muted mb-1">
                      Due date {sameMonthDay && idx > 0 && <span className="text-blue-500 ml-1">(auto)</span>}
                    </label>
                    <input type="date" value={row.date}
                      onChange={e => updateSplitRow(idx, 'date', e.target.value)}
                      disabled={sameMonthDay && idx > 0}
                      className={`w-full px-2.5 py-1.5 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 ${sameMonthDay && idx > 0 ? 'bg-blue-50 text-blue-700 cursor-not-allowed' : 'bg-white'}`} />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-muted mb-1">Time (optional)</label>
                    <input type="time" value={row.time} onChange={e => updateSplitRow(idx, 'time', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-ink-muted mb-1">Label (optional)</label>
                    <input type="text" value={row.label} onChange={e => updateSplitRow(idx, 'label', e.target.value)}
                      placeholder="e.g. 2nd payment"
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={row.autoRemind} onChange={e => updateSplitRow(idx, 'autoRemind', e.target.checked)} className="w-3.5 h-3.5 accent-blue-600 rounded" />
                  <span className="text-xs text-ink"><Bell size={10} className="inline mr-1 text-blue-500" />Auto-remind on due date</span>
                </label>
              </div>
            ))}
          </div>

          <button onClick={() => setSplitRows(prev => {
              const newRow = { amount: '', date: '', time: '', label: '', autoRemind: false }
              const next = [...prev, newRow]
              return sameMonthDay ? applySameMonthDay(next, next[0]?.date ?? '') : next
            })}
            className="flex items-center gap-1.5 text-xs text-forest/70 hover:text-forest font-medium transition-colors">
            <Plus size={12} /> Add another split
          </button>

          {splitError && <p className="text-xs text-danger">{splitError}</p>}
          <div className="flex gap-2">
            <button onClick={saveSplit} disabled={splitSaving}
              className="flex items-center gap-2 px-4 py-2 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors">
              {splitSaving ? <Loader2 size={13} className="animate-spin" /> : <Split size={13} />}
              {splitSaving ? 'Saving…' : 'Save all splits'}
            </button>
            <button onClick={() => { setShowSplit(false); setSplitError(''); setSameMonthDay(false); setSplitCount('') }}
              className="px-4 py-2 border border-border rounded-lg text-sm text-ink-muted hover:text-ink transition-colors bg-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom action buttons */}
      {!showForm && !showSplit && (
        <div className="flex items-center gap-3">
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm text-forest/70 hover:text-forest font-medium transition-colors">
            <Plus size={14} /> Add installment
          </button>
          <span className="text-ink-dim text-xs">·</span>
          <button onClick={() => setShowSplit(true)}
            className="flex items-center gap-2 text-sm text-forest/70 hover:text-forest font-medium transition-colors">
            <Split size={14} /> Split payment
          </button>
        </div>
      )}
    </div>
  )
}
