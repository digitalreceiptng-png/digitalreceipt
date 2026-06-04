'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react'
import { formatNaira } from '@/lib/formatters'

interface Item {
  id: string
  description: string
  quantity: string
  unitPrice: string
  totalPrice: number
}

const INPUT = 'w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Cheque', 'Mobile Money', 'Other']

function newItem(): Item {
  return { id: Math.random().toString(36).slice(2), description: '', quantity: '1', unitPrice: '', totalPrice: 0 }
}

export default function GeneratePage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [items, setItems] = useState<Item[]>([newItem()])
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [sellerDisplayName, setSellerDisplayName] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [issuerMode, setIssuerMode] = useState<'individual' | 'business'>('individual')
  const [error, setError] = useState('')
  const [vatPercent, setVatPercent] = useState('')

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)
  const vatAmount = parseFloat(vatPercent) > 0 ? parseFloat((subtotal * parseFloat(vatPercent) / 100).toFixed(2)) : 0
  const total = subtotal + vatAmount

  function updateItem(id: string, field: keyof Omit<Item, 'id' | 'totalPrice'>, value: string) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        updated.totalPrice = parseFloat(
          ((parseFloat(updated.quantity) || 0) * (parseFloat(updated.unitPrice) || 0)).toFixed(2)
        )
        return updated
      })
    )
  }

  function validate(): string | null {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'A valid email address is required.'
    if (!buyerName.trim()) return 'Buyer name is required.'
    if (!transactionDate) return 'Transaction date is required.'
    if (!paymentMethod) return 'Payment method is required.'
    const allValid = items.every(
      i => i.description.trim() && parseFloat(i.quantity) > 0 && parseFloat(i.unitPrice) > 0
    )
    if (!allValid) return 'Each item needs a description, quantity, and unit price.'
    if (subtotal <= 0) return 'Total must be greater than zero.'
    return null
  }

  function handleContinue() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    sessionStorage.setItem('dr_generate', JSON.stringify({
      email, buyerName, buyerPhone, buyerEmail, buyerAddress,
      items, transactionDate, paymentMethod, referenceNumber, notes,
      sellerDisplayName, tradingName,
      vatPercent, vatAmount, subtotal, total,
    }))
    router.push('/generate/verify')
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 space-y-4 pb-12">

        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors">
          <ArrowLeft size={16} />
          Back to home
        </button>

        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-ink">Generate a Receipt</h1>
          <p className="text-sm text-ink-muted mt-1">
            Fill in the details below. You&apos;ll verify your identity on the next step.
          </p>
        </div>

        {/* ── Your account ── */}
        <section className="bg-white rounded-2xl border border-border p-4 sm:p-6 space-y-4">
          <h2 className="font-heading text-base sm:text-lg text-ink">Your account</h2>
          <Field label="Email address" required>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={INPUT}
              placeholder="you@example.com"
              autoFocus
            />
            <p className="text-xs text-ink-dim mt-1.5 leading-relaxed">
              A secure one-time code will be sent here when you log in. No password required.
            </p>
          </Field>
        </section>

        {/* ── Transaction details ── */}
        <section className="bg-white rounded-2xl border border-border p-4 sm:p-6 space-y-5">
          <h2 className="font-heading text-base sm:text-lg text-ink">Transaction details</h2>

          {/* Buyer */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Buyer information</p>
            <Field label="Buyer name" required>
              <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} className={INPUT} placeholder="Full name of buyer" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Buyer phone" hint="optional">
                <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} className={INPUT} placeholder="08012345678" />
              </Field>
              <Field label="Buyer email" hint="optional">
                <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} className={INPUT} placeholder="buyer@example.com" />
              </Field>
            </div>
            <Field label="Buyer address" hint="optional">
              <input type="text" value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} className={INPUT} placeholder="Street, City, State" />
            </Field>
          </div>

          {/* Items */}
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Items purchased</p>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-border bg-surface/50 p-3 space-y-2">
                  {/* Description row */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      placeholder={`Item ${idx + 1} description`}
                      className={`${INPUT} flex-1 min-w-0`}
                    />
                    <button
                      type="button"
                      onClick={() => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== item.id) : prev)}
                      disabled={items.length === 1}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Qty + Price + Total row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-ink-dim">Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                        min="0.01"
                        step="0.01"
                        className={`${INPUT} text-center`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-ink-dim">Unit price (₦)</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, 'unitPrice', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className={`${INPUT} text-right`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-ink-dim">Total</label>
                      <div className="px-2 py-2.5 bg-white border border-border rounded-lg text-xs text-right text-ink-muted tabular-nums">
                        {item.totalPrice > 0 ? formatNaira(item.totalPrice) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setItems(prev => [...prev, newItem()])}
                className="flex items-center gap-2 text-sm text-forest/70 hover:text-forest font-medium py-1 transition-colors"
              >
                <Plus size={14} />
                Add another item
              </button>
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-3 space-y-2.5">
              {subtotal > 0 && (
                <div className="flex justify-between text-sm text-ink-muted">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatNaira(subtotal)}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-muted">VAT</span>
                  <div className="relative w-20">
                    <input
                      type="number"
                      value={vatPercent}
                      onChange={e => setVatPercent(e.target.value)}
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="0"
                      className="w-full pl-3 pr-6 py-1.5 border border-border rounded-lg text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-dim pointer-events-none">%</span>
                  </div>
                </div>
                <span className="text-sm text-ink-muted tabular-nums">
                  {vatAmount > 0 ? `+ ${formatNaira(vatAmount)}` : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center font-semibold text-ink border-t border-border pt-2.5">
                <span className="text-sm">Total</span>
                <span className="font-heading text-base tabular-nums">{formatNaira(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Payment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Transaction date" required>
                <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} className={INPUT} />
              </Field>
              <Field label="Payment method" required>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={INPUT}>
                  <option value="">Select method…</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Reference number" hint="optional">
              <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className={INPUT} placeholder="e.g. TRF-2026-001" />
            </Field>
            <Field label="Notes" hint="optional">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${INPUT} resize-none`} placeholder="Any additional notes…" />
            </Field>
          </div>
        </section>

        {/* ── Issuer identity ── */}
        <section className="bg-white rounded-2xl border border-border p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="font-heading text-base sm:text-lg text-ink">Issuer identity verification</h2>
            <p className="text-xs text-ink-dim mt-0.5">How should this receipt identify you?</p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => { setIssuerMode('individual'); setTradingName('') }}
              className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors ${
                issuerMode === 'individual'
                  ? 'bg-forest text-white'
                  : 'bg-white text-ink-muted hover:bg-surface'
              }`}
            >
              Issue as an individual
            </button>
            <button
              type="button"
              onClick={() => setIssuerMode('business')}
              className={`flex-1 py-3 text-xs sm:text-sm font-medium border-l border-border transition-colors ${
                issuerMode === 'business'
                  ? 'bg-forest text-white'
                  : 'bg-white text-ink-muted hover:bg-surface'
              }`}
            >
              Issue as a business
            </button>
          </div>

          {issuerMode === 'individual' ? null : (
            <div className="space-y-3">
              <Field label="Business name" hint="optional">
                <input
                  type="text"
                  value={sellerDisplayName}
                  onChange={e => setSellerDisplayName(e.target.value)}
                  className={INPUT}
                  placeholder="e.g. JTech Mobile Services"
                />
                <p className="text-xs text-ink-dim mt-1.5">The name buyers see on the receipt. Defaults to your email if left blank.</p>
              </Field>
              <Field label="Trading name" hint="optional">
                <input
                  type="text"
                  value={tradingName}
                  onChange={e => setTradingName(e.target.value)}
                  className={INPUT}
                  placeholder="Legal registered name (if different from above)"
                />
                <p className="text-xs text-ink-dim mt-1.5">Permanently linked to your verified identity — buyers can confirm the real entity behind the business name.</p>
              </Field>
              {(sellerDisplayName || tradingName) && (
                <div className="bg-forest-light border border-forest/20 rounded-lg px-4 py-3">
                  <p className="text-xs text-ink-dim mb-1">Your receipt will show:</p>
                  <p className="text-sm font-semibold text-forest">
                    {tradingName
                      ? `${sellerDisplayName || 'Your Business'} (${tradingName})`
                      : sellerDisplayName}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {error && (
          <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
        )}

        <button
          onClick={handleContinue}
          className="w-full flex items-center justify-center gap-2 py-4 bg-forest text-white rounded-xl font-semibold text-sm hover:bg-forest-bright transition-colors"
        >
          Continue to verification
          <ArrowRight size={16} />
        </button>

      </div>
    </div>
  )
}

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
        {hint && <span className="text-ink-dim font-normal ml-1.5 text-xs">({hint})</span>}
      </label>
      {children}
    </div>
  )
}
