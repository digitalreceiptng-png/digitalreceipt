'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Copy, Check, Eye, Upload, Loader2 } from 'lucide-react'

interface SubAccount {
  id: string
  business_name: string
  logo_url: string | null
  slug: string | null
  primary_color: string | null
  secondary_color: string | null
  receipt_footer_text: string | null
  staff_pin_hash: string | null
  phone: string | null
  email: string | null
  address: string | null
  rc_number: string | null
}

export default function BrandingForm({ subAccount }: { subAccount: SubAccount }) {
  const [slug, setSlug] = useState(subAccount.slug ?? '')
  const [primaryColor, setPrimaryColor] = useState(subAccount.primary_color ?? '#0d6b1e')
  const [secondaryColor, setSecondaryColor] = useState(subAccount.secondary_color ?? '#e8f5ec')
  const [footerText, setFooterText] = useState(subAccount.receipt_footer_text ?? '')
  const [phone, setPhone] = useState(subAccount.phone ?? '')
  const [email, setEmail] = useState(subAccount.email ?? '')
  const [address, setAddress] = useState(subAccount.address ?? '')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const [logoUrl, setLogoUrl] = useState(subAccount.logo_url)
  const [logoUploading, setLogoUploading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const hasPin = !!subAccount.staff_pin_hash
  const generateUrl = slug ? `https://digitalreceipt.ng/generate/${slug}` : null

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2 MB.'); return }

    setLogoUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/sub-accounts/${subAccount.id}/logo`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setLogoUrl(data.logo_url ?? data.url ?? null)
    } catch (err: any) {
      setError(err.message ?? 'Logo upload failed.')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (pin && pin !== confirmPin) {
      setError('PINs do not match.')
      return
    }
    if (pin && !/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits.')
      return
    }
    if (slug && !/^[a-z0-9-]{3,50}$/.test(slug)) {
      setError('Slug must be 3–50 characters: lowercase letters, numbers, and hyphens only.')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, string> = {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        receipt_footer_text: footerText,
        phone,
        email,
        address,
        ...(slug ? { slug } : {}),
        ...(pin ? { pin } : {}),
      }

      const res = await fetch(`/api/sub-accounts/${subAccount.id}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')

      if (data.subAccount?.slug) setSlug(data.subAccount.slug)
      setPin('')
      setConfirmPin('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message ?? 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    if (!generateUrl) return
    navigator.clipboard.writeText(generateUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-border overflow-hidden">
      {/* Card header */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: `${primaryColor}12`, borderBottom: `1.5px solid ${primaryColor}25` }}
      >
        {logoUrl ? (
          <Image src={logoUrl} alt={subAccount.business_name} width={40} height={40} className="rounded-xl object-contain" style={{ maxHeight: 40 }} />
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: primaryColor }}>
            {subAccount.business_name[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-ink">{subAccount.business_name}</p>
          {subAccount.rc_number && <p className="text-xs text-ink-dim">RC {subAccount.rc_number}</p>}
        </div>
      </div>

      <div className="p-5 space-y-6">

        {/* Generate link */}
        <div>
          <label className="field-label">Unique Generate-Receipt Link</label>
          <div className="flex gap-2 mt-1.5">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-dim select-none">
                digitalreceipt.ng/generate/
              </span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="your-biz-name"
                className="w-full pl-[180px] pr-3 py-2.5 rounded-xl border border-border text-sm outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
              />
            </div>
            {generateUrl && (
              <button
                type="button"
                onClick={copyLink}
                className="px-3 py-2.5 rounded-xl border border-border text-sm text-ink-muted hover:bg-surface transition-colors shrink-0"
              >
                {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
              </button>
            )}
          </div>
          {generateUrl && (
            <div className="flex items-center gap-2 mt-2">
              <p className="text-xs text-ink-dim truncate">{generateUrl}</p>
              <a href={generateUrl} target="_blank" rel="noreferrer" className="shrink-0">
                <Eye size={13} className="text-ink-dim hover:text-forest transition-colors" />
              </a>
            </div>
          )}
        </div>

        {/* Logo upload */}
        <div>
          <label className="field-label">Company Logo</label>
          <div className="flex items-center gap-4 mt-1.5">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={56} height={56} className="rounded-xl object-contain border border-border" style={{ maxHeight: 56 }} />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-surface border border-border flex items-center justify-center text-ink-dim text-xl font-bold">
                {subAccount.business_name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={logoUploading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-ink-muted hover:bg-surface transition-colors disabled:opacity-50"
              >
                {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {logoUploading ? 'Uploading…' : 'Upload Logo'}
              </button>
              <p className="text-[11px] text-ink-dim mt-1">PNG, JPG, WebP — max 2 MB</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Primary Color</label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setPrimaryColor(e.target.value) }}
                className="flex-1 px-3 py-2 rounded-xl border border-border text-sm font-mono outline-none focus:border-forest"
              />
            </div>
          </div>
          <div>
            <label className="field-label">Background Color</label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="color"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setSecondaryColor(e.target.value) }}
                className="flex-1 px-3 py-2 rounded-xl border border-border text-sm font-mono outline-none focus:border-forest"
              />
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-3">
          <label className="field-label">Contact Details <span className="font-normal text-ink-dim">(shown on receipts)</span></label>
          <input type="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} className="field-input" />
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="field-input" />
          <input type="text" placeholder="Business address" value={address} onChange={e => setAddress(e.target.value)} className="field-input" />
        </div>

        {/* Footer text */}
        <div>
          <label className="field-label">Receipt Footer Text <span className="font-normal text-ink-dim">(optional)</span></label>
          <textarea
            value={footerText}
            onChange={e => setFooterText(e.target.value)}
            rows={2}
            placeholder="e.g. Thank you for your business!"
            className="field-input mt-1.5 resize-none"
          />
        </div>

        {/* PIN */}
        <div className="space-y-3">
          <label className="field-label">
            Staff PIN{' '}
            <span className="font-normal text-ink-dim">
              ({hasPin ? 'change PIN' : 'set a 6-digit PIN for staff access'})
            </span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="New 6-digit PIN"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="field-input"
          />
          {pin && (
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="field-input"
            />
          )}
        </div>

        {/* Preview */}
        {generateUrl && (
          <div
            className="rounded-xl p-4 flex items-center gap-3 text-sm"
            style={{ background: `${primaryColor}10`, border: `1.5px solid ${primaryColor}30` }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: primaryColor }}>
              {subAccount.business_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium" style={{ color: primaryColor }}>{subAccount.business_name}</p>
              <p className="text-xs text-ink-dim">Preview of staff-facing page header</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'oklch(0.42 0.18 145)' }}
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Branding Settings'}
        </button>
      </div>

      <style jsx global>{`
        .field-label { display: block; font-size: 12px; font-weight: 600; color: #6b7280; }
        .field-input {
          display: block; width: 100%; padding: 10px 12px;
          border: 1.5px solid oklch(0.875 0.020 145); border-radius: 12px;
          font-size: 14px; outline: none; background: white; color: #111827;
          transition: border-color 0.15s;
        }
        .field-input:focus { border-color: oklch(0.42 0.18 145); box-shadow: 0 0 0 3px oklch(0.42 0.18 145 / 0.15); }
      `}</style>
    </form>
  )
}
