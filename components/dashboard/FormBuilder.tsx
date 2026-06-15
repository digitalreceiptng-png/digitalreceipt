'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical, Eye, Save, Link2, Copy, Check, ChevronUp, ChevronDown } from 'lucide-react'

const APP_URL = 'https://digitalreceipt.ng'

const DEFAULT_FIELD_LABELS: Record<string, string> = {
  item_description: 'Item Description',
  unit_of_item: 'Unit of Item',
  unit_price: 'Unit Price',
  additional_notes: 'Additional Notes',
  payment_method: 'Payment Method',
}

const DEFAULT_FIELD_CONFIG: Record<string, string> = {
  customer_email: 'required',
  customer_phone: 'optional',
  item_description: 'required',
  unit_of_item: 'optional',
  unit_price: 'required',
  payment_method: 'optional',
  payment_date: 'optional',
  additional_notes: 'optional',
}

const CONFIGURABLE_FIELDS = [
  { key: 'customer_email', defaultLabel: 'Email Address', canRename: false },
  { key: 'customer_phone', defaultLabel: 'Phone Number', canRename: false },
  { key: 'item_description', defaultLabel: 'Item Description', canRename: true },
  { key: 'unit_of_item', defaultLabel: 'Unit of Item', canRename: true },
  { key: 'unit_price', defaultLabel: 'Unit Price', canRename: true },
  { key: 'payment_method', defaultLabel: 'Payment Method', canRename: false },
  { key: 'payment_date', defaultLabel: 'Date of Payment', canRename: false },
  { key: 'additional_notes', defaultLabel: 'Additional Notes', canRename: true },
]

type Purpose = { id: string; label: string; sort_order: number }

interface FormData {
  title: string
  vat_enabled: boolean
  vat_rate: string
  require_payment_evidence: boolean
  additional_instructions: string
  purpose_type: 'fixed' | 'multiple'
  fixed_purpose: string
  purposes: Purpose[]
  field_labels: Record<string, string>
  field_config: Record<string, string>
}

