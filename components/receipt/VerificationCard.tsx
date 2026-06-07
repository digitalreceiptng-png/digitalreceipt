'use client'

import Image from 'next/image'
import QRCode from 'react-qr-code'
import { Receipt, ReceiptItem } from '@/types'
import { formatNaira, formatDate, formatDateTime } from '@/lib/formatters'

const LOGO_URL = 'https://ctmiexmeufxvhfyffljx.supabase.co/storage/v1/object/public/assets/Digitalreceiptlogo.jpeg'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://digitalreceipt-ng.vercel.app'

interface Props {
  receipt: Receipt & { items: ReceiptItem[] }
  verifiedAt?: string
  method?: 'search' | 'qr'
}

export default function VerificationCard({ receipt, verifiedAt, method = 'search' }: Props) {
  const isValid = receipt.status === 'active'

  return (
    <div
      className="bg-white overflow-hidden w-full max-w-lg shadow-xl"
      style={{
        border: '1px solid #d4c5a0',
        borderRadius: '4px',
      }}
    >
      {/* Status header */}
      <div
        style={{
          background: isValid ? '#0d6b1e' : '#3b0a0a',
          padding: '20px 24px',
          borderBottom: isValid ? '2px solid rgba(255,255,255,0.25)' : '2px solid #dc2626',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-4">
          <Image
            src={LOGO_URL}
            alt="DigitalReceipt.ng"
            width={32}
            height={32}
            className="rounded-sm"
            unoptimized
          />
          <span className="text-sm font-semibold text-white">DigitalReceipt.ng</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="font-heading text-2xl leading-tight tracking-wide"
              style={{ color: isValid ? '#ffffff' : '#fca5a5' }}
            >
              {isValid ? 'VERIFIED RECEIPT' : 'INVALID RECEIPT'}
            </p>
            <p className="text-sm mt-1" style={{ color: isValid ? 'rgba(255,255,255,0.75)' : '#f87171' }}>
              Authenticated via DigitalReceipt.ng
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: isValid ? 'rgba(255,255,255,0.15)' : 'rgba(220,38,38,0.15)',
              border: `1px solid ${isValid ? 'rgba(255,255,255,0.3)' : 'rgba(220,38,38,0.4)'}`,
            }}
          >
            <span className="text-lg text-white">{isValid ? '✓' : '✕'}</span>
          </div>
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: '#e8e0d0' }}>
        {/* Issued By */}
        <Section title="Issued By">
          <p className="font-semibold text-[#1a1a1a]">{receipt.seller_name}</p>
          {receipt.seller_rc_number && <Detail label="RC Number" value={receipt.seller_rc_number} />}
          <Detail label="Phone" value={receipt.seller_phone} />
          {receipt.seller_email && <Detail label="Email" value={receipt.seller_email} />}
          {receipt.seller_address && <p className="text-sm text-[#6b6251] mt-0.5">{receipt.seller_address}</p>}
        </Section>

        {/* Issued To */}
        <Section title="Issued To">
          <p className="font-semibold text-[#1a1a1a]">{receipt.buyer_name}</p>
          <Detail label="Phone" value={receipt.buyer_phone} />
          {receipt.buyer_email && <Detail label="Email" value={receipt.buyer_email} />}
        </Section>

        {/* Transaction */}
        <Section title="Transaction Details">
          <div className="space-y-1.5 text-sm">
            <Row label="Receipt No." value={<span className="font-mono">{receipt.receipt_number}</span>} />
            <Row label="Identifier" value={<span className="font-mono">{receipt.unique_identifier}</span>} />
            <Row label="Date" value={formatDate(receipt.transaction_date)} />
            <Row label="Payment Method" value={receipt.payment_method} />
            {receipt.reference_number && <Row label="Reference" value={receipt.reference_number} />}
            {receipt.notes && <Row label="Notes" value={receipt.notes} />}
          </div>
        </Section>

        {/* Items */}
        <Section title="Items Purchased">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[#9b8e7a]" style={{ borderBottom: '1px solid #e8e0d0' }}>
                <th className="text-left pb-2 font-medium">Description</th>
                <th className="text-right pb-2 font-medium">Qty</th>
                <th className="text-right pb-2 font-medium">Unit</th>
                <th className="text-right pb-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(receipt.items ?? []).map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ebe2' }} className="last:border-0">
                  <td className="py-1.5 pr-2 text-[#1a1a1a]">{item.description}</td>
                  <td className="py-1.5 text-right text-[#6b6251]">{item.quantity}</td>
                  <td className="py-1.5 text-right text-[#6b6251]">{formatNaira(item.unit_price)}</td>
                  <td className="py-1.5 text-right text-[#1a1a1a] font-medium">{formatNaira(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 pt-3 space-y-1.5 text-sm" style={{ borderTop: '1px solid #e8e0d0' }}>
            <Row label="Subtotal" value={formatNaira(receipt.subtotal)} />
            {receipt.discount > 0 && (
              <Row label="Discount" value={`−${formatNaira(receipt.discount)}`} />
            )}
            {receipt.tax > 0 && (
              <Row label="Tax" value={formatNaira(receipt.tax)} />
            )}
            <div
              className="flex justify-between text-base pt-2 mt-1"
              style={{ borderTop: '1px solid #d4c5a0' }}
            >
              <span className="font-bold text-[#1a1a1a] tracking-wider text-sm">TOTAL PAID</span>
              <span className="font-heading text-xl text-[#1a1a1a]">{formatNaira(receipt.total_amount)}</span>
            </div>
          </div>
        </Section>

        {/* QR Code */}
        <div className="px-6 py-5 flex flex-col items-center gap-3" style={{ borderTop: '1px solid #e8e0d0' }}>
          <div className="p-3 bg-white border rounded relative inline-block" style={{ borderColor: '#d4c5a0' }}>
            <QRCode
              value={`${APP_URL}/r/${receipt.unique_identifier}`}
              size={120}
              level="H"
              fgColor="#0d6b1e"
              bgColor="#ffffff"
            />
            {/* Logo overlay in the center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded p-0.5" style={{ border: '1.5px solid #d4c5a0' }}>
                <Image
                  src={LOGO_URL}
                  alt="DigitalReceipt.ng"
                  width={22}
                  height={22}
                  className="rounded-sm block"
                  unoptimized
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-center" style={{ color: '#9b8e7a' }}>
            Scan to verify this receipt online
          </p>
        </div>

        {/* Verification Info */}
        <div className="px-6 py-4" style={{ background: '#f8f5ef', borderTop: '1px solid #e8e0d0' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#9b8e7a' }}>
            Verification Record
          </p>
          <div className="space-y-1.5 text-sm">
            <Row label="Method" value={method === 'qr' ? 'QR Code Scan' : 'Website Search'} />
            <Row
              label="Status"
              value={
                <span className="font-semibold" style={{ color: '#0d6b1e' }}>
                  VERIFIED VIA DATABASE
                </span>
              }
            />
            {verifiedAt && <Row label="Verified at" value={formatDateTime(verifiedAt)} />}
            <Row
              label="Powered by"
              value={
                <span className="font-medium" style={{ color: '#0d6b1e' }}>
                  DigitalReceipt.ng
                </span>
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-4">
      <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#9b8e7a' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-[#6b6251]">
      {label}: <span className="text-[#1a1a1a]">{value}</span>
    </p>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#6b6251] shrink-0">{label}</span>
      <span className="text-[#1a1a1a] text-right">{value}</span>
    </div>
  )
}
