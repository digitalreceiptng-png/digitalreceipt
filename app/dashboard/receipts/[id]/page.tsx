'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Copy, ArrowLeft, ExternalLink, CheckCircle, Mail, Loader2, X, Bell, BellOff, Banknote } from 'lucide-react'

type ReminderFrequency = 'weekly' | 'biweekly' | 'monthly'

const FREQUENCY_LABELS: Record<ReminderFrequency, string> = {
  weekly:   'Weekly',
  biweekly: 'Every 2 weeks',
  monthly:  'Monthly',
}
import VerificationCard from '@/components/receipt/VerificationCard'
import type { Receipt, ReceiptItem } from '@/types'

type FullReceipt = Receipt & { items: ReceiptItem[] }

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [receipt, setReceipt] = useState<FullReceipt | null>(null)
  const [paymentReceipts, setPaymentReceipts] = useState<FullReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Email state
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Record payment state
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)

  // Reminder state
  const [reminderOpen, setReminderOpen] = useState(false)
  const [activeReminder, setActiveReminder] = useState<{ frequency: ReminderFrequency; next_send_at: string; send_count: number } | null>(null)
  const [reminderLoaded, setReminderLoaded] = useState(false)
  const [reminderFreq, setReminderFreq] = useState<ReminderFrequency>('weekly')
  const [reminderStartDate, setReminderStartDate] = useState('')
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderCancelling, setReminderCancelling] = useState(false)
  const [reminderSendingNow, setReminderSendingNow] = useState(false)
  const [reminderError, setReminderError] = useState('')
  const [reminderSaved, setReminderSaved] = useState(false)
  const [reminderSentNow, setReminderSentNow] = useState(false)

  useEffect(() => {
    fetch(`/api/receipts/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.receipt) {
          setReceipt(data.receipt)
          setEmailInput(data.receipt.buyer_email ?? '')
          setPaymentReceipts(data.paymentReceipts ?? [])
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
      body: JSON.stringify({ receiptId: id, frequency: reminderFreq, startDate: reminderStartDate || undefined }),
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

  async function recordPayment() {
    const amount = parseFloat(paymentAmount.replace(/,/g, ''))
    if (!amount || amount <= 0) { setPaymentError('Enter a valid amount.'); return }
    setPaymentError('')
    setPaymentSaving(true)
    const res = await fetch(`/api/receipts/${id}/record-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    const data = await res.json()
    setPaymentSaving(false)
    if (!res.ok) { setPaymentError(data.error ?? 'Failed to record payment.'); return }
    // Update local receipt state
    setReceipt(r => r ? { ...r, amount_paid: data.amountPaid, balance_due: data.balanceDue, overpaid: data.overpaid } : r)
    setPaymentDone(true)
    setPaymentAmount('')
    if (data.balanceDue === 0) setActiveReminder(null)
    if (data.paymentReceipt) {
      setPaymentReceipts(prev => [...prev, { ...data.paymentReceipt, items: data.paymentReceipt.items ?? [] }])
    }
    setTimeout(() => { setPaymentOpen(false); setPaymentDone(false) }, 3000)
  }

  async function sendReminderNow() {
    setReminderError('')
    setReminderSendingNow(true)
    const res = await fetch(`/api/reminders/${id}/send-now`, { method: 'POST' })
    const data = await res.json()
    setReminderSendingNow(false)
    if (!res.ok) { setReminderError(data.error ?? 'Failed to send.'); return }
    setReminderSentNow(true)
    setTimeout(() => setReminderSentNow(false), 4000)
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

          {(receipt.balance_due ?? 0) > 0 && (
            <button
              onClick={() => { setPaymentOpen(v => !v); setPaymentError(''); setPaymentDone(false) }}
              className="flex items-center gap-2 px-3.5 py-2 border border-border rounded-lg text-sm text-ink-muted hover:border-green-500/50 hover:text-green-700 bg-white transition-colors"
            >
              <Banknote size={15} />
              Update payment
            </button>
          )}

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
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={emailInput}
                  onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                  placeholder="customer@email.com, another@email.com"
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
              <p className="text-xs text-ink-dim">Separate multiple addresses with a comma.</p>
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

      {/* Update payment panel */}
      {paymentOpen && (
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <Banknote size={15} className="text-green-600" />
                Update payment
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                Outstanding balance: <strong>₦{(receipt.balance_due ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
            <button onClick={() => setPaymentOpen(false)} className="text-ink-dim hover:text-ink transition-colors">
              <X size={15} />
            </button>
          </div>

          {paymentDone ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle size={15} />
              {(receipt.balance_due ?? 0) === 0
                ? 'Fully paid — balance cleared and reminder stopped.'
                : `Payment recorded. ₦${(receipt.balance_due ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })} still outstanding.`}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">₦</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={e => { setPaymentAmount(e.target.value.replace(/[^\d.]/g, '')); setPaymentError('') }}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => setPaymentAmount(String(receipt.balance_due ?? 0))}
                  className="px-3 py-2 border border-border rounded-lg text-xs text-ink-muted hover:border-forest/40 hover:text-forest bg-white transition-colors whitespace-nowrap"
                >
                  Full amount
                </button>
                <button
                  onClick={recordPayment}
                  disabled={paymentSaving || !paymentAmount}
                  className="flex items-center gap-2 px-4 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright disabled:opacity-50 transition-colors"
                >
                  {paymentSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {paymentSaving ? 'Saving…' : 'Record'}
                </button>
              </div>
              {paymentError && <p className="text-xs text-danger">{paymentError}</p>}
              <p className="text-xs text-ink-dim">Partial payments are supported. The balance updates immediately.</p>
            </div>
          )}
        </div>
      )}

      {/* Reminder panel */}
      {reminderOpen && (
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink flex items-center gap-2">
              <Bell size={14} className="text-amber-500" />
              Payment reminder
              <span className="text-xs font-normal text-ink-muted">· ₦{(receipt.balance_due ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })} outstanding</span>
            </p>
            <button onClick={() => setReminderOpen(false)} className="text-ink-dim hover:text-ink transition-colors shrink-0">
              <X size={15} />
            </button>
          </div>

          {!reminderLoaded ? (
            <div className="flex items-center gap-2 text-sm text-ink-muted py-1">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-3">

              {/* Active reminder status */}
              {activeReminder && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Bell size={12} className="shrink-0" />
                  <span>
                    Sending <strong>{FREQUENCY_LABELS[activeReminder.frequency]}</strong>
                    {' · '}Next: {new Date(activeReminder.next_send_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {activeReminder.send_count > 0 && ` · ${activeReminder.send_count} sent`}
                  </span>
                </div>
              )}

              {/* Send now */}
              <div className="flex items-center gap-2">
                <button
                  onClick={sendReminderNow}
                  disabled={reminderSendingNow}
                  className="flex items-center gap-2 px-4 py-2.5 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors"
                >
                  {reminderSendingNow ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  {reminderSendingNow ? 'Sending…' : 'Send reminder now'}
                </button>
                {reminderSentNow && (
                  <span className="flex items-center gap-1 text-xs text-green-700">
                    <CheckCircle size={13} /> Sent to {receipt.buyer_email}
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-ink-dim shrink-0">or schedule recurring</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Frequency + date inline */}
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-ink-muted mb-1">Frequency</label>
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
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-ink-muted mb-1">First send date <span className="text-ink-dim">(optional)</span></label>
                  <input
                    type="date"
                    value={reminderStartDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setReminderStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={saveReminder}
                    disabled={reminderSaving}
                    className="flex items-center gap-1.5 px-4 py-2 border border-forest text-forest text-sm font-semibold rounded-lg hover:bg-forest-light disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {reminderSaving ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                    {activeReminder ? 'Update' : 'Schedule'}
                  </button>
                </div>
              </div>

              {reminderSaved && (
                <p className="flex items-center gap-1.5 text-xs text-green-700">
                  <CheckCircle size={12} />
                  {reminderStartDate
                    ? `Scheduled — first email sends ${new Date(reminderStartDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}.`
                    : 'Reminder set — sends automatically on schedule.'}
                </p>
              )}

              {reminderError && <p className="text-xs text-danger">{reminderError}</p>}

              {/* Cancel */}
              {activeReminder && (
                <button
                  onClick={cancelReminder}
                  disabled={reminderCancelling}
                  className="flex items-center gap-1.5 text-xs text-ink-dim hover:text-danger transition-colors disabled:opacity-50"
                >
                  <BellOff size={12} />
                  {reminderCancelling ? 'Cancelling…' : 'Cancel recurring reminder'}
                </button>
              )}

              {!activeReminder && (
                <p className="text-xs text-ink-dim">Stops automatically when the balance is cleared.</p>
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

      {paymentReceipts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <p className="text-xs font-semibold tracking-widest uppercase text-ink-dim shrink-0">
              Payment History ({paymentReceipts.length})
            </p>
            <div className="flex-1 h-px bg-border" />
          </div>
          <p className="text-xs text-ink-dim text-center -mt-2">
            Each payment update generates a linked receipt for your records.
          </p>
          {paymentReceipts.map((pr, idx) => (
            <div key={pr.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Banknote size={13} className="text-green-600 shrink-0" />
                <p className="text-xs font-semibold text-ink-muted">
                  Payment #{idx + 1} · {new Date(pr.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex-1 h-px bg-border" />
                <Link
                  href={`/dashboard/receipts/${pr.id}`}
                  className="text-xs text-forest hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={11} />
                  View
                </Link>
              </div>
              <div className="flex justify-center">
                <VerificationCard receipt={pr} verifiedAt={pr.created_at} method="search" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
