'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle, Download, Wallet, Paperclip, X, Printer, ChevronDown } from 'lucide-react'
import { formatNaira, formatAmount, formatDate, CURRENCIES } from '@/lib/formatters'
import AmountInput from '@/components/ui/AmountInput'

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
  const [printMenuOpen, setPrintMenuOpen] = useState(false)
  const [qtyLabel, setQtyLabel] = useState('Qty')
  const [priceLabel, setPriceLabel] = useState('Unit Price')
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [activeProfile, setActiveProfile] = useState<{ business_name: string; rc_number: string } | null>(null)
  const [autoSendSms, setAutoSendSms] = useState(false)
  const [autoSendEmail, setAutoSendEmail] = useState(false)

  useEffect(() => {
    fetch('/api/sub-accounts/active').then(r => r.json()).then(d => {
      if (d.active) setActiveProfile(d.active)
    })
  }, [])

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)
  const discountAmt = parseFloat(form.discount) || 0
  const vatPct = parseFloat(form.tax) || 0
  const taxAmt = vatPct > 0 ? parseFloat(((subtotal - discountAmt) * vatPct / 100).toFixed(2)) : 0
  const total = subtotal - discountAmt + taxAmt
  const amountPaidNum = parseFloat(form.amountPaid) || 0
  const balanceDue = amountPaidNum > 0 && amountPaidNum < total ? parseFloat((total - amountPaidNum).toFixed(2)) : 0
  const overpaidAmt = amountPaidNum > total ? parseFloat((amountPaidNum - total).toFixed(2)) : 0

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
      if (!form.amountPaid || parseFloat(form.amountPaid) <= 0) return 'Amount paid is required.'
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
      // Upload attachments first if platinum
      const attachmentUrls: string[] = []
      if (receiptType === 'platinum' && attachments.length > 0) {
        for (const file of attachments) {
          const fd = new FormData()
          fd.append('file', file)
          const uploadRes = await fetch('/api/receipts/upload-attachment', { method: 'POST', body: fd })
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            attachmentUrls.push(uploadData.url)
          }
        }
      }

      const res = await fetch('/api/receipts', {
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
          subtotal, discount: discountAmt, tax: taxAmt, total_amount: total,
          amount_paid: amountPaidNum || undefined,
          balance_due: balanceDue || undefined,
          overpaid: overpaidAmt || undefined,
          items: items.map(i => ({
            description: i.description,
            quantity: parseFloat(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
            totalPrice: i.totalPrice,
          })),
          attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
          column_labels: { qty: qtyLabel, price: priceLabel },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_BALANCE') {
          setWalletError({ required: data.required, balance: data.balance, shortfall: data.shortfall })
        } else if (data.code === 'PROFILE_NOT_FOUND') {
          setError('PROFILE_NOT_FOUND')
        } else {
          setError(data.error ?? 'Something went wrong. Please try again.')
        }
        return
      }
      const receiptId = data.receipt.id
      if (autoSendSms && form.buyerPhone) {
        fetch(`/api/receipts/${receiptId}/sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phones: [form.buyerPhone] }),
        }).catch(() => {})
      }
      if (autoSendEmail && form.buyerEmail) {
        fetch(`/api/receipts/${receiptId}/email`, { method: 'POST' }).catch(() => {})
      }
      setGenerated({ id: receiptId, receiptNumber: data.receipt.receipt_number, identifier: data.receipt.unique_identifier })
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
              <span className="text-ink-muted shrink-0">Verification Code</span>
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
            <div className="relative">
              <button
                onClick={() => setPrintMenuOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white"
              >
                <Printer size={15} />
                Print
                <ChevronDown size={12} />
              </button>
              {printMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPrintMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                    <p className="text-xs text-ink-dim px-3 py-1.5 font-medium border-b border-border">Select paper size</p>
                    {(['A4', 'LETTER', 'LEGAL', 'A5'] as const).map(size => (
                      <a
                        key={size}
                        href={`/api/receipts/${generated.id}/pdf?print=1&size=${size}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setPrintMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface transition-colors"
                      >
                        <Printer size={13} className="text-ink-dim" />
                        {size === 'LETTER' ? 'Letter (US)' : size === 'LEGAL' ? 'Legal (US)' : size}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Link href={`/dashboard/receipts/${generated.id}`} className="flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
              View Receipt
            </Link>
            <button onClick={() => { setGenerated(null); setStep(1); setReceiptType('silver'); setForm(INITIAL_FORM); setItems([newItem()]); setQtyLabel('Qty'); setPriceLabel('Unit Price'); setAttachments([]); }} className="px-4 py-2.5 text-sm text-ink-muted hover:text-forest transition-colors">
              Generate Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      {activeProfile && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium" style={{ background: 'oklch(0.25 0.08 270)', color: 'rgba(255,255,255,0.92)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Issuing as <strong className="ml-1">{activeProfile.business_name}</strong>
          <span className="opacity-60 ml-1">· RC {activeProfile.rc_number}</span>
          <a href="/dashboard/profile" className="ml-auto opacity-60 hover:opacity-100 underline underline-offset-2 transition-opacity">Switch</a>
        </div>
      )}
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
          {step === 2 && <Step2 form={form} setForm={setForm} autoSendSms={autoSendSms} setAutoSendSms={setAutoSendSms} autoSendEmail={autoSendEmail} setAutoSendEmail={setAutoSendEmail} />}
          {step === 3 && <Step3 form={form} setForm={setForm} />}
          {step === 4 && <Step4 items={items} form={form} setForm={setForm} subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} total={total} amountPaidNum={amountPaidNum} balanceDue={balanceDue} overpaidAmt={overpaidAmt} addItem={addItem} removeItem={removeItem} updateItem={updateItem} qtyLabel={qtyLabel} setQtyLabel={setQtyLabel} priceLabel={priceLabel} setPriceLabel={setPriceLabel} currency={form.currency} receiptType={receiptType} attachments={attachments} setAttachments={setAttachments} attachmentError={attachmentError} setAttachmentError={setAttachmentError} />}
          {step === 5 && <Step5 form={form} items={items} receiptType={receiptType} subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} vatPct={vatPct} total={total} amountPaidNum={amountPaidNum} balanceDue={balanceDue} overpaidAmt={overpaidAmt} qtyLabel={qtyLabel} priceLabel={priceLabel} currency={form.currency} />}

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
            <div className="mt-5 text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {error === 'PROFILE_NOT_FOUND' ? (
                <>
                  Profile not found.{' '}
                  <a href="/dashboard/verify" className="font-semibold underline underline-offset-2 hover:opacity-80">
                    Verify your identity now →
                  </a>
                </>
              ) : error}
            </div>
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
    price: '5 free/month',
    priceSub: '₦100 per receipt after',
    color: 'oklch(0.42 0.18 145)',
    colorLight: 'oklch(0.96 0.02 145)',
    features: ['Search-verifiable via receipt number or unique ID'],
    badge: null,
    available: true,
  },
  {
    id: 'gold',
    name: 'Gold Receipt',
    price: '₦200',
    priceSub: 'per receipt',
    color: 'oklch(0.68 0.15 75)',
    colorLight: 'oklch(0.97 0.025 75)',
    features: ['Search-verifiable via receipt number or unique ID', 'QR code + tamper-proof verification', '5 years active QR code'],
    badge: null,
    available: true,
  },
  {
    id: 'diamond',
    name: 'Diamond Receipt',
    price: '₦500',
    priceSub: 'per receipt',
    color: 'oklch(0.55 0.16 230)',
    colorLight: 'oklch(0.96 0.02 230)',
    features: ['Search-verifiable via receipt number or unique ID', 'QR code + tamper-proof verification', 'Forever active QR code'],
    badge: null,
    available: true,
  },
  {
    id: 'platinum',
    name: 'Platinum Receipt',
    price: '₦1,000',
    priceSub: 'per receipt',
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
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm" style={{ color: tier.color }}>
                      {tier.name}
                    </p>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold leading-tight" style={{ color: tier.color }}>{tier.price}</p>
                      <p className="text-xs text-ink-dim leading-tight">{tier.priceSub}</p>
                    </div>
                  </div>
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

interface Step2Props extends FormSetterProps {
  autoSendSms: boolean
  setAutoSendSms: (v: boolean) => void
  autoSendEmail: boolean
  setAutoSendEmail: (v: boolean) => void
}

function Step2({ form, setForm, autoSendSms, setAutoSendSms, autoSendEmail, setAutoSendEmail }: Step2Props) {
  const bind = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [field]: e.target.value }))
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl text-ink">Customer details</h2>
        <p className="text-sm text-ink-muted mt-1">Who is this receipt being issued to?</p>
      </div>
      <Field label="Customer's name" required><input type="text" value={form.buyerName} onChange={bind('buyerName')} placeholder="Full name" className={INPUT} autoFocus /></Field>
      <div className="space-y-1.5">
        <Field label="Customer's phone number" required><input type="tel" value={form.buyerPhone} onChange={bind('buyerPhone')} placeholder="" className={INPUT} /></Field>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={autoSendSms} onChange={e => setAutoSendSms(e.target.checked)} className="w-4 h-4 rounded border-border accent-forest" />
          <span className="text-xs text-ink-muted">Automatically send receipt to this phone number via SMS</span>
        </label>
      </div>
      <div className="space-y-1.5">
        <Field label="Customer's email address" hint="optional"><input type="email" value={form.buyerEmail} onChange={bind('buyerEmail')} placeholder="buyer@example.com" className={INPUT} /></Field>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={autoSendEmail} onChange={e => setAutoSendEmail(e.target.checked)} className="w-4 h-4 rounded border-border accent-forest" />
          <span className="text-xs text-ink-muted">Automatically send receipt to this email address</span>
        </label>
      </div>
      <Field label="Customer's address" hint="optional"><input type="text" value={form.buyerAddress} onChange={bind('buyerAddress')} placeholder="Street, City, State" className={INPUT} /></Field>
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
      <Field label="Currency" required>
        <select value={form.currency} onChange={bind('currency')} className={INPUT}>
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.symbol} — {c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Transaction date" required><input type="date" value={form.transactionDate} onChange={bind('transactionDate')} className={INPUT} /></Field>
      <Field label="Payment method" required>
        <select value={form.paymentMethod} onChange={bind('paymentMethod')} className={INPUT}>
          <option value="">Select payment method…</option>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={form.referenceLabel}
            onChange={bind('referenceLabel')}
            placeholder="Reference number"
            className="font-medium text-sm text-ink bg-transparent border-b border-dashed border-ink-dim focus:border-forest focus:outline-none w-40 pb-0.5"
          />
          <span className="text-xs text-ink-dim">(optional: transfer ref, cheque no.)</span>
        </div>
        <input type="text" value={form.referenceNumber} onChange={bind('referenceNumber')} placeholder="e.g. TRF-2026-001" className={INPUT} />
      </div>
      <Field label="Notes" hint="optional"><textarea value={form.notes} onChange={bind('notes')} rows={3} placeholder="Any additional notes…" className={`${INPUT} resize-none`} /></Field>
    </div>
  )
}

