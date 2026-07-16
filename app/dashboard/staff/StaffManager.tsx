'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/formatters'
import {
  UserPlus, Trash2, Mail, Users, CheckCircle, Clock, ToggleLeft, ToggleRight,
  Loader2, X, Pencil, Check, Phone, Activity, AlertTriangle, KeyRound, FileText, Shield, Building2,
} from 'lucide-react'

type ValidityUnit = 'mins' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
const UNIT_MINUTES: Record<ValidityUnit, number> = {
  mins: 1, hours: 60, days: 1440, weeks: 10080, months: 43200, years: 525600,
}
function toMinutes(value: number, unit: ValidityUnit) { return Math.round(value * UNIT_MINUTES[unit]) }
function bestUnit(minutes: number): { value: number; unit: ValidityUnit } {
  for (const [unit, factor] of [['years', 525600], ['months', 43200], ['weeks', 10080], ['days', 1440], ['hours', 60]] as [ValidityUnit, number][]) {
    if (minutes >= factor && minutes % factor === 0) return { value: minutes / factor, unit }
  }
  return { value: minutes, unit: 'mins' }
}
function formatValidity(minutes: number): string {
  const { value, unit } = bestUnit(minutes)
  return `${value} ${value === 1 ? unit.replace(/s$/, '') : unit}`
}

interface StaffMember {
  id: string
  staff_id: string
  role: string
  display_name?: string | null
  phone?: string | null
  otp_validity_minutes?: number | null
  has_login_code?: boolean
  receipts_issued?: number
  can_create_receipts: boolean
  can_view_all_receipts: boolean
  can_view_wallet: boolean
  access_level?: string | null
  manage_all_profiles?: boolean
  managed_scopes?: string[]
  is_active: boolean
  created_at: string
  staff_profile?: { id: string; full_name: string; email: string } | null
}

interface SubAccount { id: string; business_name: string }

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
  phone: string | null
}

interface Props {
  members: StaffMember[]
  pendingInvites: PendingInvite[]
  ownerProfile: OwnerProfile
  subAccounts: SubAccount[]
}

