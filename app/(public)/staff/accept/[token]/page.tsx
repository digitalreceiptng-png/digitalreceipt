'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react'

interface InviteDetails {
  businessName: string
  role: string
  can_create_receipts: boolean
  can_view_all_receipts: boolean
  can_view_wallet: boolean
  expiresAt: string
  expired: boolean
  alreadyUsed: boolean
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/staff/invite-details/${token}`)
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Invite not found'); setLoading(false); return }
        setInvite(data)
        setIsLoggedIn(data.isLoggedIn)
      } catch {
        setError('Failed to load invite')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function accept() {
    setAccepting(true)
    setError('')
    try {
      const res = await fetch(`/api/staff/accept/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to accept invite'); return }
      setAccepted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Loader2 size={24} className="text-forest animate-spin" />
    </div>
  )

  const roleLabel = invite?.role === 'sales_rep' ? 'Sales Representative' : invite?.role === 'cashier' ? 'Cashier' : 'Staff Member'

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-8">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.22 0.14 145)' }}>
            <Users size={15} className="text-white" />
          </div>
          <span className="font-heading text-sm text-ink">DigitalReceipt.ng</span>
        </div>

        {accepted ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: 'oklch(0.96 0.02 145)' }}>
              <CheckCircle size={28} className="text-forest" />
            </div>
            <h1 className="font-heading text-2xl text-ink">You&apos;re in!</h1>
            <p className="text-sm text-ink-muted">
              You have joined <strong>{invite?.businessName}</strong> as a {roleLabel}. You can now access their dashboard.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-2 px-6 py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : error && !invite ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <XCircle size={28} className="text-red-500" />
            </div>
            <h1 className="font-heading text-xl text-ink">Invite Not Found</h1>
            <p className="text-sm text-ink-muted">{error}</p>
            <Link href="/" className="inline-block mt-2 text-sm text-forest hover:underline">Back to home</Link>
          </div>
        ) : invite?.expired || invite?.alreadyUsed ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
              <XCircle size={28} className="text-amber-500" />
            </div>
            <h1 className="font-heading text-xl text-ink">{invite.expired ? 'Invite Expired' : 'Invite Already Used'}</h1>
            <p className="text-sm text-ink-muted">
              {invite.expired ? 'This invitation has expired. Ask the business owner to send a new one.' : 'This invitation has already been accepted.'}
            </p>
            <Link href="/" className="inline-block mt-2 text-sm text-forest hover:underline">Back to home</Link>
          </div>
        ) : invite ? (
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-2xl text-ink mb-1">Staff Invitation</h1>
              <p className="text-sm text-ink-muted">
                <strong>{invite.businessName}</strong> has invited you to join their team.
              </p>
            </div>

            <div className="bg-surface rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Role</span>
                <span className="font-medium text-ink">{roleLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Create Receipts</span>
                <span className={invite.can_create_receipts ? 'text-forest font-medium' : 'text-ink-dim'}>
                  {invite.can_create_receipts ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">View All Receipts</span>
                <span className={invite.can_view_all_receipts ? 'text-forest font-medium' : 'text-ink-dim'}>
                  {invite.can_view_all_receipts ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">View Wallet</span>
                <span className={invite.can_view_wallet ? 'text-forest font-medium' : 'text-ink-dim'}>
                  {invite.can_view_wallet ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
            )}

            {isLoggedIn === false ? (
              <div className="space-y-3">
                <p className="text-xs text-ink-muted text-center">You need an account to accept this invitation.</p>
                <Link
                  href={`/auth/login?redirectTo=/staff/accept/${token}`}
                  className="flex items-center justify-center w-full py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright transition-colors"
                >
                  Log in to Accept
                </Link>
                <Link
                  href={`/auth/register?redirectTo=/staff/accept/${token}`}
                  className="flex items-center justify-center w-full py-3 border border-border rounded-xl text-sm font-medium text-ink hover:border-forest/40 hover:text-forest transition-colors"
                >
                  Create Account
                </Link>
              </div>
            ) : (
              <button
                onClick={accept}
                disabled={accepting}
                className="w-full py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {accepting ? <><Loader2 size={15} className="animate-spin" />Accepting…</> : 'Accept Invitation'}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
