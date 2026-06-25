'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, X, GripVertical, ExternalLink, Upload } from 'lucide-react'

interface Partner {
  id: string
  name: string
  logo_url: string
  website_url: string | null
  is_active: boolean
  sort_order: number
}

const INPUT = 'w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white'

export default function PartnersManager({ partners: initial }: { partners: Partner[] }) {
  const router = useRouter()
  const [partners, setPartners] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', website_url: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function addPartner() {
    if (!form.name.trim() || !logoFile) { setError('Name and logo image are required'); return }
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('website_url', form.website_url.trim())
      fd.append('sort_order', String(partners.length))
      fd.append('logo', logoFile)
      const res = await fetch('/api/admin/partners', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to add partner'); return }
      setPartners(p => [...p, data.partner])
      setForm({ name: '', website_url: '' })
      setLogoFile(null)
      setLogoPreview('')
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/partners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) setPartners(p => p.map(pt => pt.id === id ? { ...pt, is_active: !current } : pt))
  }

  async function remove(id: string) {
    if (!confirm('Remove this partner?')) return
    const res = await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' })
    if (res.ok) setPartners(p => p.filter(pt => pt.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">Partners</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-forest/10 text-forest">{partners.length}</span>
            <span className="text-xs text-ink-dim">({partners.filter(p => p.is_active).length} active)</span>
          </div>
          <button
            onClick={() => { setShowForm(true); setError('') }}
            className="flex items-center gap-2 px-3.5 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-bright transition-colors"
          >
            <Plus size={13} />
            Add Partner
          </button>
        </div>

        {partners.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-ink-muted">No partners yet</p>
            <p className="text-xs text-ink-dim mt-1">Add partner logos to display on the homepage</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {partners.map(partner => (
              <div key={partner.id} className="px-5 py-3.5 flex items-center gap-4 group">
                <GripVertical size={14} className="text-ink-dim shrink-0 cursor-grab" />
                <div className="w-16 h-10 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden shrink-0 p-1">
                  <img src={partner.logo_url} alt={partner.name} className="h-full w-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{partner.name}</p>
                  {partner.website_url && (
                    <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-forest flex items-center gap-1 hover:underline">
                      {partner.website_url} <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(partner.id, partner.is_active)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    style={
                      partner.is_active
                        ? { background: 'oklch(0.96 0.02 145)', borderColor: 'oklch(0.82 0.06 145)', color: 'oklch(0.35 0.16 145)' }
                        : { background: 'white', borderColor: 'oklch(0.90 0.01 145)', color: 'oklch(0.55 0.02 145)' }
                    }
                  >
                    {partner.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    {partner.is_active ? 'Active' : 'Hidden'}
                  </button>
                  <button
                    onClick={() => remove(partner.id)}
                    className="p-1.5 rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add partner modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg text-ink">Add Partner</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-ink-dim hover:text-ink hover:bg-surface transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Partner name <span className="text-danger">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={INPUT} placeholder="e.g. Vasset" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Logo image <span className="text-danger">*</span></label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors"
                >
                  <Upload size={16} />
                  {logoFile ? logoFile.name : 'Click to upload logo image'}
                </button>
                {logoPreview && (
                  <div className="flex items-center gap-3 mt-2 p-3 bg-surface rounded-xl">
                    <div className="w-16 h-10 border border-border rounded-lg bg-white flex items-center justify-center overflow-hidden p-1 shrink-0">
                      <img src={logoPreview} alt="Preview" className="h-full w-full object-contain" />
                    </div>
                    <span className="text-xs text-ink-muted">Logo preview</span>
                    <button type="button" onClick={() => { setLogoFile(null); setLogoPreview('') }} className="ml-auto p-1 text-ink-dim hover:text-danger transition-colors"><X size={14} /></button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Website URL <span className="font-normal text-ink-dim">(optional)</span></label>
                <input type="url" value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} className={INPUT} placeholder="https://partner.com" />
              </div>
            </div>
            {error && <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-ink-muted hover:text-ink transition-colors">Cancel</button>
              <button onClick={addPartner} disabled={saving} className="flex-1 py-2.5 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" />Adding…</> : 'Add Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