interface Step4Props {
  items: FormItem[]; form: FormData; setForm: React.Dispatch<React.SetStateAction<FormData>>
  subtotal: number; discountAmt: number; taxAmt: number; total: number
  amountPaidNum: number; balanceDue: number; overpaidAmt: number
  addItem: () => void; removeItem: (id: string) => void
  updateItem: (id: string, field: keyof Omit<FormItem, 'id' | 'totalPrice'>, value: string) => void
  qtyLabel: string; setQtyLabel: (v: string) => void
  priceLabel: string; setPriceLabel: (v: string) => void
  currency: string
  receiptType: string
  attachments: File[]; setAttachments: React.Dispatch<React.SetStateAction<File[]>>
  attachmentError: string; setAttachmentError: (v: string) => void
}

function Step4({ items, form, setForm, subtotal, discountAmt, taxAmt, total, amountPaidNum, balanceDue, overpaidAmt, addItem, removeItem, updateItem, qtyLabel, setQtyLabel, priceLabel, setPriceLabel, currency, receiptType, attachments, setAttachments, attachmentError, setAttachmentError }: Step4Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl text-ink">Items &amp; amounts</h2>
        <p className="text-sm text-ink-muted mt-1">{`List goods or services provided. All amounts in ${CURRENCIES.find(c => c.code === currency)?.name ?? currency}.`}</p>
      </div>
      <div className="space-y-2">
        {/* Desktop header */}
        <div className="hidden sm:grid grid-cols-[1fr_64px_110px_92px_32px] gap-2 px-1 text-xs text-ink-dim font-medium items-center">
          <span>Description</span>
          <input value={qtyLabel} onChange={e => setQtyLabel(e.target.value)} className="text-center text-xs font-medium text-ink-dim bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:border-forest/50 w-full" />
          <input value={priceLabel} onChange={e => setPriceLabel(e.target.value)} className="text-center text-xs font-medium text-ink-dim bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:border-forest/50 w-full" />
          <span className="text-right">Total</span><span />
        </div>
        {/* Desktop rows */}
        {items.map(item => (
          <div key={item.id} className="hidden sm:grid grid-cols-[1fr_64px_110px_92px_32px] gap-2 items-center">
            <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Item description" className={INPUT} />
            <AmountInput value={item.quantity} onChange={v => updateItem(item.id, 'quantity', v)} min={0} step={0.01} className={`${INPUT} text-center`} placeholder="0" blurDefault="0" />
            <AmountInput value={item.unitPrice} onChange={v => updateItem(item.id, 'unitPrice', v)} min={0} step={0.01} placeholder="0.00" className={`${INPUT} text-right`} />
            <div className="px-2 py-2 bg-surface border border-border rounded-lg text-sm text-right text-ink-muted tabular-nums">
              {item.totalPrice > 0 ? item.totalPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '-'}
            </div>
            <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {/* Mobile rows */}
        {items.map(item => (
          <div key={`m-${item.id}`} className="sm:hidden space-y-1.5">
            <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Item description" className={`${INPUT} w-full`} />
            <div className="grid grid-cols-[1fr_88px_72px_28px] gap-1.5 items-center">
              <input value={qtyLabel} onChange={e => setQtyLabel(e.target.value)} className="text-center text-xs font-medium text-ink-dim bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:border-forest/50 w-full" />
              <input value={priceLabel} onChange={e => setPriceLabel(e.target.value)} className="text-center text-xs font-medium text-ink-dim bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:border-forest/50 w-full" />
              <span className="text-xs text-ink-dim text-right">Total</span>
              <span />
            </div>
            <div className="grid grid-cols-[1fr_88px_72px_28px] gap-1.5 items-center">
              <AmountInput value={item.quantity} onChange={v => updateItem(item.id, 'quantity', v)} min={0} step={0.01} className={`${INPUT} text-center`} placeholder="0" blurDefault="0" />
              <AmountInput value={item.unitPrice} onChange={v => updateItem(item.id, 'unitPrice', v)} min={0} step={0.01} placeholder="0.00" className={`${INPUT} text-right`} />
              <div className="px-1 py-2 bg-surface border border-border rounded-lg text-xs text-right text-ink-muted tabular-nums">
                {item.totalPrice > 0 ? item.totalPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '-'}
              </div>
              <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm text-forest/70 hover:text-forest font-medium px-1 mt-1 transition-colors">
          <Plus size={15} />
          Add item
        </button>
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm"><span className="text-ink-muted">Subtotal</span><span className="font-medium text-ink">{formatAmount(subtotal, currency)}</span></div>
        <div className="flex items-center gap-3 text-sm">
          <label className="text-ink-muted w-24 shrink-0">Discount</label>
          <AmountInput value={form.discount} onChange={v => setForm(p => ({ ...p, discount: v }))} min={0} step={0.01} placeholder="0.00" className={`${INPUT} flex-1 text-right`} />
          {discountAmt > 0 && <span className="text-ink-muted shrink-0 w-28 text-right">−{formatAmount(discountAmt, currency)}</span>}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="text-ink-muted w-24 shrink-0">VAT (%)</label>
          <input type="number" value={form.tax} onChange={e => setForm(p => ({ ...p, tax: e.target.value }))} min="0" max="100" step="0.5" placeholder="0" className={`${INPUT} flex-1 text-right`} />
          {taxAmt > 0 && <span className="text-ink-muted shrink-0 w-28 text-right">+{formatAmount(taxAmt, currency)}</span>}
        </div>
        <div className="flex justify-between text-base font-bold text-ink pt-2 border-t border-border">
          <span>TOTAL</span>
          <span className="font-heading text-lg">{formatAmount(total, currency)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm pt-2 border-t border-border mt-1">
          <label className="text-ink-muted w-24 shrink-0">Amount Paid</label>
          <AmountInput value={form.amountPaid} onChange={v => setForm(p => ({ ...p, amountPaid: v }))} min={0} step={0.01} placeholder="0.00" className={`${INPUT} flex-1 text-right`} />
          {amountPaidNum > 0 && <span className="text-ink-muted shrink-0 w-28 text-right">{formatAmount(amountPaidNum, currency)}</span>}
        </div>
        {balanceDue > 0 && (
          <div className="flex justify-between text-sm font-semibold text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <span>Balance Due</span>
            <span>{formatAmount(balanceDue, currency)}</span>
          </div>
        )}
        {overpaidAmt > 0 && (
          <div className="flex justify-between text-sm font-semibold text-forest bg-forest-light border border-forest/20 rounded-lg px-3 py-2">
            <span>Overpaid</span>
            <span>{formatAmount(overpaidAmt, currency)}</span>
          </div>
        )}
      </div>

      {receiptType === 'platinum' && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div>
            <p className="text-sm font-medium text-ink">Receipt attachments</p>
            <p className="text-xs text-ink-muted mt-0.5">Attach up to 2 JPG images (max 3 MB each) — Platinum feature</p>
          </div>
          <div className="flex flex-col gap-2">
            {attachments.map((file, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-surface rounded-lg border border-border">
                <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-white border border-border">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{file.name}</p>
                  <p className="text-xs text-ink-dim">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-ink-dim hover:text-danger transition-colors shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
            {attachments.length < 2 && (
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg text-sm text-ink-muted cursor-pointer hover:border-forest/40 hover:text-forest transition-colors">
                <Paperclip size={15} />
                {attachments.length === 0 ? 'Attach photo (JPG)' : 'Attach another photo'}
                <input
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 3 * 1024 * 1024) { setAttachmentError('File too large (max 3 MB)'); return }
                    setAttachmentError('')
                    setAttachments(prev => [...prev, file].slice(0, 2))
                    e.target.value = ''
                  }}
                />
              </label>
            )}
            {attachmentError && <p className="text-xs text-danger">{attachmentError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

interface Step5Props { form: FormData; items: FormItem[]; receiptType: string; subtotal: number; discountAmt: number; taxAmt: number; vatPct: number; total: number; amountPaidNum: number; balanceDue: number; overpaidAmt: number; qtyLabel: string; priceLabel: string; currency: string }

function Step5({ form, items, receiptType, subtotal, discountAmt, taxAmt, vatPct, total, amountPaidNum, balanceDue, overpaidAmt, qtyLabel, priceLabel, currency }: Step5Props) {
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
          <ReviewRow label="Currency" value={CURRENCIES.find(c => c.code === currency)?.name ?? currency} />
        </ReviewSection>
        <ReviewSection title="Customer">
          <ReviewRow label="Name" value={form.buyerName} />
          <ReviewRow label="Phone" value={form.buyerPhone} />
          {form.buyerEmail && <ReviewRow label="Email" value={form.buyerEmail} />}
          {form.buyerAddress && <ReviewRow label="Address" value={form.buyerAddress} />}
        </ReviewSection>
        <ReviewSection title="Transaction">
          <ReviewRow label="Date" value={formatDate(form.transactionDate)} />
          <ReviewRow label="Payment Method" value={form.paymentMethod} />
          {form.referenceNumber && <ReviewRow label={form.referenceLabel.trim() || 'Reference'} value={form.referenceNumber} />}
          {form.notes && <ReviewRow label="Notes" value={form.notes} />}
        </ReviewSection>
        <ReviewSection title="Items">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-dim text-xs border-b border-border">
                <th className="text-left pb-1.5 font-medium">Description</th>
                <th className="text-right pb-1.5 font-medium">{qtyLabel}</th>
                <th className="text-right pb-1.5 font-medium">{priceLabel}</th>
                <th className="text-right pb-1.5 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 pr-2 text-ink">{item.description}</td>
                  <td className="py-1.5 text-right text-ink-muted">{item.quantity}</td>
                  <td className="py-1.5 text-right text-ink-muted">{formatAmount(parseFloat(item.unitPrice) || 0, currency)}</td>
                  <td className="py-1.5 text-right font-medium text-ink">{formatAmount(item.totalPrice, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1.5 mt-3 pt-3 border-t border-border">
            <ReviewRow label="Subtotal" value={formatAmount(subtotal, currency)} />
            {discountAmt > 0 && <ReviewRow label="Discount" value={`−${formatAmount(discountAmt, currency)}`} />}
            {taxAmt > 0 && <ReviewRow label={`VAT (${vatPct}%)`} value={formatAmount(taxAmt, currency)} />}
            <div className="flex justify-between font-bold text-base text-ink pt-2 border-t border-border">
              <span>TOTAL</span>
              <span className="font-heading text-lg">{formatAmount(total, currency)}</span>
            </div>
            {amountPaidNum > 0 && (
              <div className="pt-2 border-t border-border space-y-1.5">
                <ReviewRow label="Amount Paid" value={formatAmount(amountPaidNum, currency)} />
                {balanceDue > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-danger">
                    <span>Balance Due</span><span>{formatAmount(balanceDue, currency)}</span>
                  </div>
                )}
                {overpaidAmt > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-forest">
                    <span>Overpaid</span><span>{formatAmount(overpaidAmt, currency)}</span>
                  </div>
                )}
              </div>
            )}
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
