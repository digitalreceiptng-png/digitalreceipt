'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError('')
    setSaving(true)
    const supabase = createClient()
    const updates: Partial<Profile> = { full_name: fullName, phone, address }
    if (profile.issuer_type === 'business') updates.business_name = businessName
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
      <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors">
        <ArrowLeft size={16} /> Back to dashboard
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
        <h2 className="font-medium text-ink">Edit Details</h2>

        <Field label="Full name" required>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className={INPUT} />
        </Field>
        {profile.issuer_type === 'business' && (
          <Field label="Business name" required>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required className={INPUT} />
          </Field>
        )}
        <Field label="Phone number">
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08012345678" className={INPUT} />
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
