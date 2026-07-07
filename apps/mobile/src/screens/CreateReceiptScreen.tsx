import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Share,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Profile, DraftItem } from '../types'
import BackRow from '../components/BackRow'

const G = '#1a3728'

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Check your internet connection and try again.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Cheque', 'Online', 'Crypto', 'Other']

const RECEIPT_TYPES = [
  {
    key: 'silver',
    name: 'Silver Receipt',
    price: 'Free',
    sub: '5 free/month · ₦100 per receipt after',
    features: ['Search-verifiable via receipt number or unique ID'],
    color: '#6b7280',
  },
  {
    key: 'gold',
    name: 'Gold Receipt',
    price: '₦200',
    sub: 'per receipt',
    features: [
      'Search-verifiable via receipt number or unique ID',
      'QR code + tamper-proof verification',
      '5 years active QR code',
    ],
    color: '#ca8a04',
  },
  {
    key: 'diamond',
    name: 'Diamond Receipt',
    price: '₦500',
    sub: 'per receipt',
    features: [
      'Search-verifiable via receipt number or unique ID',
      'QR code + tamper-proof verification',
      'Forever active QR code',
    ],
    color: '#0ea5e9',
  },
  {
    key: 'platinum',
    name: 'Platinum Receipt',
    price: '₦1,000',
    sub: 'per receipt',
    features: [
      'QR code + tamper-proof verification',
      'Searchable with identifier',
      'Photo attachment support',
      'Forever active QR code',
    ],
    color: '#7c3aed',
  },
]

function Field({ label, required, ...props }: { label: string; required?: boolean; [k: string]: any }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}{required && <Text style={{ color: '#dc2626' }}> *</Text>}</Text>
      <TextInput
        style={[s.input, props.multiline && { height: 80, textAlignVertical: 'top' }]}
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        {...props}
      />
    </View>
  )
}

