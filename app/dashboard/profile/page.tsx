'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { ArrowLeft, CheckCircle, Loader2, Lock, Trash2, AlertTriangle, X } from 'lucide-react'

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
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data)
          setFullName(data.full_name ?? '')
          setPhone(data.phone ?? '')
          setAddress(data.address ?? '')
          setBusinessName(data.business_name ?? '')
        }
        setLoading(false)
      })
    })
  }, [])

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError('')
    setSaving(true)
    const supabase = createClient()
    // Verified users can only update address
    const updates: Partial<Profile> = profile.is_verified
      ? { address }
      : { full_name: fullName, phone, address, ...(profile.issuer_type === 'business' ? { business_name: businessName } : {}) }
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

  if (!profile) return null

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
        <ArrowLeft size={15} /> Back to dashboard
      </button>
      <div>
        <h1 className="font-heading text-2xl text-ink">Profile Settings</h1>
        <p className="text-sm text-ink-muted mt-1">Manage your issuer information. This appears on all your receipts.</p>
      </div>

      <div className="bg-white rounded-xl border border-border px-5 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-forest text-white flex items-center justify-center text-lg font-bold shrink-0">
          {profile.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-ink">{profile.full_name}</p>
          <p className="text-sm text-ink-muted">{profile.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs bg-forest-light text-forest border border-forest/20 px-2 py-0.5 rounded-full capitalize font-medium">
              {profile.issuer_type}
            </span>
            {profile.is_verified && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle size={10} />
                Verified
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-ink">Edit Details</h2>
          {profile.is_verified && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-dim bg-surface border border-border px-2.5 py-1 rounded-full">
              <Lock size={11} />
              Name and phone locked after verification
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
          {profile.is_verified ? (
            <LockedField value={phone || '—'} />
          ) : (
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08012345678" className={INPUT} />
          )}
        </Field>
        <Field label="Address">
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, State" className={INPUT} />
          <p className="text-xs text-ink-dim mt-1">Used to determine the state code on your receipt numbers.</p>
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

      {/* ── Danger Zone ── */}
      <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
          <div>
            <h2 className="font-medium text-danger">Danger Zone</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Permanently delete your account and all associated receipts, wallet, and data. This cannot be undone.
            </p>
          </div>
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
            {deleteError && (
              <p className="text-xs text-danger bg-white border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={requestDeleteCodes}
                className="flex items-center gap-2 px-4 py-2.5 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={14} /> Yes, send me the codes
              </button>
              <button
                type="button"
                onClick={() => { setDeleteStep('idle'); setDeleteError('') }}
                className="flex items-center gap-2 px-4 py-2.5 border border-border text-ink-muted text-sm rounded-lg hover:bg-surface transition-colors"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {deleteStep === 'sending' && (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 size={16} className="animate-spin text-danger" />
            Sending verification codes…
          </div>
        )}

        {(deleteStep === 'enter-codes' || deleteStep === 'deleting') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-5">
            <p className="text-sm text-red-800">
              Codes sent to <strong>{deleteEmailMasked}</strong> (email) and <strong>{deletePhoneMasked}</strong> (SMS). Enter both below to confirm deletion.
            </p>

            {/* Email code */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink">Email verification code</p>
              <div className="flex gap-1.5">
                {deleteEmailCode.map((d, i) => (
                  <input
                    key={i}
                    id={`del-email-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDeleteOtpInput(deleteEmailCode, setDeleteEmailCode, i, e.target.value, 'del-email')}
                    onKeyDown={e => handleDeleteOtpKeyDown(deleteEmailCode, setDeleteEmailCode, i, e, 'del-email')}
                    className={OTP_INPUT}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            </div>

            {/* SMS code */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink">SMS verification code</p>
              <div className="flex gap-1.5">
                {deleteSmsCode.map((d, i) => (
                  <input
                    key={i}
                    id={`del-sms-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDeleteOtpInput(deleteSmsCode, setDeleteSmsCode, i, e.target.value, 'del-sms')}
                    onKeyDown={e => handleDeleteOtpKeyDown(deleteSmsCode, setDeleteSmsCode, i, e, 'del-sms')}
                    className={OTP_INPUT}
                  />
                ))}
              </div>
            </div>

            {deleteError && (
              <p className="text-xs text-danger bg-white border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteStep === 'deleting' || deleteEmailCode.join('').length < 6 || deleteSmsCode.join('').length < 6}
                className="flex items-center gap-2 px-4 py-2.5 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteStep === 'deleting'
                  ? <><Loader2 size={14} className="animate-spin" /> Deleting account…</>
                  : <><Trash2 size={14} /> Permanently delete my account</>
                }
              </button>
              <button
                type="button"
                onClick={() => { setDeleteStep('idle'); setDeleteError('') }}
                disabled={deleteStep === 'deleting'}
                className="flex items-center gap-2 px-4 py-2.5 border border-border text-ink-muted text-sm rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
              >
                <X size={14} /> Cancel
              </button>
              <button
                type="button"
                onClick={requestDeleteCodes}
                disabled={deleteStep === 'deleting'}
                className="text-xs text-danger hover:underline ml-1 disabled:opacity-50"
              >
                Resend codes
              </button>
            </div>
          </div>
        )}
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