interface Props {
  formId?: string
  initialData?: Partial<FormData> & { id?: string }
  onSaved?: (id: string) => void
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export default function FormBuilder({ formId, initialData, onSaved }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<string | null>(formId ?? null)
  const [copied, setCopied] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const [data, setData] = useState<FormData>({
    title: initialData?.title ?? '',
    vat_enabled: initialData?.vat_enabled ?? false,
    vat_rate: String(initialData?.vat_rate ?? '7.5'),
    require_payment_evidence: initialData?.require_payment_evidence ?? false,
    additional_instructions: initialData?.additional_instructions ?? '',
    purpose_type: initialData?.purpose_type ?? 'fixed',
    fixed_purpose: initialData?.fixed_purpose ?? '',
    purposes: (initialData?.purposes as Purpose[]) ?? [],
    field_labels: { ...DEFAULT_FIELD_LABELS, ...(initialData?.field_labels ?? {}) },
    field_config: { ...DEFAULT_FIELD_CONFIG, ...(initialData?.field_config ?? {}) },
  })

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setData(d => ({ ...d, [key]: value }))
  }, [])

  function addPurpose() {
    set('purposes', [...data.purposes, { id: uid(), label: '', sort_order: data.purposes.length }])
  }

  function updatePurpose(id: string, label: string) {
    set('purposes', data.purposes.map(p => p.id === id ? { ...p, label } : p))
  }

  function removePurpose(id: string) {
    set('purposes', data.purposes.filter(p => p.id !== id).map((p, i) => ({ ...p, sort_order: i })))
  }

  function movePurpose(id: string, dir: -1 | 1) {
    const idx = data.purposes.findIndex(p => p.id === id)
    if (idx < 0) return
    const next = idx + dir
    if (next < 0 || next >= data.purposes.length) return
    const updated = [...data.purposes]
    ;[updated[idx], updated[next]] = [updated[next], updated[idx]]
    set('purposes', updated.map((p, i) => ({ ...p, sort_order: i })))
  }

  function setFieldLabel(key: string, value: string) {
    set('field_labels', { ...data.field_labels, [key]: value })
  }

  function setFieldConfig(key: string, value: string) {
    set('field_config', { ...data.field_config, [key]: value })
  }

  async function save() {
    setSaving(true)
    setError('')

    const payload = {
      title: data.title.trim() || null,
      vat_enabled: data.vat_enabled,
      vat_rate: data.vat_enabled ? parseFloat(data.vat_rate) || 7.5 : null,
      require_payment_evidence: data.require_payment_evidence,
      additional_instructions: data.additional_instructions.trim() || null,
      purpose_type: data.purpose_type,
      fixed_purpose: data.purpose_type === 'fixed' ? data.fixed_purpose.trim() || null : null,
      purposes: data.purpose_type === 'multiple'
        ? data.purposes.filter(p => p.label.trim()).map((p, i) => ({ label: p.label.trim(), sort_order: i }))
        : [],
      field_labels: data.field_labels,
      field_config: data.field_config,
    }

    try {
      const url = savedId ? `/api/forms/${savedId}` : '/api/forms'
      const method = savedId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
      const id = json.form.id
      setSavedId(id)
      onSaved?.(id)
      if (!savedId) router.replace(`/dashboard/forms/${id}/edit`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    if (!savedId) return
    navigator.clipboard.writeText(`${APP_URL}/form/${savedId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formUrl = savedId ? `${APP_URL}/form/${savedId}` : null

  return (
    <div className="space-y-6">
      {/* Link banner (if saved) */}
      {formUrl && (
        <div className="flex items-center gap-3 bg-forest/8 border border-forest/20 rounded-xl px-4 py-3">
          <Link2 size={16} className="text-forest shrink-0" />
          <p className="flex-1 text-sm text-forest font-mono truncate">{formUrl}</p>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-forest-bright transition-colors shrink-0"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      {/* Section 1: Basic Settings */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-ink text-base">Basic Settings</h2>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">Form Title <span className="text-ink-dim font-normal">(optional)</span></label>
          <input
            value={data.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. School Fees Payment Form"
            className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Toggle
            label="Enable VAT"
            description="Add VAT to the total amount"
            checked={data.vat_enabled}
            onChange={v => set('vat_enabled', v)}
          />
          <Toggle
            label="Require Payment Evidence"
            description="Customers must upload proof of payment"
            checked={data.require_payment_evidence}
            onChange={v => set('require_payment_evidence', v)}
          />
        </div>

        {data.vat_enabled && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink">VAT Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={data.vat_rate}
              onChange={e => set('vat_rate', e.target.value)}
              className="w-36 px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
            />
            <p className="text-xs text-ink-dim">Nigeria standard VAT is 7.5%</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">Additional Instructions <span className="text-ink-dim font-normal">(optional)</span></label>
          <textarea
            value={data.additional_instructions}
            onChange={e => set('additional_instructions', e.target.value)}
            placeholder="Any special instructions for customers completing this form…"
            rows={3}
            className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors resize-none"
          />
        </div>
      </section>

      {/* Section 2: Purpose of Payment */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-ink text-base">Purpose of Payment</h2>

        <div className="flex gap-2">
          {(['fixed', 'multiple'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set('purpose_type', t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                data.purpose_type === t
                  ? 'bg-forest text-white border-forest'
                  : 'bg-white text-ink-muted border-border hover:border-forest/40 hover:text-forest'
              }`}
            >
              {t === 'fixed' ? 'Fixed Purpose' : 'Multiple Purposes'}
            </button>
          ))}
        </div>

        {data.purpose_type === 'fixed' && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink">Purpose</label>
            <input
              value={data.fixed_purpose}
              onChange={e => set('fixed_purpose', e.target.value)}
              placeholder="e.g. School Fees, Rent Payment, Subscription…"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
            />
          </div>
        )}

        {data.purpose_type === 'multiple' && (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted">Add the payment purposes customers can select from.</p>
            {data.purposes.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => movePurpose(p.id, -1)} disabled={idx === 0} className="text-ink-dim hover:text-ink disabled:opacity-30 transition-colors"><ChevronUp size={14} /></button>
                  <button type="button" onClick={() => movePurpose(p.id, 1)} disabled={idx === data.purposes.length - 1} className="text-ink-dim hover:text-ink disabled:opacity-30 transition-colors"><ChevronDown size={14} /></button>
                </div>
                <GripVertical size={14} className="text-ink-dim shrink-0" />
                <input
                  value={p.label}
                  onChange={e => updatePurpose(p.id, e.target.value)}
                  placeholder={`Purpose ${idx + 1}`}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
                />
                <button type="button" onClick={() => removePurpose(p.id)} className="p-1.5 text-ink-dim hover:text-danger transition-colors rounded">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPurpose}
              className="flex items-center gap-2 text-sm text-forest font-medium hover:text-forest-bright transition-colors mt-1"
            >
              <Plus size={15} />
              Add purpose
            </button>
          </div>
        )}
      </section>

      {/* Section 3: Field Configuration */}
      <section className="bg-white rounded-xl border border-border p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-ink text-base">Field Configuration</h2>
          <p className="text-sm text-ink-muted mt-1">Customize labels and control which fields appear on the form.</p>
        </div>

        {/* Always-required fields notice */}
        <div className="text-xs text-ink-dim bg-surface rounded-lg px-3 py-2 border border-border">
          <strong>Always required:</strong> Customer Name, Total Amount Paid
        </div>

        <div className="divide-y divide-border">
          {CONFIGURABLE_FIELDS.map(f => (
            <div key={f.key} className="py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">{f.defaultLabel}</p>
                {f.canRename && (
                  <input
                    value={data.field_labels[f.key] ?? f.defaultLabel}
                    onChange={e => setFieldLabel(f.key, e.target.value)}
                    placeholder={f.defaultLabel}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
                  />
                )}
              </div>
              <div className="flex gap-1.5">
                {(['required', 'optional', 'hidden'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFieldConfig(f.key, v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      (data.field_config[f.key] ?? DEFAULT_FIELD_CONFIG[f.key]) === v
                        ? v === 'hidden'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : v === 'required'
                          ? 'bg-forest/10 text-forest border-forest/30'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-white text-ink-dim border-border hover:border-ink-dim'
                    }`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-border text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white"
        >
          <Eye size={15} />
          Preview Form
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-forest text-white hover:bg-forest-bright transition-colors disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? 'Saving…' : savedId ? 'Save Changes' : 'Generate Form Link'}
        </button>
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <FormPreviewModal data={data} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 p-4 rounded-xl border transition-colors text-left ${checked ? 'border-forest/30 bg-forest/5' : 'border-border bg-white hover:border-forest/20'}`}
    >
      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-forest border-forest' : 'border-border'}`}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-dim mt-0.5">{description}</p>
      </div>
    </button>
  )
}

function FormPreviewModal({ data, onClose }: { data: FormData; onClose: () => void }) {
  const fieldLabel = (key: string, fallback: string) => data.field_labels[key] || fallback
  const fieldCfg = (key: string) => data.field_config[key] ?? DEFAULT_FIELD_CONFIG[key] ?? 'optional'
  const isVisible = (key: string) => fieldCfg(key) !== 'hidden'
  const isRequired = (key: string) => fieldCfg(key) === 'required'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full my-8 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-forest px-6 py-5">
          <p className="text-xs font-bold tracking-widest text-white/60 uppercase mb-1">DigitalReceipt.ng</p>
          <h1 className="text-xl font-bold text-white">{data.title || 'Receipt Request Form'}</h1>
          {data.additional_instructions && (
            <p className="text-white/70 text-sm mt-2">{data.additional_instructions}</p>
          )}
        </div>
        <div className="p-6 space-y-4">
          <PreviewField label="Full Name" required />
          {isVisible('customer_email') && <PreviewField label="Email Address" required={isRequired('customer_email')} />}
          {isVisible('customer_phone') && <PreviewField label="Phone Number" required={isRequired('customer_phone')} />}

          {data.purpose_type === 'fixed' && data.fixed_purpose && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink">Purpose of Payment <span className="text-ink-dim">(fixed)</span></p>
              <div className="px-3.5 py-2.5 bg-surface border border-border rounded-lg text-sm text-ink-muted">{data.fixed_purpose}</div>
            </div>
          )}

          {data.purpose_type === 'multiple' && data.purposes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink">Purpose of Payment <span className="text-danger text-xs">*</span></p>
              <select className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink-muted bg-white appearance-none">
                <option>Select purpose…</option>
                {data.purposes.filter(p => p.label.trim()).map(p => (
                  <option key={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          {isVisible('item_description') && <PreviewField label={fieldLabel('item_description', 'Item Description')} required={isRequired('item_description')} />}
          {isVisible('unit_of_item') && <PreviewField label={fieldLabel('unit_of_item', 'Unit of Item')} required={isRequired('unit_of_item')} />}
          {isVisible('unit_price') && <PreviewField label={fieldLabel('unit_price', 'Unit Price')} required={isRequired('unit_price')} type="number" />}
          <PreviewField label="Total Amount Paid" required type="number" />
          {isVisible('payment_method') && <PreviewField label={fieldLabel('payment_method', 'Payment Method')} required={isRequired('payment_method')} />}
          {isVisible('payment_date') && <PreviewField label="Date of Payment" required={isRequired('payment_date')} type="date" />}
          {isVisible('additional_notes') && <PreviewField label={fieldLabel('additional_notes', 'Additional Notes')} required={isRequired('additional_notes')} textarea />}

          {data.require_payment_evidence && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink">Proof of Payment <span className="text-danger text-xs">*</span></p>
              <div className="border-2 border-dashed border-border rounded-lg px-4 py-6 text-center text-sm text-ink-dim">Upload file (JPG, PNG, PDF — max 10 MB)</div>
            </div>
          )}

          <button className="w-full bg-forest text-white py-3 rounded-xl font-semibold text-sm hover:bg-forest-bright transition-colors">Submit Request</button>
        </div>
        <div className="border-t border-border px-6 py-4 flex justify-between items-center">
          <p className="text-xs text-ink-dim">Preview only — not functional</p>
          <button onClick={onClose} className="text-sm font-medium text-forest hover:text-forest-bright transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}

function PreviewField({ label, required, type = 'text', textarea = false }: {
  label: string
  required?: boolean
  type?: string
  textarea?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-ink">
        {label} {required && <span className="text-danger text-xs">*</span>}
      </p>
      {textarea
        ? <textarea rows={2} disabled className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink-dim bg-surface resize-none" />
        : <input type={type} disabled className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink-dim bg-surface" />
      }
    </div>
  )
}
