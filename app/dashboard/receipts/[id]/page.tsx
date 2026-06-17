'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Copy, ArrowLeft, ExternalLink, CheckCircle, Mail, Loader2, X, Bell, BellOff } from 'lucide-react'

type ReminderFrequency = 'daily' | 'every_3_days' | 'weekly' | 'biweekly' | 'monthly'

const FREQUENCY_LABELS: Record<ReminderFrequency, string> = {
  daily:        'Every day',
  every_3_days: 'Every 3 days',
  weekly:       'Every week',
  biweekly:     'Every 2 weeks',
  monthly:      'Every month',
}
import VerificationCard from '@/components/receipt/VerificationCard'
import type { Receipt, ReceiptItem } from '@/types'

type FullReceipt = Receipt & { items: ReceiptItem[] }

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [receipt, setReceipt] = useState<FullReceipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Email state
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Reminder state
  const [reminderOpen, setReminderOpen] = useState(false)
  const [activeReminder, setActiveReminder] = useState<{ frequency: ReminderFrequency; next_send_at: string; send_count: number } | null>(null)
  const [reminderLoaded, setReminderLoaded] = useState(false)
  const [reminderFreq, setReminderFreq] = useState<ReminderFrequency>('weekly')
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderCancelling, setReminderCancelling] = useState(false)
  const [reminderError, setReminderError] = useState('')
  const [reminderSaved, setReminderSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/receipts/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.receipt) {
          setReceipt(data.receipt)
          setEmailInput(data.receipt.buyer_email ?? '')
        } else {
          router.push('/dashboard/receipts')
        }
      })
      .finally(() => setLoading(false))
  }, [id, router])

  // Load existing reminder when panel opens
  useEffect(() => {
    if (!reminderOpen || reminderLoaded) return
    fetch(`/api/reminders/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.reminder?.is_active) {
          setActiveReminder(data.reminder)
          setReminderFreq(data.reminder.frequency)
        }
        setReminderLoaded(true)
      })
  }, [reminderOpen, reminderLoaded, id])

  async function saveReminder() {
    setReminderError('')
    setReminderSaving(true)
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId: id, frequency: reminderFreq }),
    })
    const data = await res.json()
    setReminderSaving(false)
    if (!res.ok) { setReminderError(data.error ?? 'Failed to save reminder.'); return }
    setActiveReminder(data.reminder)
    setReminderSaved(true)
    setTimeout(() => setReminderSaved(false), 3000)
  }

  async function cancelReminder() {
    setReminderError('')
    setReminderCancelling(true)
    const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    setReminderCancelling(false)
    if (!res.ok) { setReminderError('Failed to cancel reminder.'); return }
    setActiveReminder(null)
  }

  function copyLink() {
    const url = `${window.location.origin}/r/${receipt?.unique_identifier}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function sendEmail() {
    if (!emailInput.trim()) { setEmailError('Enter a valid email address.'); return }
    setSending(true)
    setEmailError('')
    const res = await fetch(`/api/receipts/${id}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.trim() }),
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) { setEmailError(data.error ?? 'Failed to send email.'); return }
    setEmailSent(true)
    setTimeout(() => { setEmailOpen(false); setEmailSent(false) }, 3000)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="w-5 h-5 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
      </div>
    )
  }

  if (!receipt) return null

  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${receipt.unique_identifier}`

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button onClick={() => router.push('/dashboard/receipts')} className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
          <ArrowLeft size={15} />
          Back to Receipts
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-3.5 py-2 border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white"
          >
            {copied ? <CheckCircle size={15} className="text-green-600" /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          <Link
            href={verifyUrl}
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2 border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white"
          >
            <ExternalLink size={15} />
            View public
          </Link>

          <button
            onClick={() => { setEmailOpen(v => !v); setEmailError(''); setEmailSent(false) }}
            className="flex items-center gap-2 px-3.5 py-2 border border-forest/50 bg-forest-light text-forest rounded-lg text-sm font-semibold hover:bg-forest hover:text-white transition-colors"
          >
            <Mail size={15} />
            Email customer
          </button>

          {(receipt.balance_due ?? 0) > 0 && receipt.buyer_email && (
            <button
              onClick={() => { setReminderOpen(v => !v); setReminderError('') }}
              className={`flex items-center gap-2 px-3.5 py-2 border rounded-lg text-sm font-semibold transition-colors ${
                activeReminder
                  ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-border text-ink-muted hover:border-forest/40 hover:text-forest bg-white'
              }`}
            >
              <Bell size={15} />
              {activeReminder ? 'Reminder active' : 'Set reminder'}
            </button>
          )}

          <Link
            href={`/api/receipts/${receipt.id}/pdf`}
            className="flex items-center gap-2 px-3.5 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
          >
            <Download size={15} />
            Download PDF
          </Link>
        </div>
      </div>

      {/* Email panel */}
      {emailOpen && (
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Email receipt to customer</p>
              <p className="text-xs text-ink-muted mt-0.5">
                The customer will receive a verified receipt email from DigitalReceipt.ng on your behalf.
              </p>
            </div>
            <button onClick={() => setEmailOpen(false)} className="text-ink-dim hover:text-ink transition-colors">
              <X size={16} />
            </button>
          </div>

          {emailSent ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle size={16} />
              Receipt sent to {emailInput}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                placeholder="customer@email.com"
                className="flex-1 px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
              />
              <button
                onClick={sendEmail}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          )}

          {emailError && (
            <p className="text-xs text-danger">{emailError}</p>
          )}

          <p className="text-xs text-ink-dim">
            The email will say: <span className="font-medium text-ink-muted">&ldquo;{receipt.seller_name} sent you a receipt&rdquo;</span>
          </p>
        </div>
      )}

      {/* Reminder panel */}
      {reminderOpen && (
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <Bell size={15} className="text-amber-500" />
                Payment reminder
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                Automatically email <strong>{receipt.buyer_name}</strong> until the ₦{((receipt.balance_due ?? 0)).toLocaleString('en-NG', { minimumFractionDigits: 2 })} balance is cleared.
              </p>
            </div>
            <button onClick={() => setReminderOpen(false)} className="text-ink-dim hover:text-ink transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>

          {activeReminder ? (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm space-y-1.5">
                <p className="font-semibold text-amber-800 flex items-center gap-1.5">
                  <Bell size={13} /> Reminder is active
                </p>
                <p className="text-amber-700">
                  Sending <strong>{FREQUENCY_LABELS[activeReminder.frequency]}</strong> to {receipt.buyer_email}
                </p>
                <p className="text-amber-600 text-xs">
                  Next reminder: {new Date(activeReminder.next_send_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {activeReminder.send_count > 0 && ` · ${activeReminder.send_count} sent so far`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-ink mb-1">Change frequency</label>
                  <select
                    value={reminderFreq}
                    onChange={e => setReminderFreq(e.target.value as ReminderFrequency)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={saveReminder}
                  disabled={reminderSaving || reminderFreq === activeReminder.frequency}
                  className="mt-5 flex items-center gap-1.5 px-3.5 py-2 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors"
                >
                  {reminderSaving ? <Loader2 size={13} className="animate-spin" /> : null}
                  Update
                </button>
              </div>

              {reminderError && <p className="text-xs text-danger">{reminderError}</p>}

              <button
                onClick={cancelReminder}
                disabled={reminderCancelling}
                className="flex items-center gap-1.5 text-sm text-danger hover:underline disabled:opacity-50"
              >
                <BellOff size={13} />
                {reminderCancelling ? 'Cancelling…' : 'Cancel reminder'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {!reminderLoaded ? (
                <div className="flex items-center gap-2 text-sm text-ink-muted py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">How often should we remind them?</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(Object.entries(FREQUENCY_LABELS) as [ReminderFrequency, string][]).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setReminderFreq(val)}
                          className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                            reminderFreq === val
                              ? 'border-forest bg-forest-light text-forest'
                              : 'border-border text-ink-muted hover:border-forest/40'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {reminderSaved && (
                    <p className="flex items-center gap-1.5 text-sm text-green-700">
                      <CheckCircle size={14} /> Reminder set — first email sends tomorrow.
                    </p>
                  )}

                  {reminderError && <p className="text-xs text-danger">{reminderError}</p>}

                  <button
                    onClick={saveReminder}
                    disabled={reminderSaving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors"
                  >
                    {reminderSaving ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                    {reminderSaving ? 'Setting reminder…' : 'Set reminder'}
                  </button>

                  <p className="text-xs text-ink-dim">
                    Reminders stop automatically when the balance is cleared or you cancel them.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-border px-5 py-4 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-ink-dim font-medium mb-0.5">Receipt Number</p>
          <p className="font-mono text-sm text-ink">{receipt.receipt_number}</p>
        </div>
        <div>
          <p className="text-xs text-ink-dim font-medium mb-0.5">Unique Identifier</p>
          <p className="font-mono text-sm text-ink">{receipt.unique_identifier}</p>
        </div>
        <div>
          <p className="text-xs text-ink-dim font-medium mb-0.5">Verify URL</p>
          <a href={verifyUrl} className="text-sm text-forest/70 hover:text-forest break-all transition-colors">{verifyUrl}</a>
        </div>
      </div>

      <div className="flex justify-center">
        <VerificationCard receipt={receipt} verifiedAt={receipt.created_at} method="search" />
      </div>
    </div>
  )
}
