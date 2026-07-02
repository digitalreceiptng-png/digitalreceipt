'use client'

import Image from 'next/image'
import QRCode from 'react-qr-code'
import { useState, useEffect, useRef } from 'react'
import { Receipt, ReceiptItem } from '@/types'
import { formatAmount, formatDate, formatDateTime } from '@/lib/formatters'

const DR_LOGO_URL = '/logo-dark.png'
const APP_URL = 'https://digitalreceipt.ng'

interface Props {
  receipt: Receipt & { items: ReceiptItem[] }
  verifiedAt?: string
  method?: 'search' | 'qr' | 'code'
  parentReceipt?: { id: string; total_amount: number; receipt_number: string; items?: ReceiptItem[] }
  lastPaymentAmount?: number
  sellerLogoUrl?: string | null
  sellerIssuerType?: string | null
}

function useDominantColor(imageUrl: string | null | undefined, fallback: string): string {
  const [color, setColor] = useState(fallback)
  useEffect(() => {
    if (!imageUrl) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 16
        canvas.height = 16
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, 16, 16)
        const data = ctx.getImageData(0, 0, 16, 16).data
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue // skip transparent
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
        }
        if (count === 0) return
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count)
        // Darken so text is readable on it
        const darken = (v: number) => Math.round(v * 0.55)
        setColor(`rgb(${darken(r)},${darken(g)},${darken(b)})`)
      } catch {}
    }
  }, [imageUrl])
  return color
}

