'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Loader2, Lock, Trash2, X, ShieldAlert, ShieldCheck, Building2, Plus, Check, Trash, Camera, Eye, EyeOff, KeyRound } from 'lucide-react'
import AddCompanyProfile from '@/components/dashboard/AddCompanyProfile'

const OTP_INPUT = 'w-10 h-11 text-center text-base font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger/60 transition-colors'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [issuedByName, setIssuedByName] = useState('')

  // Avatar upload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  // Sub-accounts / profile switcher
  interface SubAccount { id: string; business_name: string; rc_number: string; is_verified: boolean; logo_url?: string | null }
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [activeSubId, setActiveSubId] = useState<string | null>(null)
  const [addingCompany, setAddingCompany] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null)
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null)

  // Google user detection
  const [isGoogleUser, setIsGoogleUser] = useState(false)

  // Password management state
  type PwStep = 'idle' | 'form' | 'forgot-sending' | 'forgot-codes' | 'forgot-verifying' | 'forgot-done' | 'saving' | 'saved'
  const [pwStep, setPwStep] = useState<PwStep>('idle')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [forgotSession, setForgotSession] = useState('')
  const [forgotEmailMasked, setForgotEmailMasked] = useState('')
  const [forgotPhoneMasked, setForgotPhoneMasked] = useState('')
  const [forgotEmailCode, setForgotEmailCode] = useState(['', '', '', '', '', ''])
  const [forgotSmsCode, setForgotSmsCode] = useState(['', '', '', '', '', ''])
  const [forgotError, setForgotError] = useState('')

  // Delete account state
  type DeleteStep = 'idle' | 'confirm-intent' | 'sending' | 'enter-codes' | 'deleting' | 'done'
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle')
  const [deleteSession, setDeleteSession] = useState('')
  const [deleteEmailMasked, setDeleteEmailMasked] = useState('')
  const [deletePhoneMasked, setDeletePhoneMasked] = useState('')
  const [deleteEmailCode, setDeleteEmailCode] = useState(['', '', '', '', '', ''])
  const [deleteSmsCode, setDeleteSmsCode]     = useState(['', '', '', '', '', ''])
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      // Detect Google users (no email/password identity)
      const hasPasswordIdentity = user.identities?.some(i => i.provider === 'email')
      setIsGoogleUser(!hasPasswordIdentity)
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data)
          setFullName(data.full_name ?? '')
          setPhone(data.phone ?? '')
          setAddress(data.address ?? '')
          setBusinessName(data.business_name ?? '')
          setIssuedByName((data as any).issued_by_name ?? '')
          setAvatarUrl(data.logo_url ?? null)
        }
        setLoading(false)
      })
    })
    // Load sub-accounts
    fetch('/api/sub-accounts').then(r => r.json()).then(d => setSubAccounts(d.accounts ?? []))
    // Read active sub-account from localStorage
    const active = localStorage.getItem('active_sub_account')
    if (active) setActiveSubId(active)
  }, [])

  async function switchProfile(id: string | null) {
    setSwitchingId(id ?? 'main')
    await fetch('/api/sub-accounts/activate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (id) localStorage.setItem('active_sub_account', id)
    else localStorage.removeItem('active_sub_account')
    setActiveSubId(id)
    setSwitchingId(null)
    router.refresh()
  }

  async function deleteSubAccount(id: string) {
    setDeletingSubId(id)
    await fetch(`/api/sub-accounts/${id}`, { method: 'DELETE' })
    setSubAccounts(prev => prev.filter(a => a.id !== id))
    if (activeSubId === id) {
      localStorage.removeItem('active_sub_account')
      setActiveSubId(null)
      router.refresh()
    }
    setDeletingSubId(null)
  }

  function handleDeleteOtpInput(
    codes: string[], setCodes: (c: string[]) => void,
    index: number, value: string, prefix: string
  ) {
    if (!/^\d*$/.test(value)) return
    const next = [...codes]; next[index] = value.slice(-1); setCodes(next)
    if (value && index < 5) document.getElementById(`${prefix}-${index + 1}`)?.focus()
  }

  function handleDeleteOtpKeyDown(
    codes: string[], setCodes: (c: string[]) => void,
    index: number, e: React.KeyboardEvent<HTMLInputElement>, prefix: string
  ) {
    if (e.key === 'Backspace' && !codes[index] && index > 0)
      document.getElementById(`${prefix}-${index - 1}`)?.focus()
  }

  async function requestDeleteCodes() {
    setDeleteError('')
    setDeleteStep('sending')
    const res = await fetch('/api/auth/delete-account/request', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setDeleteError(data.error ?? 'Failed to send codes.'); setDeleteStep('confirm-intent'); return }
    setDeleteSession(data.sessionToken)
    setDeleteEmailMasked(data.emailMasked)
    setDeletePhoneMasked(data.phoneMasked)
    setDeleteEmailCode(['', '', '', '', '', ''])
    setDeleteSmsCode(['', '', '', '', '', ''])
    setDeleteStep('enter-codes')
  }

  async function confirmDelete() {
    setDeleteError('')
    setDeleteStep('deleting')
    const res = await fetch('/api/auth/delete-account/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: deleteSession,
        emailCode: deleteEmailCode.join(''),
        smsCode:   deleteSmsCode.join(''),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setDeleteError(data.error ?? 'Verification failed.'); setDeleteStep('enter-codes'); return }
    setDeleteStep('done')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError('')
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingAvatar(false)
    if (!res.ok) { setAvatarError(data.error ?? 'Upload failed'); return }
    setAvatarUrl(data.url)
    setProfile(p => p ? { ...p, logo_url: data.url } : p)
  }

  async function handleSubLogoChange(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogoId(id)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/sub-accounts/${id}/logo`, { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingLogoId(null)
    if (res.ok) {
      setSubAccounts(prev => prev.map(a => a.id === id ? { ...a, logo_url: data.url } : a))
    }
  }

  function resetPwForm() {
    setOldPassword(''); setNewPassword(''); setConfirmPassword('')
    setShowOldPw(false); setShowNewPw(false); setShowConfirmPw(false)
    setPwError(''); setForgotError('')
    setForgotEmailCode(['', '', '', '', '', '']); setForgotSmsCode(['', '', '', '', '', ''])
    setPwStep('idle')
  }

  async function handlePasswordSave() {
    setPwError('')
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    if (!isGoogleUser && !oldPassword) { setPwError('Enter your current password.'); return }

    setPwStep('saving')
    const supabase = createClient()

    if (!isGoogleUser) {
      // Re-authenticate with old password first
      const { data: { user } } = await supabase.auth.getUser()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: profile!.email,
        password: oldPassword,
      })
      if (signInErr) { setPwError('Current password is incorrect.'); setPwStep('form'); return }
      // Re-fetch user after re-auth
      void user
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwError(error.message); setPwStep('form'); return }
    setPwStep('saved')
    setTimeout(() => resetPwForm(), 3000)
  }

  async function requestForgotCodes() {
    setForgotError('')
    setPwStep('forgot-sending')
    const res = await fetch('/api/auth/reset-password/request', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setForgotError(data.error ?? 'Failed to send codes.'); setPwStep('form'); return }
    setForgotSession(data.sessionToken)
    setForgotEmailMasked(data.emailMasked)
    setForgotPhoneMasked(data.phoneMasked)
    setForgotEmailCode(['', '', '', '', '', ''])
    setForgotSmsCode(['', '', '', '', '', ''])
    setPwStep('forgot-codes')
  }

  async function confirmForgotCodes() {
    setForgotError('')
    setPwStep('forgot-verifying')
    const res = await fetch('/api/auth/reset-password/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: forgotSession, emailCode: forgotEmailCode.join(''), smsCode: forgotSmsCode.join('') }),
    })
    const data = await res.json()
    if (!res.ok) { setForgotError(data.error ?? 'Verification failed.'); setPwStep('forgot-codes'); return }
    setPwStep('forgot-done')
  }

  function handleForgotOtpInput(codes: string[], setCodes: (c: string[]) => void, index: number, value: string, prefix: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...codes]; next[index] = value.slice(-1); setCodes(next)
    if (value && index < 5) document.getElementById(`${prefix}-${index + 1}`)?.focus()
  }

  function handleForgotOtpKeyDown(codes: string[], setCodes: (c: string[]) => void, index: number, e: React.KeyboardEvent<HTMLInputElement>, prefix: string) {
    if (e.key === 'Backspace' && !codes[index] && index > 0) document.getElementById(`${prefix}-${index - 1}`)?.focus()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError('')
    setSaving(true)
    const supabase = createClient()
    // Verified users can only update address
    const updates: Partial<Profile> & { issued_by_name?: string } = profile.is_verified
      ? { phone: phone || undefined, address, issued_by_name: issuedByName || undefined }
      : { full_name: fullName, phone, address, issued_by_name: issuedByName || undefined, ...(profile.issuer_type === 'business' ? { business_name: businessName } : {}) }
    const { error: err } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setProfile(p => p ? { ...p, ...updates } : p)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <Loader2 size={24} className="text-forest animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
          <ArrowLeft size={15} /> Back to dashboard
        </button>
        <div>
          <h1 className="font-heading text-2xl text-ink">Profile Settings</h1>
          <p className="text-sm text-ink-muted mt-1">Manage your issuer information.</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
            <ShieldAlert size={28} className="text-danger" />
          </div>
          <div>
            <p className="font-heading text-xl text-ink">Account not verified</p>
            <p className="text-sm text-ink-muted mt-1 max-w-sm">
              Your profile has not been set up yet. Verify your identity to activate your account and start issuing receipts.
            </p>
          </div>
          <Link
            href="/dashboard/verify"
            className="inline-flex items-center gap-2 px-6 py-3 bg-forest text-white text-sm font-semibold rounded-xl hover:bg-forest-bright transition-colors"
          >
            <ShieldCheck size={16} />
            Verify my account now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
        <ArrowLeft size={15} /> Back to dashboard
      </button>
      <div>
        <h1 className="font-heading text-2xl text-ink">Profile Settings</h1>
        <p className="text-sm text-ink-muted mt-1">Manage your issuer information. This appears on all your receipts.</p>
      </div>

      {/* Unverified banner */}
      {!profile.is_verified && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-start gap-3">
          <ShieldAlert size={18} className="text-danger mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-danger">Account not verified</p>
            <p className="text-xs text-red-600 mt-0.5">
              Your identity has not been verified yet. Verify your{' '}
              {profile.issuer_type === 'business' ? 'business (CAC)' : 'identity (NIN)'} to issue receipts and unlock all features.
            </p>
            <Link
              href="/dashboard/verify"
              className="inline-flex items-center gap-1.5 mt-2.5 px-4 py-2 bg-danger text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              <ShieldCheck size={13} />
              Verify now
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border px-5 py-4 flex items-center gap-4">
        <label className="relative w-14 h-14 rounded-full shrink-0 cursor-pointer group">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-forest text-white flex items-center justify-center text-xl font-bold">
              {profile.full_name
                ? profile.full_name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                : (profile.email?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploadingAvatar ? <Loader2 size={16} className="text-white animate-spin" /> : <Camera size={16} className="text-white" />}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
        </label>
        <div>
          <p className="font-semibold text-ink">{profile.full_name || profile.email?.split('@')[0] || 'Unverified User'}</p>
          <p className="text-sm text-ink-muted">{profile.email}</p>
          {avatarError && <p className="text-xs text-danger mt-1">{avatarError}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs bg-forest-light text-forest border border-forest/20 px-2 py-0.5 rounded-full capitalize font-medium">
              {profile.issuer_type}
            </span>
            {profile.is_verified ? (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle size={10} />
                Verified
              </span>
            ) : (
              <span className="text-xs bg-red-50 text-danger border border-red-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <ShieldAlert size={10} />
                Not verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile Switcher ── */}
      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-ink">Your Profiles</h2>
            <p className="text-xs text-ink-muted mt-0.5">Switch between your main account and added company profiles.</p>
          </div>
          {!addingCompany && (
            <button
              onClick={() => setAddingCompany(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors"
            >
              <Plus size={13} /> Add Company
            </button>
          )}
        </div>

        {/* Main profile row */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${!activeSubId ? 'border-forest bg-forest-light' : 'border-border hover:border-forest/30'}`}>
          <div className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : (profile.full_name?.trim()[0]?.toUpperCase() ?? '?')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{profile.full_name || 'Your Account'}</p>
            <p className="text-xs text-ink-muted capitalize">{profile.issuer_type} · Main account</p>
          </div>
          {!activeSubId ? (
            <span className="flex items-center gap-1 text-xs text-forest font-semibold px-2 py-1 bg-white border border-forest/30 rounded-full">
              <Check size={11} /> Active
            </span>
          ) : (
            <button
              onClick={() => switchProfile(null)}
              disabled={switchingId === 'main'}
              className="text-xs px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest transition-colors disabled:opacity-50"
            >
              {switchingId === 'main' ? <Loader2 size={11} className="animate-spin" /> : '→ Switch Here'}
            </button>
          )}
        </div>

        {/* Company sub-accounts */}
        {subAccounts.map(acc => (
          <div key={acc.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${activeSubId === acc.id ? 'border-forest bg-forest-light' : 'border-border hover:border-forest/30'}`}>
            <label className="relative w-9 h-9 rounded-full shrink-0 cursor-pointer group overflow-hidden">
              {acc.logo_url ? (
                <img src={acc.logo_url} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center">
                  <Building2 size={16} />
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingLogoId === acc.id ? <Loader2 size={12} className="text-white animate-spin" /> : <Camera size={12} className="text-white" />}
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleSubLogoChange(acc.id, e)} />
            </label>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{acc.business_name}</p>
              <p className="text-xs text-ink-muted">RC: {acc.rc_number} · Company</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeSubId === acc.id ? (
                <span className="flex items-center gap-1 text-xs text-forest font-semibold px-2 py-1 bg-white border border-forest/30 rounded-full">
                  <Check size={11} /> Active
                </span>
              ) : (
                <button
                  onClick={() => switchProfile(acc.id)}
                  disabled={switchingId === acc.id}
                  className="text-xs px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest transition-colors disabled:opacity-50"
                >
                  {switchingId === acc.id ? <Loader2 size={11} className="animate-spin" /> : '→ Switch Here'}
                </button>
              )}
              <button
                onClick={() => deleteSubAccount(acc.id)}
                disabled={deletingSubId === acc.id}
                className="p-1.5 text-ink-dim hover:text-danger transition-colors disabled:opacity-50"
              >
                {deletingSubId === acc.id ? <Loader2 size={13} className="animate-spin" /> : <Trash size={13} />}
              </button>
            </div>
          </div>
        ))}

        {/* Add company form */}
        {addingCompany && (
          <AddCompanyProfile
            onAdded={acc => {
              setSubAccounts(prev => [...prev, { ...acc, is_verified: true }])
              setAddingCompany(false)
            }}
            onCancel={() => setAddingCompany(false)}
          />
        )}

        {/* Restriction notice for individuals */}
        {!addingCompany && profile.issuer_type === 'individual' && (
          <p className="text-xs text-ink-dim">
            As an individual, you can add verified company profiles but cannot add another individual account.
          </p>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-ink">Edit Details</h2>
          {profile.is_verified && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-dim bg-surface border border-border px-2.5 py-1 rounded-full">
              <Lock size={11} />
              Name locked after verification
            </span>
          )}
        </div>

        <Field label="Full name" required>
          {profile.is_verified ? (
            <LockedField value={fullName} />
          ) : (
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className={INPUT} />
          )}
        </Field>
        {profile.issuer_type === 'business' && (
          <Field label="Business name" required>
            {profile.is_verified ? (
              <LockedField value={businessName} />
            ) : (
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required className={INPUT} />
            )}
          </Field>
        )}
        <Field label="Phone number">
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="" className={INPUT} />
        </Field>
        <Field label="Address">
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, State" className={INPUT} />
          <p className="text-xs text-ink-dim mt-1">Used to determine the state code on your receipt numbers.</p>
        </Field>
        <Field label="Issued By name">
          <input type="text" value={issuedByName} onChange={e => setIssuedByName(e.target.value)} placeholder="e.g. Victor Ayodele (defaults to Admin)" className={INPUT} />
          <p className="text-xs text-ink-dim mt-1">This name appears in the "Issued By" column on receipts. Leave blank to show "Admin".</p>
        </Field>

        {error && (
          <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</div>
        )}

        <div className="flex items-center justify-between pt-1">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle size={15} />
              Changes saved
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <div>
          <h2 className="font-medium text-ink">Account Information</h2>
          <p className="text-xs text-ink-dim mt-0.5">These fields are read-only. Contact support to make changes.</p>
        </div>
        <ReadField label="Email address" value={profile.email} />
        <ReadField label="Account type" value={profile.issuer_type === 'business' ? 'Business Issuer' : 'Individual Issuer'} />
        {profile.nin && <ReadField label="NIN" value={'•'.repeat(7) + profile.nin.slice(-4)} />}
        {profile.rc_number && <ReadField label="RC Number" value={profile.rc_number} />}
      </div>

      {/* ── Account Settings ── */}
      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <h2 className="font-medium text-ink">Account Settings</h2>

        {/* ── Password section ── */}
        <div className="border-b border-border pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink flex items-center gap-2">
                <KeyRound size={15} className="text-forest" />
                {isGoogleUser ? 'Set Up Password' : 'Update Password'}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                {isGoogleUser
                  ? 'Your account uses Google sign-in. You can set a password to also sign in with email.'
                  : 'Change your account password.'}
              </p>
            </div>
            {pwStep === 'idle' && (
              <button
                onClick={() => setPwStep('form')}
                className="text-xs px-3 py-1.5 border border-border rounded-lg text-ink-muted hover:border-forest/40 hover:text-forest transition-colors shrink-0"
              >
                {isGoogleUser ? 'Set password' : 'Change'}
              </button>
            )}
          </div>

          {(pwStep === 'form' || pwStep === 'forgot-done' || pwStep === 'saving') && (
            <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
              {/* Old password — only for non-Google users and not after forgot verification */}
              {!isGoogleUser && pwStep !== 'forgot-done' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Current password</label>
                  <div className="relative">
                    <input
                      type={showOldPw ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      className={`${INPUT} pr-10`}
                      placeholder="Enter current password"
                    />
                    <button type="button" onClick={() => setShowOldPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors" tabIndex={-1}>
                      {showOldPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={requestForgotCodes}
                    className="text-xs text-forest hover:underline"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              {pwStep === 'forgot-done' && (
                <div className="flex items-center gap-2 text-xs text-forest font-medium">
                  <CheckCircle size={14} /> Identity verified — set your new password below
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink">New password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={`${INPUT} pr-10`}
                    placeholder="At least 8 characters"
                  />
                  <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors" tabIndex={-1}>
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink">Repeat new password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`${INPUT} pr-10`}
                    placeholder="Re-enter new password"
                  />
                  <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors" tabIndex={-1}>
                    {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {pwError && <p className="text-xs text-danger">{pwError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePasswordSave}
                  disabled={pwStep === 'saving'}
                  className="flex items-center gap-2 px-4 py-2 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-60 transition-colors"
                >
                  {pwStep === 'saving' ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save password'}
                </button>
                <button type="button" onClick={resetPwForm} className="px-4 py-2 border border-border text-ink-muted text-xs rounded-lg hover:bg-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {pwStep === 'saved' && (
            <div className="flex items-center gap-2 text-sm text-forest font-medium">
              <CheckCircle size={15} /> Password updated successfully
            </div>
          )}

          {/* Forgot password OTP flow */}
          {(pwStep === 'forgot-sending' || pwStep === 'forgot-codes' || pwStep === 'forgot-verifying') && (
            <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
              {pwStep === 'forgot-sending' && (
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  <Loader2 size={15} className="animate-spin text-forest" /> Sending verification codes…
                </div>
              )}

              {(pwStep === 'forgot-codes' || pwStep === 'forgot-verifying') && (
                <>
                  <p className="text-sm text-ink">
                    Codes sent to <strong>{forgotEmailMasked}</strong> (email) and <strong>{forgotPhoneMasked}</strong> (SMS). Enter both to verify your identity.
                  </p>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-ink">Email code</p>
                    <div className="flex gap-1.5">
                      {forgotEmailCode.map((d, i) => (
                        <input key={i} id={`fp-email-${i}`} type="text" inputMode="numeric" maxLength={1}
                          value={d} onChange={e => handleForgotOtpInput(forgotEmailCode, setForgotEmailCode, i, e.target.value, 'fp-email')}
                          onKeyDown={e => handleForgotOtpKeyDown(forgotEmailCode, setForgotEmailCode, i, e, 'fp-email')}
                          className={OTP_INPUT} autoFocus={i === 0} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-ink">SMS code</p>
                    <div className="flex gap-1.5">
                      {forgotSmsCode.map((d, i) => (
                        <input key={i} id={`fp-sms-${i}`} type="text" inputMode="numeric" maxLength={1}
                          value={d} onChange={e => handleForgotOtpInput(forgotSmsCode, setForgotSmsCode, i, e.target.value, 'fp-sms')}
                          onKeyDown={e => handleForgotOtpKeyDown(forgotSmsCode, setForgotSmsCode, i, e, 'fp-sms')}
                          className={OTP_INPUT} />
                      ))}
                    </div>
                  </div>

                  {forgotError && <p className="text-xs text-danger">{forgotError}</p>}

                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={confirmForgotCodes}
                      disabled={pwStep === 'forgot-verifying' || forgotEmailCode.join('').length < 6 || forgotSmsCode.join('').length < 6}
                      className="flex items-center gap-2 px-4 py-2 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors"
                    >
                      {pwStep === 'forgot-verifying' ? <><Loader2 size={13} className="animate-spin" /> Verifying…</> : 'Verify identity'}
                    </button>
                    <button type="button" onClick={resetPwForm} className="px-4 py-2 border border-border text-ink-muted text-xs rounded-lg hover:bg-white transition-colors">
                      Cancel
                    </button>
                    <button type="button" onClick={requestForgotCodes} disabled={pwStep === 'forgot-verifying'} className="text-xs text-forest hover:underline disabled:opacity-50">
                      Resend codes
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Delete Account ── */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-danger flex items-center gap-2">
              <Trash2 size={15} /> Delete Account
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              Permanently delete your account and all associated receipts, wallet, and data. This cannot be undone.
            </p>
          </div>

          {deleteStep === 'idle' && (
            <button
              type="button"
              onClick={() => setDeleteStep('confirm-intent')}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-danger text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} /> Delete my account
            </button>
          )}

          {deleteStep === 'confirm-intent' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-4">
              <p className="text-sm text-red-800 font-medium">
                Are you sure? We will send a verification code to your <strong>email and phone number</strong>. You must enter both codes to confirm deletion.
              </p>
              {deleteError && <p className="text-xs text-danger bg-white border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={requestDeleteCodes}
                  className="flex items-center gap-2 px-4 py-2.5 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors">
                  <Trash2 size={14} /> Yes, send me the codes
                </button>
                <button type="button" onClick={() => { setDeleteStep('idle'); setDeleteError('') }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-border text-ink-muted text-sm rounded-lg hover:bg-surface transition-colors">
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          )}

          {deleteStep === 'sending' && (
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 size={16} className="animate-spin text-danger" /> Sending verification codes…
            </div>
          )}

          {(deleteStep === 'enter-codes' || deleteStep === 'deleting') && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-5">
              <p className="text-sm text-red-800">
                Codes sent to <strong>{deleteEmailMasked}</strong> (email) and <strong>{deletePhoneMasked}</strong> (SMS). Enter both below to confirm deletion.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink">Email verification code</p>
                <div className="flex gap-1.5">
                  {deleteEmailCode.map((d, i) => (
                    <input key={i} id={`del-email-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handleDeleteOtpInput(deleteEmailCode, setDeleteEmailCode, i, e.target.value, 'del-email')}
                      onKeyDown={e => handleDeleteOtpKeyDown(deleteEmailCode, setDeleteEmailCode, i, e, 'del-email')}
                      className={OTP_INPUT} autoFocus={i === 0} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink">SMS verification code</p>
                <div className="flex gap-1.5">
                  {deleteSmsCode.map((d, i) => (
                    <input key={i} id={`del-sms-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handleDeleteOtpInput(deleteSmsCode, setDeleteSmsCode, i, e.target.value, 'del-sms')}
                      onKeyDown={e => handleDeleteOtpKeyDown(deleteSmsCode, setDeleteSmsCode, i, e, 'del-sms')}
                      className={OTP_INPUT} />
                  ))}
                </div>
              </div>
              {deleteError && <p className="text-xs text-danger bg-white border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>}
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={confirmDelete}
                  disabled={deleteStep === 'deleting' || deleteEmailCode.join('').length < 6 || deleteSmsCode.join('').length < 6}
                  className="flex items-center gap-2 px-4 py-2.5 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {deleteStep === 'deleting'
                    ? <><Loader2 size={14} className="animate-spin" /> Deleting account…</>
                    : <><Trash2 size={14} /> Permanently delete my account</>}
                </button>
                <button type="button" onClick={() => { setDeleteStep('idle'); setDeleteError('') }} disabled={deleteStep === 'deleting'}
                  className="flex items-center gap-2 px-4 py-2.5 border border-border text-ink-muted text-sm rounded-lg hover:bg-surface transition-colors disabled:opacity-50">
                  <X size={14} /> Cancel
                </button>
                <button type="button" onClick={requestDeleteCodes} disabled={deleteStep === 'deleting'}
                  className="text-xs text-danger hover:underline ml-1 disabled:opacity-50">
                  Resend codes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  )
}

function LockedField({ value }: { value: string }) {
  return (
    <div className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-sm text-ink-muted flex items-center justify-between gap-2 select-none">
      <span>{value}</span>
      <Lock size={13} className="text-ink-dim shrink-0" />
    </div>
  )
}
