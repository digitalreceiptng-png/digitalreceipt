'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Check, Trash2, Loader2, CheckCircle2, Bell, BellOff } from 'lucide-react'

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
    const dueDateTime = newTime ? `${newDate}T${newTime}` : newDate
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

  const paidCount = installments.filter(i => i.paid_at).length
  const totalScheduled = installments.reduce((s, i) => s + i.amount, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

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
      {showForm ? (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-surface/50">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">New installment</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-ink-muted mb-1">Due date</label>
              <input
                type="date"
                value={newDate}
                onChange={e => { setNewDate(e.target.value); setError('') }}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1">Time (optional)</label>
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1">Amount (₦)</label>
              <input
                type="number"
                value={newAmount}
                onChange={e => { setNewAmount(e.target.value); setError('') }}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white ${Math.round(parseFloat(newAmount) * 100) > Math.round(balanceDue * 100) && balanceDue > 0 ? 'border-red-400' : 'border-border'}`}
              />
              {Math.round(parseFloat(newAmount) * 100) > Math.round(balanceDue * 100) && balanceDue > 0 && (
                <p className="text-xs text-danger mt-1">
                  Exceeds balance by {fmt((Math.round(parseFloat(newAmount) * 100) - Math.round(balanceDue * 100)) / 100)}
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Label (optional)</label>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. First payment, Balance, etc."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60 bg-white"
            />
          </div>
          {/* Auto-remind checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newAutoRemind}
              onChange={e => setNewAutoRemind(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            <span className="text-sm text-ink">
              <span className="font-medium">Auto-remind recipient</span>
              <span className="text-ink-muted ml-1 text-xs">— sends an email reminder on the due date</span>
            </span>
          </label>

          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={addInstallment}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              className="px-4 py-2 border border-border rounded-lg text-sm text-ink-muted hover:text-ink transition-colors bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-forest/70 hover:text-forest font-medium transition-colors"
        >
          <Plus size={14} />
          Add installment date
        </button>
      )}
    </div>
  )
}
