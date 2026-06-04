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
        <div className="w-6 h-6 border-2 border-[#1a6b2f] border-t-transparent rounded-full animate-spin" />
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
          className="flex items-center gap-2 text-sm text-[#4a6b55] hover:text-[#0f1f13] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Receipts
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-[#4a6b55] hover:border-[#1a6b2f] hover:text-[#1a6b2f] transition-colors"
          >
            {copied ? <CheckCircle size={15} className="text-[#16a34a]" /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy verify link'}
          </button>

          <Link
            href={verifyUrl}
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-[#4a6b55] hover:border-[#1a6b2f] hover:text-[#1a6b2f] transition-colors"
          >
            <ExternalLink size={15} />
            View public page
          </Link>

          <Link
            href={`/api/receipts/${receipt.id}/pdf`}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1a6b2f] text-white rounded-lg text-sm font-medium hover:bg-[#155a27] transition-colors"
          >
            <Download size={15} />
            Download PDF
          </Link>
        </div>
      </div>

      {/* Receipt identifier info */}
      <div className="bg-white rounded-xl border border-[#e0ede5] px-5 py-4 flex flex-wrap gap-4">
        <div>
          <p className="text-xs text-[#4a6b55] uppercase tracking-wide font-medium">Receipt Number</p>
          <p className="font-mono text-sm text-[#0f1f13] mt-0.5">{receipt.receipt_number}</p>
        </div>
        <div>
          <p className="text-xs text-[#4a6b55] uppercase tracking-wide font-medium">Unique Identifier</p>
          <p className="font-mono text-sm text-[#0f1f13] mt-0.5">{receipt.unique_identifier}</p>
        </div>
        <div>
          <p className="text-xs text-[#4a6b55] uppercase tracking-wide font-medium">Verify URL</p>
          <p className="text-sm text-[#1a6b2f] mt-0.5 break-all">{verifyUrl}</p>
        </div>
      </div>

      {/* Verification card (reused for display) */}
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
