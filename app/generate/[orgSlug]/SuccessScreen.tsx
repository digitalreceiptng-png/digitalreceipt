'use client'

import { CheckCircle2, ExternalLink, MessageSquare, Plus } from 'lucide-react'
import type { Branding } from './PinGate'

interface Receipt {
  id: string
  receipt_number: string | null
  unique_identifier: string
  receipt_type: string
  total_amount: number
  buyer_name: string
  buyer_email: string | null
}

export default function SuccessScreen({
  receipt,
  branding,
  onNew,
}: {
  receipt: Receipt
  branding: Branding
  onNew: () => void
}) {
  const publicUrl = `https://digitalreceipt.ng/r/${receipt.unique_identifier}`

  function shareWhatsApp() {
    const msg = `Your receipt from ${branding.businessName} is ready.\n\nView and download it here: ${publicUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xs">
        {/* Success icon */}
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: `${branding.primaryColor}18` }}
          >
            <CheckCircle2 size={38} style={{ color: branding.primaryColor }} strokeWidth={1.8} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Receipt Issued!</h2>
          <p className="text-sm text-gray-500 mt-1">
            Successfully issued to <strong>{receipt.buyer_name}</strong>
          </p>
        </div>

        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 space-y-2.5">
          {receipt.receipt_number && (
            <Row label="Receipt No." value={<span className="font-mono text-xs">{receipt.receipt_number}</span>} />
          )}
          <Row
            label="Amount"
            value={
              <span className="font-bold text-base" style={{ color: branding.primaryColor }}>
                ₦{Number(receipt.total_amount).toLocaleString('en-NG')}
              </span>
            }
          />
          <Row label="Type" value={<span className="capitalize">{receipt.receipt_type}</span>} />
          {receipt.buyer_email && <Row label="Email" value={<span className="text-xs break-all">{receipt.buyer_email}</span>} />}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={15} /> View &amp; Download Receipt
          </a>

          <button
            onClick={shareWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ background: '#25D366' }}
          >
            <MessageSquare size={15} /> Share via WhatsApp
          </button>

          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ background: branding.primaryColor }}
          >
            <Plus size={15} /> Issue Another Receipt
          </button>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Powered by{' '}
          <a href="https://digitalreceipt.ng" target="_blank" rel="noreferrer" className="underline">
            DigitalReceipt.ng
          </a>
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  )
}
