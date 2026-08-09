'use client'

import { useState } from 'react'
import { X, Pencil, Loader2, Check } from 'lucide-react'

interface Item {
  id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Props {
  receiptId: string
  items: Item[]
  onUpdated: (itemId: string, description: string) => void
  onClose: () => void
}

export default function EditItems({ receiptId, items, onUpdated, onClose }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [step, setStep] = useState<'edit' | 'code'>('edit')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [channels, setChannels] = useState<{ email?: string; phone?: string } | null>(null)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [confirming, setConfirming] = useState(false)

  function startEdit(item: Item) {
    setEditingId(item.id)
    setDraft(item.description)
    setStep('edit')
    setError('')
    setChannels(null)
    setCode(['', '', '', '', '', ''])
  }

  async function requestCode() {
    if (!editingId) return
    const original = items.find(i => i.id === editingId)?.description ?? ''
    if (!draft.trim() || draft.trim() === original) { setError('Enter a different description.'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/receipts/${receiptId}/items/${editingId}/edit-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: draft.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send code.'); return }
      setChannels(data.channels)
      setStep('code')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSending(false)
    }
  }

  async function confirmCode() {
    if (!editingId) return
    const full = code.join('')
    if (full.length !== 6) { setError('Enter the 6-digit code.'); return }
    setConfirming(true)
    setError('')
    try {
      const res = await fetch(`/api/receipts/${receiptId}/items/${editingId}/edit-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: full }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Incorrect code.'); return }
      onUpdated(editingId, draft.trim())
      setEditingId(null)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setConfirming(false)
    }
  }

  function handleCodeInput(i: number, v: string) {
    if (!/^\d*$/.test(v)) return
    const next = [...code]
    next[i] = v.slice(-1)
    setCode(next)
    if (v && i < 5) document.getElementById(`item-otp-${i + 1}`)?.focus()
  }

  function handleCodeKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) document.getElementById(`item-otp-${i - 1}`)?.focus()
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Edit Item Description</p>
        <button onClick={onClose} className="text-ink-dim hover:text-ink transition-colors">
          <X size={15} />
        </button>
      </div>
      <p className="text-xs text-ink-muted">
        Changing a description requires a code sent to the company profile&apos;s email and phone number.
      </p>

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="border border-border rounded-lg p-3">
            {editingId === item.id ? (
              <div className="space-y-3">
                {step === 'edit' ? (
                  <>
                    <input
                      value={draft}
                      onChange={e => { setDraft(e.target.value); setError('') }}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60"
                      autoFocus
                    />
                    {error && <p className="text-xs text-danger">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={requestCode}
                        disabled={sending}
                        className="flex items-center gap-2 px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors"
                      >
                        {sending && <Loader2 size={12} className="animate-spin" />}
                        {sending ? 'Sending code…' : 'Send code'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 border border-border rounded-lg text-xs text-ink-muted hover:text-ink transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-ink-muted">
                      Code sent to
                      {channels?.email && <> email <strong className="text-ink">{channels.email}</strong></>}
                      {channels?.email && channels?.phone ? ' and' : ''}
                      {channels?.phone && <> phone <strong className="text-ink">{channels.phone}</strong></>}
                    </p>
                    <div className="flex gap-1.5">
                      {code.map((d, i) => (
                        <input
                          key={i}
                          id={`item-otp-${i}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={e => handleCodeInput(i, e.target.value)}
                          onKeyDown={e => handleCodeKeyDown(i, e)}
                          autoFocus={i === 0}
                          className="w-9 h-10 text-center text-sm font-semibold border border-border rounded-lg text-ink focus:outline-none focus:border-forest/60"
                        />
                      ))}
                    </div>
                    {error && <p className="text-xs text-danger">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={confirmCode}
                        disabled={confirming}
                        className="flex items-center gap-2 px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors"
                      >
                        {confirming ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        {confirming ? 'Confirming…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => { setStep('edit'); setError('') }}
                        className="px-3 py-1.5 border border-border rounded-lg text-xs text-ink-muted hover:text-ink transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink truncate">{item.description}</span>
                <button
                  onClick={() => startEdit(item)}
                  className="p-1.5 rounded-lg text-ink-dim hover:text-forest hover:bg-surface transition-colors shrink-0"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
