'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/formatters'
import {
  UserPlus, Trash2, Mail, Users, CheckCircle, Clock, ToggleLeft, ToggleRight, Loader2, X, Pencil, Check,
} from 'lucide-react'

interface StaffMember {
  id: string
  staff_id: string
  role: string
  display_name?: string | null
  can_create_receipts: boolean
  can_view_all_receipts: boolean
  can_view_wallet: boolean
  is_active: boolean
  created_at: string
  staff_profile?: { id: string; full_name: string; email: string } | null
}

interface PendingInvite {
  id: string
  email: string
  role: string
  status: string
  can_create_receipts: boolean
  can_view_all_receipts: boolean
  can_view_wallet: boolean
  expires_at: string
  created_at: string
}

interface OwnerProfile {
  full_name: string
  email: string
  logo_url: string | null
  issued_by_name: string
}

interface Props {
  members: StaffMember[]
  pendingInvites: PendingInvite[]
  ownerProfile: OwnerProfile
}

const ROLES = [
  { value: 'sales_rep', label: 'Sales Representative' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'manager', label: 'Manager' },
]

const INPUT = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white'

export default function StaffManager({ members: initialMembers, pendingInvites: initialInvites, ownerProfile }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [pendingInvites, setPendingInvites] = useState(initialInvites)
  const [editingOwnerName, setEditingOwnerName] = useState(false)
  const [ownerNameDraft, setOwnerNameDraft] = useState(ownerProfile.issued_by_name)
  const [ownerNameSaving, setOwnerNameSaving] = useState(false)
  const [ownerDisplayName, setOwnerDisplayName] = useState(ownerProfile.issued_by_name)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'sales_rep',
    can_create_receipts: true,
    can_view_all_receipts: false,
    can_view_wallet: false,
  })
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  async function sendInvite() {
    if (!form.name.trim()) { setInviteError('Name is required'); return }
    if (!form.email.trim()) { setInviteError('Email is required'); return }
    setInviteLoading(true)
    setInviteError('')
    try {
      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error ?? 'Failed to send invite'); return }
      setInviteSent(true)
      setTimeout(() => {
        setShowInviteForm(false)
        setInviteSent(false)
        setForm({ name: '', email: '', role: 'sales_rep', can_create_receipts: true, can_view_all_receipts: false, can_view_wallet: false })
        router.refresh()
      }, 2000)
    } finally {
      setInviteLoading(false)
    }
  }

  async function saveStaffName(id: string) {
    if (!nameDraft.trim()) return
    setNameSaving(true)
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: nameDraft.trim() }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, display_name: nameDraft.trim() } : m))
      setEditingNameId(null)
    }
    setNameSaving(false)
  }

  async function saveOwnerName() {
    setOwnerNameSaving(true)
    const res = await fetch('/api/profile/issued-by-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issued_by_name: ownerNameDraft.trim() }),
    })
    if (res.ok) {
      setOwnerDisplayName(ownerNameDraft.trim())
      setEditingOwnerName(false)
    }
    setOwnerNameSaving(false)
  }

  async function removeMember(id: string) {
    if (!confirm('Remove this staff member? They will no longer be able to issue receipts on your behalf.')) return
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== id))
  }

  async function togglePermission(id: string, field: 'can_create_receipts' | 'can_view_all_receipts' | 'can_view_wallet', value: boolean) {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label ?? role

  const ownerInitials = (ownerProfile.full_name || ownerProfile.email)
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?'

  return (
    <div className="space-y-5">
      {/* Admin (you) card */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">You (Admin)</p>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden" style={{ background: 'oklch(0.42 0.18 145)' }}>
            {ownerProfile.logo_url
              ? <img src={ownerProfile.logo_url} alt="avatar" className="w-full h-full object-cover" />
              : ownerInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">{ownerProfile.full_name || ownerProfile.email}</p>
            <p className="text-xs text-ink-muted">{ownerProfile.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs px-2 py-0.5 rounded-lg bg-forest/10 text-forest border border-forest/20 font-medium">Admin</span>
            {editingOwnerName ? (
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  autoFocus
                  value={ownerNameDraft}
                  onChange={e => setOwnerNameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveOwnerName(); if (e.key === 'Escape') setEditingOwnerName(false) }}
                  placeholder="Issued By name…"
                  className="text-xs border border-forest/40 rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-forest/30"
                />
                <button onClick={saveOwnerName} disabled={ownerNameSaving} className="text-forest hover:text-forest-bright">
                  {ownerNameSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                </button>
                <button onClick={() => setEditingOwnerName(false)} className="text-ink-dim hover:text-ink"><X size={13} /></button>
              </div>
            ) : (
              <button
                onClick={() => { setOwnerNameDraft(ownerDisplayName); setEditingOwnerName(true) }}
                className="flex items-center gap-1 text-xs text-ink-dim hover:text-forest transition-colors mt-0.5"
              >
                <Pencil size={11} />
                {ownerDisplayName ? ownerDisplayName : 'Set display name'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active staff */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-ink-muted" />
            <h2 className="text-sm font-semibold text-ink">Active Staff</h2>
            {members.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-forest/10 text-forest">{members.length}</span>
            )}
          </div>
          <button
            onClick={() => { setShowInviteForm(true); setInviteSent(false); setInviteError('') }}
            className="flex items-center gap-2 px-3.5 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-bright transition-colors"
          >
            <UserPlus size={13} />
            Invite Staff
          </button>
        </div>

        {members.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={28} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No staff members yet</p>
            <p className="text-xs text-ink-dim mt-1">Invite team members to issue receipts on your behalf</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map(member => (
              <div key={member.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'oklch(0.42 0.18 145)' }}
                    >
                      {(member.display_name ?? member.staff_profile?.full_name ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      {editingNameId === member.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={nameDraft}
                            onChange={e => setNameDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveStaffName(member.id); if (e.key === 'Escape') setEditingNameId(null) }}
                            className="text-sm border border-forest/40 rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-forest/30"
                          />
                          <button onClick={() => saveStaffName(member.id)} disabled={nameSaving} className="text-forest hover:text-forest-bright">
                            {nameSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button onClick={() => setEditingNameId(null)} className="text-ink-dim hover:text-ink"><X size={13} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-ink">{member.display_name ?? member.staff_profile?.full_name ?? 'Unknown'}</p>
                          <button
                            onClick={() => { setEditingNameId(member.id); setNameDraft(member.display_name ?? member.staff_profile?.full_name ?? '') }}
                            className="p-0.5 text-ink-dim hover:text-forest transition-colors"
                            title="Rename staff member"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-ink-muted">{member.staff_profile?.email ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-lg bg-surface border border-border text-ink-muted">
                      {roleLabel(member.role)}
                    </span>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-1.5 rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 transition-colors"
                      title="Remove staff member"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {/* Permission toggles */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(
                    [
                      { field: 'can_create_receipts', label: 'Create Receipts' },
                      { field: 'can_view_all_receipts', label: 'View All Receipts' },
                      { field: 'can_view_wallet', label: 'View Wallet' },
                    ] as const
                  ).map(({ field, label }) => (
                    <button
                      key={field}
                      onClick={() => togglePermission(member.id, field, !member[field])}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                      style={
                        member[field]
                          ? { background: 'oklch(0.96 0.02 145)', borderColor: 'oklch(0.82 0.06 145)', color: 'oklch(0.35 0.16 145)' }
                          : { background: 'white', borderColor: 'oklch(0.90 0.01 145)', color: 'oklch(0.55 0.02 145)' }
                      }
                    >
                      {member[field] ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-dim mt-2">Added {formatDate(member.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Clock size={15} className="text-ink-muted" />
            <h2 className="text-sm font-semibold text-ink">Pending Invitations</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">{pendingInvites.length}</span>
          </div>
          <div className="divide-y divide-border">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
                  <Mail size={13} className="text-ink-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{invite.email}</p>
                  <p className="text-xs text-ink-dim">{roleLabel(invite.role)} · expires {formatDate(invite.expires_at)}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-border p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg text-ink">Invite Staff Member</h3>
              <button onClick={() => setShowInviteForm(false)} className="p-1.5 rounded-lg text-ink-dim hover:text-ink hover:bg-surface transition-colors">
                <X size={18} />
              </button>
            </div>

            {inviteSent ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: 'oklch(0.96 0.02 145)' }}>
                  <CheckCircle size={22} className="text-forest" />
                </div>
                <p className="text-sm font-medium text-ink">Invitation sent!</p>
                <p className="text-xs text-ink-muted">An email with the invite link has been sent to <strong>{form.email}</strong></p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Full name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className={INPUT}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="staff@example.com"
                      className={INPUT}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Role</label>
                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={INPUT}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-ink mb-2">Permissions</p>
                    <div className="space-y-2">
                      {(
                        [
                          { field: 'can_create_receipts', label: 'Create receipts', desc: 'Can issue receipts on your behalf' },
                          { field: 'can_view_all_receipts', label: 'View all receipts', desc: 'Can see all receipts in your account' },
                          { field: 'can_view_wallet', label: 'View wallet', desc: 'Can see your wallet balance' },
                        ] as const
                      ).map(({ field, label, desc }) => (
                        <label key={field} className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:border-forest/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={form[field]}
                            onChange={e => setForm(p => ({ ...p, [field]: e.target.checked }))}
                            className="mt-0.5 accent-forest"
                          />
                          <div>
                            <p className="text-sm font-medium text-ink">{label}</p>
                            <p className="text-xs text-ink-muted">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {inviteError && (
                  <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{inviteError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-ink-muted hover:text-ink hover:border-border-bright transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendInvite}
                    disabled={inviteLoading}
                    className="flex-1 py-2.5 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? <><Loader2 size={14} className="animate-spin" />Sending…</> : <>Send Invite</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
