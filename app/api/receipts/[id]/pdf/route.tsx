import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const BRAND_GREEN = '#0d6b1e'
const LIGHT_GREEN = '#e8f5ec'
const BORDER      = '#d4c5a0'
const INK         = '#1a1a1a'
const MUTED       = '#6b6251'
const BG          = '#f8f5ef'
const LOGO_URL    = 'https://digitalreceipt.ng/logo-dark.png'
const APP_URL     = 'https://digitalreceipt.ng'

const s = StyleSheet.create({
  page:          { fontFamily: 'Helvetica', fontSize: 9, color: INK, backgroundColor: '#ffffff' },
  header:        { backgroundColor: BRAND_GREEN, padding: '16 20', borderBottom: `2 solid rgba(255,255,255,0.25)` },
  logoRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  logoImg:       { width: 24, height: 24, borderRadius: 3, marginRight: 6 },
  logoText:      { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold' },
  verifiedLabel: { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  verifiedSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 8, marginTop: 2 },
  badge:         { marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  badgeText:     { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
  section:       { padding: '10 20', borderBottom: `1 solid ${BORDER}` },
  sectionTitle:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  bold:          { fontFamily: 'Helvetica-Bold', fontSize: 9, color: INK },
  detail:        { fontSize: 8, color: MUTED, marginTop: 2 },
  row:           { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  rowLabel:      { color: MUTED, fontSize: 8 },
  rowValue:      { fontSize: 8, color: INK, textAlign: 'right' },
  tableHead:     { flexDirection: 'row', borderBottom: `1 solid ${BORDER}`, paddingBottom: 4, marginBottom: 4 },
  tableHeadText: { fontSize: 7, color: MUTED, fontFamily: 'Helvetica-Bold' },
  tableRow:      { flexDirection: 'row', borderBottom: `1 solid #f0ebe2`, paddingVertical: 3 },
  tableCell:     { fontSize: 8, color: INK },
  totalsRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  totalLabel:    { fontFamily: 'Helvetica-Bold', fontSize: 9, letterSpacing: 0.5, color: INK },
  totalValue:    { fontFamily: 'Helvetica-Bold', fontSize: 12, color: INK },
  qrSection:     { padding: '12 20', alignItems: 'center', borderBottom: `1 solid ${BORDER}` },
  qrLabel:       { fontSize: 7, color: MUTED, marginTop: 6, textAlign: 'center' },
  footer:        { padding: '10 20', backgroundColor: BG },
  footerTitle:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  verifiedStatus:{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: BRAND_GREEN },
  poweredBy:     { fontFamily: 'Helvetica-Bold', fontSize: 8, color: BRAND_GREEN },
})

function fmtNaira(n: number) {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })
}

const PAPER_SIZES = ['A4', 'LETTER', 'LEGAL', 'A5'] as const
type PaperSize = typeof PAPER_SIZES[number]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReceiptPDF({ receipt, size = 'A4', sellerLogoUrl }: { receipt: any; size?: PaperSize; sellerLogoUrl?: string | null }) {
  const items = receipt.items ?? []
  const verifyUrl = `${APP_URL}/r/${receipt.unique_identifier}`
  const colLabels = receipt.column_labels ?? {}
  const qtyLabel = colLabels.qty || 'Qty'
  const priceLabel = colLabels.price || 'Unit'

  return (
    <Document title={`Receipt ${receipt.receipt_number}`}>
      <Page size={size} wrap style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <Image src={sellerLogoUrl ?? LOGO_URL} style={s.logoImg} />
            <Text style={s.logoText}>{sellerLogoUrl ? receipt.seller_name : 'DigitalReceipt.ng'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.verifiedLabel}>VERIFIED RECEIPT</Text>
              <Text style={s.verifiedSub}>Authenticated via DigitalReceipt.ng</Text>
            </View>
            <View style={s.badge}>
              <Text style={s.badgeText}>✓</Text>
            </View>
          </View>
        </View>

        {/* Issued By */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Issued By</Text>
          <Text style={s.bold}>{receipt.seller_name}</Text>
          {receipt.seller_rc_number ? <Text style={s.detail}>RC Number: {receipt.seller_rc_number}</Text> : null}
          {receipt.seller_phone ? <Text style={s.detail}>Phone: {receipt.seller_phone}</Text> : null}
          {receipt.seller_email ? <Text style={s.detail}>Email: {receipt.seller_email}</Text> : null}
          {receipt.seller_address ? <Text style={s.detail}>{receipt.seller_address}</Text> : null}
        </View>

        {/* Issued To */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Issued To</Text>
          <Text style={s.bold}>{receipt.buyer_name}</Text>
          {receipt.buyer_phone ? <Text style={s.detail}>Phone: {receipt.buyer_phone}</Text> : null}
          {receipt.buyer_email ? <Text style={s.detail}>Email: {receipt.buyer_email}</Text> : null}
        </View>

        {/* Transaction */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Transaction Details</Text>
          <View style={s.row}><Text style={s.rowLabel}>Receipt No.</Text><Text style={s.rowValue}>{receipt.receipt_number}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Identifier</Text><Text style={s.rowValue}>{receipt.unique_identifier}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Date</Text><Text style={s.rowValue}>{fmtDate(receipt.transaction_date)}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Payment Method</Text><Text style={s.rowValue}>{receipt.payment_method}</Text></View>
          {receipt.reference_number ? <View style={s.row}><Text style={s.rowLabel}>Reference</Text><Text style={s.rowValue}>{receipt.reference_number}</Text></View> : null}
          {receipt.notes ? <View style={s.row}><Text style={s.rowLabel}>Notes</Text><Text style={s.rowValue}>{receipt.notes}</Text></View> : null}
        </View>

        {/* Items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Items Purchased</Text>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadText, { flex: 3 }]}>Description</Text>
            <Text style={[s.tableHeadText, { flex: 1, textAlign: 'right' }]}>{qtyLabel}</Text>
            <Text style={[s.tableHeadText, { flex: 2, textAlign: 'right' }]}>{priceLabel}</Text>
            <Text style={[s.tableHeadText, { flex: 2, textAlign: 'right' }]}>Total</Text>
          </View>
          {items.map((item: { description: string; quantity: number; unit_price: number; total_price: number }, i: number) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 3 }]}>{item.description}</Text>
              <Text style={[s.tableCell, { flex: 1, textAlign: 'right', color: MUTED }]}>{item.quantity}</Text>
              <Text style={[s.tableCell, { flex: 2, textAlign: 'right', color: MUTED }]}>{fmtNaira(item.unit_price)}</Text>
              <Text style={[s.tableCell, { flex: 2, textAlign: 'right' }]}>{fmtNaira(item.total_price)}</Text>
            </View>
          ))}
          <View style={{ marginTop: 8, paddingTop: 6, borderTop: `1 solid ${BORDER}` }}>
            <View style={s.row}><Text style={s.rowLabel}>Subtotal</Text><Text style={s.rowValue}>{fmtNaira(receipt.subtotal)}</Text></View>
            {receipt.discount > 0 ? <View style={s.row}><Text style={s.rowLabel}>Discount</Text><Text style={s.rowValue}>−{fmtNaira(receipt.discount)}</Text></View> : null}
            {receipt.tax > 0 ? <View style={s.row}><Text style={s.rowLabel}>Tax</Text><Text style={s.rowValue}>{fmtNaira(receipt.tax)}</Text></View> : null}
            <View style={[s.totalsRow, { marginTop: 6, paddingTop: 6, borderTop: `1 solid ${BORDER}` }]}>
              <Text style={s.totalLabel}>TOTAL PAID</Text>
              <Text style={s.totalValue}>{fmtNaira(receipt.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* QR Code — only for gold, diamond, platinum */}
        {['gold', 'diamond', 'platinum'].includes(receipt.receipt_type) && (
          <View style={s.qrSection}>
            <View style={{ position: 'relative', width: 90, height: 90 }}>
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0d6b1e&data=${encodeURIComponent(verifyUrl)}`}
                style={{ width: 90, height: 90 }}
              />
              {/* Logo centered over QR */}
              <View style={{
                position: 'absolute',
                top: 33, left: 33,
                width: 24, height: 24,
                backgroundColor: '#ffffff',
                borderRadius: 3,
                padding: 2,
                border: '1 solid #d4c5a0',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Image src={LOGO_URL} style={{ width: 20, height: 20, borderRadius: 2 }} />
              </View>
            </View>
            <Text style={s.qrLabel}>Scan to verify this receipt online</Text>
            <Text style={[s.qrLabel, { color: BRAND_GREEN, marginTop: 2 }]}>{verifyUrl}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerTitle}>Verification Record</Text>
          <View style={s.row}><Text style={s.rowLabel}>Method</Text><Text style={s.rowValue}>{['gold', 'diamond', 'platinum'].includes(receipt.receipt_type) ? 'QR Code / Website Search' : 'Website Search'}</Text></View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Status</Text>
            <Text style={s.verifiedStatus}>VERIFIED VIA DATABASE</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Powered by</Text>
            <Text style={s.poweredBy}>DigitalReceipt.ng</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const admin = createAdminClient()
  const { data: receipt, error } = await admin
    .from('receipts')
    .select('*, items:receipt_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !receipt) return new NextResponse('Not found', { status: 404 })

  // Sub-account logo takes priority over profile logo
  let sellerLogoUrl: string | null = null
  if (receipt.sub_account_id) {
    const { data: sub } = await admin
      .from('user_sub_accounts')
      .select('logo_url')
      .eq('id', receipt.sub_account_id)
      .maybeSingle()
    sellerLogoUrl = sub?.logo_url ?? null
  }
  if (!sellerLogoUrl) {
    const { data: profile } = await admin
      .from('profiles')
      .select('logo_url')
      .eq('id', receipt.user_id)
      .maybeSingle()
    sellerLogoUrl = profile?.logo_url ?? null
  }

  // Accept ?size=A4|LETTER|LEGAL|A5 — defaults to A4
  const rawSize = (req.nextUrl.searchParams.get('size') ?? 'A4').toUpperCase()
  const size: PaperSize = PAPER_SIZES.includes(rawSize as PaperSize) ? (rawSize as PaperSize) : 'A4'

  const buffer = await renderToBuffer(<ReceiptPDF receipt={receipt} size={size} sellerLogoUrl={sellerLogoUrl} />)

  // ?print=1 → serve inline so the browser opens the PDF viewer for printing
  const isPrint = req.nextUrl.searchParams.get('print') === '1'
  const disposition = isPrint
    ? `inline; filename="receipt-${receipt.receipt_number}.pdf"`
    : `attachment; filename="receipt-${receipt.receipt_number}.pdf"`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
    },
  })
}
