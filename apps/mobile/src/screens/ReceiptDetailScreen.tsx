import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share,
  ActivityIndicator, Alert, Image, Linking, Modal,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Receipt } from '../types'
import { formatAmount, formatDate, formatDateTime } from '../lib/formatters'

const GREEN = '#1a3728'

export default function ReceiptDetailScreen({ route, navigation }: any) {
  const [receipt, setReceipt] = useState<Receipt>(route.params.receipt)
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showPrintMenu, setShowPrintMenu] = useState(false)

  useEffect(() => {
    supabase
      .from('receipts')
      .select('*, items:receipt_items(*), businesses(*)')
      .eq('id', receipt.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setReceipt(data)
          setBusiness(data.businesses)
        }
      })
  }, [])

  const verifyUrl = `https://www.digitalreceipt.ng/r/${receipt.unique_identifier}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}`
  const currency = receipt.currency ?? 'NGN'
  const isActive = receipt.status === 'active'

  async function copyLink() {
    await Share.share({ message: verifyUrl })
  }

  async function viewPublic() {
    Linking.openURL(verifyUrl)
  }

  async function emailReceipt() {
    const body = buildTextReceipt()
    Linking.openURL(`mailto:${receipt.buyer_email || ''}?subject=Your Receipt ${receipt.receipt_number}&body=${encodeURIComponent(body)}`)
  }

  async function smsReceipt() {
    const body = buildTextReceipt()
    Linking.openURL(`sms:${receipt.buyer_phone || ''}?body=${encodeURIComponent(body)}`)
  }

  async function downloadPDF() {
    const text = buildTextReceipt()
    await Share.share({ message: text, title: `Receipt ${receipt.receipt_number}` })
  }

  function buildTextReceipt() {
    const biz = business
    const lines = [
      biz?.name ? `${biz.name}` : receipt.seller_name || '',
      biz?.address || '',
      biz?.phone ? `Phone: ${biz.phone}` : '',
      biz?.email ? `Email: ${biz.email}` : '',
      '',
      '─────────────────────────',
      'VERIFIED DIGITAL RECEIPT',
      '─────────────────────────',
      `Receipt No: ${receipt.receipt_number}`,
      `Verification Code: ${receipt.unique_identifier}`,
      `Date: ${formatDate(receipt.transaction_date)}`,
      `Payment: ${receipt.payment_method || ''}`,
      '',
      'ISSUED TO',
      receipt.buyer_name || '',
      receipt.buyer_phone ? `Phone: ${receipt.buyer_phone}` : '',
      receipt.buyer_email ? `Email: ${receipt.buyer_email}` : '',
      '',
      'ITEMS',
      ...(receipt.items || []).map((it: any) =>
        `${it.description}  x${it.quantity}  ₦${parseFloat(it.unit_price).toLocaleString()}  = ₦${parseFloat(it.total_price).toLocaleString()}`
      ),
      '',
      `TOTAL: ${formatAmount(receipt.total_amount, currency)}`,
      '',
      `Verify: ${verifyUrl}`,
      'Powered by DigitalReceipt.ng',
    ].filter(l => l !== undefined).join('\n')
    return lines
  }

  async function handleCancel() {
    Alert.alert('Cancel Receipt', 'Are you sure you want to cancel this receipt?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel', style: 'destructive',
        onPress: async () => {
          setLoading(true)
          const { error } = await supabase.from('receipts').update({ status: 'cancelled' }).eq('id', receipt.id)
          setLoading(false)
          if (error) return Alert.alert('Error', error.message)
          setReceipt(prev => ({ ...prev, status: 'cancelled' }))
        },
      },
    ])
  }

  const subtotal = (receipt.items || []).reduce((s: number, it: any) => s + parseFloat(it.total_price || 0), 0)
  const amountPaid = parseFloat((receipt as any).amount_paid || receipt.total_amount || 0)
  const outstanding = receipt.total_amount - amountPaid
  const hasOutstanding = outstanding > 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Back button */}
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>‹</Text>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.actionsGrid}>
        <ActionBtn icon="🔗" label="Copy link" onPress={copyLink} />
        <ActionBtn icon="↗" label="View public" onPress={viewPublic} />
        <ActionBtn icon="✉️" label="Email receipt" onPress={emailReceipt} />
        <ActionBtn icon="💬" label="SMS receipt" onPress={smsReceipt} />
        <ActionBtn icon="⬇" label="Download PDF" onPress={downloadPDF} dark />
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPrintMenu(true)}>
          <Text style={styles.actionIcon}>🖨</Text>
          <Text style={styles.actionLabel}>Print  ▾</Text>
        </TouchableOpacity>
        <ActionBtn icon="⇆" label="Merge to receipt" onPress={() => Alert.alert('Merge', 'Coming soon.')} />
        <ActionBtn icon="📁" label="Add to Group" onPress={() => Alert.alert('Group', 'Coming soon.')} />
      </View>

      {/* Receipt type + meta */}
      <View style={styles.metaCard}>
        {receipt.receipt_type && (
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Receipt Type</Text>
            <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{receipt.receipt_type}</Text></View>
          </View>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.metaKey}>Receipt Number</Text>
          <Text style={styles.metaMono}>{receipt.receipt_number}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaKey}>Verification Code</Text>
          <Text style={styles.metaMono}>{receipt.unique_identifier}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaKey}>Verify URL</Text>
          <Text style={styles.metaUrl} numberOfLines={1}>{verifyUrl}</Text>
        </View>
      </View>

      {/* Verified receipt card */}
      <View style={styles.receiptCard}>
        {/* Header */}
        <View style={styles.rcptHeader}>
          {/* Top row: logo + business name */}
          <View style={styles.rcptHeaderTop}>
            {business?.logo_url ? (
              <Image source={{ uri: business.logo_url }} style={styles.bizLogo} />
            ) : (
              <View style={styles.bizLogoPlaceholder}><Text style={{ color: GREEN, fontWeight: '800', fontSize: 18 }}>D</Text></View>
            )}
            <Text style={styles.rcptBizName}>{business?.name || receipt.seller_name || 'Business'}</Text>
          </View>
          {/* Bottom row: VERIFIED RECEIPT + checkmark */}
          <View style={styles.rcptHeaderBottom}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rcptVerifiedTitle}>VERIFIED RECEIPT</Text>
              <Text style={styles.rcptVerifiedSub}>Authenticated via DigitalReceipt.ng</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedCheck}>✓</Text>
            </View>
          </View>
        </View>

        {/* Issued By */}
        <Section title="ISSUED BY">
          <Text style={styles.secBoldVal}>{business?.name || receipt.seller_name}</Text>
          {business?.rc_number ? <Text style={styles.secVal}>RC Number: {business.rc_number}</Text> : null}
          {business?.phone ? <Text style={styles.secVal}>Phone: {business.phone}</Text> : null}
          {business?.email ? <Text style={styles.secVal}>Email: {business.email}</Text> : null}
          {business?.address ? <Text style={styles.secVal}>Address: {business.address}</Text> : null}
          {business?.website ? <Text style={styles.secVal}>Website: {business.website}</Text> : null}
        </Section>

        {/* Issued To */}
        <Section title="ISSUED TO">
          <Text style={styles.secBoldVal}>{receipt.buyer_name}</Text>
          {receipt.buyer_phone ? <Text style={styles.secVal}>Phone: {receipt.buyer_phone}</Text> : null}
          {receipt.buyer_email ? <Text style={styles.secVal}>Email: {receipt.buyer_email}</Text> : null}
          {receipt.buyer_address ? <Text style={styles.secVal}>Address: {receipt.buyer_address}</Text> : null}
        </Section>

        {/* Transaction Details */}
        <Section title="TRANSACTION DETAILS">
          <TxRow label="Receipt No." value={receipt.receipt_number} mono />
          <TxRow label="Verification Code" value={receipt.unique_identifier} mono />
          <TxRow label="Date" value={formatDate(receipt.transaction_date)} />
          <TxRow label="Payment Method" value={receipt.payment_method || '—'} />
          {receipt.reference_number ? <TxRow label="Reference" value={receipt.reference_number} /> : null}
        </Section>

        {/* Items — always shown */}
        <Section title="ITEMS PURCHASED">
          <View style={styles.itemsHeader}>
            <Text style={[styles.itemsHdr, { flex: 2 }]}>Description</Text>
            <Text style={styles.itemsHdr}>Qty</Text>
            <Text style={styles.itemsHdr}>Unit Price</Text>
            <Text style={[styles.itemsHdr, { textAlign: 'right' }]}>Total</Text>
          </View>

          {(!receipt.items || receipt.items.length === 0) ? (
            <View style={styles.itemRow}>
              <Text style={[styles.itemCell, { flex: 2, color: '#9ca3af' }]}>—</Text>
              <Text style={styles.itemCell}>—</Text>
              <Text style={styles.itemCell}>—</Text>
              <Text style={[styles.itemCell, { textAlign: 'right' }]}>{formatAmount(receipt.total_amount, currency)}</Text>
            </View>
          ) : (
            receipt.items.map((it: any, i: number) => (
              <View key={i} style={styles.itemRow}>
                <Text style={[styles.itemCell, { flex: 2 }]}>{it.description}</Text>
                <Text style={styles.itemCell}>{it.quantity}</Text>
                <Text style={styles.itemCell}>{formatAmount(it.unit_price, currency)}</Text>
                <Text style={[styles.itemCell, { textAlign: 'right', fontWeight: '700' }]}>{formatAmount(it.total_price, currency)}</Text>
              </View>
            ))
          )}

          <View style={styles.itemsDivider} />
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalVal}>{formatAmount(subtotal || receipt.total_amount, currency)}</Text>
          </View>
          {receipt.discount > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Discount</Text>
              <Text style={[styles.subtotalVal, { color: '#dc2626' }]}>−{formatAmount(receipt.discount, currency)}</Text>
            </View>
          )}
          {(receipt as any).vat_amount > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>VAT</Text>
              <Text style={styles.subtotalVal}>{formatAmount((receipt as any).vat_amount, currency)}</Text>
            </View>
          )}
          <View style={styles.totalAmtRow}>
            <Text style={styles.totalAmtLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.totalAmtVal}>{formatAmount(receipt.total_amount, currency)}</Text>
          </View>
          <View style={[styles.subtotalRow, { marginTop: 6 }]}>
            <Text style={styles.subtotalLabel}>Total Amount Paid</Text>
            <Text style={[styles.subtotalVal, { color: GREEN, fontWeight: '700' }]}>{formatAmount(amountPaid, currency)}</Text>
          </View>
          {hasOutstanding && (
            <View style={styles.outstandingRow}>
              <Text style={styles.outstandingLabel}>Outstanding Balance</Text>
              <Text style={styles.outstandingVal}>{formatAmount(outstanding, currency)}</Text>
            </View>
          )}
        </Section>

        {/* Payment status */}
        <View style={[styles.paidBanner, hasOutstanding && styles.outstandingBanner]}>
          <Text style={[styles.paidText, hasOutstanding && styles.outstandingBannerText]}>
            {hasOutstanding ? `⚠  OUTSTANDING: ${formatAmount(outstanding, currency)}` : '✓  FULLY PAID'}
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrWrap}>
          <Image source={{ uri: qrUrl }} style={styles.qrCode} />
          <Text style={styles.qrHint}>Scan to verify this receipt online</Text>
        </View>

        {/* Verification Record */}
        <Section title="VERIFICATION RECORD">
          <TxRow label="Method" value="Website Search" />
          <TxRow label="Status" value="VERIFIED VIA DATABASE" valueStyle={{ color: GREEN, fontWeight: '800' }} />
          <TxRow label="Verified at" value={formatDateTime ? formatDateTime(receipt.created_at) : formatDate(receipt.created_at)} />
          <TxRow label="Powered by" value="DigitalReceipt.ng" valueStyle={{ color: GREEN, fontWeight: '700' }} />
        </Section>
      </View>


      {/* Print menu */}
      <Modal visible={showPrintMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.printOverlay} onPress={() => setShowPrintMenu(false)}>
          <View style={styles.printMenu}>
            <TouchableOpacity style={styles.printOption} onPress={() => { setShowPrintMenu(false); downloadPDF() }}>
              <Text style={styles.printOptionText}>Print as PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.printOption} onPress={() => { setShowPrintMenu(false); Alert.alert('Print', 'Connect to a printer to print.') }}>
              <Text style={styles.printOptionText}>Print via Bluetooth</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  )
}

