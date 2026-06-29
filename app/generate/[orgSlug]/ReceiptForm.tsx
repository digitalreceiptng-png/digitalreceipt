'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Trash2, LogOut } from 'lucide-react'
import type { Branding } from './PinGate'
import SuccessScreen from './SuccessScreen'

interface Item {
  description: string
  quantity: number
  unitPrice: number
}

const RECEIPT_TYPES = [
  { value: 'silver',   label: 'Silver  — ₦100 / receipt (5 free/month)' },
  { value: 'gold',     label: 'Gold    — ₦200 / receipt' },
  { value: 'diamond',  label: 'Diamond — ₦500 / receipt' },
  { value: 'platinum', label: 'Platinum — ₦1,000 / receipt' },
]

const PAYMENT_METHODS = ['Cash', 'Transfer', 'Card', 'POS', 'Cheque', 'Other']

export default function ReceiptForm({ orgSlug, branding }: { orgSlug: string; branding: Branding }) {
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [receiptType, setReceiptType] = useState('silver')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<any>(null)

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)

  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof Item, val: string | number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  function resetForm() {
    setItems([{ description: '', quantity: 1, unitPrice: 0 }])
    setBuyerName('')
    setBuyerEmail('')
    setBuyerPhone('')
    setNotes('')
    setReceiptType('silver')
    setPaymentMethod('Cash')
    setError('')
    setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!buyerName.trim()) { setError('Customer name is required.'); return }
    if (items.some(it => !it.description.trim())) { setError('Each item needs a description.'); return }
    if (total <= 0) { setError('Total amount must be greater than zero.'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/org/${orgSlug}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(it => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })),
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim() || undefined,
          buyer_phone: buyerPhone.trim() || undefined,
          total_amount: total,
          receipt_type: receiptType,
          payment_method: paymentMethod,
          notes: notes.trim() || undefined,
          transaction_date: new Date().toISOString().split('T')[0],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to issue receipt. Please try again.')
      } else {
        setSuccess(data.receipt)
      }
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <SuccessScreen
        receipt={success}
        branding={branding}
        onNew={resetForm}
      />
    )
  }

  return (
    <div className="min-h-screen">
      {/* Sticky branded header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        {branding.logoUrl ? (
          <Image
            src={branding.logoUrl}
            alt={branding.businessName}
            width={36}
            height={36}
            className="rounded-xl object-contain shrink-0"
            style={{ maxHeight: 36 }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: branding.primaryColor }}
          >
            {branding.businessName[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{branding.businessName}</p>
          <p className="text-xs text-gray-400">Issue Receipt</p>
        </div>
        <button
          type="button"
          title="Sign out"
          onClick={() => {
            document.cookie = `org_session_${orgSlug}=; Max-Age=0; path=/`
            window.location.reload()
          }}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-10">

        {/* Customer section */}
        <Section title="Customer Details">
          <input
            type="text"
            placeholder="Customer name *"
            required
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
            className="input-field"
          />
          <input
            type="email"
            placeholder="Email address (optional)"
            value={buyerEmail}
            onChange={e => setBuyerEmail(e.target.value)}
            className="input-field"
          />
          <input
            type="tel"
            placeholder="Phone number (optional)"
            value={buyerPhone}
            onChange={e => setBuyerPhone(e.target.value)}
            className="input-field"
          />
        </Section>

        {/* Items section */}
        <Section title="Items">
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Item description *"
                    value={item.description}
                    onChange={e => updateItem(i, 'description', e.target.value)}
                    className="input-field flex-1"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="p-2.5 text-red-400 hover:text-red-600 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 pl-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="input-field mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 pl-1">Unit Price (₦)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
                      className="input-field mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 pl-1">Total</label>
                    <div className="input-field mt-0.5 bg-gray-50 text-gray-600 font-medium">
                      ₦{(item.quantity * item.unitPrice).toLocaleString('en-NG')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-sm font-medium mt-1"
            style={{ color: branding.primaryColor }}
          >
            <Plus size={14} /> Add item
          </button>

          <div
            className="flex justify-between items-center pt-3 mt-1 border-t"
            style={{ borderColor: `${branding.primaryColor}20` }}
          >
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold" style={{ color: branding.primaryColor }}>
              ₦{total.toLocaleString('en-NG')}
            </span>
          </div>
        </Section>

        {/* Settings section */}
        <Section title="Receipt Settings">
          <div>
            <label className="text-xs text-gray-500 pl-1">Receipt Type</label>
            <select
              value={receiptType}
              onChange={e => setReceiptType(e.target.value)}
              className="input-field mt-1 bg-white"
            >
              {RECEIPT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 pl-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="input-field mt-1 bg-white"
            >
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 pl-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes…"
              className="input-field mt-1 resize-none"
            />
          </div>
        </Section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50"
          style={{ background: branding.primaryColor }}
        >
          {loading ? 'Issuing Receipt…' : 'Issue Receipt'}
        </button>

        {branding.footerText && (
          <p className="text-center text-xs text-gray-400">{branding.footerText}</p>
        )}
        <p className="text-center text-[11px] text-gray-300">
          Powered by{' '}
          <a href="https://digitalreceipt.ng" target="_blank" rel="noreferrer" className="underline">
            DigitalReceipt.ng
          </a>
        </p>
      </form>

      {/* Shared input styles via a scoped style tag */}
      <style jsx global>{`
        .input-field {
          display: block;
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
          background: white;
          color: #111827;
        }
        .input-field:focus {
          border-color: ${branding.primaryColor};
          box-shadow: 0 0 0 3px ${branding.primaryColor}20;
        }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}
