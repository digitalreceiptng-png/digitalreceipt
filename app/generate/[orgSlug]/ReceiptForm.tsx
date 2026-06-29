'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Plus, Trash2, LogOut, CheckCircle2 } from 'lucide-react'
import { formatAmount, formatDate, CURRENCIES } from '@/lib/formatters'
import AmountInput from '@/components/ui/AmountInput'
import type { Branding } from './PinGate'
import SuccessScreen from './SuccessScreen'

// ─── types ────────────────────────────────────────────────────────────────────

interface FormItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
  totalPrice: number
}

interface FormData {
  buyerName: string
  buyerPhone: string
  buyerEmail: string
  buyerAddress: string
  currency: string
  transactionDate: string
  paymentMethod: string
  referenceNumber: string
  referenceLabel: string
  notes: string
  discount: string
  tax: string
  amountPaid: string
}

// ─── constants ────────────────────────────────────────────────────────────────

const STEPS = ['Type', 'Customer', 'Transaction', 'Items', 'Review']
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Cheque', 'Mobile Money', 'Other']

const INITIAL_FORM: FormData = {
  buyerName: '',
  buyerPhone: '',
  buyerEmail: '',
  buyerAddress: '',
  currency: 'NGN',
  transactionDate: new Date().toISOString().split('T')[0],
  paymentMethod: '',
  referenceNumber: '',
  referenceLabel: '',
  notes: '',
  discount: '',
  tax: '',
  amountPaid: '',
}

const TIERS = [
  {
    id: 'silver',
    name: 'Silver Receipt',
    price: '5 free/month',
    priceSub: '₦100 per receipt after',
    color: '#2d7a3e',
    colorLight: '#f0f9f2',
    features: ['Search-verifiable via receipt number or unique ID'],
  },
  {
    id: 'gold',
    name: 'Gold Receipt',
    price: '₦200',
    priceSub: 'per receipt',
    color: '#b45309',
    colorLight: '#fffbeb',
    features: ['Search-verifiable', 'QR code + tamper-proof verification', '5 years active QR code'],
  },
  {
    id: 'diamond',
    name: 'Diamond Receipt',
    price: '₦500',
    priceSub: 'per receipt',
    color: '#1d4ed8',
    colorLight: '#eff6ff',
    features: ['Search-verifiable', 'QR code + tamper-proof verification', 'Forever active QR code'],
  },
  {
    id: 'platinum',
    name: 'Platinum Receipt',
    price: '₦1,000',
    priceSub: 'per receipt',
    color: '#7c3aed',
    colorLight: '#f5f3ff',
    features: ['QR code + tamper-proof verification', 'Searchable with identifier', 'Forever active QR code'],
  },
]

