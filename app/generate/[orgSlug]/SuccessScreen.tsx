'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, ExternalLink, MessageSquare, Plus, Mail, Phone, Send, Check, X, Printer, ChevronDown } from 'lucide-react'
import type { Branding } from './PinGate'

interface Receipt {
  id: string
  receipt_number: string | null
  unique_identifier: string
  receipt_type: string
  total_amount: number
  buyer_name: string
  buyer_email: string | null
  buyer_phone: string | null
}

export default function SuccessScreen({
  receipt,
  branding,
  orgSlug,
  onNew,
}: {
  receipt: Receipt
  branding: Branding
  orgSlug: string
  onNew: () => void
}) {
  const pc = branding.primaryColor
  const [printMenuOpen, setPrintMenuOpen] = useState(false)
  const publicUrl = `https://digitalreceipt.ng/r/${receipt.unique_identifier}`

  function shareWhatsApp() {
    const msg = `Your receipt from ${branding.businessName} is ready.\n\nView and download it here: ${publicUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xs">
        {/* Success icon */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: `${pc}18` }}>
            <CheckCircle2 size={38} style={{ color: pc }} strokeWidth={1.8} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Receipt Issued!</h2>
          <p className="text-sm text-gray-500 mt-1">
            Successfully issued to <strong>{receipt.buyer_name}</strong>
          </p>
        </div>

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 space-y-2.5">
          {receipt.receipt_number && (
            <Row label="Receipt No." value={<span className="font-mono text-xs">{receipt.receipt_number}</span>} />
          )}
          <Row label="Amount" value={
            <span className="font-bold text-base" style={{ color: pc }}>
              ₦{Number(receipt.total_amount).toLocaleString('en-NG')}
            </span>
          } />
          <Row label="Type" value={<span className="capitalize">{receipt.receipt_type}</span>} />
          {receipt.buyer_email && <Row label="Email" value={<span className="text-xs break-all">{receipt.buyer_email}</span>} />}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={15} /> View &amp; Download Receipt
          </a>

          {/* Print */}
          <div className="relative">
            <button
              onClick={() => setPrintMenuOpen(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Printer size={15} /> Print Receipt <ChevronDown size={13} className={`ml-auto transition-transform ${printMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {printMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPrintMenuOpen(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
                  <p className="text-xs text-gray-400 px-3 py-1.5 font-medium border-b border-gray-100">Select paper size</p>
                  {(['A4', 'LETTER', 'LEGAL', 'A5'] as const).map(size => (
                    <a
                      key={size}
                      href={`/api/receipts/${receipt.id}/pdf?print=1&size=${size}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setPrintMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Printer size={13} className="text-gray-400" />
                      {size === 'LETTER' ? 'Letter (US)' : size === 'LEGAL' ? 'Legal (US)' : size}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Email receipt */}
          <SendAction
            icon={<Mail size={15} />}
            label="Email Receipt"
            color="#2563eb"
            defaultValue={receipt.buyer_email ?? ''}
            inputType="email"
            inputPlaceholder="customer@email.com"
            onSend={async (value) => {
              const res = await fetch(`/api/org/${orgSlug}/receipts/${receipt.id}/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: value }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error ?? 'Failed to send email')
            }}
          />

          {/* SMS receipt */}
          <SendAction
            icon={<Phone size={15} />}
            label="SMS Receipt"
            color="#7c3aed"
            defaultValue={receipt.buyer_phone ?? ''}
            inputType="tel"
            inputPlaceholder="080xxxxxxxx"
            onSend={async (value) => {
              const res = await fetch(`/api/org/${orgSlug}/receipts/${receipt.id}/sms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phones: [value] }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error ?? 'Failed to send SMS')
            }}
          />

          <button
            onClick={shareWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ background: '#25D366' }}
          >
            <MessageSquare size={15} /> Share via WhatsApp
          </button>

          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ background: pc }}
          >
            <Plus size={15} /> Issue Another Receipt
          </button>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Powered by{' '}
          <a href="https://digitalreceipt.ng" target="_blank" rel="noreferrer" className="underline">
            DigitalReceipt.ng
          </a>
        </p>
      </div>
    </div>
  )
}

// ─── inline send widget ────────────────────────────────────────────────────────

function SendAction({
  icon,
  label,
  color,
  defaultValue,
  inputType,
  inputPlaceholder,
  onSend,
}: {
  icon: React.ReactNode
  label: string
  color: string
  defaultValue: string
  inputType: string
  inputPlaceholder: string
  onSend: (value: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!value.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSend(value.trim())
      setSent(true)
      setTimeout(() => { setSent(false); setOpen(false) }, 2500)
    } catch (err: any) {
      setError(err.message ?? 'Failed to send. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors"
        style={{ borderColor: `${color}40`, color, background: `${color}08` }}
      >
        {icon} {label}
      </button>
    )
  }

  return (
    <div className="rounded-xl border p-3 space-y-2.5" style={{ borderColor: `${color}30`, background: `${color}06` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
        <button onClick={() => { setOpen(false); setError('') }}
          className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type={inputType}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={inputPlaceholder}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-gray-400 bg-white text-gray-900 placeholder:text-gray-400"
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          autoFocus
        />
        <button
          onClick={handleSend}
          disabled={loading || !value.trim()}
          className="px-3 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-opacity"
          style={{ background: color }}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : sent ? (
            <><Check size={14} /> Sent!</>
          ) : (
            <><Send size={14} /> Send</>
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── shared helpers ────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  )
}
