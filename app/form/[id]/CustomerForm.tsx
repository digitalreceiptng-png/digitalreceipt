'use client'

import { useState, useRef } from 'react'
import { CheckCircle, Upload, X, Loader2, Sparkles, FileText } from 'lucide-react'

interface Purpose {
  id: string
  label: string
  sort_order: number
}

interface Props {
  formId: string
  fieldLabels: Record<string, string>
  fieldConfig: Record<string, string>
  purposeType: 'fixed' | 'multiple'
  fixedPurpose: string | null
  purposes: Purpose[]
  requireEvidence: boolean
  vatEnabled: boolean
  vatRate: number
}

const DEFAULT_LABELS: Record<string, string> = {
  item_description: 'Item Description',
  unit_of_item: 'Unit of Item',
  unit_price: 'Unit Price',
  additional_notes: 'Additional Notes',
  payment_method: 'Payment Method',
}

type Stage = 'upload' | 'autofill_prompt' | 'form'

export default function CustomerForm({
  formId, fieldLabels, fieldConfig, purposeType, fixedPurpose, purposes, requireEvidence, vatEnabled, vatRate,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Proof upload state
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceName, setEvidenceName] = useState('')

  // Step state — if proof required, start at 'upload', else go straight to 'form'
  const [stage, setStage] = useState<Stage>(requireEvidence ? 'upload' : 'form')
  const [extracting, setExtracting] = useState(false)
  const [autoFilled, setAutoFilled] = useState<Partial<Record<'customer_name' | 'total_amount' | 'payment_date', boolean>>>({})

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    purpose_of_payment: purposeType === 'fixed' ? (fixedPurpose ?? '') : '',
    item_description: '',
    unit_value: '',
    unit_price: '',
    total_amount: '',
    payment_method: '',
    payment_date: '',
    additional_notes: '',
  })

  function label(key: string) {
    return fieldLabels[key] || DEFAULT_LABELS[key] || key
  }

  function cfg(key: string): string {
    return fieldConfig[key] ?? 'optional'
  }

  function isVisible(key: string) { return cfg(key) !== 'hidden' }
  function isRequired(key: string) { return cfg(key) === 'required' }

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const rawTotal = parseFloat(form.total_amount) || 0
  const vatAmount = vatEnabled && rawTotal > 0 ? Math.round(rawTotal * (vatRate / 100) * 100) / 100 : 0
  const grandTotal = rawTotal + vatAmount

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadProgress('uploading')
    setError('')
    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch(`/api/form/${formId}/upload`, { method: 'POST', body: fd })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Upload failed')
      setUploadProgress('idle')
      return
    }

    setEvidenceUrl(json.url)
    setEvidenceName(json.name)
    setUploadProgress('done')
  }

  function removeFile() {
    setEvidenceUrl('')
    setEvidenceName('')
    setUploadProgress('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleAutoFill() {
    setExtracting(true)
    setError('')
    try {
      const res = await fetch(`/api/form/${formId}/extract-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: evidenceUrl }),
      })
      const data = await res.json()
      const filled: typeof autoFilled = {}
      if (data.customer_name) { set('customer_name', data.customer_name); filled.customer_name = true }
      if (data.total_amount)  { set('total_amount',  data.total_amount);  filled.total_amount = true }
      if (data.payment_date)  { set('payment_date',  data.payment_date);  filled.payment_date = true }
      setAutoFilled(filled)
    } catch {
      // silent — just proceed to form
    }
    setExtracting(false)
    setStage('form')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.customer_name.trim()) { setError('Please enter your full name.'); return }
    if (!form.total_amount || parseFloat(form.total_amount) <= 0) { setError('Please enter the total amount paid.'); return }
    if (requireEvidence && !evidenceUrl) { setError('Please upload proof of payment before submitting.'); return }
    if (purposeType === 'multiple' && !form.purpose_of_payment) { setError('Please select a purpose of payment.'); return }

    setSubmitting(true)

    const payload = {
      ...form,
      unit_label: label('unit_of_item'),
      unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
      total_amount: parseFloat(form.total_amount),
      payment_evidence_url: evidenceUrl || null,
      payment_evidence_name: evidenceName || null,
    }

    const res = await fetch(`/api/form/${formId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Submission failed. Please try again.')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-4">
        <CheckCircle size={48} className="text-forest mx-auto" />
        <h2 className="font-heading text-xl text-ink">Request Submitted!</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          Your receipt request has been submitted and is awaiting review. You&apos;ll receive your official receipt by email once it&apos;s been approved.
        </p>
        {form.customer_email && (
          <p className="text-xs text-ink-dim">A confirmation has been sent to <strong>{form.customer_email}</strong></p>
        )}
      </div>
    )
  }

  /* ── Step 1: Upload proof of payment ── */
  if (stage === 'upload') {
    return (
      <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
        <div className="text-center space-y-1 pb-1">
          <h2 className="font-heading text-lg text-ink">Upload Proof of Payment</h2>
          <p className="text-sm text-ink-muted">Attach your payment receipt, screenshot, or transfer confirmation.</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploadProgress === 'done' && evidenceName ? (
          <div className="flex items-center gap-3 border border-green-300 bg-green-50 rounded-xl px-4 py-4">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 truncate">{evidenceName}</p>
              <p className="text-xs text-green-600 mt-0.5">Uploaded successfully</p>
            </div>
            <button type="button" onClick={removeFile} className="text-green-600 hover:text-danger transition-colors">
              <X size={15} />
            </button>
          </div>
        ) : uploadProgress === 'uploading' ? (
          <div className="flex items-center gap-3 border border-border rounded-xl px-4 py-6 justify-center">
            <Loader2 size={20} className="text-forest animate-spin" />
            <span className="text-sm text-ink-muted">Uploading…</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border hover:border-forest/40 rounded-xl px-4 py-10 text-center transition-colors group"
          >
            <Upload size={28} className="text-ink-dim group-hover:text-forest mx-auto mb-3 transition-colors" />
            <p className="text-sm font-medium text-ink-muted group-hover:text-ink transition-colors">Tap to upload proof of payment</p>
            <p className="text-xs text-ink-dim mt-1">JPG, PNG, PDF — max 10 MB</p>
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button
          type="button"
          disabled={uploadProgress !== 'done'}
          onClick={() => setStage('autofill_prompt')}
          className="w-full bg-forest text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-forest-bright transition-colors disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    )
  }

  /* ── Step 2: Auto-fill prompt ── */
  if (stage === 'autofill_prompt') {
    return (
      <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
        {/* Uploaded file preview */}
        <div className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-xl px-4 py-3">
          <FileText size={16} className="text-green-600 shrink-0" />
          <span className="text-sm text-green-800 flex-1 truncate">{evidenceName}</span>
          <CheckCircle size={15} className="text-green-500 shrink-0" />
        </div>

        <div className="rounded-xl border border-forest/20 bg-forest/5 p-5 space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={20} className="text-forest" />
            <p className="font-semibold text-ink text-sm">Auto-fill from your receipt?</p>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            We can read your uploaded receipt and automatically fill in your <strong>name</strong>, <strong>amount paid</strong>, and <strong>date</strong>.
          </p>

          <button
            type="button"
            onClick={handleAutoFill}
            disabled={extracting}
            className="w-full flex items-center justify-center gap-2 bg-forest text-white py-3 rounded-xl font-semibold text-sm hover:bg-forest-bright transition-colors disabled:opacity-60"
          >
            {extracting ? (
              <><Loader2 size={16} className="animate-spin" /> Reading receipt…</>
            ) : (
              <><Sparkles size={16} /> Yes, auto-fill details</>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStage('form')}
            className="w-full py-3 rounded-xl font-semibold text-sm border border-border text-ink-muted hover:border-forest/30 hover:text-ink transition-colors"
          >
            No, I&apos;ll fill in manually
          </button>
        </div>
      </div>
    )
  }

  /* ── Step 3: Main form ── */
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border p-6 space-y-5">

      {/* Show uploaded proof summary at top */}
      {requireEvidence && evidenceName && (
        <div className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-xl px-4 py-3">
          <FileText size={16} className="text-green-600 shrink-0" />
          <span className="text-sm text-green-800 flex-1 truncate">{evidenceName}</span>
          <CheckCircle size={15} className="text-green-500 shrink-0" />
        </div>
      )}

      {/* Auto-fill badge */}
      {Object.keys(autoFilled).length > 0 && (
        <div className="flex items-center gap-2 text-xs text-forest bg-forest/5 border border-forest/15 rounded-lg px-3 py-2">
          <Sparkles size={13} />
          <span>Some fields were auto-filled from your receipt — please review and correct if needed.</span>
        </div>
      )}

      {/* Full Name */}
      <Field label="Full Name" required>
        <div className="relative">
          <input
            value={form.customer_name}
            onChange={e => set('customer_name', e.target.value)}
            placeholder="Enter your full name"
            required
            className={autoFilled.customer_name ? `${inputCls} border-forest/40 bg-forest/5` : inputCls}
          />
          {autoFilled.customer_name && <AutoTag />}
        </div>
      </Field>

      {isVisible('customer_email') && (
        <Field label="Email Address" required={isRequired('customer_email')}>
          <input
            type="email"
            value={form.customer_email}
            onChange={e => set('customer_email', e.target.value)}
            placeholder="your@email.com"
            required={isRequired('customer_email')}
            className={inputCls}
          />
        </Field>
      )}

      {isVisible('customer_phone') && (
        <Field label="Phone Number" required={isRequired('customer_phone')}>
          <input
            type="tel"
            value={form.customer_phone}
            onChange={e => set('customer_phone', e.target.value)}
            placeholder="e.g. 08012345678"
            required={isRequired('customer_phone')}
            className={inputCls}
          />
        </Field>
      )}

      {purposeType === 'fixed' && fixedPurpose && (
        <Field label="Purpose of Payment" required>
          <div className="px-3.5 py-2.5 bg-surface border border-border rounded-lg text-sm text-ink-muted">
            {fixedPurpose}
          </div>
        </Field>
      )}

      {purposeType === 'multiple' && purposes.length > 0 && (
        <Field label="Purpose of Payment" required>
          <select
            value={form.purpose_of_payment}
            onChange={e => set('purpose_of_payment', e.target.value)}
            required
            className={inputCls}
          >
            <option value="">Select purpose…</option>
            {purposes.map(p => (
              <option key={p.id} value={p.label}>{p.label}</option>
            ))}
          </select>
        </Field>
      )}

      {isVisible('item_description') && (
        <Field label={label('item_description')} required={isRequired('item_description')}>
          <input
            value={form.item_description}
            onChange={e => set('item_description', e.target.value)}
            placeholder={`Enter ${label('item_description').toLowerCase()}`}
            required={isRequired('item_description')}
            className={inputCls}
          />
        </Field>
      )}

      {isVisible('unit_of_item') && (
        <Field label={label('unit_of_item')} required={isRequired('unit_of_item')}>
          <input
            value={form.unit_value}
            onChange={e => set('unit_value', e.target.value)}
            placeholder={`Enter ${label('unit_of_item').toLowerCase()}`}
            required={isRequired('unit_of_item')}
            className={inputCls}
          />
        </Field>
      )}

      {isVisible('unit_price') && (
        <Field label={label('unit_price')} required={isRequired('unit_price')}>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim text-sm">₦</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={e => set('unit_price', e.target.value)}
              placeholder="0.00"
              required={isRequired('unit_price')}
              className={`${inputCls} pl-7`}
            />
          </div>
        </Field>
      )}

      <Field label="Total Amount Paid" required>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim text-sm">₦</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.total_amount}
            onChange={e => set('total_amount', e.target.value)}
            placeholder="0.00"
            required
            className={autoFilled.total_amount ? `${inputCls} pl-7 border-forest/40 bg-forest/5` : `${inputCls} pl-7`}
          />
          {autoFilled.total_amount && <AutoTag />}
        </div>
        {vatEnabled && rawTotal > 0 && (
          <p className="text-xs text-ink-dim mt-1">
            + VAT ({vatRate}%): ₦{vatAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} = <strong>₦{grandTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong> total
          </p>
        )}
      </Field>

      {isVisible('payment_method') && (
        <Field label={label('payment_method')} required={isRequired('payment_method')}>
          <select
            value={form.payment_method}
            onChange={e => set('payment_method', e.target.value)}
            required={isRequired('payment_method')}
            className={inputCls}
          >
            <option value="">Select method…</option>
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>POS</option>
            <option>Mobile Money</option>
            <option>Cheque</option>
            <option>Other</option>
          </select>
        </Field>
      )}

      {isVisible('payment_date') && (
        <Field label="Date of Payment" required={isRequired('payment_date')}>
          <div className="relative">
            <input
              type="date"
              value={form.payment_date}
              onChange={e => set('payment_date', e.target.value)}
              required={isRequired('payment_date')}
              className={autoFilled.payment_date ? `${inputCls} border-forest/40 bg-forest/5` : inputCls}
            />
            {autoFilled.payment_date && <AutoTag />}
          </div>
        </Field>
      )}

      {isVisible('additional_notes') && (
        <Field label={label('additional_notes')} required={isRequired('additional_notes')}>
          <textarea
            value={form.additional_notes}
            onChange={e => set('additional_notes', e.target.value)}
            placeholder="Any additional information…"
            rows={3}
            required={isRequired('additional_notes')}
            className={`${inputCls} resize-none`}
          />
        </Field>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-forest text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-forest-bright transition-colors disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit Receipt Request'}
      </button>

      <p className="text-xs text-center text-ink-dim">
        By submitting, you confirm that the information provided is accurate.
      </p>
    </form>
  )
}

function AutoTag() {
  return (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-forest bg-forest/10 rounded px-1.5 py-0.5 pointer-events-none">
      <Sparkles size={9} /> auto
    </span>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white'
