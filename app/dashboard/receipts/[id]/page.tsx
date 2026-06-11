'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Copy, ArrowLeft, ExternalLink, CheckCircle, Mail, Loader2, X } from 'lucide-react'
import VerificationCard from '@/components/receipt/VerificationCard'
import type { Receipt, ReceiptItem } from '@/types'

type FullReceipt = Receipt & { items: ReceiptItem[] }

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [receipt, setReceipt] = useState<FullReceipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Email state
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    fetch(`/api/receipts/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.receipt) {
          setReceipt(data.receipt)
          setEmailInput(data.receipt.buyer_email ?? '')
        } else {
          router.push('/dashboard/receipts')
        }
      })
      .finally(() => setLoading(false))
  }, [id, router])

  function copyLink() {
    const url = `${window.location.origin}/r/${receipt?.unique_identifier}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function sendEmail() {
    if (!emailInput.trim()) { setEmailError('Enter a valid email address.'); return }
    setSending(true)
    setEmailError('')
    const res = await fetch(`/api/receipts/${id}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.trim() }),
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) { setEmailError(data.error ?? 'Failed to send email.'); return }
    setEmailSent(true)
    setTimeout(() => { setEmailOpen(false); setEmailSent(false) }, 3000)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="w-5 h-5 border-2 border-forest/30 border-t-forest rounded-full animate-spin" />
      </div>
    )
  }

  if (!receipt) return null

  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${receipt.unique_identifier}`

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button onClick={() => router.push('/dashboard/receipts')} className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
          <ArrowLeft size={15} />
          Back to Receipts
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-3.5 py-2 border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white"
          >
            {copied ? <CheckCircle size={15} className="text-green-600" /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          <Link
            href={verifyUrl}
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2 border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white"
          >
            <ExternalLink size={15} />
            View public
          </Link>

          <button
            onClick={() => { setEmailOpen(v => !v); setEmailError(''); setEmailSent(false) }}
            className="flex items-center gap-2 px-3.5 py-2 border border-forest/50 bg-forest-light text-forest rounded-lg text-sm font-semibold hover:bg-forest hover:text-white transition-colors"
          >
            <Mail size={15} />
            Email customer
          </button>

          <Link
            href={`/api/receipts/${receipt.id}/pdf`}
            className="flex items-center gap-2 px-3.5 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
          >
            <Download size={15} />
            Download PDF
          </Link>
        </div>
      </div>

      {/* Email panel */}
      {emailOpen && (
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Email receipt to customer</p>
              <p className="text-xs text-ink-muted mt-0.5">
                The customer will receive a verified receipt email from DigitalReceipt.ng on your behalf.
              </p>
            </div>
            <button onClick={() => setEmailOpen(false)} className="text-ink-dim hover:text-ink transition-colors">
              <X size={16} />
            </button>
          </div>

          {emailSent ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle size={16} />
              Receipt sent to {emailInput}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                placeholder="customer@email.com"
                className="flex-1 px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
              />
              <button
                onClick={sendEmail}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          )}

          {emailError && (
            <p className="text-xs text-danger">{emailError}</p>
          )}

          <p className="text-xs text-ink-dim">
            The email will say: <span className="font-medium text-ink-muted">&ldquo;{receipt.seller_name} sent you a receipt&rdquo;</span>
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border px-5 py-4 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-ink-dim font-medium mb-0.5">Receipt Number</p>
          <p className="font-mono text-sm text-ink">{receipt.receipt_number}</p>
        </div>
        <div>
          <p className="text-xs text-ink-dim font-medium mb-0.5">Unique Identifier</p>
          <p className="font-mono text-sm text-ink">{receipt.unique_identifier}</p>
        </div>
        <div>
          <p className="text-xs text-ink-dim font-medium mb-0.5">Verify URL</p>
          <a href={verifyUrl} className="text-sm text-forest/70 hover:text-forest break-all transition-colors">{verifyUrl}</a>
        </div>
      </div>

      <div className="flex justify-center">
        <VerificationCard receipt={receipt} verifiedAt={receipt.created_at} method="search" />
      </div>
    </div>
  )
}