export default function VerificationCard({ receipt, verifiedAt, method = 'search', parentReceipt, lastPaymentAmount, sellerLogoUrl, sellerIssuerType }: Props) {
  const isValid = receipt.status === 'active'
  const currency = receipt.currency ?? 'NGN'
  const colLabels = (receipt as any).column_labels ?? {}
  const qtyLabel = colLabels.qty || 'Qty'
  const priceLabel = colLabels.price || 'Unit'

  const showBranding = !!sellerLogoUrl

  const headerBg = useDominantColor(showBranding ? sellerLogoUrl : null, isValid ? '#0d6b1e' : '#3b0a0a')
  const activeHeaderBg = showBranding ? headerBg : (isValid ? '#0d6b1e' : '#3b0a0a')

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
          background: activeHeaderBg,
          padding: '20px 24px',
          borderBottom: isValid ? '2px solid rgba(255,255,255,0.25)' : '2px solid #dc2626',
          transition: 'background 0.4s ease',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-4">
          <Image
            src={showBranding ? sellerLogoUrl! : DR_LOGO_URL}
            alt={showBranding ? receipt.seller_name : 'DigitalReceipt.ng'}
            width={56}
            height={56}
            className="rounded-sm object-contain bg-white/10"
            unoptimized
          />
          <span className="text-sm font-semibold text-white">
            {showBranding ? receipt.seller_name : 'DigitalReceipt.ng'}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="font-heading text-2xl leading-tight tracking-wide"
              style={{ color: isValid ? '#ffffff' : '#fca5a5' }}
            >
              {!isValid ? 'INVALID RECEIPT' : receipt.parent_receipt_id ? 'PAYMENT RECEIPT' : 'VERIFIED RECEIPT'}
            </p>
            <p className="text-sm mt-1" style={{ color: isValid ? 'rgba(255,255,255,0.75)' : '#f87171' }}>
              {receipt.parent_receipt_id ? 'Payment update — Authenticated via DigitalReceipt.ng' : 'Authenticated via DigitalReceipt.ng'}
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
          {receipt.buyer_phone && <Detail label="Phone" value={receipt.buyer_phone} />}
          {receipt.buyer_email && <Detail label="Email" value={receipt.buyer_email} />}
          {receipt.buyer_address && <p className="text-sm text-[#6b6251] mt-0.5">{receipt.buyer_address}</p>}
        </Section>

        {/* Transaction */}
        <Section title="Transaction Details">
          <div className="space-y-1.5 text-sm">
            <Row label="Receipt No." value={<span className="font-mono">{receipt.receipt_number}</span>} />
            <Row label="Verification Code" value={<span className="font-mono">{receipt.unique_identifier}</span>} />
            <Row label="Date" value={formatDate(receipt.transaction_date)} />
            <Row label="Payment Method" value={receipt.payment_method} />
            {receipt.reference_number && <Row label={(receipt as any).reference_label || 'Reference'} value={receipt.reference_number} />}
            {receipt.notes && <Row label="Notes" value={receipt.notes} />}
          </div>
        </Section>

        {/* Items — child receipts use parent's item descriptions */}
        {(() => {
          const isChild = !!receipt.parent_receipt_id
          const displayItems = isChild && parentReceipt?.items?.length ? parentReceipt.items : (receipt.items ?? [])
          return (
            <Section title="Items Purchased">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#9b8e7a]" style={{ borderBottom: '1px solid #e8e0d0' }}>
                    <th className="text-left pb-2 font-medium">Description</th>
                    {!isChild && <th className="text-right pb-2 font-medium">{qtyLabel}</th>}
                    {!isChild && <th className="text-right pb-2 font-medium">{priceLabel}</th>}
                    <th className="text-right pb-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0ebe2' }} className="last:border-0">
                      <td className="py-1.5 pr-2 text-[#1a1a1a]">{item.description}</td>
                      {!isChild && <td className="py-1.5 text-right text-[#6b6251]">{item.quantity}</td>}
                      {!isChild && <td className="py-1.5 text-right text-[#6b6251]">{formatAmount(item.unit_price, currency)}</td>}
                      <td className="py-1.5 text-right text-[#1a1a1a] font-medium">{formatAmount(isChild ? receipt.total_amount : item.total_price, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 pt-3 space-y-1.5 text-sm" style={{ borderTop: '1px solid #e8e0d0' }}>
            {!receipt.parent_receipt_id && (
              <Row label="Subtotal" value={formatAmount(receipt.subtotal, currency)} />
            )}
            {receipt.discount > 0 && (
              <Row label="Discount" value={`−${formatAmount(receipt.discount, currency)}`} />
            )}
            {receipt.tax > 0 && (
              <Row label="Tax" value={formatAmount(receipt.tax, currency)} />
            )}
            <div
              className="flex justify-between text-base pt-2 mt-1"
              style={{ borderTop: '1px solid #d4c5a0' }}
            >
              <span className="font-bold text-[#1a1a1a] tracking-wider text-sm">
                {receipt.parent_receipt_id ? 'AMOUNT PAID' : 'TOTAL AMOUNT'}
              </span>
              <span className="font-heading text-xl text-[#1a1a1a]">{formatAmount(receipt.total_amount, currency)}</span>
            </div>

            {/* Payment status */}
            {receipt.parent_receipt_id && parentReceipt ? null : (receipt.amount_paid !== undefined || (receipt.balance_due ?? 0) > 0) ? (
              // Parent receipt — payment status
              <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid #e8e0d0' }}>
                {lastPaymentAmount !== undefined && lastPaymentAmount > 0 && (
                  <Row label="Amount Paid Now" value={
                    <span style={{ color: '#0d6b1e' }} className="font-semibold">{formatAmount(lastPaymentAmount, currency)}</span>
                  } />
                )}
                {receipt.amount_paid !== undefined && receipt.amount_paid > 0 && (
                  <Row label="Total Amount Paid" value={
                    <span style={{ color: '#0d6b1e' }} className="font-semibold">{formatAmount(receipt.amount_paid, currency)}</span>
                  } />
                )}
                {(receipt.balance_due ?? 0) > 0 ? (
                  <div
                    className="flex justify-between items-center px-3 py-2.5 rounded-lg mt-1"
                    style={{ background: '#fff3cd', border: '1px solid #ffc107' }}
                  >
                    <span className="text-sm font-bold" style={{ color: '#856404' }}>OUTSTANDING BALANCE</span>
                    <span className="font-heading text-lg font-bold" style={{ color: '#856404' }}>
                      {formatAmount(receipt.balance_due ?? 0, currency)}
                    </span>
                  </div>
                ) : receipt.amount_paid !== undefined && receipt.amount_paid > 0 ? (
                  <div
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg mt-1"
                    style={{ background: '#d4edda', border: '1px solid #c3e6cb' }}
                  >
                    <span className="text-sm font-semibold" style={{ color: '#155724' }}>✓ FULLY PAID</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
            </Section>
          )
        })()}

        {/* QR Code — hidden on Silver receipts */}
        {receipt.receipt_type !== 'silver' && <div className="px-6 py-5 flex flex-col items-center gap-3" style={{ borderTop: '1px solid #e8e0d0' }}>
          <div className="p-3 bg-white border rounded relative inline-block" style={{ borderColor: '#d4c5a0' }}>
            <QRCode
              value={`${typeof window !== 'undefined' ? window.location.origin : APP_URL}/r/${receipt.unique_identifier}`}
              size={120}
              level="H"
              fgColor="#0d6b1e"
              bgColor="#ffffff"
            />
            {/* Logo overlay in the center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded p-0.5" style={{ border: '1.5px solid #d4c5a0' }}>
                <Image
                  src={DR_LOGO_URL}
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
        </div>}

        {/* Attachments — Platinum only */}
        {receipt.attachment_urls && receipt.attachment_urls.length > 0 && (
          <div className="px-6 py-5" style={{ borderTop: '1px solid #e8e0d0' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#9b8e7a' }}>
              Attachments
            </p>
            <div className="flex gap-3 flex-wrap">
              {receipt.attachment_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={url}
                    alt={`Attachment ${i + 1}`}
                    className="w-28 h-28 object-cover rounded-lg border"
                    style={{ borderColor: '#d4c5a0' }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Verification Info */}
        <div className="px-6 py-4" style={{ background: '#f8f5ef', borderTop: '1px solid #e8e0d0' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#9b8e7a' }}>
            Verification Record
          </p>
          <div className="space-y-1.5 text-sm">
            <Row label="Method" value={method === 'qr' ? 'QR Code Scan' : method === 'code' ? 'Verification Code' : 'Website Search'} />
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
