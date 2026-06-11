'use client'

import { useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, X, Megaphone, ExternalLink } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'urgent'
  link_text: string | null
  link_url: string | null
  is_active: boolean
  expires_at: string | null
  created_at: string
}

const INPUT = 'w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white'

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  info:    { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  success: { bg: 'bg-forest/10', text: 'text-forest',     dot: 'bg-forest' },
  urgent:  { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
}

export default function AnnouncementsManager({ announcements: initial }: { announcements: Announcement[] }) {
  const [items, setItems] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', message: '', type: 'info', link_text: '', link_url: '', expires_at: '' })

  async function create() {
    if (!form.title.trim() || !form.message.trim()) { setError('Title and message are required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setItems(p => [data.announcement, ...p])
      setForm({ title: '', message: '', type: 'info', link_text: '', link_url: '', expires_at: '' })
      setShowForm(false)
    } finally { setSaving(false) }
  }

  async function toggle(id: string, current: boolean) {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) setItems(p => p.map(a => a.id === id ? { ...a, is_active: !current } : a))
  }

  async function remove(id: string) {
    if (!confirm('Delete this announcement?')) return
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) setItems(p => p.filter(a => a.id !== id))
  }

  const active = items.filter(a => a.is_active)

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <Megaphone size={14} className="shrink-0" />
          <span><strong>{active.length}</strong> announcement{active.length > 1 ? 's are' : ' is'} currently live on the site.</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">Announcements</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-forest/10 text-forest">{items.length}</span>
          </div>
          <button
            onClick={() => { setShowForm(true); setError('') }}
            className="flex items-center gap-2 px-3.5 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-bright transition-colors"
          >
            <Plus size={13} />
            New Announcement
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Megaphone size={24} className="text-ink-dim mx-auto mb-2" />
            <p className="text-sm text-ink-muted">No announcements yet</p>
            <p className="text-xs text-ink-dim mt-1">Create banners to display across the site</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map(a => {
              const s = TYPE_STYLES[a.type]
              return (
                <div key={a.id} className="px-5 py-4 flex items-start gap-4">
                  <span className={`mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text} shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {a.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{a.message}</p>
                    {a.link_url && (
                      <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-forest flex items-center gap-1 mt-1 hover:underline">
                        {a.link_text ?? a.link_url} <ExternalLink size={10} />
                      </a>
                    )}
                    {a.expires_at && (
                      <p className="text-xs text-ink-dim mt-1">Expires {new Date(a.expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggle(a.id, a.is_active)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                      style={
                        a.is_active
                          ? { background: 'oklch(0.96 0.02 145)', borderColor: 'oklch(0.82 0.06 145)', color: 'oklch(0.35 0.16 145)' }
                          : { background: 'white', borderColor: 'oklch(0.90 0.01 145)', color: 'oklch(0.55 0.02 145)' }
                      }
                    >
                      {a.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      {a.is_active ? 'Live' : 'Hidden'}
                    </button>
                    <button onClick={() => remove(a.id)} className="p-1.5 rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg text-ink">New Announcement</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-ink-dim hover:text-ink hover:bg-surface transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={INPUT}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Title <span className="text-danger">*</span></label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={INPUT} placeholder="e.g. Scheduled maintenance" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Message <span className="text-danger">*</span></label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} className={INPUT + ' resize-none'} placeholder="The announcement body text shown to users" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Link text <span className="font-normal text-ink-dim">(optional)</span></label>
                  <input type="text" value={form.link_text} onChange={e => setForm(p => ({ ...p, link_text: e.target.value }))} className={INPUT} placeholder="Learn more" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Link URL <span className="font-normal text-ink-dim">(optional)</span></label>
                  <input type="url" value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} className={INPUT} placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Expires at <span className="font-normal text-ink-dim">(optional)</span></label>
                <input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className={INPUT} />
              </div>
            </div>
            {error && <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-ink-muted hover:text-ink transition-colors">Cancel</button>
              <button onClick={create} disabled={saving} className="flex-1 py-2.5 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" />Creating…</> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
