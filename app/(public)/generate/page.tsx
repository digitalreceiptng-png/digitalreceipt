'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { formatNaira } from '@/lib/formatters'

interface Item {
  id: string
  description: string
  quantity: string
  unitPrice: string
  totalPrice: number
}

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
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
  const [items, setItems] = useState<Item[]>([newItem()])
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [sellerDisplayName, setSellerDisplayName] = useState('')
  const [tradingName, setTradingName] = useState('')
  const [showTradingName, setShowTradingName] = useState(false)
  const [error, setError] = useState('')

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)

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
      email, buyerName, buyerPhone, buyerEmail,
      items, transactionDate, paymentMethod, referenceNumber, notes,
      sellerDisplayName, tradingName,
    }))
    router.push('/generate/verify')
  }

  return (
    <div className="bg-surface min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6 pb-10">

        <div className="pt-2">
          <h1 className="font-heading text-3xl text-ink">Generate a Receipt</h1>
          <p className="text-sm text-ink-muted mt-1.5">
            Fill in the details below. You&apos;ll verify your identity on the next step.
          </p>
        </div>

        {/* ── Your account ── */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-heading text-lg text-ink">Your account</h2>
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
              This is your account username. Whenever you need to log in to view your receipts or generate new ones, a secure one-time code will be sent here. No password required.
            </p>
          </Field>
        </div>

        {/* ── Transaction details ── */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-6">
          <h2 className="font-heading text-lg text-ink">Transaction details</h2>

          {/* Buyer */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Buyer information</p>
            <Field label="Buyer name" required>
              <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} className={INPUT} placeholder="Full name of buyer" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Buyer phone" hint="optional">
                <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} className={INPUT} placeholder="08012345678" />
              </Field>
              <Field label="Buyer email" hint="optional">
                <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} className={INPUT} placeholder="buyer@example.com" />
              </Field>
            </div>
          </div>

          {/* Items */}
          <div className="border-t border-border pt-5 space-y-3">
            <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Items purchased</p>
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-[1fr_60px_120px_90px_32px] gap-2 px-1">
                <span className="text-xs text-ink-dim font-medium">Description</span>
                <span className="text-xs text-ink-dim font-medium text-center">Qty</span>
                <span className="text-xs text-ink-dim font-medium text-right">Unit price (₦)</span>
                <span className="text-xs text-ink-dim font-medium text-right">Total</span>
                <span />
              </div>
              {items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-[1fr_60px_120px_90px_32px] gap-2 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                    placeholder={`Item ${idx + 1}`}
                    className={INPUT}
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                    min="0.01"
                    step="0.01"
                    className={`${INPUT} text-center`}
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => updateItem(item.id, 'unitPrice', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={`${INPUT} text-right`}
                  />
                  <div className="px-2 py-2 bg-surface border border-border rounded-lg text-xs text-right text-ink-muted tabular-nums">
                    {item.totalPrice > 0 ? formatNaira(item.totalPrice) : '—'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== item.id) : prev)}
                    disabled={items.length === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems(prev => [...prev, newItem()])}
                className="flex items-center gap-2 text-sm text-forest/70 hover:text-forest font-medium px-1 mt-1 transition-colors"
              >
                <Plus size={14} />
                Add another item
              </button>
            </div>
            {subtotal > 0 && (
              <div className="flex justify-between items-center text-sm font-semibold text-ink border-t border-border pt-3">
                <span>Total</span>
                <span className="font-heading text-base">{formatNaira(subtotal)}</span>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="border-t border-border pt-5 space-y-4">
            <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Payment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        {/* ── Seller identity ── */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
          <h2 className="font-heading text-lg text-ink">Seller identity</h2>

          <Field label="Seller display name" hint="optional">
            <input
              type="text"
              value={sellerDisplayName}
              onChange={e => setSellerDisplayName(e.target.value)}
              className={INPUT}
              placeholder="Your name or business name as it appears on the receipt"
            />
            <p className="text-xs text-ink-dim mt-1.5">How your name appears on this receipt. Defaults to your email if left blank.</p>
          </Field>

          {/* Trading name — collapsible */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTradingName(!showTradingName)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-ink hover:bg-surface transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-forest/40" />
                <span>Add a trading name</span>
                <span className="text-xs text-ink-dim font-normal">(optional)</span>
              </div>
              {showTradingName
                ? <ChevronUp size={16} className="text-ink-dim" />
                : <ChevronDown size={16} className="text-ink-dim" />}
            </button>

            {showTradingName && (
              <div className="border-t border-border bg-surface/40 px-4 pt-4 pb-5 space-y-4">
                <p className="text-xs text-ink-muted leading-relaxed">
                  A trading name is a business alias permanently linked to your verified identity. Buyers see the legal name behind the business, preventing impersonation.
                </p>
                <Field label="Trading name">
                  <input
                    type="text"
                    value={tradingName}
                    onChange={e => setTradingName(e.target.value)}
                    className={INPUT}
                    placeholder="e.g. JTech Mobile Services"
                  />
                </Field>
                {(sellerDisplayName || tradingName) && (
                  <div className="bg-forest-light border border-forest/20 rounded-lg px-4 py-3">
                    <p className="text-xs text-ink-dim mb-1">Your receipt will show:</p>
                    <p className="text-sm font-semibold text-forest">
                      {tradingName
                        ? `${sellerDisplayName || 'Your Name'} (${tradingName})`
                        : sellerDisplayName}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 px-8 py-3.5 bg-forest text-white rounded-xl font-semibold text-sm hover:bg-forest-bright transition-colors"
          >
            Continue to verification
            <ArrowRight size={16} />
          </button>
        </div>

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
