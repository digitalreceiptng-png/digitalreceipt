'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Copy, Check, Eye, Upload, Loader2, Code2, FileText } from 'lucide-react'

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
  const [codeCopied, setCodeCopied] = useState(false)
  const [embedPosition, setEmbedPosition] = useState<'inline' | 'bottom-left' | 'bottom-center' | 'bottom-right'>('inline')

  const fileRef = useRef<HTMLInputElement>(null)
  const hasPin = !!subAccount.staff_pin_hash
  const generateUrl = slug ? `https://digitalreceipt.ng/generate/${slug}` : null

  const BUTTON_INNER = generateUrl
    ? `<a href="${generateUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:11px 20px;background:${primaryColor};color:#ffffff;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;line-height:1;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.18);"><svg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/></svg>Generate Receipt</a>`
    : ''

  const POSITION_STYLES: Record<string, string> = {
    'inline': '',
    'bottom-left':   'position:fixed;bottom:24px;left:24px;z-index:99999;',
    'bottom-center': 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;',
    'bottom-right':  'position:fixed;bottom:24px;right:24px;z-index:99999;',
  }

  const embedCode = BUTTON_INNER
    ? embedPosition === 'inline'
      ? BUTTON_INNER
      : `<div style="${POSITION_STYLES[embedPosition]}">${BUTTON_INNER}</div>`
    : ''

  function copyEmbedCode() {
    if (!embedCode) return
    navigator.clipboard.writeText(embedCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2500)
  }

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

        {/* ── Generate Button Creation ───────────────────────────────────── */}
        <div className="rounded-xl border border-dashed border-gray-200 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Code2 size={15} className="text-gray-400 shrink-0" />
            <p className="text-sm font-semibold text-gray-700">Generate Button Creation</p>
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            Your staff generate link is auto-generated from the unique link you set above. Copy the embed code and paste it into any website to display a &quot;Generate Receipt&quot; button.
          </p>

          {/* Auto-generated link display */}
          {generateUrl ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-xs text-gray-600 font-mono">
              <span className="flex-1 truncate">{generateUrl}</span>
              <span className="text-[10px] text-green-600 font-sans font-semibold shrink-0 bg-green-50 px-1.5 py-0.5 rounded-md">auto</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-700">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Set a unique link slug above to generate your embed code.
            </div>
          )}

          {/* Position picker */}
          <div>
            <label className="field-label mb-2">Button Position on Page</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {([
                { value: 'inline',        label: 'Inline',         desc: 'Appears where you paste the code' },
                { value: 'bottom-left',   label: 'Bottom Left',    desc: 'Fixed to bottom-left corner' },
                { value: 'bottom-center', label: 'Bottom Center',  desc: 'Fixed to bottom-center' },
                { value: 'bottom-right',  label: 'Bottom Right',   desc: 'Fixed to bottom-right corner' },
              ] as const).map(opt => {
                const active = embedPosition === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEmbedPosition(opt.value)}
                    className="relative flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all"
                    style={{ borderColor: active ? primaryColor : '#e5e7eb', background: active ? `${primaryColor}08` : 'white' }}
                  >
                    {/* Mini page diagram */}
                    <PageDiagram position={opt.value} color={primaryColor} active={active} />
                    <span className="text-xs font-semibold mt-1" style={{ color: active ? primaryColor : '#374151' }}>{opt.label}</span>
                    <span className="text-[10px] text-gray-400 leading-tight">{opt.desc}</span>
                    {active && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: primaryColor }}>
                        <svg width="8" height="8" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Live button preview */}
          {embedLink.trim() && (
            <div className="space-y-2">
              <label className="field-label">Preview</label>
              <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <a
                  href={embedLink.trim()}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', background: primaryColor, color: '#fff',
                    borderRadius: 10, fontFamily: 'sans-serif', fontSize: 14,
                    fontWeight: 600, textDecoration: 'none', lineHeight: 1,
                  }}
                  onClick={e => e.preventDefault()}
                >
                  <FileText size={14} />
                  Generate Receipt
                </a>
                <span className="text-xs text-gray-400">← live preview</span>
              </div>
            </div>
          )}

          {/* Embed code */}
          {embedCode && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="field-label">Embed Code</label>
                <button
                  type="button"
                  onClick={copyEmbedCode}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {codeCopied ? <><Check size={12} className="text-green-600" /> Copied!</> : <><Copy size={12} /> Copy Code</>}
                </button>
              </div>
              <div className="relative">
                <pre className="text-[10px] leading-relaxed text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all select-all font-mono">
                  {embedCode}
                </pre>
              </div>
              <p className="text-[11px] text-gray-400">Copy this code and paste it inside the <code className="bg-gray-100 px-1 rounded text-gray-500">&lt;body&gt;</code> of any webpage to show the button.</p>
            </div>
          )}
        </div>

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

function PageDiagram({ position, color, active }: { position: string; color: string; active: boolean }) {
  const dot = { width: 6, height: 6, borderRadius: 3, background: active ? color : '#d1d5db', flexShrink: 0 } as const
  const isInline = position === 'inline'
  const isBottomLeft = position === 'bottom-left'
  const isBottomCenter = position === 'bottom-center'
  const isBottomRight = position === 'bottom-right'

  return (
    <div style={{ width: 44, height: 34, border: `1.5px solid ${active ? color : '#d1d5db'}`, borderRadius: 5, background: '#f9fafb', position: 'relative', flexShrink: 0 }}>
      {[0, 5, 10].map(t => (
        <div key={t} style={{ position: 'absolute', top: 5 + t, left: 5, right: 5, height: 2, borderRadius: 1, background: '#e5e7eb' }} />
      ))}
      {isInline && <div style={{ ...dot, position: 'absolute', top: 12, left: 5 }} />}
      {isBottomLeft && <div style={{ ...dot, position: 'absolute', bottom: 3, left: 4 }} />}
      {isBottomCenter && <div style={{ ...dot, position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)' }} />}
      {isBottomRight && <div style={{ ...dot, position: 'absolute', bottom: 3, right: 4 }} />}
    </div>
  )
}