// Assign which company profiles a generate-only staff member manages (or all).
function ProfileAssignment({ subAccounts, manageAll, scopes, onChange }: {
  subAccounts: SubAccount[]
  manageAll: boolean
  scopes: string[]
  onChange: (v: { manage_all_profiles: boolean; managed_scopes: string[] }) => void
}) {
  const toggleScope = (id: string) => {
    const next = scopes.includes(id) ? scopes.filter(s => s !== id) : [...scopes, id]
    onChange({ manage_all_profiles: false, managed_scopes: next.length ? next : ['main'] })
  }
  return (
    <div>
      <p className="text-xs font-medium text-ink mb-2">Profiles this staff manages</p>
      <label className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors mb-1.5"
        style={manageAll ? { borderColor: 'oklch(0.55 0.16 145)', background: 'oklch(0.97 0.02 145)' } : {}}>
        <input type="checkbox" checked={manageAll}
          onChange={e => onChange({ manage_all_profiles: e.target.checked, managed_scopes: scopes })}
          className="accent-forest w-4 h-4" />
        <span className="text-sm text-ink">All profiles <span className="text-ink-dim">(current &amp; future)</span></span>
      </label>
      {!manageAll && (
        <div className="space-y-1 pl-1">
          {[{ id: 'main', name: 'Main account' }, ...subAccounts.map(s => ({ id: s.id, name: s.business_name }))].map(opt => (
            <label key={opt.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface cursor-pointer">
              <input type="checkbox" checked={scopes.includes(opt.id)} onChange={() => toggleScope(opt.id)} className="accent-forest w-3.5 h-3.5" />
              <span className="text-sm text-ink">{opt.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const ROLES = [
  { value: 'sales_rep', label: 'Sales Representative' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'manager', label: 'Manager' },
]

const ACCESS_LEVELS = [
  { key: 'generate_only', label: 'Generate Receipt Only', desc: 'Only sees the receipt creation form. No dashboard access.' },
  { key: 'partial', label: 'Partial Access', desc: 'Can view the receipts dashboard but cannot edit, delete, or update payment.' },
  { key: 'full', label: 'All Access', desc: 'Full dashboard access — same as the account owner.' },
]

const INPUT = 'w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white'
const CODE_INPUT = 'w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white text-center text-2xl font-bold tracking-widest'

function ValidityPicker({ minutes, onChange, onSubmit, inputClass, compact }: {
  minutes: number; onChange: (mins: number) => void; onSubmit?: () => void; inputClass?: string; compact?: boolean
}) {
  const initial = bestUnit(minutes)
  const [value, setValue] = useState(String(initial.value))
  const [unit, setUnit] = useState<ValidityUnit>(initial.unit)

  function handleChange(v: string, u: ValidityUnit) {
    setValue(v); setUnit(u)
    const n = parseFloat(v)
    if (n > 0) onChange(toMinutes(n, u))
  }

  const base = compact
    ? 'text-xs border border-border rounded px-1.5 py-0.5 bg-white'
    : inputClass ?? 'text-sm border border-border rounded-lg px-3 py-2 w-full bg-white'

  return (
    <span className="flex items-center gap-1.5">
      <input type="number" min={1} value={value}
        onChange={e => handleChange(e.target.value, unit)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit?.() }}
        className={base + (compact ? ' w-14' : ' w-24')} />
      <select value={unit} onChange={e => handleChange(value, e.target.value as ValidityUnit)} className={base + (compact ? '' : ' flex-1')}>
        <option value="mins">mins</option>
        <option value="hours">hours</option>
        <option value="days">days</option>
        <option value="weeks">weeks</option>
        <option value="months">months</option>
        <option value="years">years</option>
      </select>
    </span>
  )
}

export default function StaffManager({ members: initialMembers, pendingInvites: initialInvites, ownerProfile, subAccounts }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [pendingInvites] = useState(initialInvites)
  const hasProfiles = subAccounts.length > 0

  // Owner name editing
  const [editingOwnerName, setEditingOwnerName] = useState(false)
  const [ownerNameDraft, setOwnerNameDraft] = useState(ownerProfile.issued_by_name)
  const [ownerNameSaving, setOwnerNameSaving] = useState(false)
  const [ownerNameError, setOwnerNameError] = useState('')
  const [ownerDisplayName, setOwnerDisplayName] = useState(ownerProfile.issued_by_name)

  // Add staff form
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'sales_rep', access_level: 'full',
    otp_validity_minutes: 10, can_create_receipts: true, can_view_all_receipts: false, can_view_wallet: false,
    manage_all_profiles: false, managed_scopes: ['main'] as string[],
  })

  // Per-card profile-assignment editing (generate-only staff)
  const [editingProfilesId, setEditingProfilesId] = useState<string | null>(null)
  const [profDraft, setProfDraft] = useState<{ manage_all_profiles: boolean; managed_scopes: string[] }>({ manage_all_profiles: false, managed_scopes: ['main'] })
  const [profSaving, setProfSaving] = useState(false)

  // Staff name editing
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  // Activities modal
  const [activitiesMember, setActivitiesMember] = useState<StaffMember | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // Remove staff modal
  const [removingMember, setRemovingMember] = useState<StaffMember | null>(null)
  const [removeStep, setRemoveStep] = useState<'confirm' | 'otp'>('confirm')
  const [removeSessionToken, setRemoveSessionToken] = useState('')
  const [removeMasked, setRemoveMasked] = useState('')
  const [removeOtp, setRemoveOtp] = useState('')
  const [removeLoading, setRemoveLoading] = useState(false)
  const [removeError, setRemoveError] = useState('')
  const [removeSuccess, setRemoveSuccess] = useState(false)

  async function sendInvite() {
    if (!form.name.trim()) { setInviteError('Name is required'); return }
    if (contactType === 'email' && !form.email.trim()) { setInviteError('Email is required'); return }
    if (contactType === 'phone' && !form.phone.trim()) { setInviteError('Phone number is required'); return }
    setInviteLoading(true); setInviteError('')
    try {
      const res = await fetch('/api/staff/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, contact_type: contactType }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error ?? 'Failed to add staff'); return }
      setInviteSent(true)
      setTimeout(() => {
        setShowInviteForm(false); setInviteSent(false)
        setForm({ name: '', email: '', phone: '', role: 'sales_rep', access_level: 'full', otp_validity_minutes: 10, can_create_receipts: true, can_view_all_receipts: false, can_view_wallet: false, manage_all_profiles: false, managed_scopes: ['main'] })
        router.refresh()
      }, 2000)
    } finally { setInviteLoading(false) }
  }

  async function saveStaffName(id: string) {
    if (!nameDraft.trim()) return
    setNameSaving(true)
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: nameDraft.trim() }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, display_name: nameDraft.trim() } : m))
      setEditingNameId(null)
    }
    setNameSaving(false)
  }

  async function saveOwnerName() {
    setOwnerNameSaving(true); setOwnerNameError('')
    try {
      const res = await fetch('/api/profile/issued-by-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issued_by_name: ownerNameDraft.trim() }),
      })
      const data = await res.json()
      if (res.ok) { setOwnerDisplayName(ownerNameDraft.trim()); setEditingOwnerName(false) }
      else setOwnerNameError(data.error ?? 'Failed to save')
    } catch { setOwnerNameError('Network error — try again') }
    finally { setOwnerNameSaving(false) }
  }

  async function changeAccessLevel(id: string, level: 'generate_only' | 'partial' | 'full') {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_level: level }),
    })
    if (res.ok) setMembers(prev => prev.map(m => m.id === id ? { ...m, access_level: level } : m))
  }

  function profileSummary(m: StaffMember): string {
    if (m.manage_all_profiles) return 'All profiles'
    const ids = m.managed_scopes ?? ['main']
    return ids
      .map(id => id === 'main' ? 'Main account' : (subAccounts.find(s => s.id === id)?.business_name ?? 'Profile'))
      .join(', ') || 'Main account'
  }

  function startEditProfiles(m: StaffMember) {
    setEditingProfilesId(m.id)
    setProfDraft({ manage_all_profiles: !!m.manage_all_profiles, managed_scopes: m.managed_scopes ?? ['main'] })
  }

  async function saveProfiles(id: string) {
    setProfSaving(true)
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profDraft),
    })
    if (res.ok) setMembers(prev => prev.map(m => m.id === id ? { ...m, ...profDraft } : m))
    setProfSaving(false)
    setEditingProfilesId(null)
  }

  async function openActivities(member: StaffMember) {
    setActivitiesMember(member); setActivities([]); setActivitiesLoading(true)
    const res = await fetch(`/api/staff/${member.id}/activities`)
    if (res.ok) {
      const data = await res.json()
      setActivities(data.receipts ?? [])
    }
    setActivitiesLoading(false)
  }

  async function initiateRemove(member: StaffMember) {
    setRemovingMember(member); setRemoveStep('confirm')
    setRemoveOtp(''); setRemoveError(''); setRemoveSuccess(false); setRemoveSessionToken('')
  }

  async function sendRemoveCode() {
    if (!removingMember) return
    setRemoveLoading(true); setRemoveError('')
    const res = await fetch(`/api/staff/${removingMember.id}/remove/initiate`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setRemoveError(data.error ?? 'Could not send code.'); setRemoveLoading(false); return }
    setRemoveSessionToken(data.sessionToken); setRemoveMasked(data.masked)
    setRemoveStep('otp'); setRemoveLoading(false)
  }

  async function confirmRemove(e: React.FormEvent) {
    e.preventDefault()
    if (!removingMember || !removeOtp.trim()) return
    setRemoveLoading(true); setRemoveError('')
    const res = await fetch(`/api/staff/${removingMember.id}/remove/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: removeSessionToken, code: removeOtp.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setRemoveError(data.error ?? 'Incorrect code.'); setRemoveLoading(false); return }
    setRemoveSuccess(true)
    setMembers(prev => prev.filter(m => m.id !== removingMember.id))
    setTimeout(() => setRemovingMember(null), 2000)
    setRemoveLoading(false)
  }

  function closeRemoveModal() { setRemovingMember(null); setRemoveOtp(''); setRemoveError('') }

  const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label ?? role
  const ownerInitials = (ownerProfile.full_name || ownerProfile.email)
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?'

  return (
    <div className="space-y-5">
      {/* Admin card */}
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
              <div className="flex flex-col items-end gap-1 mt-1">
                <div className="flex items-center gap-1.5">
                  <input autoFocus value={ownerNameDraft} onChange={e => setOwnerNameDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveOwnerName(); if (e.key === 'Escape') { setEditingOwnerName(false); setOwnerNameError('') } }}
                    placeholder="Issued By name…"
                    className="text-xs border border-forest/40 rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-forest/30" />
                  <button onClick={saveOwnerName} disabled={ownerNameSaving} className="text-forest hover:text-forest-bright">
                    {ownerNameSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  </button>
                  <button onClick={() => { setEditingOwnerName(false); setOwnerNameError('') }} className="text-ink-dim hover:text-ink"><X size={13} /></button>
                </div>
                {ownerNameError && <p className="text-xs text-danger">{ownerNameError}</p>}
              </div>
            ) : (
              <button onClick={() => { setOwnerNameDraft(ownerDisplayName); setEditingOwnerName(true) }}
                className="flex items-center gap-1 text-xs text-ink-dim hover:text-forest transition-colors mt-0.5">
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
          <button onClick={() => { setShowInviteForm(true); setInviteSent(false); setInviteError('') }}
            className="flex items-center gap-2 px-3.5 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-bright transition-colors">
            <UserPlus size={13} /> Add Staff
          </button>
        </div>

        {members.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={28} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No staff members yet</p>
            <p className="text-xs text-ink-dim mt-1">Add team members to issue receipts on your behalf</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map(member => (
              <div key={member.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'oklch(0.42 0.18 145)' }}>
                      {(member.display_name ?? member.staff_profile?.full_name ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      {editingNameId === member.id ? (
                        <div className="flex items-center gap-1.5">
                          <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveStaffName(member.id); if (e.key === 'Escape') setEditingNameId(null) }}
                            className="text-sm border border-forest/40 rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-forest/30" />
                          <button onClick={() => saveStaffName(member.id)} disabled={nameSaving} className="text-forest hover:text-forest-bright">
                            {nameSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button onClick={() => setEditingNameId(null)} className="text-ink-dim hover:text-ink"><X size={13} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-ink">{member.display_name ?? member.staff_profile?.full_name ?? 'Unknown'}</p>
                          <button onClick={() => { setEditingNameId(member.id); setNameDraft(member.display_name ?? member.staff_profile?.full_name ?? '') }}
                            className="p-0.5 text-ink-dim hover:text-forest transition-colors" title="Rename">
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}
                      {/* Contact info */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {member.staff_profile?.email && (
                          <span className="flex items-center gap-1 text-xs text-ink-muted">
                            <Mail size={10} /> {member.staff_profile.email}
                          </span>
                        )}
                        {(member.phone ?? (member as any).phone) && (
                          <span className="flex items-center gap-1 text-xs text-ink-muted">
                            <Phone size={10} /> {member.phone ?? (member as any).phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg bg-surface border border-border text-ink-muted shrink-0">
                    {roleLabel(member.role)}
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-3 mt-2 mb-1">
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <FileText size={11} />
                    <span>{member.receipts_issued ?? 0} receipt{(member.receipts_issued ?? 0) !== 1 ? 's' : ''} issued</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs"
                    style={{ color: member.has_login_code ? 'oklch(0.35 0.16 145)' : 'oklch(0.55 0.18 25)' }}>
                    <KeyRound size={11} />
                    <span>{member.has_login_code ? 'Login code set' : 'No login code yet'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Clock size={11} />
                    <span>OTP valid {formatValidity(member.otp_validity_minutes ?? 10)}</span>
                  </div>
                </div>

                {/* Access level selector */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {([
                    { level: 'generate_only', label: 'Generate Receipt' },
                    { level: 'partial', label: 'Partial Access' },
                    { level: 'full', label: 'All Access' },
                  ] as const).map(({ level, label }) => {
                    const active = (member.access_level ?? 'full') === level
                    return (
                      <button key={level} onClick={() => changeAccessLevel(member.id, level)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                        style={active
                          ? { background: 'oklch(0.96 0.02 145)', borderColor: 'oklch(0.82 0.06 145)', color: 'oklch(0.35 0.16 145)' }
                          : { background: 'white', borderColor: 'oklch(0.90 0.01 145)', color: 'oklch(0.55 0.02 145)' }}>
                        {active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        {label}
                      </button>
                    )
                  })}
                </div>

                {/* Profile assignment (generate-only staff, when the owner has company profiles) */}
                {(member.access_level ?? 'full') === 'generate_only' && hasProfiles && (
                  <div className="mt-3 rounded-lg border border-border bg-surface/40 px-3 py-2.5">
                    {editingProfilesId === member.id ? (
                      <div className="space-y-2.5">
                        <ProfileAssignment
                          subAccounts={subAccounts}
                          manageAll={profDraft.manage_all_profiles}
                          scopes={profDraft.managed_scopes}
                          onChange={setProfDraft}
                        />
                        <div className="flex items-center gap-2">
                          <button onClick={() => saveProfiles(member.id)} disabled={profSaving}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-forest text-white hover:bg-forest-bright disabled:opacity-60 transition-colors">
                            {profSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                          </button>
                          <button onClick={() => setEditingProfilesId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-muted hover:text-ink transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted min-w-0">
                          <Building2 size={12} className="shrink-0" />
                          <span className="truncate">Manages: <span className="text-ink font-medium">{profileSummary(member)}</span></span>
                        </div>
                        <button onClick={() => startEditProfiles(member)}
                          className="flex items-center gap-1 text-xs text-ink-dim hover:text-forest transition-colors shrink-0">
                          <Pencil size={11} /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-ink-dim">Added {formatDate(member.created_at)}</span>
                  <span className="text-ink-dim text-xs">·</span>
                  <button onClick={() => openActivities(member)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-ink-muted hover:text-forest hover:border-forest/40 transition-colors">
                    <Activity size={11} /> View Activities
                  </button>
                  <button onClick={() => initiateRemove(member)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-danger hover:bg-red-50 transition-colors">
                    <Trash2 size={11} /> Remove Staff
                  </button>
                </div>
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

      {/* Add Staff modal */}
      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <h3 className="font-heading text-lg text-ink">Add Staff Member</h3>
              <button onClick={() => setShowInviteForm(false)} className="p-1.5 rounded-lg text-ink-dim hover:text-ink hover:bg-surface transition-colors"><X size={18} /></button>
            </div>
            {inviteSent ? (
              <div className="text-center py-8 px-6 space-y-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: 'oklch(0.96 0.02 145)' }}>
                  <CheckCircle size={22} className="text-forest" />
                </div>
                <p className="text-sm font-medium text-ink">Staff member added!</p>
                <p className="text-xs text-ink-muted">
                  They can now log in at the Staff Login page using their {contactType === 'phone' ? 'phone number' : 'email'}.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Full name</label>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. John Doe" className={INPUT} autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Add via</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface rounded-xl border border-border mb-3">
                      {(['email', 'phone'] as const).map(t => (
                        <button key={t} type="button"
                          onClick={() => { setContactType(t); setForm(p => ({ ...p, email: '', phone: '' })) }}
                          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${contactType === t ? 'bg-forest text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
                          {t === 'email' ? <Mail size={12} /> : <Phone size={12} />}
                          {t === 'email' ? 'Email' : 'Phone Number'}
                        </button>
                      ))}
                    </div>
                    {contactType === 'email'
                      ? <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="staff@example.com" className={INPUT} />
                      : <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+234 80..." className={INPUT} />}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Role</label>
                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={INPUT}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-ink mb-2">Access Level</p>
                    <div className="space-y-2">
                      {ACCESS_LEVELS.map(al => (
                        <label key={al.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.access_level === al.key ? 'border-forest bg-forest/5' : 'border-border hover:border-forest/30'}`}>
                          <input type="radio" name="access_level" value={al.key} checked={form.access_level === al.key}
                            onChange={() => setForm(p => ({ ...p, access_level: al.key }))} className="mt-0.5 accent-forest" />
                          <div>
                            <p className="text-sm font-semibold text-ink">{al.label}</p>
                            <p className="text-xs text-ink-muted mt-0.5">{al.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {form.access_level === 'generate_only' && hasProfiles && (
                    <ProfileAssignment
                      subAccounts={subAccounts}
                      manageAll={form.manage_all_profiles}
                      scopes={form.managed_scopes}
                      onChange={v => setForm(p => ({ ...p, ...v }))}
                    />
                  )}
                  {contactType === 'phone' && (
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1.5">OTP validity (first login)</label>
                      <ValidityPicker
                        minutes={form.otp_validity_minutes > 0 ? form.otp_validity_minutes : 10}
                        onChange={mins => setForm(p => ({ ...p, otp_validity_minutes: mins }))}
                        inputClass={INPUT} />
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                        💡 The first-time OTP costs <strong>₦10</strong>. After that, staff use their own login code — no cost.
                      </p>
                    </div>
                  )}
                  {inviteError && <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{inviteError}</p>}
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
                  <button onClick={() => setShowInviteForm(false)}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-ink-muted hover:text-ink hover:border-border-bright transition-colors">Cancel</button>
                  <button onClick={sendInvite} disabled={inviteLoading}
                    className="flex-1 py-2.5 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {inviteLoading ? <><Loader2 size={14} className="animate-spin" />Adding…</> : 'Add Staff Member'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Activities modal */}
      {activitiesMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-border flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-heading text-base text-ink">
                  {activitiesMember.display_name ?? activitiesMember.staff_profile?.full_name ?? 'Staff'}'s Activities
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">Receipts issued by this staff member</p>
              </div>
              <button onClick={() => setActivitiesMember(null)} className="p-1.5 rounded-lg text-ink-dim hover:text-ink hover:bg-surface transition-colors"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-ink-dim" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <Activity size={28} className="text-ink-dim mx-auto mb-3" />
                  <p className="text-sm text-ink-muted">No receipts issued yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{r.buyer_name || '—'}</p>
                        <p className="text-xs text-ink-muted">{r.receipt_number} · {formatDate(r.created_at)}</p>
                      </div>
                      <span className="text-sm font-semibold text-ink shrink-0">
                        {r.currency ?? '₦'}{Number(r.total_amount ?? 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove Staff modal */}
      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-border">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-border">
              <h3 className="font-heading text-base text-ink">Remove Staff Member</h3>
              <button onClick={closeRemoveModal} className="p-1.5 rounded-lg text-ink-dim hover:text-ink hover:bg-surface transition-colors"><X size={18} /></button>
            </div>

            {removeSuccess ? (
              <div className="text-center py-8 px-6 space-y-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-red-50">
                  <CheckCircle size={22} className="text-danger" />
                </div>
                <p className="text-sm font-medium text-ink">
                  {removingMember.display_name ?? 'Staff member'} has been removed and logged out.
                </p>
              </div>
            ) : removeStep === 'confirm' ? (
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                  <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">
                    This will remove <strong>{removingMember.display_name ?? 'this staff member'}</strong> and immediately log them out.
                    A confirmation code will be sent to your phone{ownerProfile.phone ? ` (****${ownerProfile.phone.slice(-4)})` : ''}.
                  </p>
                </div>
                {!ownerProfile.phone && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    You don't have a phone number on your account. Add one in your profile first.
                  </p>
                )}
                {removeError && <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{removeError}</p>}
                <div className="flex gap-3">
                  <button onClick={closeRemoveModal}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-ink-muted hover:text-ink transition-colors">Cancel</button>
                  <button onClick={sendRemoveCode} disabled={removeLoading || !ownerProfile.phone}
                    className="flex-1 py-2.5 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {removeLoading ? <><Loader2 size={14} className="animate-spin" />Sending…</> : 'Send Code & Remove'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={confirmRemove} className="p-5 space-y-4">
                <p className="text-sm text-ink-muted">
                  Enter the code sent to <strong className="text-ink">{removeMasked}</strong>.
                </p>
                <input
                  type="text" inputMode="numeric" autoFocus maxLength={6}
                  value={removeOtp}
                  onChange={e => setRemoveOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={CODE_INPUT} placeholder="------" />
                {removeError && <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{removeError}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setRemoveStep('confirm'); setRemoveOtp(''); setRemoveError('') }}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-ink-muted hover:text-ink transition-colors">Back</button>
                  <button type="submit" disabled={removeLoading || removeOtp.length < 6}
                    className="flex-1 py-2.5 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {removeLoading ? <><Loader2 size={14} className="animate-spin" />Removing…</> : 'Confirm Remove'}
                  </button>
                </div>
                <button type="button" onClick={sendRemoveCode} disabled={removeLoading}
                  className="w-full text-xs text-ink-dim hover:text-forest transition-colors py-1">
                  Didn't receive it? Resend code
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
