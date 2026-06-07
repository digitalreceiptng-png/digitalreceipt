'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, CheckCircle, Download, Lock, BadgeCheck, User, Building2, Loader2, Search } from 'lucide-react'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

interface SavedForm {
  email: string
  userType: 'new' | 'returning'
  issuerMode: 'individual' | 'business'
  issuerPhone?: string
  buyerName: string
  buyerPhone: string
  buyerEmail: string
  buyerAddress: string
  items: Array<{ id: string; description: string; quantity: string; unitPrice: string; totalPrice: number }>
  transactionDate: string
  paymentMethod: string
  referenceNumber: string
  notes: string
  sellerDisplayName: string
  tradingName: string
  vatPercent: string
  vatAmount: number
  subtotal: number
  total: number
}

interface Profile {
  full_name: string
  business_name?: string
  nin?: string
  issuer_type: string
  phone?: string
}

interface Company {
  rcNumber: string
  name: string
  type: string
  status: string
  dateRegistered: string
  address: string
}

interface Generated {
  id: string
  receiptNumber: string
  identifier: string
}

// ── Shared helpers ────────────────────────────────────────────────────────────

async function generateReceipt(form: SavedForm, sellerName: string): Promise<{ ok: boolean; data: Generated | null; error?: string }> {
  const res = await fetch('/api/receipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller_name: sellerName,
      buyer_name: form.buyerName,
      buyer_phone: form.buyerPhone || undefined,
      buyer_email: form.buyerEmail || undefined,
      buyer_address: form.buyerAddress || undefined,
      transaction_date: form.transactionDate,
      payment_method: form.paymentMethod,
      reference_number: form.referenceNumber || undefined,
      notes: form.notes || undefined,
      subtotal: form.subtotal,
      discount: 0,
      tax: form.vatAmount || 0,
      total_amount: form.total,
      items: form.items.map(i => ({
        description: i.description,
        quantity: parseFloat(i.quantity),
        unitPrice: parseFloat(i.unitPrice),
        totalPrice: i.totalPrice,
      })),
    }),
  })

  const json = await res.json()
  if (!res.ok) {
    return {
      ok: false,
      data: null,
      error: json.code === 'LIMIT_REACHED'
        ? "You've reached your monthly receipt limit."
        : json.error ?? 'Something went wrong. Please try again.',
    }
  }

  return {
    ok: true,
    data: {
      id: json.receipt.id,
      receiptNumber: json.receipt.receipt_number,
      identifier: json.receipt.unique_identifier,
    },
  }
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors">
      <ArrowLeft size={16} /> Back to form
    </button>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ generated }: { generated: Generated }) {
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${generated.identifier}`
  return (
    <div className="min-h-screen bg-surface py-10 px-4 flex items-start justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border p-5 sm:p-8 mt-4 sm:mt-6 text-center space-y-5">
        <div className="w-16 h-16 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-forest" />
        </div>
        <div>
          <h2 className="font-heading text-2xl text-ink">Receipt Generated</h2>
          <p className="text-sm text-ink-muted mt-1">Stored securely and ready to share.</p>
        </div>
        <div className="bg-surface rounded-xl p-4 text-left space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-ink-muted shrink-0">Receipt No.</span>
            <span className="font-mono font-medium text-ink">{generated.receiptNumber}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-muted shrink-0">Identifier</span>
            <span className="font-mono font-medium text-ink">{generated.identifier}</span>
          </div>
          <div className="flex justify-between gap-4 items-start">
            <span className="text-ink-muted shrink-0">Verify URL</span>
            <a href={verifyUrl} className="text-forest/70 hover:text-forest break-all text-right transition-colors">{verifyUrl}</a>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center pt-1">
          <a
            href={`/api/receipts/${generated.id}/pdf`}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white"
          >
            <Download size={15} /> Download PDF
          </a>
          <Link
            href={`/dashboard/receipts/${generated.id}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
          >
            View receipt
          </Link>
        </div>
        <Link href="/generate" className="block text-sm text-ink-dim hover:text-forest transition-colors">
          Generate another receipt
        </Link>
      </div>
    </div>
  )
}

// ── Business flow (RC Number + CAC lookup) ────────────────────────────────────