export default function CreateReceiptScreen({ navigation }: any) {
  const [step, setStep] = useState(0)
  const [receiptType, setReceiptType] = useState('silver')

  // Customer details
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [sendSms, setSendSms] = useState(false)
  const [sendEmail, setSendEmail] = useState(false)

  // Transaction details
  const [currency] = useState('NGN')
  const [txnDate, setTxnDate] = useState(new Date().toLocaleDateString('en-GB').replace(/\//g, '/'))
  const [paymentMethod, setPaymentMethod] = useState('')
  const [refNo, setRefNo] = useState('')
  const [notes, setNotes] = useState('')

  // Items
  const [items, setItems] = useState<DraftItem[]>([{ description: '', quantity: '1', unit_price: '0.00' }])
  const [discount, setDiscount] = useState('0.00')
  const [vat, setVat] = useState('0')
  const [amountPaid, setAmountPaid] = useState('0.00')

  // Result
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  function updateItem(i: number, field: keyof DraftItem, val: string) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0)
  const discountAmt = parseFloat(discount) || 0
  const vatRate = parseFloat(vat) || 0
  const vatAmt = (subtotal - discountAmt) * vatRate / 100
  const total = Math.max(0, subtotal - discountAmt + vatAmt)

  function canProceed() {
    if (step === 0) return !!receiptType
    if (step === 1) return buyerName.trim().length > 0 && buyerPhone.trim().length > 0
    if (step === 2) return paymentMethod.length > 0
    return true
  }

  async function handleSubmit() {
    if (items.some(it => !it.description.trim())) {
      return Alert.alert('Required', 'Fill in all item descriptions')
    }
    const paid = parseFloat(amountPaid)
    if (!amountPaid.trim() || isNaN(paid) || paid <= 0) {
      return Alert.alert('Required', 'Amount paid is required.')
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        Alert.alert('Not logged in', 'You must be logged in to generate a receipt. Please go back and log in again.')
        return
      }

      const dateISO = (() => {
        const parts = txnDate.split('/')
        if (parts.length === 3) {
          const [d, m, y] = parts
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        }
        return new Date().toISOString().slice(0, 10)
      })()

      const receiptItems = items.map((it, i) => ({
        description: it.description.trim(),
        quantity: parseFloat(it.quantity) || 1,
        unit_price: parseFloat(it.unit_price) || 0,
        total_price: (parseFloat(it.quantity) || 1) * (parseFloat(it.unit_price) || 0),
        sort_order: i,
      }))

      const body = {
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        buyer_email: buyerEmail.trim() || undefined,
        buyer_address: buyerAddress.trim() || undefined,
        transaction_date: dateISO,
        payment_method: paymentMethod,
        reference_number: refNo.trim() || undefined,
        notes: notes.trim() || undefined,
        subtotal,
        discount: discountAmt,
        tax: vatAmt,
        total_amount: total,
        amount_paid: parseFloat(amountPaid) || total,
        currency,
        receipt_type: receiptType,
        send_sms: sendSms,
        send_email: sendEmail,
        items: receiptItems,
      }

      const res = await fetchWithTimeout('https://www.digitalreceipt.ng/api/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(`[${res.status}] ${data.error || 'Failed to create receipt'}`)
      setResult(data.receipt)
      setStep(4)
    } catch (err: any) {
      Alert.alert('Receipt Error', err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 0: Receipt type ──
  if (step === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f0f5f2' }}>
        <BackRow navigation={navigation} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 }}>
          <Text style={s.stepTitle}>Choose receipt type</Text>
          <Text style={s.stepSub}>Select the type of receipt you want to generate.</Text>
          {RECEIPT_TYPES.map(rt => (
            <TouchableOpacity
              key={rt.key}
              style={[s.typeCard, receiptType === rt.key && { borderColor: rt.color, borderWidth: 2 }]}
              onPress={() => setReceiptType(rt.key)}
              activeOpacity={0.85}
            >
              <View style={s.typeTop}>
                <View style={[s.typeRadio, receiptType === rt.key && { borderColor: rt.color }]}>
                  {receiptType === rt.key && <View style={[s.typeRadioInner, { backgroundColor: rt.color }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.typeName, { color: rt.color }]}>{rt.name}</Text>
                  <Text style={s.typePriceLine}>
                    <Text style={s.typePrice}>{rt.price}</Text>
                    {'  '}<Text style={s.typeSub}>{rt.sub}</Text>
                  </Text>
                </View>
              </View>
              {rt.features.map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <Text style={[s.featureDot, { color: rt.color }]}>·</Text>
                  <Text style={s.featureText}>{f}</Text>
                </View>
              ))}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={s.fixedNav}>
          <TouchableOpacity style={[s.continueBtn, { flex: 1 }]} onPress={() => setStep(1)}>
            <Text style={s.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Step 1: Customer details ──
  if (step === 1) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: '#f0f5f2' }}>
          <BackRow navigation={navigation} />
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 }}>
            <Text style={s.stepTitle}>Customer details</Text>
            <Text style={s.stepSub}>Who is this receipt being issued to?</Text>
            <View style={s.card}>
              <Field label="Customer's name" required value={buyerName} onChangeText={setBuyerName} placeholder="Full name" autoCapitalize="words" />
              <Field label="Customer's phone number" required value={buyerPhone} onChangeText={setBuyerPhone} placeholder="Customer's phone number" keyboardType="phone-pad" autoCapitalize="none" />
              <TouchableOpacity style={s.checkRow} onPress={() => setSendSms(v => !v)} activeOpacity={0.7}>
                <View style={[s.checkbox, sendSms && s.checkboxChecked]}>
                  {sendSms && <Text style={s.checkMark}>✓</Text>}
                </View>
                <Text style={s.checkLabel}>Automatically send receipt to this phone number via SMS</Text>
              </TouchableOpacity>
              <Field label="Customer's email address" value={buyerEmail} onChangeText={setBuyerEmail} placeholder="buyer@example.com" keyboardType="email-address" />
              <TouchableOpacity style={s.checkRow} onPress={() => setSendEmail(v => !v)} activeOpacity={0.7}>
                <View style={[s.checkbox, sendEmail && s.checkboxChecked]}>
                  {sendEmail && <Text style={s.checkMark}>✓</Text>}
                </View>
                <Text style={s.checkLabel}>Automatically send receipt to this email</Text>
              </TouchableOpacity>
              <Field label="Customer's address" value={buyerAddress} onChangeText={setBuyerAddress} placeholder="Street, City, State" autoCapitalize="words" />
            </View>
          </ScrollView>
          <View style={s.fixedNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(0)}>
              <Text style={s.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.continueBtn, { flex: 1, marginLeft: 10 }, !canProceed() && s.btnDisabled]} onPress={() => canProceed() && setStep(2)} disabled={!canProceed()}>
              <Text style={s.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    )
  }

  // ── Step 2: Transaction details ──
  if (step === 2) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: '#f0f5f2' }}>
          <BackRow navigation={navigation} />
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 }}>
            <Text style={s.stepTitle}>Transaction details</Text>
            <Text style={s.stepSub}>When and how was payment received?</Text>
            <View style={s.card}>
              <Text style={s.label}>Currency <Text style={{ color: '#dc2626' }}>*</Text></Text>
              <View style={[s.input, { justifyContent: 'center', marginBottom: 14 }]}>
                <Text style={{ color: '#111827', fontSize: 14 }}>₦ — Nigerian Naira</Text>
              </View>
              <Field label="Transaction date" required value={txnDate} onChangeText={setTxnDate} placeholder="DD/MM/YYYY" keyboardType="numeric" />
              <Text style={s.label}>Payment method <Text style={{ color: '#dc2626' }}>*</Text></Text>
              <View style={s.pillsWrap}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity key={m} style={[s.pill, paymentMethod === m && s.pillActive]} onPress={() => setPaymentMethod(m)}>
                    <Text style={[s.pillText, paymentMethod === m && s.pillTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Field label="Reference number" value={refNo} onChangeText={setRefNo} placeholder="e.g. TRF-2026-001" />
              <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Any additional notes…" multiline />
            </View>
          </ScrollView>
          <View style={s.fixedNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)}>
              <Text style={s.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.continueBtn, { flex: 1, marginLeft: 10 }, !canProceed() && s.btnDisabled]} onPress={() => canProceed() && setStep(3)} disabled={!canProceed()}>
              <Text style={s.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    )
  }

  // ── Step 3: Items & amounts ──
  if (step === 3) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: '#f0f5f2' }}>
          <BackRow navigation={navigation} />
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 }}>
            <Text style={s.stepTitle}>Items & amounts</Text>
            <Text style={s.stepSub}>List goods or services provided. All amounts in Nigerian Naira.</Text>
            <View style={s.card}>
              {/* Table header */}
              <View style={s.tableHeader}>
                <Text style={[s.tableHead, { flex: 3 }]}>Description</Text>
                <Text style={[s.tableHead, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                <Text style={[s.tableHead, { flex: 2, textAlign: 'right' }]}>Unit Price</Text>
                <Text style={[s.tableHead, { flex: 2, textAlign: 'right' }]}>Total</Text>
              </View>
              {items.map((it, i) => {
                const rowTotal = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)
                return (
                  <View key={i} style={[s.tableRow, i % 2 === 1 && { backgroundColor: '#f9fafb' }]}>
                    <TextInput
                      style={[s.tableInput, { flex: 3 }]}
                      value={it.description}
                      onChangeText={v => updateItem(i, 'description', v)}
                      placeholder="Item description"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="sentences"
                    />
                    <TextInput
                      style={[s.tableInput, { flex: 1, textAlign: 'center' }]}
                      value={it.quantity}
                      onChangeText={v => updateItem(i, 'quantity', v)}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#9ca3af"
                      selectTextOnFocus
                    />
                    <TextInput
                      style={[s.tableInput, { flex: 2, textAlign: 'right' }]}
                      value={it.unit_price}
                      onChangeText={v => updateItem(i, 'unit_price', v)}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#9ca3af"
                      selectTextOnFocus
                    />
                    <View style={{ flex: 2, justifyContent: 'center', alignItems: 'flex-end', paddingLeft: 4 }}>
                      <Text style={s.tableTotal}>₦{rowTotal.toFixed(2)}</Text>
                      {i > 0 && (
                        <TouchableOpacity onPress={() => setItems(prev => prev.filter((_, x) => x !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={s.removeText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )
              })}
              <TouchableOpacity style={s.addItemBtn} onPress={() => setItems(p => [...p, { description: '', quantity: '1', unit_price: '0.00' }])}>
                <Text style={s.addItemText}>Add item</Text>
              </TouchableOpacity>

              {/* Totals */}
              <View style={s.divider} />
              <SummaryRow label="Subtotal" value={`₦${subtotal.toFixed(2)}`} />
              <View style={s.inlineRow}>
                <Text style={s.label}>Discount</Text>
                <TextInput style={s.smallInput} value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholderTextColor="#9ca3af" />
              </View>
              <View style={s.inlineRow}>
                <Text style={s.label}>VAT (%)</Text>
                <TextInput style={s.smallInput} value={vat} onChangeText={setVat} keyboardType="numeric" placeholderTextColor="#9ca3af" />
              </View>
              <SummaryRow label="TOTAL" value={`₦${total.toFixed(2)}`} bold />
              <View style={s.inlineRow}>
                <Text style={s.label}>Amount Paid <Text style={{ color: '#dc2626' }}>*</Text></Text>
                <TextInput style={s.smallInput} value={amountPaid} onChangeText={setAmountPaid} keyboardType="decimal-pad" placeholderTextColor="#9ca3af" selectTextOnFocus />
              </View>
              {(() => {
                const paid = parseFloat(amountPaid) || 0
                if (paid <= 0 || paid === total) return null
                const diff = Math.abs(total - paid)
                const isOutstanding = paid < total
                return (
                  <View style={[s.balanceBanner, { backgroundColor: isOutstanding ? '#fff7ed' : '#f0f5f2', borderColor: isOutstanding ? '#f97316' : '#1a3728' }]}>
                    <Text style={[s.balanceLabel, { color: isOutstanding ? '#c2410c' : '#1a3728' }]}>
                      {isOutstanding ? '⚠ Outstanding Balance' : '✓ Overpaid'}
                    </Text>
                    <Text style={[s.balanceAmt, { color: isOutstanding ? '#c2410c' : '#1a3728' }]}>
                      ₦{diff.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )
              })()}
            </View>

          </ScrollView>
          <View style={s.fixedNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)}>
              <Text style={s.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.continueBtn, { flex: 1, marginLeft: 10 }, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.continueBtnText}>Generate Receipt</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    )
  }

  // ── Step 4: Success ──
  if (step === 4 && result) {
    const verifyUrl = `https://www.digitalreceipt.ng/r/${result.unique_identifier || result.receipt_number}`
    return (
      <View style={{ flex: 1, backgroundColor: '#f0f5f2' }}>
        <BackRow navigation={navigation} />
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48, alignItems: 'center' }}>
          <View style={s.successIcon}>
            <Text style={{ fontSize: 36 }}>✓</Text>
          </View>
          <Text style={s.successTitle}>Receipt Generated</Text>
          <Text style={s.successSub}>Stored securely and ready to share.</Text>

          <View style={s.resultCard}>
            <ResultRow label="Receipt No." value={result.receipt_number} />
            <ResultRow label="Verification Code" value={result.unique_identifier} />
            <ResultRow label="Verify URL" value={verifyUrl} small />
          </View>

          <TouchableOpacity style={s.actionBtn} onPress={() => Share.share({ message: `Verify your receipt at: ${verifyUrl}` })}>
            <Text style={s.actionBtnText}>Download PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#f3f4f6' }]} onPress={() => Share.share({ message: `Verify your receipt at: ${verifyUrl}` })}>
            <Text style={[s.actionBtnText, { color: '#1a3728' }]}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('ReceiptDetail', { receipt: result })}>
            <Text style={s.actionBtnText}>View Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#1a3728' }]} onPress={() => {
            setStep(0)
            setReceiptType('silver')
            setBuyerName(''); setBuyerPhone(''); setBuyerEmail(''); setBuyerAddress('')
            setPaymentMethod(''); setRefNo(''); setNotes('')
            setItems([{ description: '', quantity: '1', unit_price: '0.00' }])
            setDiscount('0.00'); setVat('0'); setAmountPaid('0.00')
            setResult(null)
          }}>
            <Text style={[s.actionBtnText, { color: '#1a3728' }]}>Generate Another</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  return null
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={[{ fontSize: 13, color: '#6b7280' }, bold && { fontWeight: '800', color: '#111827', fontSize: 15 }]}>{label}</Text>
      <Text style={[{ fontSize: 13, color: '#111827', fontWeight: '600' }, bold && { fontWeight: '800', color: '#1a3728', fontSize: 15 }]}>{value}</Text>
    </View>
  )
}

function ResultRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: small ? 12 : 16, fontWeight: '700', color: '#111827', marginTop: 2 }}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  stepSub: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 11, fontSize: 14, color: '#111827', backgroundColor: '#fafafa' },

  // Receipt type cards
  typeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: '#e5e7eb' },
  typeTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  typeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  typeRadioInner: { width: 10, height: 10, borderRadius: 5 },
  typeName: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  typePriceLine: { fontSize: 13 },
  typePrice: { fontSize: 15, fontWeight: '800', color: '#111827' },
  typeSub: { fontSize: 12, color: '#6b7280' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 32, marginBottom: 3 },
  featureDot: { fontSize: 18, lineHeight: 20, marginRight: 6, fontWeight: '900' },
  featureText: { fontSize: 13, color: '#374151', flex: 1 },

  // Checkbox
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, marginTop: -6 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1, backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: '#1a3728', borderColor: '#1a3728' },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '800' },
  checkLabel: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 18 },

  // Payment pills
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb' },
  pillActive: { backgroundColor: '#1a3728', borderColor: '#1a3728' },
  pillText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  pillTextActive: { color: '#fff', fontWeight: '700' },

  // Table
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 8, marginBottom: 6 },
  tableHead: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  tableInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, fontSize: 13, color: '#111827', backgroundColor: '#fafafa' },
  tableTotal: { fontSize: 13, color: '#111827', fontWeight: '600' },
  removeText: { fontSize: 18, color: '#dc2626', fontWeight: '700', marginTop: 2 },
  addItemBtn: { borderWidth: 1.5, borderColor: '#1a3728', borderStyle: 'dashed', borderRadius: 10, padding: 10, alignItems: 'center', marginVertical: 8 },
  addItemText: { color: '#1a3728', fontWeight: '700', fontSize: 14 },
  divider: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginVertical: 10 },
  inlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  smallInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, width: 90, fontSize: 14, color: '#111827', textAlign: 'right', backgroundColor: '#fafafa' },

  // Balance banner
  balanceBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4 },
  balanceLabel: { fontSize: 13, fontWeight: '700' },
  balanceAmt: { fontSize: 15, fontWeight: '800' },

  // Navigation
  fixedNav: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: '#f0f5f2', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  continueBtn: { backgroundColor: '#1a3728', borderRadius: 12, padding: 15, alignItems: 'center' },
  continueBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  backBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 15, paddingHorizontal: 20, alignItems: 'center' },
  backBtnText: { color: '#374151', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },

  // Success
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#c8ddd1', alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginTop: 8 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
  successSub: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  resultCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, width: '100%', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  actionBtn: { backgroundColor: '#1a3728', borderRadius: 12, padding: 15, alignItems: 'center', width: '100%', marginBottom: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
