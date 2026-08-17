'use client'

import { useState, useEffect, useRef } from 'react'
import { Pencil, Check, Paperclip, Plus, X } from 'lucide-react'

type EntryType = 'fixed' | 'percent'

interface Entry {
  id: string
  label: string
  value: number
  type: EntryType
  attachment_url?: string | null
}

interface Props {
  totalRevenue: number
  totalVat: number
  activeGroup?: string | null
}

export default function ReceiptsSummary({ totalRevenue, activeGroup = null }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])
  // Only General (no group) participates in the one-time localStorage → server recovery,
  // since the old localStorage entries were global (never group-scoped).
  const groupParam = activeGroup && activeGroup !== 'none' ? `?group=${encodeURIComponent(activeGroup)}` : ''
  const isGeneral = !activeGroup || activeGroup === 'none'

  // Load expenditures/taxes for the ACTIVE GROUP from the server (syncs across web + mobile).
  // One-time recovery (General only): if the server has none but this browser still has the
  // old localStorage entries, upload them so nothing added before the migration is lost.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/expenditures${groupParam}`)
        const data = res.ok ? await res.json() : { expenditures: [] }
        const serverEntries: Entry[] = Array.isArray(data.expenditures) ? data.expenditures : []
        if (serverEntries.length > 0) { setEntries(serverEntries); return }

        if (isGeneral) {
          let saved: unknown = null
          try { saved = JSON.parse(localStorage.getItem('dr_expenditures') || 'null') } catch {}
          if (Array.isArray(saved) && saved.length) {
            const created: Entry[] = []
            for (const e of saved as { label?: string; value?: number; type?: string }[]) {
              const r = await fetch('/api/expenditures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: e.label ?? 'Expenditure', value: e.value ?? 0, type: e.type === 'percent' ? 'percent' : 'fixed' }),
              })
              if (r.ok) created.push((await r.json()).expenditure)
            }
            if (created.length) {
              try { localStorage.removeItem('dr_expenditures') } catch {}
              setEntries(created)
              return
            }
          }
        }
        setEntries([])
      } catch { setEntries([]) }
    })()
  }, [groupParam, isGeneral])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editType, setEditType] = useState<EntryType>('fixed')

  // No automatic VAT: percentage deductions are taken off total revenue. Add VAT as a
  // named percent expenditure if needed.
  const netRevenue = totalRevenue

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
        body: JSON.stringify({ label: 'New expenditure/tax', value: 0, type: 'fixed', sort_order: entries.length, group: activeGroup }),
      })
      if (!res.ok) return
      const { expenditure } = await res.json()
      setEntries(prev => [...prev, expenditure])
      startEdit(expenditure)
    } catch {}
  }

  // Attach a document (proof of external outflow) to an expenditure/tax entry.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachTargetId, setAttachTargetId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [attachError, setAttachError] = useState('')

  function triggerAttach(id: string) {
    setAttachTargetId(id)
    setAttachError('')
    fileInputRef.current?.click()
  }

  async function patchAttachment(id: string, attachment_url: string | null) {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, attachment_url } : e)))
    await fetch('/api/expenditures', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, attachment_url }),
    }).catch(() => {})
  }

  async function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    const id = attachTargetId
    ev.target.value = ''
    if (!file || !id) return

    setUploadingId(id)
    setAttachError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/receipts/upload-attachment', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setAttachError(data.error ?? 'Upload failed'); return }
      await patchAttachment(id, data.url)
    } catch {
      setAttachError('Upload failed')
    } finally {
      setUploadingId(null)
      setAttachTargetId(null)
    }
  }

  // Deleting an entry, or removing its attachment, requires an emailed
  // verification code — both destroy financial records/evidence.
  type DeleteAction = 'delete_entry' | 'remove_attachment'
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; action: DeleteAction; label: string } | null>(null)
  const [confirmStep, setConfirmStep] = useState<'sending' | 'code' | 'confirming'>('sending')
  const [confirmCode, setConfirmCode] = useState<string[]>(Array(6).fill(''))
  const [confirmError, setConfirmError] = useState('')
  const [confirmMasked, setConfirmMasked] = useState('')

  async function sendDeleteCode(id: string, action: DeleteAction) {
    setConfirmStep('sending')
    setConfirmError('')
    const res = await fetch('/api/expenditures/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setConfirmError(data.error ?? 'Failed to send code.'); setConfirmStep('code'); return }
    setConfirmMasked(data.masked ?? '')
    setConfirmStep('code')
  }

  function startDelete(id: string, action: DeleteAction, label: string) {
    setConfirmDelete({ id, action, label })
    setConfirmCode(Array(6).fill(''))
    sendDeleteCode(id, action)
  }

  function cancelConfirm() {
    setConfirmDelete(null)
    setConfirmError('')
  }

  async function submitConfirmCode() {
    if (!confirmDelete) return
    setConfirmStep('confirming')
    setConfirmError('')
    const res = await fetch('/api/expenditures/delete-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: confirmDelete.id, action: confirmDelete.action, code: confirmCode.join('') }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setConfirmError(data.error ?? 'Incorrect code.'); setConfirmStep('code'); return }

    if (confirmDelete.action === 'delete_entry') {
      setEntries(prev => prev.filter(e => e.id !== confirmDelete.id))
    } else {
      setEntries(prev => prev.map(e => (e.id === confirmDelete.id ? { ...e, attachment_url: null } : e)))
    }
    setConfirmDelete(null)
  }

  function handleCodeInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...confirmCode]; next[index] = value.slice(-1); setConfirmCode(next)
    if (value && index < 5) document.getElementById(`exp-otp-${index + 1}`)?.focus()
  }

  function handleCodeKeyDown(index: number, ev: React.KeyboardEvent<HTMLInputElement>) {
    if (ev.key === 'Backspace' && !confirmCode[index] && index > 0) document.getElementById(`exp-otp-${index - 1}`)?.focus()
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
                {e.attachment_url ? (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <a
                      href={e.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View attachment"
                      className="p-1.5 rounded-lg text-forest hover:bg-forest-light transition-colors"
                    >
                      <Paperclip size={13} />
                    </a>
                    <button
                      onClick={() => startDelete(e.id, 'remove_attachment', e.label)}
                      title="Remove attachment"
                      className="p-1 rounded-lg text-ink-dim hover:text-danger transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => triggerAttach(e.id)}
                    disabled={uploadingId === e.id}
                    title="Attach document (proof of outflow)"
                    className="p-1.5 rounded-lg text-ink-dim hover:text-forest hover:bg-surface transition-colors shrink-0 disabled:opacity-50"
                  >
                    {uploadingId === e.id ? (
                      <span className="block w-[13px] h-[13px] rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <Plus size={13} />
                    )}
                  </button>
                )}
                <button onClick={() => startEdit(e)} className="p-1.5 rounded-lg text-ink-dim hover:text-forest hover:bg-surface transition-colors shrink-0">
                  <Pencil size={13} />
                </button>
                <button onClick={() => startDelete(e.id, 'delete_entry', e.label)} className="text-xs text-ink-dim hover:text-danger transition-colors px-1 shrink-0">✕</button>
              </>
            )}
          </div>
        ))}

        {/* Add entry */}
        <div className="px-5 py-2.5">
          <button onClick={addEntry} className="text-xs text-forest/70 hover:text-forest font-medium transition-colors">
            + Add Expenditure/Tax
          </button>
          {attachError && <p className="text-xs text-danger mt-1">{attachError}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Total Balance */}
        <div className="flex items-center justify-between px-5 py-4 bg-surface">
          <span className="text-sm font-bold text-ink">Total Balance</span>
          <span className={`text-base font-bold font-heading ${balance < 0 ? 'text-danger' : 'text-forest'}`}>
            {balance < 0 ? '− ' : ''}{fmt(balance)}
          </span>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-ink">
                {confirmDelete.action === 'delete_entry' ? 'Delete' : 'Remove attachment from'} &ldquo;{confirmDelete.label}&rdquo;
              </p>
              <p className="text-xs text-ink-muted mt-1">
                {confirmStep === 'sending'
                  ? 'Sending a verification code to your email…'
                  : `Enter the 6-digit code sent to ${confirmMasked || 'your email'} to confirm.`}
              </p>
            </div>

            {confirmStep !== 'sending' && (
              <div className="flex gap-1.5 justify-center">
                {confirmCode.map((d, i) => (
                  <input
                    key={i}
                    id={`exp-otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={ev => handleCodeInput(i, ev.target.value)}
                    onKeyDown={ev => handleCodeKeyDown(i, ev)}
                    autoFocus={i === 0}
                    className="w-10 h-11 text-center text-base font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger/60 transition-colors"
                  />
                ))}
              </div>
            )}

            {confirmError && (
              <p className="text-xs text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{confirmError}</p>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={submitConfirmCode}
                disabled={confirmStep !== 'code' || confirmCode.join('').length < 6}
                className="px-4 py-2 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {confirmStep === 'confirming' ? 'Confirming…' : 'Confirm'}
              </button>
              <button
                onClick={cancelConfirm}
                disabled={confirmStep === 'confirming'}
                className="px-4 py-2 border border-border text-ink-muted text-sm rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              {confirmStep === 'code' && (
                <button
                  onClick={() => sendDeleteCode(confirmDelete.id, confirmDelete.action)}
                  className="text-xs text-forest hover:underline ml-1"
                >
                  Resend code
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