function ActionBtn({ icon, label, onPress, dark }: { icon: string; label: string; onPress: () => void; dark?: boolean }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, dark && styles.actionBtnDark]} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, dark && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function TxRow({ label, value, mono, valueStyle }: { label: string; value: string; mono?: boolean; valueStyle?: any }) {
  return (
    <View style={styles.txRow}>
      <Text style={styles.txLabel}>{label}</Text>
      <Text style={[styles.txVal, mono && { fontFamily: 'monospace' }, valueStyle]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  backRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f5f5f5' },
  backArrow: { fontSize: 26, color: '#1a3728', marginRight: 4, lineHeight: 28 },
  backText: { fontSize: 15, color: '#1a3728', fontWeight: '600' },
  // Action grid
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  actionBtn: { width: '47%', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, backgroundColor: '#fff', gap: 8 },
  actionBtnDark: { backgroundColor: GREEN, borderColor: GREEN },
  actionIcon: { fontSize: 16 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 },
  // Meta card
  metaCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  metaKey: { fontSize: 13, color: '#6b7280' },
  metaMono: { fontSize: 13, fontWeight: '700', color: '#111827', fontFamily: 'monospace' },
  metaUrl: { fontSize: 11, color: GREEN, flex: 1, textAlign: 'right' },
  typeBadge: { backgroundColor: '#f0f5f2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: '#c8ddd1' },
  typeBadgeText: { fontSize: 12, fontWeight: '700', color: GREEN },
  // Receipt card
  receiptCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 12, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  rcptHeader: { backgroundColor: GREEN, padding: 20, paddingBottom: 20 },
  rcptHeaderTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rcptHeaderBottom: { flexDirection: 'row', alignItems: 'flex-start' },
  bizLogo: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#fff', marginRight: 12 },
  bizLogoPlaceholder: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rcptBizName: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1 },
  verifiedBadge: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  verifiedCheck: { color: '#fff', fontSize: 20, fontWeight: '800' },
  rcptVerifiedTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  rcptVerifiedSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  // Sections
  section: { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#9a7c3f', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  secBoldVal: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 },
  secVal: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  txLabel: { fontSize: 13, color: '#6b7280', flex: 1 },
  txVal: { fontSize: 13, color: '#111827', fontWeight: '600', textAlign: 'right', flex: 1 },
  // Items table
  itemsHeader: { flexDirection: 'row', marginBottom: 8 },
  itemsHdr: { flex: 1, fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  itemCell: { flex: 1, fontSize: 13, color: '#374151' },
  itemsDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  subtotalLabel: { fontSize: 13, color: '#6b7280' },
  subtotalVal: { fontSize: 13, color: '#111827', fontWeight: '600' },
  totalAmtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  totalAmtLabel: { fontSize: 14, fontWeight: '800', color: '#111827' },
  totalAmtVal: { fontSize: 20, fontWeight: '900', color: '#111827' },
  // Paid banner
  paidBanner: { backgroundColor: '#f0f5f2', padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#c8ddd1' },
  paidText: { fontSize: 15, fontWeight: '800', color: GREEN, letterSpacing: 1 },
  outstandingBanner: { backgroundColor: '#fff7ed', borderTopColor: '#fed7aa' },
  outstandingBannerText: { color: '#c2410c' },
  outstandingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#fee2e2', backgroundColor: '#fff5f5', borderRadius: 8, paddingHorizontal: 8, paddingBottom: 8 },
  outstandingLabel: { fontSize: 14, fontWeight: '800', color: '#dc2626' },
  outstandingVal: { fontSize: 16, fontWeight: '900', color: '#dc2626' },
  // QR
  qrWrap: { alignItems: 'center', padding: 24, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  qrCode: { width: 160, height: 160, borderRadius: 8 },
  qrHint: { fontSize: 12, color: '#9ca3af', marginTop: 12 },
  // Cancel
  cancelBtn: { borderWidth: 1.5, borderColor: '#dc2626', margin: 12, borderRadius: 14, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  // Print
  printOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  printMenu: { backgroundColor: '#fff', borderRadius: 14, padding: 8, width: 220 },
  printOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  printOptionText: { fontSize: 15, color: '#111827' },
})
