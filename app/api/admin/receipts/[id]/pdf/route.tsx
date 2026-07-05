import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'
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
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReceiptPDF({ receipt, issuedByStaffName }: { receipt: any; issuedByStaffName?: string | null }) {
  const items = receipt.items ?? []
  const verifyUrl = `${APP_URL}/r/${receipt.unique_identifier}`
  const colLabels = receipt.column_labels ?? {}
  const qtyLabel = colLabels.qty || 'Qty'
  const priceLabel = colLabels.price || 'Unit'
  const showQr = ['gold', 'diamond', 'platinum'].includes(receipt.receipt_type)

  return (
    <Document title={`Receipt ${receipt.receipt_number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.logoRow}>
            <Image src={LOGO_URL} style={s.logoImg} />
            <Text style={s.logoText}>DigitalReceipt.ng</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.verifiedLabel}>VERIFIED RECEIPT</Text>
              <Text style={s.verifiedSub}>Authenticated via DigitalReceipt.ng</Text>
            </View>
            <View style={s.badge}><Text style={s.badgeText}>✓</Text></View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Issued by</Text>
          <Text style={s.bold}>{receipt.seller_name}</Text>
          {receipt.seller_phone && <Text style={s.detail}>{receipt.seller_phone}</Text>}
          {receipt.seller_address && <Text style={s.detail}>{receipt.seller_address}</Text>}
          {receipt.seller_rc_number && <Text style={s.detail}>RC: {receipt.seller_rc_number}</Text>}
          {issuedByStaffName && <Text style={[s.detail, { marginTop: 4 }]}>Prepared by: {issuedByStaffName}</Text>}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Issued to</Text>
          <Text style={s.bold}>{receipt.buyer_name}</Text>
          {receipt.buyer_phone && <Text style={s.detail}>{receipt.buyer_phone}</Text>}
        </View>

        <View style={s.section}>
          <View style={s.row}><Text style={s.rowLabel}>Receipt No.</Text><Text style={[s.rowValue, { fontFamily: 'Helvetica-Bold' }]}>{receipt.receipt_number}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Date</Text><Text style={s.rowValue}>{fmtDate(receipt.transaction_date)}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Payment method</Text><Text style={s.rowValue}>{receipt.payment_method}</Text></View>
          {receipt.reference_number && <View style={s.row}><Text style={s.rowLabel}>Reference</Text><Text style={s.rowValue}>{receipt.reference_number}</Text></View>}
        </View>

        <View style={{ padding: '10 20', borderBottom: `1 solid ${BORDER}` }}>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadText, { flex: 3 }]}>Description</Text>
            <Text style={[s.tableHeadText, { flex: 1, textAlign: 'right' }]}>{qtyLabel}</Text>
            <Text style={[s.tableHeadText, { flex: 2, textAlign: 'right' }]}>{priceLabel}</Text>
            <Text style={[s.tableHeadText, { flex: 2, textAlign: 'right' }]}>Total</Text>
          </View>
          {items.map((item: any, i: number) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 3 }]}>{item.description}</Text>
              <Text style={[s.tableCell, { flex: 1, textAlign: 'right', color: MUTED }]}>{item.quantity}</Text>
              <Text style={[s.tableCell, { flex: 2, textAlign: 'right', color: MUTED }]}>{fmtNaira(item.unit_price)}</Text>
              <Text style={[s.tableCell, { flex: 2, textAlign: 'right' }]}>{fmtNaira(item.total_price)}</Text>
            </View>
          ))}
          <View style={{ marginTop: 8 }}>
            <View style={s.row}><Text style={s.rowLabel}>Subtotal</Text><Text style={s.rowValue}>{fmtNaira(receipt.subtotal)}</Text></View>
            {receipt.discount > 0 && <View style={s.row}><Text style={s.rowLabel}>Discount</Text><Text style={s.rowValue}>−{fmtNaira(receipt.discount)}</Text></View>}
            {receipt.tax > 0 && <View style={s.row}><Text style={s.rowLabel}>Tax</Text><Text style={s.rowValue}>{fmtNaira(receipt.tax)}</Text></View>}
            <View style={[s.totalsRow, { marginTop: 6, paddingTop: 6, borderTop: `1 solid ${BORDER}` }]}>
              <Text style={s.totalLabel}>TOTAL PAID</Text>
              <Text style={s.totalValue}>{fmtNaira(receipt.total_amount)}</Text>
            </View>
          </View>
        </View>

        {showQr && (
          <View style={s.qrSection}>
            <View style={{ position: 'relative', width: 90, height: 90 }}>
              <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0d6b1e&data=${encodeURIComponent(verifyUrl)}`} style={{ width: 90, height: 90 }} />
              <View style={{ position: 'absolute', top: 33, left: 33, width: 24, height: 24, backgroundColor: '#ffffff', borderRadius: 3, padding: 2, border: '1 solid #d4c5a0', alignItems: 'center', justifyContent: 'center' }}>
                <Image src={LOGO_URL} style={{ width: 20, height: 20, borderRadius: 2 }} />
              </View>
            </View>
            <Text style={s.qrLabel}>Scan to verify this receipt online</Text>
            <Text style={[s.qrLabel, { color: BRAND_GREEN, marginTop: 2 }]}>{verifyUrl}</Text>
          </View>
        )}

        <View style={s.footer}>
          <Text style={s.footerTitle}>Verification Record</Text>
          <View style={s.row}><Text style={s.rowLabel}>Method</Text><Text style={s.rowValue}>{showQr ? 'QR Code / Website Search' : 'Website Search'}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Status</Text><Text style={s.verifiedStatus}>VERIFIED VIA DATABASE</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Powered by</Text><Text style={s.poweredBy}>DigitalReceipt.ng</Text></View>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const admin = await getAdminUser()
  if (!admin) return new NextResponse('Forbidden', { status: 403 })

  const { id } = await params
  const db = createAdminClient()
  const { data: receipt, error } = await db
    .from('receipts')
    .select('*, items:receipt_items(*)')
    .eq('id', id)
    .single()

  if (error || !receipt) return new NextResponse('Not found', { status: 404 })

  let issuedByStaffName: string | null = null
  if (receipt.issued_by_staff_id) {
    const { data: staffMember } = await db
      .from('staff_members')
      .select('display_name, profiles!staff_members_staff_id_fkey(full_name)')
      .eq('staff_id', receipt.issued_by_staff_id)
      .maybeSingle()
    if (staffMember) {
      const profileName = Array.isArray(staffMember.profiles)
        ? (staffMember.profiles[0] as any)?.full_name
        : (staffMember.profiles as any)?.full_name
      issuedByStaffName = staffMember.display_name || profileName || null
    }
  }

  const buffer = await renderToBuffer(<ReceiptPDF receipt={receipt} issuedByStaffName={issuedByStaffName} />)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${receipt.receipt_number}.pdf"`,
    },
  })
}