function newItem(): FormItem {
  return { id: Math.random().toString(36).slice(2), description: '', quantity: '1', unitPrice: '', totalPrice: 0 }
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ReceiptForm({ orgSlug, branding }: { orgSlug: string; branding: Branding }) {
  const pc = branding.primaryColor  // shorthand for primary color

  const [step, setStep] = useState(1)
  const [receiptType, setReceiptType] = useState('silver')
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [items, setItems] = useState<FormItem[]>([newItem()])
  const [qtyLabel, setQtyLabel] = useState('Qty')
  const [priceLabel, setPriceLabel] = useState('Unit Price')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [walletError, setWalletError] = useState<{ required: number; balance: number; shortfall: number } | null>(null)
  const [success, setSuccess] = useState<any>(null)

  // computed totals
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)
  const discountAmt = parseFloat(form.discount) || 0
  const vatPct = parseFloat(form.tax) || 0
  const taxAmt = vatPct > 0 ? parseFloat(((subtotal - discountAmt) * vatPct / 100).toFixed(2)) : 0
  const total = subtotal - discountAmt + taxAmt
  const amountPaidNum = parseFloat(form.amountPaid) || 0
  const balanceDue = amountPaidNum > 0 && amountPaidNum < total ? parseFloat((total - amountPaidNum).toFixed(2)) : 0
  const overpaidAmt = amountPaidNum > total ? parseFloat((amountPaidNum - total).toFixed(2)) : 0

  // item helpers
  function addItem() { setItems(prev => [...prev, newItem()]) }
  function removeItem(id: string) { setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev) }
  function updateItem(id: string, field: keyof Omit<FormItem, 'id' | 'totalPrice'>, value: string) {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      const qty = parseFloat(updated.quantity) || 0
      const price = parseFloat(updated.unitPrice) || 0
      updated.totalPrice = parseFloat((qty * price).toFixed(2))
      return updated
    }))
  }

  function validateStep(): string | null {
    if (step === 2) {
      if (!form.buyerName.trim()) return 'Customer name is required.'
      if (!form.buyerPhone.trim()) return 'Customer phone number is required.'
    }
    if (step === 3) {
      if (!form.transactionDate) return 'Transaction date is required.'
      if (!form.paymentMethod) return 'Payment method is required.'
    }
    if (step === 4) {
      const allValid = items.every(i => i.description.trim() && parseFloat(i.quantity) > 0 && parseFloat(i.unitPrice) > 0)
      if (!allValid) return 'Each item needs a description, quantity greater than 0, and a unit price.'
      if (total <= 0) return 'Total amount must be greater than zero.'
      if (!form.amountPaid || parseFloat(form.amountPaid) <= 0) return 'Amount paid is required.'
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setWalletError(null)
    setStep(s => s + 1)
  }

  function back() { setError(''); setWalletError(null); setStep(s => s - 1) }

  function resetForm() {
    setStep(1)
    setReceiptType('silver')
    setForm(INITIAL_FORM)
    setItems([newItem()])
    setQtyLabel('Qty')
    setPriceLabel('Unit Price')
    setError('')
    setWalletError(null)
    setSuccess(null)
  }

  async function generate() {
    setError('')
    setWalletError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/org/${orgSlug}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_type: receiptType,
          buyer_name: form.buyerName,
          buyer_phone: form.buyerPhone,
          buyer_email: form.buyerEmail || undefined,
          buyer_address: form.buyerAddress || undefined,
          transaction_date: form.transactionDate,
          payment_method: form.paymentMethod,
          reference_number: form.referenceNumber || undefined,
          reference_label: form.referenceLabel.trim() || undefined,
          notes: form.notes || undefined,
          currency: form.currency,
          subtotal,
          discount: discountAmt,
          tax: taxAmt,
          total_amount: total,
          amount_paid: amountPaidNum || undefined,
          balance_due: balanceDue || undefined,
          overpaid: overpaidAmt || undefined,
          column_labels: { qty: qtyLabel, price: priceLabel },
          items: items.map(i => ({
            description: i.description,
            quantity: parseFloat(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
            totalPrice: i.totalPrice,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_BALANCE') {
          setWalletError({ required: data.required, balance: data.balance, shortfall: data.shortfall })
        } else {
          setError(data.error ?? 'Something went wrong. Please try again.')
        }
        return
      }
      setSuccess(data.receipt)
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <SuccessScreen receipt={success} branding={branding} onNew={resetForm} />
    )
  }

  const INPUT = `w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors`

  return (
    <div className="min-h-screen">
      {/* Sticky branded header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        {branding.logoUrl ? (
          <Image src={branding.logoUrl} alt={branding.businessName} width={36} height={36}
            className="rounded-xl object-contain shrink-0" style={{ maxHeight: 36 }} />
        ) : (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: pc }}>
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
          onClick={() => { document.cookie = `org_session_${orgSlug}=; Max-Age=0; path=/`; window.location.reload() }}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 pb-12 space-y-4">

        {/* Step indicator */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
          <div className="flex items-start justify-center">
            {STEPS.map((label, i) => {
              const num = i + 1
              const done = step > num
              const active = step === num
              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        background: (done || active) ? pc : '#f3f4f6',
                        color: (done || active) ? 'white' : '#9ca3af',
                        boxShadow: active ? `0 0 0 4px ${pc}25` : 'none',
                      }}
                    >
                      {done ? '✓' : num}
                    </div>
                    <span
                      className="hidden sm:block text-xs font-medium whitespace-nowrap"
                      style={{ color: active ? pc : '#9ca3af' }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="w-8 sm:w-10 h-px mb-4 mx-1 transition-colors"
                      style={{ background: done ? `${pc}60` : '#e5e7eb' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          {step === 1 && <Step1 receiptType={receiptType} setReceiptType={setReceiptType} pc={pc} />}
          {step === 2 && <Step2 form={form} setForm={setForm} INPUT={INPUT} pc={pc} />}
          {step === 3 && <Step3 form={form} setForm={setForm} INPUT={INPUT} pc={pc} />}
          {step === 4 && (
            <Step4
              items={items} form={form} setForm={setForm}
              subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} total={total}
              amountPaidNum={amountPaidNum} balanceDue={balanceDue} overpaidAmt={overpaidAmt}
              addItem={addItem} removeItem={removeItem} updateItem={updateItem}
              qtyLabel={qtyLabel} setQtyLabel={setQtyLabel}
              priceLabel={priceLabel} setPriceLabel={setPriceLabel}
              currency={form.currency} pc={pc} INPUT={INPUT}
            />
          )}
          {step === 5 && (
            <Step5
              form={form} items={items} receiptType={receiptType}
              subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} vatPct={vatPct}
              total={total} amountPaidNum={amountPaidNum} balanceDue={balanceDue} overpaidAmt={overpaidAmt}
              qtyLabel={qtyLabel} priceLabel={priceLabel} currency={form.currency} pc={pc}
            />
          )}

          {/* Wallet error */}
          {walletError && (
            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
              <p className="font-semibold">Insufficient wallet balance</p>
              <p className="mt-0.5 text-orange-700">
                This receipt costs <strong>₦{walletError.required.toLocaleString()}</strong>. Current balance:{' '}
                <strong>₦{walletError.balance.toLocaleString()}</strong>. Shortfall:{' '}
                <strong>₦{walletError.shortfall.toLocaleString()}</strong>.
              </p>
              <p className="mt-2 text-xs text-orange-600">Please ask the account owner to top up the wallet.</p>
            </div>
          )}

          {/* Generic error */}
          {error && (
            <div className="mt-5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center">
          {step > 1 ? (
            <button
              onClick={back}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors bg-white"
            >
              <ArrowLeft size={15} />
              Back
            </button>
          ) : <div />}

          {step < 5 ? (
            <button
              onClick={next}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: pc }}
            >
              Continue
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              onClick={generate}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: pc }}
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating…</>
              ) : (
                <><CheckCircle2 size={15} />Generate Receipt</>
              )}
            </button>
          )}
        </div>

        {branding.footerText && (
          <p className="text-center text-xs text-gray-400 pt-2">{branding.footerText}</p>
        )}
        <p className="text-center text-[11px] text-gray-300">
          Powered by{' '}
          <a href="https://digitalreceipt.ng" target="_blank" rel="noreferrer" className="underline">
            DigitalReceipt.ng
          </a>
        </p>
      </div>

      <style jsx global>{`
        .gen-input:focus {
          border-color: ${pc} !important;
          box-shadow: 0 0 0 3px ${pc}25 !important;
        }
      `}</style>
    </div>
  )
}

