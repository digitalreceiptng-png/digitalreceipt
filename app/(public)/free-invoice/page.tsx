'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Download, Share2, Mail, ArrowLeft, ChevronDown, Check, Loader2, X } from 'lucide-react'

interface LineItem {
  id: string
  description: string
  qty: number
  price: number
}

const CURRENCIES = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
]

const PAYMENT_OPTIONS = [
  'Bank Transfer',
  'Cash',
  'Card',
  'Cheque',
  'Mobile Money',
  'USSD',
  'Crypto',
]

function genCode() {
  return 'INV-' + Math.floor(10000000 + Math.random() * 90000000)
}

function todayStr() {
  return new Date().toLocaleDateString('en-GB').replace(/\//g, '/')
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function newItem(): LineItem {
  return { id: Math.random().toString(36).slice(2), description: '', qty: 1, price: 0 }
}

const LABEL = 'block text-xs font-semibold text-ink-muted mb-1.5'
const INPUT = 'w-full px-3 py-2.5 rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors bg-white border border-border'

export default function FreeInvoicePage() {
  const [businessName, setBusinessName] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [receiptCode] = useState(genCode)
  const [date, setDate] = useState(todayISO)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [currency, setCurrency] = useState(CURRENCIES[0])
  const [showCurrency, setShowCurrency] = useState(false)
  const [items, setItems] = useState<LineItem[]>([newItem()])

  // Section 4 state
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false)
  const [notes, setNotes] = useState('Thank you for your business. We appreciate your trust and look forward to working with you again.')

  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [promptEmail, setPromptEmail] = useState('')

  const previewRef = useRef<HTMLDivElement>(null)

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev)
  }, [])

  function togglePaymentMethod(method: string) {
    setPaymentMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    )
  }

  function handleDownload() { window.print() }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `Invoice ${receiptCode}`,
        text: `Invoice from ${businessName || 'DigitalReceipt.ng'} for ${clientName || 'client'} — ${currency.symbol}${subtotal.toLocaleString()}`,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard')
    }
  }

  function handleEmailClick() {
    setEmailError('')
    setEmailSent(false)
    if (!clientEmail.trim()) {
      setPromptEmail('')
      setShowEmailPrompt(true)
      return
    }
    sendInvoiceEmail(clientEmail.trim())
  }

  async function sendInvoiceEmail(to: string) {
    setEmailLoading(true)
    setEmailError('')
    try {
      const res = await fetch('/api/free-invoice/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          businessName,
          clientName,
          invoiceNo: receiptCode,
          date,
          currency: currency.symbol,
          items,
          subtotal,
          bankName: bankName || undefined,
          accountName: accountName || undefined,
          accountNumber: accountNumber || undefined,
          paymentMethods: paymentMethods.length ? paymentMethods : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setEmailError(data.error ?? 'Failed to send. Please try again.'); return }
      setEmailSent(true)
      setShowEmailPrompt(false)
      setTimeout(() => setEmailSent(false), 4000)
    } catch {
      setEmailError('Network error. Please check your connection and try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : todayStr()

  const hasBankDetails = bankName || accountName || accountNumber

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-printable, #receipt-printable * { visibility: visible; }
          #receipt-printable { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; }
        }
      `}</style>

      <div className="min-h-screen bg-surface">
        {/* Page header */}
        <div className="max-w-6xl mx-auto px-5 pt-8 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors mb-6"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
          <h1 className="font-heading text-3xl text-ink font-bold" style={{ letterSpacing: '-0.02em' }}>
            Free Invoice Generator
          </h1>
          <p className="text-sm text-ink-muted mt-1.5">
            Create a professional invoice in seconds. No account required.
          </p>
        </div>

        {/* Main layout */}
        <div className="max-w-6xl mx-auto px-5 pb-16 flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-8 items-start">

          {/* ── Form ── */}
          <div className="order-2 lg:order-1 w-full space-y-4">

            {/* Section 1 — Business Info */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'oklch(0.42 0.18 145)' }}>1</div>
                <p className="text-xs font-bold tracking-widest uppercase text-ink-dim">Your Business Info</p>
              </div>

              <div>
                <label className={LABEL}>Business Name</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Your Business Ltd" className={INPUT} />
              </div>

              <div>
                <label className={LABEL}>Business Address</label>
                <input value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder="e.g. 123 Main Street, Lagos" className={INPUT} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Invoice No.</label>
                  <input value={receiptCode} readOnly className={INPUT + ' opacity-50 cursor-default select-all'} />
                </div>
                <div>
                  <label className={LABEL}>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
                </div>
              </div>
            </div>

            {/* Section 2 — Client Info */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'oklch(0.42 0.18 145)' }}>2</div>
                <p className="text-xs font-bold tracking-widest uppercase text-ink-dim">Client Info</p>
              </div>

              <div>
                <label className={LABEL}>Who is this for?</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Dangote Cement, John Doe" className={INPUT} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Email (Optional)</label>
                  <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Phone Number</label>
                  <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+234 80..." className={INPUT} />
                </div>
              </div>
            </div>

            {/* Section 3 — Line Items */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'oklch(0.42 0.18 145)' }}>3</div>
                  <p className="text-xs font-bold tracking-widest uppercase text-ink-dim">Line Items</p>
                </div>

                {/* Currency selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCurrency(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-surface text-ink-muted hover:border-forest/40 hover:text-forest transition-colors"
                  >
                    {currency.code}
                    <span className="text-ink-dim" style={{ fontSize: '10px' }}>({currency.name.split(' ')[0]})</span>
                    <ChevronDown size={11} />
                  </button>
                  {showCurrency && (
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-xl overflow-hidden z-20 shadow-lg bg-white border border-border">
                      {CURRENCIES.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setCurrency(c); setShowCurrency(false) }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-surface"
                          style={{ color: c.code === currency.code ? 'oklch(0.42 0.18 145)' : undefined, fontWeight: c.code === currency.code ? 600 : undefined }}
                        >
                          <span className="font-bold w-5">{c.symbol}</span>
                          <span className="text-ink">{c.code}</span>
                          <span className="text-xs text-ink-dim ml-auto">{c.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-border">
                <div className="grid grid-cols-[1fr_72px_96px_32px] gap-2 px-3 py-2 text-xs font-semibold text-ink-dim bg-surface border-b border-border">
                  <span>Item / Service</span>
                  <span className="text-center">Qty</span>
                  <span className="text-center">Price ({currency.symbol})</span>
                  <span />
                </div>

                <div className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-[1fr_72px_96px_32px] gap-2 items-center px-3 py-2.5 bg-white">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-ink-dim shrink-0">{idx + 1}</span>
                        <input
                          value={item.description}
                          onChange={e => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-dim focus:outline-none"
                        />
                      </div>
                      <input
                        type="number"
                        value={item.qty}
                        min={1}
                        onChange={e => updateItem(item.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center bg-transparent text-sm text-ink focus:outline-none tabular-nums"
                      />
                      <input
                        type="number"
                        value={item.price || ''}
                        min={0}
                        step="0.01"
                        onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full text-center bg-transparent text-sm text-ink placeholder:text-ink-dim focus:outline-none tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-ink-dim hover:text-danger transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setItems(prev => [...prev, newItem()])}
                className="flex items-center gap-2 text-sm font-medium text-forest hover:text-forest-bright transition-colors"
              >
                <Plus size={15} /> Add Another Item
              </button>
            </div>

            {/* Section 4 — Additional Information */}
            <div className="bg-white rounded-xl border border-border p-5 space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'oklch(0.42 0.18 145)' }}>4</div>
                <p className="text-xs font-bold tracking-widest uppercase text-ink-dim">Additional Information</p>
              </div>

              {/* Payment Instructions */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-ink-muted">Payment Instructions</p>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={LABEL}>Bank Name</label>
                    <input
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="e.g. First Bank of Nigeria"
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Account Name</label>
                      <input
                        value={accountName}
                        onChange={e => setAccountName(e.target.value)}
                        placeholder="e.g. Your Business Ltd"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Account Number</label>
                      <input
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value)}
                        placeholder="e.g. 0123456789"
                        className={INPUT}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <label className={LABEL}>Payment Methods Accepted</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPaymentDropdown(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm border border-border bg-white text-ink-muted hover:border-forest/40 hover:text-ink transition-colors"
                    >
                      <span className={paymentMethods.length ? 'text-ink' : ''}>
                        {paymentMethods.length
                          ? paymentMethods.join(', ')
                          : 'Select payment methods…'
                        }
                      </span>
                      <ChevronDown size={14} className={`shrink-0 transition-transform ${showPaymentDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showPaymentDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20 shadow-lg bg-white border border-border">
                        {PAYMENT_OPTIONS.map(method => {
                          const selected = paymentMethods.includes(method)
                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => togglePaymentMethod(method)}
                              className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-surface transition-colors"
                            >
                              <span style={{ color: selected ? 'oklch(0.42 0.18 145)' : undefined, fontWeight: selected ? 600 : undefined }}>
                                {method}
                              </span>
                              {selected && <Check size={13} style={{ color: 'oklch(0.42 0.18 145)' }} />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Notes & Terms */}
              <div>
                <p className="text-xs font-semibold text-ink-muted mb-3">Notes &amp; Terms</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Thank you for your business."
                  className={INPUT + ' resize-none leading-relaxed'}
                />
              </div>
            </div>
          </div>

          {/* ── Preview + Actions ── */}
          <div className="order-1 lg:order-2 w-full space-y-4 lg:sticky lg:top-6">

            {/* Invoice preview */}
            <div ref={previewRef} id="receipt-printable">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-border">
                <div className="px-6 pt-6 pb-5 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-2xl text-ink font-bold" style={{ letterSpacing: '-0.02em' }}>Invoice</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink leading-snug">
                        {businessName || <span className="opacity-30">Your Business</span>}
                      </p>
                      {businessAddress && (
                        <p className="text-xs text-ink-dim mt-0.5 leading-snug max-w-[160px] ml-auto">{businessAddress}</p>
                      )}
                      <p className="text-xs text-ink-dim mt-1">{formattedDate}</p>
                    </div>
                  </div>
                  <p className="font-mono text-xs text-ink-dim mt-3">{receiptCode}</p>
                </div>

                <div className="px-6 py-4 border-b border-border">
                  <p className="text-xs font-bold tracking-widest uppercase text-ink-dim mb-1.5">Billed To</p>
                  <p className="text-sm font-semibold text-ink">
                    {clientName || <span className="opacity-30">Client Name</span>}
                  </p>
                  {(clientEmail || clientPhone) && (
                    <p className="text-xs text-ink-dim mt-0.5">{[clientEmail, clientPhone].filter(Boolean).join(' · ')}</p>
                  )}
                </div>

                <div className="px-6 py-4">
                  <div className="flex justify-between text-xs font-semibold text-ink-dim pb-2 border-b border-border">
                    <span>Item</span>
                    <span>Amt</span>
                  </div>
                  <div className="space-y-2.5 py-3">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-sm text-ink font-medium leading-snug">
                            {item.description || <span className="text-ink-dim opacity-50">Item Name</span>}
                          </p>
                          <p className="text-xs text-ink-dim">Qty: {item.qty}</p>
                        </div>
                        <p className="text-sm text-ink tabular-nums shrink-0">
                          {item.price > 0 ? `${currency.symbol}${(item.qty * item.price).toLocaleString()}` : <span className="text-ink-dim opacity-40">—</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="text-sm font-semibold text-ink">Total</span>
                    <span className="text-base font-bold text-ink tabular-nums">{currency.symbol}{subtotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment info in preview */}
                {(hasBankDetails || paymentMethods.length > 0) && (
                  <div className="px-6 py-4 border-t border-border space-y-2">
                    <p className="text-xs font-bold tracking-widest uppercase text-ink-dim">Payment Details</p>
                    {hasBankDetails && (
                      <div className="space-y-0.5">
                        {bankName && <p className="text-xs text-ink-muted">Bank: <span className="text-ink font-medium">{bankName}</span></p>}
                        {accountName && <p className="text-xs text-ink-muted">Account Name: <span className="text-ink font-medium">{accountName}</span></p>}
                        {accountNumber && <p className="text-xs text-ink-muted">Account No: <span className="text-ink font-medium">{accountNumber}</span></p>}
                      </div>
                    )}
                    {paymentMethods.length > 0 && (
                      <p className="text-xs text-ink-muted">Accepted: <span className="text-ink font-medium">{paymentMethods.join(', ')}</span></p>
                    )}
                  </div>
                )}

                {/* Notes in preview */}
                {notes.trim() && (
                  <div className="px-6 py-4 border-t border-border">
                    <p className="text-xs font-bold tracking-widest uppercase text-ink-dim mb-1.5">Notes</p>
                    <p className="text-xs text-ink-muted leading-relaxed">{notes}</p>
                  </div>
                )}

                <div className="px-6 py-4 text-center border-t-2 border-dashed border-border bg-surface">
                  <p className="text-xs text-ink-dim">Generated by DigitalReceipt.ng</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white bg-forest hover:bg-forest-bright transition-colors"
              >
                <Download size={16} /> Download PDF
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-border bg-white text-ink-muted hover:border-forest/40 hover:text-forest transition-colors"
                >
                  <Share2 size={14} /> Share
                </button>
                <button
                  type="button"
                  onClick={handleEmailClick}
                  disabled={emailLoading}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-border bg-white text-ink-muted hover:border-forest/40 hover:text-forest transition-colors disabled:opacity-60"
                >
                  {emailLoading ? <Loader2 size={14} className="animate-spin" /> : emailSent ? <Check size={14} className="text-forest" /> : <Mail size={14} />}
                  {emailLoading ? 'Sending…' : emailSent ? 'Sent!' : 'Email Invoice'}
                </button>
              </div>
            </div>

            {emailError && (
              <p className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{emailError}</p>
            )}

            {/* Upsell */}
            <div className="rounded-xl p-4 text-center space-y-2 bg-white border border-border">
              <p className="text-xs font-medium text-ink-muted">Want a verifiable receipt with a QR code?</p>
              <Link
                href="/generate"
                className="inline-block text-xs font-bold px-4 py-2 rounded-lg bg-forest text-white hover:bg-forest-bright transition-colors"
              >
                Create a verified receipt →
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Email prompt modal */}
      {showEmailPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEmailPrompt(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-ink">Enter recipient email</h3>
              <button type="button" onClick={() => setShowEmailPrompt(false)} className="text-ink-dim hover:text-ink transition-colors"><X size={16} /></button>
            </div>
            <p className="text-sm text-ink-muted">No customer email was entered. Enter the email address to send this invoice to.</p>
            <input
              type="email"
              value={promptEmail}
              onChange={e => setPromptEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && promptEmail.trim() && sendInvoiceEmail(promptEmail.trim())}
              placeholder="customer@example.com"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm text-ink border border-border focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
            />
            {emailError && <p className="text-xs text-danger">{emailError}</p>}
            <button
              type="button"
              onClick={() => promptEmail.trim() && sendInvoiceEmail(promptEmail.trim())}
              disabled={!promptEmail.trim() || emailLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-forest text-white hover:bg-forest-bright disabled:opacity-50 transition-colors"
            >
              {emailLoading ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <>Send Invoice</>}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
