'use client'

import { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'

interface Props {
  receiptId: string
  currentName: string
  onUpdated: (buyerName: string) => void
  onClose: () => void
}

function CodeInput({ prefix, value, onChange }: { prefix: string; value: string[]; onChange: (next: string[]) => void }) {
  function handleInput(i: number, v: string) {
    if (!/^\d*$/.test(v)) return
    const next = [...value]
    next[i] = v.slice(-1)
    onChange(next)
    if (v && i < 5) document.getElementById(`${prefix}-${i + 1}`)?.focus()
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) document.getElementById(`${prefix}-${i - 1}`)?.focus()
  }
  return (
    <div className="flex gap-1.5">
      {value.map((d, i) => (
        <input
          key={i}
          id={`${prefix}-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleInput(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          autoFocus={i === 0}
          className="w-9 h-10 text-center text-sm font-semibold border border-border rounded-lg text-ink focus:outline-none focus:border-forest/60"
        />
      ))}
    </div>
  )
}

const EMPTY_CODE = ['', '', '', '', '', '']

export default function EditName({ receiptId, currentName, onUpdated, onClose }: Props) {
  const [draft, setDraft] = useState(currentName)
  const [step, setStep] = useState<'edit' | 'code'>('edit')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [channels, setChannels] = useState<{ email?: string; phone?: string } | null>(null)
  const [emailCode, setEmailCode] = useState(EMPTY_CODE)
  const [phoneCode, setPhoneCode] = useState(EMPTY_CODE)
  const [confirming, setConfirming] = useState(false)

  async function requestCode() {
    const name = draft.trim()
    if (!name) { setError('Enter a name.'); return }
    if (name === currentName) { setError('Enter a different name.'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/receipts/${receiptId}/name/edit-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerName: name }),
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
    const needsEmail = !!channels?.email
    const needsPhone = !!channels?.phone
    if (needsEmail && emailCode.join('').length !== 6) { setError('Enter the 6-digit code sent to your email.'); return }
    if (needsPhone && phoneCode.join('').length !== 6) { setError('Enter the 6-digit code sent to your phone.'); return }
    setConfirming(true)
    setError('')
    try {
      const res = await fetch(`/api/receipts/${receiptId}/name/edit-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(needsEmail ? { emailCode: emailCode.join('') } : {}),
          ...(needsPhone ? { phoneCode: phoneCode.join('') } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Incorrect code.'); return }
      onUpdated(data.buyerName ?? draft.trim())
      onClose()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Edit Name</p>
        <button onClick={onClose} className="text-ink-dim hover:text-ink transition-colors">
          <X size={15} />
        </button>
      </div>
      <p className="text-xs text-ink-muted">
        Changing the buyer&apos;s name requires separate codes sent to the company profile&apos;s email and phone number.
      </p>

      {step === 'edit' ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Buyer name</label>
            <input
              value={draft}
              onChange={e => { setDraft(e.target.value); setError('') }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-forest/60"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={requestCode}
              disabled={sending}
              className="flex items-center gap-2 px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors"
            >
              {sending && <Loader2 size={12} className="animate-spin" />}
              {sending ? 'Sending codes…' : 'Send codes'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-border rounded-lg text-xs text-ink-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {channels?.email && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-muted">Code sent to email <strong className="text-ink">{channels.email}</strong></p>
              <CodeInput prefix="name-otp-email" value={emailCode} onChange={setEmailCode} />
            </div>
          )}
          {channels?.phone && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-muted">Code sent to phone <strong className="text-ink">{channels.phone}</strong></p>
              <CodeInput prefix="name-otp-phone" value={phoneCode} onChange={setPhoneCode} />
            </div>
          )}
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
        </div>
      )}
    </div>
  )
}