// ─── step 1: receipt type ─────────────────────────────────────────────────────

function Step1({ receiptType, setReceiptType, pc }: { receiptType: string; setReceiptType: (t: string) => void; pc: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-lg text-gray-900">Choose receipt type</h2>
        <p className="text-sm text-gray-500 mt-1">Select the type of receipt to generate.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TIERS.map(tier => {
          const selected = receiptType === tier.id
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => setReceiptType(tier.id)}
              className="text-left rounded-xl p-4 border-2 transition-all"
              style={{
                borderColor: selected ? tier.color : '#e5e7eb',
                background: selected ? tier.colorLight : 'white',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all"
                  style={{
                    borderColor: selected ? tier.color : '#d1d5db',
                    background: selected ? tier.color : 'transparent',
                  }}
                >
                  {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm" style={{ color: tier.color }}>{tier.name}</p>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold leading-tight" style={{ color: tier.color }}>{tier.price}</p>
                      <p className="text-xs text-gray-400 leading-tight">{tier.priceSub}</p>
                    </div>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {tier.features.map((f, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0" style={{ color: tier.color }}>·</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── step 2: customer ─────────────────────────────────────────────────────────

function Step2({ form, setForm, INPUT, pc }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>; INPUT: string; pc: string }) {
  const bind = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }))
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-lg text-gray-900">Customer details</h2>
        <p className="text-sm text-gray-500 mt-1">Who is this receipt being issued to?</p>
      </div>
      <GField label="Customer's name" required>
        <input type="text" value={form.buyerName} onChange={bind('buyerName')}
          placeholder="Full name" className={`${INPUT} gen-input`} autoFocus />
      </GField>
      <GField label="Phone number" required>
        <input type="tel" value={form.buyerPhone} onChange={bind('buyerPhone')}
          placeholder="+234…" className={`${INPUT} gen-input`} />
      </GField>
      <GField label="Email address" hint="optional">
        <input type="email" value={form.buyerEmail} onChange={bind('buyerEmail')}
          placeholder="buyer@example.com" className={`${INPUT} gen-input`} />
      </GField>
      <GField label="Address" hint="optional">
        <input type="text" value={form.buyerAddress} onChange={bind('buyerAddress')}
          placeholder="Street, City, State" className={`${INPUT} gen-input`} />
      </GField>
    </div>
  )
}

// ─── step 3: transaction ──────────────────────────────────────────────────────

function Step3({ form, setForm, INPUT, pc }: { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>; INPUT: string; pc: string }) {
  const bind = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }))
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-lg text-gray-900">Transaction details</h2>
        <p className="text-sm text-gray-500 mt-1">When and how was payment received?</p>
      </div>
      <GField label="Currency" required>
        <select value={form.currency} onChange={bind('currency')} className={`${INPUT} gen-input bg-white`}>
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.symbol} — {c.name}</option>
          ))}
        </select>
      </GField>
      <GField label="Transaction date" required>
        <input type="date" value={form.transactionDate} onChange={bind('transactionDate')}
          className={`${INPUT} gen-input`} />
      </GField>
      <GField label="Payment method" required>
        <select value={form.paymentMethod} onChange={bind('paymentMethod')} className={`${INPUT} gen-input bg-white`}>
          <option value="">Select payment method…</option>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </GField>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={form.referenceLabel}
            onChange={bind('referenceLabel')}
            placeholder="Reference label"
            className="font-medium text-sm text-gray-700 bg-transparent border-b border-dashed border-gray-300 focus:border-gray-500 focus:outline-none w-40 pb-0.5"
          />
          <span className="text-xs text-gray-400">(optional)</span>
        </div>
        <input type="text" value={form.referenceNumber} onChange={bind('referenceNumber')}
          placeholder="e.g. TRF-2026-001" className={`${INPUT} gen-input`} />
      </div>
      <GField label="Notes" hint="optional">
        <textarea value={form.notes} onChange={bind('notes')} rows={3}
          placeholder="Any additional notes…" className={`${INPUT} gen-input resize-none`} />
      </GField>
    </div>
  )
}

