'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

const REJECTION_REASONS = [
  'Payment could not be verified.',
  'Incorrect payment information.',
  'Invalid proof of payment.',
  'Duplicate submission.',
  'Other',
]

export default function RequestActions({ submissionId }: { submissionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'confirm' | 'reject' | ''>('')
  const [error, setError] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  async function confirm() {
    setLoading('confirm')
    setError('')
    const res = await fetch(`/api/receipt-requests/${submissionId}/confirm`, { method: 'POST' })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to confirm')
      if (json.code === 'INSUFFICIENT_BALANCE') {
        setError(`Insufficient wallet balance. You need ₦${json.required?.toLocaleString()} but have ₦${json.balance?.toLocaleString()}. Please top up your wallet.`)
      }
      setLoading('')
      return
    }
    router.refresh()
  }

  async function reject() {
    const reason = rejectionReason === 'Other' ? customReason.trim() : rejectionReason
    setLoading('reject')
    setError('')
    const res = await fetch(`/api/receipt-requests/${submissionId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to reject')
      setLoading('')
      return
    }
    setShowRejectModal(false)
    router.refresh()
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-ink">Actions</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <div className="flex gap-3">
          <button
            onClick={confirm}
            disabled={!!loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60"
          >
            <CheckCircle size={16} />
            {loading === 'confirm' ? 'Generating Receipt…' : 'Confirm & Generate Receipt'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={!!loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border text-ink-muted rounded-lg text-sm font-semibold hover:border-danger/40 hover:text-danger transition-colors disabled:opacity-60"
          >
            <XCircle size={16} />
            Reject
          </button>
        </div>
        <p className="text-xs text-ink-dim">
          Confirming will generate an official receipt and email it to the customer. This uses one Silver receipt from your account.
        </p>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-ink text-lg">Reject Request</h2>
            <p className="text-sm text-ink-muted">Select a reason for rejection. The customer will be notified by email.</p>

            <div className="space-y-2">
              {REJECTION_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRejectionReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                    rejectionReason === r
                      ? 'border-danger/40 bg-red-50 text-red-700'
                      : 'border-border text-ink-muted hover:border-ink-dim hover:text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {rejectionReason === 'Other' && (
              <textarea
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Enter rejection reason…"
                rows={3}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors resize-none"
              />
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={reject}
                disabled={!rejectionReason || loading === 'reject'}
                className="flex-1 py-2.5 bg-danger text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading === 'reject' ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2.5 border border-border rounded-lg text-sm text-ink-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