function BusinessFlow({ form }: { form: SavedForm }) {
  const router = useRouter()
  const [rc, setRc] = useState('')
  const [looking, setLooking] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState<Generated | null>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const digits = rc.trim().replace(/^(RC|BN)\s*/i, '')
    if (!/^\d{5,8}$/.test(digits)) { setLookupError('Enter a valid RC or BN number (5–8 digits).'); return }
    setLookupError('')
    setCompany(null)
    setLooking(true)

    const res = await fetch(`/api/cac?rc=${encodeURIComponent(rc.trim())}`)
    const json = await res.json()
    setLooking(false)

    if (!res.ok) { setLookupError(json.error ?? 'Company not found. Check the RC number and try again.'); return }
    setCompany(json.company)
  }

  async function handleGenerate() {
    if (!company) return
    setError('')
    setGenerating(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired. Please go back and try again.'); setGenerating(false); return }

    await supabase.from('profiles').upsert({
      id: user.id,
      email: form.email,
      full_name: company.name,
      issuer_type: 'business',
      business_name: company.name,
      rc_number: rc.trim(),
      phone: form.issuerPhone || undefined,
    }, { onConflict: 'id' })

    const result = await generateReceipt(form, company.name)
    setGenerating(false)
    if (!result.ok || !result.data) { setError(result.error ?? 'Something went wrong.'); return }
    sessionStorage.removeItem('dr_generate')
    setGenerated(result.data)
  }

  if (generated) return <SuccessScreen generated={generated} />

  return (
    <div className="min-h-screen bg-surface py-6 sm:py-10 px-3 sm:px-4">
      <div className="max-w-md mx-auto space-y-5 sm:space-y-6">
        <BackButton onClick={() => router.push('/generate')} />

        <div className="bg-white rounded-2xl border border-border p-5 sm:p-7 space-y-6">
          <div>
            <h1 className="font-heading text-2xl text-ink mb-1">Verify your business</h1>
            <p className="text-sm text-ink-muted">
              Enter your CAC Registration Number. We will pull your company details from the Corporate Affairs Commission.
            </p>
          </div>

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Registration Number<span className="text-danger ml-0.5">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rc}
                  onChange={e => { setRc(e.target.value.toUpperCase().slice(0, 10)); setCompany(null); setLookupError('') }}
                  className={INPUT}
                  placeholder="e.g. RC100001 or BN200002"
                  maxLength={10}
                  autoFocus
                  disabled={!!company}
                />
                {!company && (
                  <button
                    type="submit"
                    disabled={looking || rc.replace(/^(RC|BN)\s*/i, '').length < 5}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white bg-forest hover:bg-forest-bright"
                  >
                    {looking ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                    {looking ? 'Looking up…' : 'Look up'}
                  </button>
                )}
              </div>
              <p className="text-xs text-ink-dim mt-1.5">RC (Registered Company) or BN (Business Name) number on your CAC certificate.</p>
            </div>

            {lookupError && (
              <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{lookupError}</p>
            )}
          </form>

          {/* Company details card */}
          {company && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl border border-forest/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-forest-light border border-forest/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 size={18} className="text-forest" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink leading-snug">{company.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <BadgeCheck size={13} className="text-forest shrink-0" />
                      <p className="text-xs text-forest font-medium">CAC verified</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <span className="text-ink-muted">RC Number</span>
                  <span className="text-ink font-medium font-mono">{company.rcNumber}</span>
                  {company.type && (
                    <>
                      <span className="text-ink-muted">Company type</span>
                      <span className="text-ink font-medium">{company.type}</span>
                    </>
                  )}
                  {company.status && (
                    <>
                      <span className="text-ink-muted">Status</span>
                      <span className={`font-medium capitalize ${company.status.toLowerCase() === 'active' ? 'text-forest' : 'text-ink'}`}>
                        {company.status}
                      </span>
                    </>
                  )}
                  {company.dateRegistered && (
                    <>
                      <span className="text-ink-muted">Registered</span>
                      <span className="text-ink font-medium">{new Date(company.dateRegistered).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </>
                  )}
                  {company.address && (
                    <>
                      <span className="text-ink-muted">Address</span>
                      <span className="text-ink font-medium leading-snug">{company.address}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setCompany(null); setRc('') }}
                className="text-xs text-ink-dim hover:text-forest transition-colors"
              >
                Not the right company? Search again
              </button>

              <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex gap-3">
                <Lock size={15} className="text-forest/60 mt-0.5 shrink-0" />
                <p className="text-xs text-ink-muted leading-relaxed">
                  Your CAC details are used solely to verify your business identity. They are never shared with buyers.
                </p>
              </div>

              {error && (
                <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-white bg-forest hover:bg-forest-bright"
              >
                {generating ? (
                  <><Loader2 size={15} className="animate-spin" /> Generating receipt…</>
                ) : (
                  <><CheckCircle size={15} /> Confirm and generate receipt</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Individual: existing user ─────────────────────────────────────────────────

function ReturningFlow({ form }: { form: SavedForm }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState<Generated | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/generate'); return }
      const { data } = await supabase
        .from('profiles')
        .select('full_name, business_name, nin, issuer_type, phone')
        .eq('id', user.id)
        .single()
      setProfile(data ?? { full_name: form.email.split('@')[0], issuer_type: 'individual' })
      setProfileLoading(false)
    }
    load()
  }, [form.email, router])

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired. Please go back and sign in again.'); setGenerating(false); return }

    const displayName = profile?.full_name || form.email.split('@')[0]
    const result = await generateReceipt(form, displayName)
    setGenerating(false)
    if (!result.ok || !result.data) { setError(result.error ?? 'Something went wrong.'); return }
    sessionStorage.removeItem('dr_generate')
    setGenerated(result.data)
  }

  if (generated) return <SuccessScreen generated={generated} />

  return (
    <div className="min-h-screen bg-surface py-6 sm:py-10 px-3 sm:px-4">
      <div className="max-w-md mx-auto space-y-5 sm:space-y-6">
        <BackButton onClick={() => router.push('/generate')} />

        {profileLoading ? (
          <div className="bg-white rounded-2xl border border-border p-8 flex items-center justify-center gap-3 text-sm text-ink-muted">
            <Loader2 size={18} className="animate-spin text-forest" />
            Loading your profile…
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border p-5 sm:p-7 space-y-6">
            <div>
              <h1 className="font-heading text-2xl text-ink mb-1">Welcome back</h1>
              <p className="text-sm text-ink-muted">Your identity is on file. Review and generate your receipt.</p>
            </div>

            <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-forest-light border border-forest/20 flex items-center justify-center shrink-0">
                  <User size={18} className="text-forest" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{profile?.full_name || form.email}</p>
                  <p className="text-xs text-ink-dim">{form.email}</p>
                </div>
                {profile?.nin && (
                  <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-forest bg-forest-light px-2.5 py-1 rounded-full border border-forest/15">
                    <BadgeCheck size={13} /> NIN verified
                  </div>
                )}
              </div>
              <div className="border-t border-border pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <span className="text-ink-muted">Account type</span>
                <span className="text-ink font-medium capitalize">{profile?.issuer_type ?? 'Individual'}</span>
                {profile?.phone && (
                  <>
                    <span className="text-ink-muted">Phone</span>
                    <span className="text-ink font-medium">{profile.phone}</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Receipt summary</p>
              <div className="bg-surface rounded-xl border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-ink-muted">Buyer</span>
                  <span className="text-ink font-medium">{form.buyerName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-ink-muted">Items</span>
                  <span className="text-ink font-medium">{form.items.length} line item{form.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2 mt-1">
                  <span className="text-ink font-semibold">Total</span>
                  <span className="text-ink font-bold">₦{form.total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-white bg-forest hover:bg-forest-bright"
            >
              {generating ? <><Loader2 size={15} className="animate-spin" /> Generating receipt…</> : <><CheckCircle size={15} /> Generate receipt</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Individual: new user ──────────────────────────────────────────────────────

interface NinPerson {
  nin: string
  firstName: string
  lastName: string
  middleName: string
  dateOfBirth: string
  gender: string
  phone: string
  photo: string | null
}

function NewUserFlow({ form }: { form: SavedForm }) {
  const router = useRouter()
  const [nin, setNin] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [person, setPerson] = useState<NinPerson | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState<Generated | null>(null)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (nin.length < 11) { setVerifyError('Enter a valid 11-digit NIN.'); return }
    setVerifyError('')
    setPerson(null)
    setVerifying(true)

    const res = await fetch('/api/nin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nin }),
    })
    const json = await res.json()
    setVerifying(false)

    if (!res.ok) {
      if (json.error === 'NIN_NOT_CONFIGURED') {
        setVerifyError('NIN verification is not available yet. Please try again later.')
      } else {
        setVerifyError(json.error ?? 'NIN not found. Check the number and try again.')
      }
      return
    }

    setPerson(json.person)
  }

  async function handleGenerate() {
    if (!person) return
    setError('')
    setGenerating(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired. Please go back and try again.'); setGenerating(false); return }

    const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ')

    await supabase.from('profiles').upsert({
      id: user.id,
      email: form.email,
      full_name: fullName || form.email.split('@')[0],
      issuer_type: 'individual',
      nin: person.nin,
      phone: form.issuerPhone || person.phone || undefined,
    }, { onConflict: 'id' })

    const result = await generateReceipt(form, fullName || form.email.split('@')[0])
    setGenerating(false)
    if (!result.ok || !result.data) { setError(result.error ?? 'Something went wrong.'); return }
    sessionStorage.removeItem('dr_generate')
    setGenerated(result.data)
  }

  if (generated) return <SuccessScreen generated={generated} />

  return (
    <div className="min-h-screen bg-surface py-6 sm:py-10 px-3 sm:px-4">
      <div className="max-w-md mx-auto space-y-5 sm:space-y-6">
        <BackButton onClick={() => router.push('/generate')} />

        <div className="bg-white rounded-2xl border border-border p-5 sm:p-7 space-y-6">
          <div>
            <h1 className="font-heading text-2xl text-ink mb-1">Verify your identity</h1>
            <p className="text-sm text-ink-muted">
              Enter your NIN to complete registration. It will be attached to every receipt you issue.
            </p>
          </div>

          {/* Step 1 — NIN input */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                National Identification Number (NIN)<span className="text-danger ml-0.5">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={nin}
                  onChange={e => { setNin(e.target.value.replace(/\D/g, '').slice(0, 11)); setPerson(null); setVerifyError('') }}
                  className={INPUT}
                  placeholder="12345678901"
                  maxLength={11}
                  autoFocus
                  disabled={!!person}
                />
                {!person && (
                  <button
                    type="submit"
                    disabled={verifying || nin.length < 11}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white bg-forest hover:bg-forest-bright"
                  >
                    {verifying ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />}
                    {verifying ? 'Verifying…' : 'Verify'}
                  </button>
                )}
              </div>
              <p className="text-xs text-ink-dim mt-1.5">11-digit number on your National ID card.</p>
            </div>

            {verifyError && (
              <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{verifyError}</p>
            )}
          </form>

          {/* Step 2 — verified person card */}
          {person && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl border border-forest/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {person.photo ? (
                    <img
                      src={`data:image/jpeg;base64,${person.photo}`}
                      alt="NIN photo"
                      className="w-14 h-14 rounded-full object-cover border-2 border-forest/20 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-forest-light border border-forest/20 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={18} className="text-forest" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink leading-snug">
                      {[person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <BadgeCheck size={13} className="text-forest shrink-0" />
                      <p className="text-xs text-forest font-medium">NIN verified</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <span className="text-ink-muted">NIN</span>
                  <span className="text-ink font-medium font-mono">{person.nin}</span>
                  {person.dateOfBirth && (
                    <>
                      <span className="text-ink-muted">Date of birth</span>
                      <span className="text-ink font-medium">{person.dateOfBirth}</span>
                    </>
                  )}
                  {person.gender && (
                    <>
                      <span className="text-ink-muted">Gender</span>
                      <span className="text-ink font-medium capitalize">{person.gender}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setPerson(null); setNin('') }}
                className="text-xs text-ink-dim hover:text-forest transition-colors"
              >
                Not you? Try a different NIN
              </button>

              <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex gap-3">
                <Lock size={15} className="text-forest/60 mt-0.5 shrink-0" />
                <p className="text-xs text-ink-muted leading-relaxed">
                  Your NIN is never displayed on receipts or shared with buyers. It is stored securely and used only to verify your identity.
                </p>
              </div>

              {error && (
                <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-white bg-forest hover:bg-forest-bright"
              >
                {generating ? (
                  <><Loader2 size={15} className="animate-spin" /> Generating receipt…</>
                ) : (
                  <><CheckCircle size={15} /> Confirm and generate receipt</>
                )}
              </button>
            </div>
          )}

          {/* Privacy note — always visible before verification */}
          {!person && (
            <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex gap-3">
              <Lock size={15} className="text-forest/60 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-ink">Why we ask for your NIN</p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Your NIN verifies your identity and prevents fraudulent receipt generation. It is never displayed on receipts or shared with buyers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function VerifyPage() {
  const router = useRouter()
  const [form, setForm] = useState<SavedForm | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('dr_generate')
    if (!saved) { router.replace('/generate'); return }
    setForm(JSON.parse(saved))
  }, [router])

  if (!form) return null

  // Business issuers always go through CAC verification regardless of new/existing
  if (form.issuerMode === 'business') return <BusinessFlow form={form} />

  // Individual issuers branch on new vs existing
  if (form.userType === 'returning') return <ReturningFlow form={form} />
  return <NewUserFlow form={form} />
}