// ─── step 4: items ────────────────────────────────────────────────────────────

interface Step4Props {
  items: FormItem[]; form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>
  subtotal: number; discountAmt: number; taxAmt: number; total: number
  amountPaidNum: number; balanceDue: number; overpaidAmt: number
  addItem: () => void; removeItem: (id: string) => void
  updateItem: (id: string, field: keyof Omit<FormItem, 'id' | 'totalPrice'>, value: string) => void
  qtyLabel: string; setQtyLabel: (v: string) => void
  priceLabel: string; setPriceLabel: (v: string) => void
  currency: string; pc: string; INPUT: string
}

function Step4({ items, form, setForm, subtotal, discountAmt, taxAmt, total, amountPaidNum, balanceDue, overpaidAmt, addItem, removeItem, updateItem, qtyLabel, setQtyLabel, priceLabel, setPriceLabel, currency, pc, INPUT }: Step4Props) {
  const currencyName = CURRENCIES.find(c => c.code === currency)?.name ?? currency
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-lg text-gray-900">Items &amp; amounts</h2>
        <p className="text-sm text-gray-500 mt-1">List goods or services provided. All amounts in {currencyName}.</p>
      </div>

      <div className="space-y-2">
        {/* Desktop header */}
        <div className="hidden sm:grid grid-cols-[1fr_64px_110px_92px_32px] gap-2 px-1 text-xs text-gray-400 font-medium items-center">
          <span>Description</span>
          <input value={qtyLabel} onChange={e => setQtyLabel(e.target.value)}
            className="text-center text-xs font-medium text-gray-400 bg-transparent border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-gray-400 w-full" />
          <input value={priceLabel} onChange={e => setPriceLabel(e.target.value)}
            className="text-center text-xs font-medium text-gray-400 bg-transparent border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-gray-400 w-full" />
          <span className="text-right">Total</span>
          <span />
        </div>

        {/* Desktop rows */}
        {items.map(item => (
          <div key={item.id} className="hidden sm:grid grid-cols-[1fr_64px_110px_92px_32px] gap-2 items-center">
            <input type="text" value={item.description}
              onChange={e => updateItem(item.id, 'description', e.target.value)}
              placeholder="Item description" className={`${INPUT} gen-input`} />
            <AmountInput value={item.quantity} onChange={v => updateItem(item.id, 'quantity', v)}
              min={0} step={0.01} className={`${INPUT} gen-input text-center`} placeholder="1" />
            <AmountInput value={item.unitPrice} onChange={v => updateItem(item.id, 'unitPrice', v)}
              min={0} step={0.01} placeholder="0.00" className={`${INPUT} gen-input text-right`} />
            <div className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-right text-gray-500 tabular-nums">
              {item.totalPrice > 0 ? item.totalPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '—'}
            </div>
            <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {/* Mobile rows */}
        {items.map(item => (
          <div key={`m-${item.id}`} className="sm:hidden space-y-1.5">
            <input type="text" value={item.description}
              onChange={e => updateItem(item.id, 'description', e.target.value)}
              placeholder="Item description" className={`${INPUT} gen-input w-full`} />
            <div className="grid grid-cols-[1fr_100px_72px_28px] gap-1.5 items-center">
              <input value={qtyLabel} onChange={e => setQtyLabel(e.target.value)}
                className="text-center text-xs font-medium text-gray-400 bg-transparent border border-gray-200 rounded px-1 py-0.5 focus:outline-none w-full" />
              <input value={priceLabel} onChange={e => setPriceLabel(e.target.value)}
                className="text-center text-xs font-medium text-gray-400 bg-transparent border border-gray-200 rounded px-1 py-0.5 focus:outline-none w-full" />
              <span className="text-xs text-gray-400 text-right">Total</span>
              <span />
            </div>
            <div className="grid grid-cols-[1fr_100px_72px_28px] gap-1.5 items-center">
              <AmountInput value={item.quantity} onChange={v => updateItem(item.id, 'quantity', v)}
                min={0} step={0.01} className={`${INPUT} gen-input text-center`} placeholder="1" />
              <AmountInput value={item.unitPrice} onChange={v => updateItem(item.id, 'unitPrice', v)}
                min={0} step={0.01} placeholder="0.00" className={`${INPUT} gen-input text-right`} />
              <div className="px-1 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-right text-gray-500 tabular-nums">
                {item.totalPrice > 0 ? item.totalPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '—'}
              </div>
              <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        <button type="button" onClick={addItem}
          className="flex items-center gap-2 text-sm font-medium px-1 mt-1 transition-opacity hover:opacity-75"
          style={{ color: pc }}>
          <Plus size={15} />
          Add item
        </button>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium text-gray-900">{formatAmount(subtotal, currency)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="text-gray-500 w-24 shrink-0">Discount</label>
          <AmountInput value={form.discount} onChange={v => setForm(p => ({ ...p, discount: v }))}
            min={0} step={0.01} placeholder="0.00" className={`${INPUT} gen-input flex-1 text-right`} />
          {discountAmt > 0 && <span className="text-gray-500 shrink-0 w-28 text-right">−{formatAmount(discountAmt, currency)}</span>}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="text-gray-500 w-24 shrink-0">VAT (%)</label>
          <input type="number" value={form.tax} onChange={e => setForm(p => ({ ...p, tax: e.target.value }))}
            min="0" max="100" step="0.5" placeholder="0"
            className={`${INPUT} gen-input flex-1 text-right`} />
          {taxAmt > 0 && <span className="text-gray-500 shrink-0 w-28 text-right">+{formatAmount(taxAmt, currency)}</span>}
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
          <span>TOTAL</span>
          <span className="text-lg" style={{ color: pc }}>{formatAmount(total, currency)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm pt-2 border-t border-gray-100">
          <label className="text-gray-500 w-24 shrink-0">Amount Paid</label>
          <AmountInput value={form.amountPaid} onChange={v => setForm(p => ({ ...p, amountPaid: v }))}
            min={0} step={0.01} placeholder="0.00" className={`${INPUT} gen-input flex-1 text-right`} />
          {amountPaidNum > 0 && <span className="text-gray-500 shrink-0 w-28 text-right">{formatAmount(amountPaidNum, currency)}</span>}
        </div>
        {balanceDue > 0 && (
          <div className="flex justify-between text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <span>Balance Due</span><span>{formatAmount(balanceDue, currency)}</span>
          </div>
        )}
        {overpaidAmt > 0 && (
          <div className="flex justify-between text-sm font-semibold text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
            <span>Overpaid</span><span>{formatAmount(overpaidAmt, currency)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── step 5: review ───────────────────────────────────────────────────────────

interface Step5Props {
  form: FormData; items: FormItem[]; receiptType: string
  subtotal: number; discountAmt: number; taxAmt: number; vatPct: number
  total: number; amountPaidNum: number; balanceDue: number; overpaidAmt: number
  qtyLabel: string; priceLabel: string; currency: string; pc: string
}

function Step5({ form, items, receiptType, subtotal, discountAmt, taxAmt, vatPct, total, amountPaidNum, balanceDue, overpaidAmt, qtyLabel, priceLabel, currency, pc }: Step5Props) {
  const tier = TIERS.find(t => t.id === receiptType) ?? TIERS[0]
  const currencyLabel = CURRENCIES.find(c => c.code === currency)?.name ?? currency
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-lg text-gray-900">Review &amp; generate</h2>
        <p className="text-sm text-gray-500 mt-1">Confirm all details are correct before generating.</p>
      </div>
      <div className="space-y-3 text-sm">
        <GReviewSection title="Receipt Type" pc={pc}>
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: tier.color }}>{tier.name}</span>
          </div>
          <GReviewRow label="Currency" value={currencyLabel} />
        </GReviewSection>
        <GReviewSection title="Customer" pc={pc}>
          <GReviewRow label="Name" value={form.buyerName} />
          <GReviewRow label="Phone" value={form.buyerPhone} />
          {form.buyerEmail && <GReviewRow label="Email" value={form.buyerEmail} />}
          {form.buyerAddress && <GReviewRow label="Address" value={form.buyerAddress} />}
        </GReviewSection>
        <GReviewSection title="Transaction" pc={pc}>
          <GReviewRow label="Date" value={formatDate(form.transactionDate)} />
          <GReviewRow label="Payment Method" value={form.paymentMethod} />
          {form.referenceNumber && <GReviewRow label={form.referenceLabel.trim() || 'Reference'} value={form.referenceNumber} />}
          {form.notes && <GReviewRow label="Notes" value={form.notes} />}
        </GReviewSection>
        <GReviewSection title="Items" pc={pc}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-100">
                <th className="text-left pb-1.5 font-medium">Description</th>
                <th className="text-right pb-1.5 font-medium">{qtyLabel}</th>
                <th className="text-right pb-1.5 font-medium">{priceLabel}</th>
                <th className="text-right pb-1.5 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-2 text-gray-900">{item.description}</td>
                  <td className="py-1.5 text-right text-gray-500">{item.quantity}</td>
                  <td className="py-1.5 text-right text-gray-500">{formatAmount(parseFloat(item.unitPrice) || 0, currency)}</td>
                  <td className="py-1.5 text-right font-medium text-gray-900">{formatAmount(item.totalPrice, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-100">
            <GReviewRow label="Subtotal" value={formatAmount(subtotal, currency)} />
            {discountAmt > 0 && <GReviewRow label="Discount" value={`−${formatAmount(discountAmt, currency)}`} />}
            {taxAmt > 0 && <GReviewRow label={`VAT (${vatPct}%)`} value={formatAmount(taxAmt, currency)} />}
            <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-100">
              <span>TOTAL</span>
              <span className="text-lg" style={{ color: pc }}>{formatAmount(total, currency)}</span>
            </div>
            {amountPaidNum > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <GReviewRow label="Amount Paid" value={formatAmount(amountPaidNum, currency)} />
                {balanceDue > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-red-600">
                    <span>Balance Due</span><span>{formatAmount(balanceDue, currency)}</span>
                  </div>
                )}
                {overpaidAmt > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-green-700">
                    <span>Overpaid</span><span>{formatAmount(overpaidAmt, currency)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </GReviewSection>
      </div>
    </div>
  )
}

// ─── shared helpers ───────────────────────────────────────────────────────────

function GField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-gray-400 font-normal ml-1.5 text-xs">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

function GReviewSection({ title, children, pc }: { title: string; children: React.ReactNode; pc: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: `${pc}99` }}>{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function GReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}
