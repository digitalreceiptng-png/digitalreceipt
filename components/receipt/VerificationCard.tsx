import { Receipt, ReceiptItem } from '@/types'
import { formatNaira, formatDate, formatDateTime } from '@/lib/formatters'

interface Props {
  receipt: Receipt & { items: ReceiptItem[] }
  verifiedAt?: string
  method?: 'search' | 'qr'
}

export default function VerificationCard({ receipt, verifiedAt, method = 'search' }: Props) {
  const isValid = receipt.status === 'active'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden w-full max-w-lg">
      {/* Status header */}
      <div className={`px-6 py-5 ${isValid ? 'bg-[#1a6b2f]' : 'bg-[#dc2626]'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{isValid ? '✅' : '❌'}</span>
          <div>
            <p className="font-heading text-xl text-white leading-tight">
              {isValid ? 'VALID RECEIPT' : 'INVALID RECEIPT'}
            </p>
            <p className="text-sm text-white/80 mt-0.5">Verified via DigitalReceipt.ng</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Issued By */}
        <Section title="Issued By">
          <p className="font-semibold text-[#0f1f13]">{receipt.seller_name}</p>
          {receipt.seller_rc_number && <Detail label="RC Number" value={receipt.seller_rc_number} />}
          <Detail label="Phone" value={receipt.seller_phone} />
          {receipt.seller_email && <Detail label="Email" value={receipt.seller_email} />}
          {receipt.seller_address && <p className="text-sm text-[#4a6b55] mt-0.5">{receipt.seller_address}</p>}
        </Section>

        {/* Issued To */}
        <Section title="Issued To">
          <p className="font-semibold text-[#0f1f13]">{receipt.buyer_name}</p>
          <Detail label="Phone" value={receipt.buyer_phone} />
          {receipt.buyer_email && <Detail label="Email" value={receipt.buyer_email} />}
        </Section>

        {/* Transaction Details */}
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
              <tr className="text-xs text-[#4a6b55] border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Description</th>
                <th className="text-right pb-2 font-medium">Qty</th>
                <th className="text-right pb-2 font-medium">Unit</th>
                <th className="text-right pb-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(receipt.items ?? []).map((item, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 pr-2 text-[#0f1f13]">{item.description}</td>
                  <td className="py-1.5 text-right text-[#4a6b55]">{item.quantity}</td>
                  <td className="py-1.5 text-right text-[#4a6b55]">{formatNaira(item.unit_price)}</td>
                  <td className="py-1.5 text-right text-[#0f1f13] font-medium">{formatNaira(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatNaira(receipt.subtotal)} />
            {receipt.discount > 0 && (
              <Row label="Discount" value={`-${formatNaira(receipt.discount)}`} />
            )}
            {receipt.tax > 0 && (
              <Row label="Tax" value={formatNaira(receipt.tax)} />
            )}
            <div className="flex justify-between font-bold text-base text-[#0f1f13] pt-1 border-t border-gray-100 mt-2">
              <span>TOTAL PAID</span>
              <span>{formatNaira(receipt.total_amount)}</span>
            </div>
          </div>
        </Section>

        {/* Verification Info */}
        <div className="px-6 py-4 bg-[#f4faf6]">
          <p className="text-xs font-semibold text-[#4a6b55] uppercase tracking-wide mb-3">Verification Info</p>
          <div className="space-y-1.5 text-sm">
            <Row label="Method" value={method === 'qr' ? 'QR Code Scan' : 'Website Search'} />
            <Row
              label="Status"
              value={<span className="font-semibold text-[#16a34a]">VERIFIED VIA DATABASE</span>}
            />
            {verifiedAt && <Row label="Verified" value={formatDateTime(verifiedAt)} />}
            <Row label="Powered by" value={<span className="text-[#1a6b2f] font-medium">DigitalReceipt.ng</span>} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-4">
      <p className="text-xs font-semibold text-[#4a6b55] uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <p className="text-sm text-[#4a6b55]">{label}: <span className="text-[#0f1f13]">{value}</span></p>
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#4a6b55] shrink-0">{label}</span>
      <span className="text-[#0f1f13] text-right">{value}</span>
    </div>
  )
}
