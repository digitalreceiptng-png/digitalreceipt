'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Copy, ArrowLeft, ExternalLink, CheckCircle } from 'lucide-react'
import VerificationCard from '@/components/receipt/VerificationCard'
import type { Receipt, ReceiptItem } from '@/types'

type FullReceipt = Receipt & { items: ReceiptItem[] }

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [receipt, setReceipt] = useState<FullReceipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/receipts/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.receipt) setReceipt(data.receipt)
        else router.push('/dashboard/receipts')
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="w-5 h-5 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (!receipt) return null

  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${receipt.unique_identifier}`

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/dashboard/receipts"
          className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Receipts
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-3.5 py-2 border border-border rounded-lg text-sm text-ink-muted hover:border-border-bright hover:text-ink transition-colors"
          >
            {copied ? <CheckCircle size={15} className="text-success" /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          <Link
            href={verifyUrl}
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2 border border-border rounded-lg text-sm text-ink-muted hover:border-border-bright hover:text-ink transition-colors"
          >
            <ExternalLink size={15} />
            View public
          </Link>

          <Link
            href={`/api/receipts/${receipt.id}/pdf`}
            className="flex items-center gap-2 px-3.5 py-2 bg-gold text-bg rounded-lg text-sm font-semibold hover:bg-gold-bright transition-colors"
          >
            <Download size={15} />
            Download PDF
          </Link>
        </div>
      </div>

      {/* Receipt identifiers */}
      <div className="bg-surface border border-border rounded-xl px-5 py-4 flex flex-wrap gap-6">
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
          <a href={verifyUrl} className="text-sm text-gold-muted hover:text-gold break-all transition-colors">{verifyUrl}</a>
        </div>
      </div>

      <div className="flex justify-center">
        <VerificationCard
          receipt={receipt}
          verifiedAt={receipt.created_at}
          method="search"
        />
      </div>
    </div>
  )
}
