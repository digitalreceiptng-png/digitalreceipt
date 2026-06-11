'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, X, Shield } from 'lucide-react'

type AdminRole = 'super_admin' | 'support_agent' | 'finance_admin' | 'kyc_reviewer' | 'content_manager' | 'analyst'

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin:     'Super Admin',
  support_agent:   'Support Agent',
  finance_admin:   'Finance Admin',
  kyc_reviewer:    'KYC Reviewer',
  content_manager: 'Content Manager',
  analyst:         'Analyst',
}

interface AdminRecord {
  id: string
  role: string
  full_name: string
  email: string
  created_at: string
}

const INPUT = 'w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white'

const ROLE_BADGE: Record<string, string> = {
  super_admin:     'bg-red-50 text-red-700',
  support_agent:   'bg-blue-50 text-blue-700',
  finance_admin:   'bg-amber-50 text-amber-700',
  kyc_reviewer:    'bg-purple-50 text-purple-700',
  content_manager: 'bg-forest/10 text-forest',
  analyst:         'bg-surface text-ink-muted',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function AdminUsersManager({
  admins: initial,
  currentId,
  isSuperAdmin,
}: {
  admins: AdminRecord[]
  currentId: string
  isSuperAdmin: boolean
}) {
  const [admins, setAdmins] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', full_name: '', role: 'support_agent' })

  async function invite() {
    if (!form.email.trim()) { setError('Email is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setAdmins(p => [...p, { id: data.id, role: form.role, full_name: form.full_name || form.email, email: form.email, created_at: new Date().toISOString() }])
      setForm({ email: '', full_name: '', role: 'support_agent' })
      setShowForm(false)
    } finally { setSaving(false) }
  }

  async function changeRole(id: string, role: string) {
    const res = await fetch(`/api/admin/admin-users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) setAdmins(p => p.map(a => a.id === id ? { ...a, role } : a))
  }

  async function remove(id: string) {
    if (!confirm('Remove this admin? They will lose all access.')) return
    const res = await fetch(`/api/admin/admin-users/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? 'Failed'); return }
    setAdmins(p => p.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-4">
      {!isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <Shield size={14} className="shrink-0" />
          Only super admins can add or remove admin users.
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">Admin Users</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-forest/10 text-forest">{admins.length}</span>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => { setShowForm(true); setError('') }}
              className="flex items-center gap-2 px-3.5 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-bright transition-colors"
            >
              <Plus size={13} />
              Add Admin
            </button>
          )}
        </div>

        <div className="divide-y divide-border">
          {admins.map(a => (
            <div key={a.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-forest/10 flex items-center justify-center text-xs font-bold text-forest shrink-0">
                {initials(a.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink">{a.full_name}</p>
                  {a.id === currentId && <span className="text-xs text-ink-dim">(you)</span>}
                </div>
                <p className="text-xs text-ink-dim">{a.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isSuperAdmin && a.id !== currentId ? (
                  <select
                    value={a.role}
                    onChange={e => changeRole(a.id, e.target.value)}
                    className="px-2.5 py-1.5 border border-border rounded-lg text-xs text-ink bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 transition-colors"
                  >
                    {(Object.entries(ROLE_LABELS) as [AdminRole, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[a.role] ?? 'bg-surface text-ink-muted'}`}>
                    {ROLE_LABELS[a.role as AdminRole] ?? a.role}
                  </span>
                )}
                {isSuperAdmin && a.id !== currentId && (
                  <button onClick={() => remove(a.id)} className="p-1.5 rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg text-ink">Add Admin</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-ink-dim hover:text-ink hover:bg-surface transition-colors"><X size={18} /></button>
            </div>
            <p className="text-xs text-ink-dim">A Supabase auth account will be created. They can set their password via the login page.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Email <span className="text-danger">*</span></label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={INPUT} placeholder="admin@example.com" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Full name <span className="font-normal text-ink-dim">(optional)</span></label>
                <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className={INPUT} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={INPUT}>
                  {(Object.entries(ROLE_LABELS) as [AdminRole, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-ink-muted hover:text-ink transition-colors">Cancel</button>
              <button onClick={invite} disabled={saving} className="flex-1 py-2.5 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" />Creating…</> : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
