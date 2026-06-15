'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle, Download, Wallet } from 'lucide-react'
import { formatNaira, formatDate } from '@/lib/formatters'

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
  transactionDate: string
  paymentDate: string
  paymentMethod: string
  referenceNumber: string
  notes: string
  discount: string
  tax: string
}

interface Generated {
  id: string
  receiptNumber: string
  identifier: string
}

const STEPS = ['Type', 'Customer', 'Transaction', 'Items', 'Review']
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Cheque', 'Mobile Money', 'Other']

const INITIAL_FORM: FormData = {
  buyerName: '',
  buyerPhone: '',
  buyerEmail: '',
  transactionDate: new Date().toISOString().split('T')[0],
  paymentDate: '',
  paymentMethod: '',
  referenceNumber: '',
  notes: '',
  discount: '',
  tax: '',
}

const INPUT = 'w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

function newItem(): FormItem {
  return { id: Math.random().toString(36).slice(2), description: '', quantity: '1', unitPrice: '', totalPrice: 0 }
}

export default function NewReceiptPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [receiptType, setReceiptType] = useState('silver')
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [items, setItems] = useState<FormItem[]>([newItem()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [walletError, setWalletError] = useState<{ required: number; balance: number; shortfall: number } | null>(null)
  const [generated, setGenerated] = useState<Generated | null>(null)

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)
  const discountAmt = parseFloat(form.discount) || 0
  const taxAmt = parseFloat(form.tax) || 0
  const total = subtotal - discountAmt + taxAmt

  function addItem() { setItems(prev => [...prev, newItem()]) }
  function removeItem(id: string) { setItems(prev => (prev.length > 1 ? prev.filter(i => i.id !== id) : prev)) }

  function updateItem(id: string, field: keyof Omit<FormItem, 'id' | 'totalPrice'>, value: string) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        const qty = parseFloat(updated.quantity) || 0
        const price = parseFloat(updated.unitPrice) || 0
        updated.totalPrice = parseFloat((qty * price).toFixed(2))
        return updated
      })
    )
  }

  function validateStep(): string | null {
    if (step === 2) {
      if (!form.buyerName.trim()) return 'Buyer name is required.'
      if (!form.buyerPhone.trim()) return 'Buyer phone number is required.'
    }
    if (step === 3) {
      if (!form.transactionDate) return 'Transaction date is required.'
      if (!form.paymentMethod) return 'Payment method is required.'
    }
    if (step === 4) {
      const allValid = items.every(i => i.description.trim() && parseFloat(i.quantity) > 0 && parseFloat(i.unitPrice) > 0)
      if (!allValid) return 'Each item needs a description, quantity greater than 0, and a unit price.'
      if (total <= 0) return 'Total amount must be greater than zero.'
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  function back() { setError(''); setStep(s => s - 1) }

  async function generate() {
    setError('')
    setWalletError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_type: receiptType,
          buyer_name: form.buyerName,
          buyer_phone: form.buyerPhone,
          buyer_email: form.buyerEmail || undefined,
          transaction_date: form.transactionDate,
          payment_date: form.paymentDate || undefined,
          payment_method: form.paymentMethod,
          reference_number: form.referenceNumber || undefined,
          notes: form.notes || undefined,
          subtotal, discount: discountAmt, tax: taxAmt, total_amount: total,
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
      setGenerated({ id: data.receipt.id, receiptNumber: data.receipt.receipt_number, identifier: data.receipt.unique_identifier })
    } finally {
      setSubmitting(false)
    }
  }

  if (generated) {
    const verifyUrl = `${window.location.origin}/r/${generated.identifier}`
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={28} className="text-forest" />
          </div>
          <div>
            <h2 className="font-heading text-2xl text-ink">Receipt Generated</h2>
            <p className="text-sm text-ink-muted mt-1">Stored securely and ready to share.</p>
          </div>
          <div className="bg-surface rounded-xl p-4 text-left space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted shrink-0">Receipt No.</span>
              <span className="font-mono font-medium text-ink">{generated.receiptNumber}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted shrink-0">Identifier</span>
              <span className="font-mono font-medium text-ink">{generated.identifier}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted shrink-0">Verify URL</span>
              <a href={verifyUrl} className="text-forest/70 hover:text-forest break-all text-right transition-colors">{verifyUrl}</a>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center pt-1">
            <a href={`/api/receipts/${generated.id}/pdf`} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white">
              <Download size={15} />
              Download PDF
            </a>
            <Link href={`/dashboard/receipts/${generated.id}`} className="flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
              View Receipt
            </Link>
            <button onClick={() => { setGenerated(null); setStep(1); setReceiptType('silver'); setForm(INITIAL_FORM); setItems([newItem()]) }} className="px-4 py-2.5 text-sm text-ink-muted hover:text-forest transition-colors">
              Generate Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <button onClick={() => router.push('/dashboard/receipts')} className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
        <ArrowLeft size={15} />
        Back to Receipts
      </button>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {/* Step indicator */}
        <div className="px-6 py-4 border-b border-border bg-surface/60">
          <div className="flex items-start justify-center">
            {STEPS.map((label, i) => {
              const num = i + 1
              const done = step > num
              const active = step === num
              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done ? 'bg-forest text-white'
                          : active ? 'bg-forest text-white ring-4 ring-forest/15'
                          : 'bg-surface-raised text-ink-dim'
                      }`}
                    >
                      {done ? '✓' : num}
                    </div>
                    <span className={`hidden sm:block text-xs font-medium whitespace-nowrap ${active ? 'text-forest' : 'text-ink-dim'}`}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 sm:w-10 h-px mb-4 mx-1 transition-colors ${done ? 'bg-forest/50' : 'bg-border'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && <Step1 receiptType={receiptType} setReceiptType={setReceiptType} />}
          {step === 2 && <Step2 form={form} setForm={setForm} />}
          {step === 3 && <Step3 form={form} setForm={setForm} />}
          {step === 4 && <Step4 items={items} form={form} setForm={setForm} subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} total={total} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
          {step === 5 && <Step5 form={form} items={items} receiptType={receiptType} subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} total={total} />}

          {walletError && (
            <div className="mt-5 rounded-xl border p-4 space-y-3" style={{ background: 'oklch(0.97 0.025 75)', borderColor: 'oklch(0.84 0.08 75)' }}>
              <div className="flex items-start gap-3">
                <Wallet size={18} style={{ color: 'oklch(0.55 0.15 75)', marginTop: 1 }} className="shrink-0" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'oklch(0.40 0.12 75)' }}>Insufficient wallet balance</p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0.10 75)' }}>
                    This receipt costs <strong>{formatNaira(walletError.required)}</strong>. Your balance is{' '}
                    <strong>{formatNaira(walletError.balance)}</strong>. You need{' '}
                    <strong>{formatNaira(walletError.shortfall)}</strong> more.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/wallet"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: 'oklch(0.55 0.15 75)' }}
              >
                <Wallet size={14} />
                Fund Wallet
              </Link>
            </div>
          )}

          {error && (
            <div className="mt-5 text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</div>
          )}
        </div>

        <div className="px-6 pb-6 flex justify-between items-center">
          {step > 1 ? (
            <button onClick={back} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-ink-muted hover:border-border-bright hover:text-ink transition-colors bg-white">
              <ArrowLeft size={15} />
              Back
            </button>
          ) : <div />}

          {step < 5 ? (
            <button onClick={next} className="flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
              Continue
              <ArrowRight size={15} />
            </button>
          ) : (
            <button onClick={generate} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating…</>
              ) : (
                <><CheckCircle size={15} />Generate Receipt</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const TIERS = [
  {
    id: 'silver',
    name: 'Silver Receipt',
    color: 'oklch(0.42 0.18 145)',
    colorLight: 'oklch(0.96 0.02 145)',
    features: ['Search-verifiable via receipt number or unique ID', 'Free'],
    badge: null,
    available: true,
  },
  {
    id: 'gold',
    name: 'Gold Receipt',
    color: 'oklch(0.68 0.15 75)',
    colorLight: 'oklch(0.97 0.025 75)',
    features: ['Search-verifiable via receipt number or unique ID', 'QR code + tamper-proof verification', '5 years active QR code'],
    badge: null,
    available: true,
  },
  {
    id: 'diamond',
    name: 'Diamond Receipt',
    color: 'oklch(0.55 0.16 230)',
    colorLight: 'oklch(0.96 0.02 230)',
    features: ['Search-verifiable via receipt number or unique ID', 'QR code + tamper-proof verification', 'Forever active QR code'],
    badge: null,
    available: true,
  },
  {
    id: 'platinum',
    name: 'Platinum Receipt',
    color: 'oklch(0.52 0.12 295)',
    colorLight: 'oklch(0.97 0.015 295)',
    features: ['QR code + tamper-proof verification', 'Searchable with identifier', 'Photo attachment support', 'Forever active QR code'],
    badge: null,
    available: true,
  },
]

function Step1({ receiptType, setReceiptType }: { receiptType: string; setReceiptType: (t: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl text-ink">Choose receipt type</h2>
        <p className="text-sm text-ink-muted mt-1">Select the type of receipt you want to generate.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TIERS.map(tier => {
          const selected = receiptType === tier.id
          return (
            <button
              key={tier.id}
              type="button"
              disabled={!tier.available}
              onClick={() => tier.available && setReceiptType(tier.id)}
              className="text-left rounded-xl p-4 border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: selected ? tier.color : 'oklch(0.88 0.01 145)',
                background: selected ? tier.colorLight : 'white',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all"
                  style={{
                    borderColor: selected ? tier.color : 'oklch(0.80 0.02 145)',
                    background: selected ? tier.color : 'transparent',
                  }}
                >
                  {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: tier.color }}>
                    {tier.name}
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {tier.features.map((f, i) => (
                      <li key={i} className="text-xs text-ink-muted flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0" style={{ color: tier.color }}>·</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {tier.badge && (
                    <span className="inline-block mt-2 text-xs bg-surface text-ink-dim px-2 py-0.5 rounded-full border border-border">
                      {tier.badge}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface FormSetterProps { form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>> }

function Step2({ form, setForm }: FormSetterProps) {
  const bind = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [field]: e.target.value }))
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl text-ink">Customer details</h2>
        <p className="text-sm text-ink-muted mt-1">Who is this receipt being issued to?</p>
      </div>
      <Field label="Buyer name" required><input type="text" value={form.buyerName} onChange={bind('buyerName')} placeholder="Full name" className={INPUT} autoFocus /></Field>
      <Field label="Buyer phone number" required><input type="tel" value={form.buyerPhone} onChange={bind('buyerPhone')} placeholder="08012345678" className={INPUT} /></Field>
      <Field label="Buyer email" hint="optional"><input type="email" value={form.buyerEmail} onChange={bind('buyerEmail')} placeholder="buyer@example.com" className={INPUT} /></Field>
    </div>
  )
}

function Step3({ form, setForm }: FormSetterProps) {
  const bind = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [field]: e.target.value }))
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl text-ink">Transaction details</h2>
        <p className="text-sm text-ink-muted mt-1">When and how was payment received?</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Transaction date" required><input type="date" value={form.transactionDate} onChange={bind('transactionDate')} className={INPUT} /></Field>
        <Field label="Payment date" hint="if different"><input type="date" value={form.paymentDate} onChange={bind('paymentDate')} className={INPUT} /></Field>
      </div>
      <Field label="Payment method" required>
        <select value={form.paymentMethod} onChange={bind('paymentMethod')} className={INPUT}>
          <option value="">Select payment method…</option>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Reference number" hint="optional: transfer ref, cheque no."><input type="text" value={form.referenceNumber} onChange={bind('referenceNumber')} placeholder="e.g. TRF-2026-001" className={INPUT} /></Field>
      <Field label="Notes" hint="optional"><textarea value={form.notes} onChange={bind('notes')} rows={3} placeholder="Any additional notes…" className={`${INPUT} resize-none`} /></Field>
    </div>
  )
}

interface Step4Props {
  items: FormItem[]; form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>
  subtotal: number; discountAmt: number; taxAmt: number; total: number
  addItem: () => void; removeItem: (id: string) => void
  updateItem: (id: string, field: keyof Omit<FormItem, 'id' | 'totalPrice'>, value: string) => void
}

function Step4({ items, form, setForm, subtotal, discountAmt, taxAmt, total, addItem, removeItem, updateItem }: Step4Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl text-ink">Items &amp; amounts</h2>
        <p className="text-sm text-ink-muted mt-1">List goods or services provided. All amounts in Naira (₦).</p>
      </div>
      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-[1fr_64px_110px_92px_32px] gap-2 px-1 text-xs text-ink-dim font-medium">
          <span>Description</span><span className="text-center">Qty</span><span className="text-right">Unit Price (₦)</span><span className="text-right">Total</span><span />
        </div>
        {items.map(item => (
          <div key={item.id} className="grid grid-cols-[1fr_64px_110px_92px_32px] gap-2 items-center">
            <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Item description" className={INPUT} />
            <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} min="0" step="0.01" className={`${INPUT} text-center`} />
            <input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} min="0" step="0.01" placeholder="0.00" className={`${INPUT} text-right`} />
            <div className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-right text-ink-muted tabular-nums">
              {item.totalPrice > 0 ? item.totalPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '-'}
            </div>
            <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm text-forest/70 hover:text-forest font-medium px-1 mt-1 transition-colors">
          <Plus size={15} />
          Add item
        </button>
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm"><span className="text-ink-muted">Subtotal</span><span className="font-medium text-ink">{formatNaira(subtotal)}</span></div>
        <div className="flex items-center gap-3 text-sm">
          <label className="text-ink-muted w-24 shrink-0">Discount (₦)</label>
          <input type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} min="0" step="0.01" placeholder="0.00" className={`${INPUT} flex-1 text-right`} />
          {discountAmt > 0 && <span className="text-ink-muted shrink-0 w-28 text-right">−{formatNaira(discountAmt)}</span>}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="text-ink-muted w-24 shrink-0">VAT (₦)</label>
          <input type="number" value={form.tax} onChange={e => setForm(p => ({ ...p, tax: e.target.value }))} min="0" step="0.01" placeholder="0.00" className={`${INPUT} flex-1 text-right`} />
          {taxAmt > 0 && <span className="text-ink-muted shrink-0 w-28 text-right">+{formatNaira(taxAmt)}</span>}
        </div>
        <div className="flex justify-between text-base font-bold text-ink pt-2 border-t border-border">
          <span>TOTAL</span>
          <span className="font-heading text-lg">{formatNaira(total)}</span>
        </div>
      </div>
    </div>
  )
}

interface Step5Props { form: FormData; items: FormItem[]; receiptType: string; subtotal: number; discountAmt: number; taxAmt: number; total: number }

function Step5({ form, items, receiptType, subtotal, discountAmt, taxAmt, total }: Step5Props) {
  const tier = TIERS.find(t => t.id === receiptType) ?? TIERS[0]
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl text-ink">Review &amp; generate</h2>
        <p className="text-sm text-ink-muted mt-1">Confirm all details are correct before generating the receipt.</p>
      </div>
      <div className="space-y-3 text-sm">
        <ReviewSection title="Receipt Type">
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: tier.color }}>{tier.name}</span>
          </div>
        </ReviewSection>
        <ReviewSection title="Customer">
          <ReviewRow label="Name" value={form.buyerName} />
          <ReviewRow label="Phone" value={form.buyerPhone} />
          {form.buyerEmail && <ReviewRow label="Email" value={form.buyerEmail} />}
        </ReviewSection>
        <ReviewSection title="Transaction">
          <ReviewRow label="Date" value={formatDate(form.transactionDate)} />
          {form.paymentDate && <ReviewRow label="Payment Date" value={formatDate(form.paymentDate)} />}
          <ReviewRow label="Payment Method" value={form.paymentMethod} />
          {form.referenceNumber && <ReviewRow label="Reference" value={form.referenceNumber} />}
          {form.notes && <ReviewRow label="Notes" value={form.notes} />}
        </ReviewSection>
        <ReviewSection title="Items">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-dim text-xs border-b border-border">
                <th className="text-left pb-1.5 font-medium">Description</th>
                <th className="text-right pb-1.5 font-medium">Qty</th>
                <th className="text-right pb-1.5 font-medium">Unit</th>
                <th className="text-right pb-1.5 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 pr-2 text-ink">{item.description}</td>
                  <td className="py-1.5 text-right text-ink-muted">{item.quantity}</td>
                  <td className="py-1.5 text-right text-ink-muted">{formatNaira(parseFloat(item.unitPrice) || 0)}</td>
                  <td className="py-1.5 text-right font-medium text-ink">{formatNaira(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1.5 mt-3 pt-3 border-t border-border">
            <ReviewRow label="Subtotal" value={formatNaira(subtotal)} />
            {discountAmt > 0 && <ReviewRow label="Discount" value={`−${formatNaira(discountAmt)}`} />}
            {taxAmt > 0 && <ReviewRow label="VAT" value={formatNaira(taxAmt)} />}
            <div className="flex justify-between font-bold text-base text-ink pt-2 border-t border-border">
              <span>TOTAL</span>
              <span className="font-heading text-lg">{formatNaira(total)}</span>
            </div>
          </div>
        </ReviewSection>
      </div>
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
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

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl p-4">
      <p className="text-xs font-semibold text-forest/70 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-ink-muted shrink-0">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  )
}
