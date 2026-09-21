import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const GREEN = '#1a3728'
const TOTAL_STEPS = 4

interface Item { description: string; qty: string; price: string }

const STEP_TITLES = [
  'Business & Client Details',
  'Items & Currency',
  'Payment Details & Notes',
  'Review & Export'
]

function ScreenHeader({ step, title }: { step: number; title: string }) {
  return (
    <View style={styles.stepProgressWrap}>
      <View style={styles.headerRow}>
        <Text style={styles.stepSubTitle}>{title}</Text>
        <Text style={styles.headerStep}>Step {step} of {TOTAL_STEPS}</Text>
      </View>
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[styles.progressSeg, i < step && styles.progressSegActive]} />
        ))}
      </View>
    </View>
  )
}

export default function PublicGenerateScreen({ navigation }: any) {
  const [step, setStep] = useState(1)
  const [sellerName, setSellerName] = useState('')
  const [sellerAddress, setSellerAddress] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [items, setItems] = useState<Item[]>([{ description: '', qty: '1', price: '0' }])
  const [notes, setNotes] = useState('Thank you for your business. We appreciate your trust and look forward to working with you again.')
  const [bankName, setBankName] = useState('')
  const [acctName, setAcctName] = useState('')
  const [acctNo, setAcctNo] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [showCurrencyOptions, setShowCurrencyOptions] = useState(false)
  const CURRENCIES = [
    { code: 'NGN', symbol: '₦', label: 'Nigerian Naira' },
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'GBP', symbol: '£', label: 'British Pound' },
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'GHS', symbol: 'GH₵', label: 'Ghanaian Cedi' },
    { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
    { code: 'ZAR', symbol: 'R', label: 'South African Rand' },
  ]
  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  const [accepted, setAccepted] = useState<string[]>([])
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const PAYMENT_OPTIONS = ['Bank Transfer', 'Cash', 'POS', 'Crypto', 'Cheque']
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<any>(null)
  const [showPdf, setShowPdf] = useState(false)

  const [invoiceNo] = useState(() => 'INV-' + Date.now().toString().slice(-8))
  const today = new Date().toLocaleDateString('en-GB')
  const [invoiceDate, setInvoiceDate] = useState(today)

  function addItem() {
    setItems([...items, { description: '', qty: '1', price: '0' }])
  }

  function updateItem(idx: number, field: keyof Item, val: string) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: val }
    setItems(updated)
  }

  function removeItem(idx: number) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  function getTotal() {
    return items.reduce((sum, it) => {
      return sum + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0)
    }, 0)
  }

  function getItemAmt(it: Item) {
    return (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0)
  }

  function validateCurrentStep() {
    if (step === 1) {
      if (!sellerName.trim()) {
        Alert.alert('Required', 'Please enter your business name.')
        return false
      }
      if (!buyerName.trim()) {
        Alert.alert('Required', 'Please enter the client / buyer name.')
        return false
      }
    }
    if (step === 2) {
      const hasValidItem = items.some(it => it.description.trim() !== '')
      if (!hasValidItem) {
        Alert.alert('Required', 'Please fill in at least one item description.')
        return false
      }
    }
    return true
  }

  function handleNext() {
    if (!validateCurrentStep()) return
    if (step === 3) {
      generate()
    } else {
      setStep(s => Math.min(4, s + 1))
    }
  }

  function handleBack() {
    setStep(s => Math.max(1, s - 1))
  }

  async function generate() {
    setLoading(true)
    setTimeout(() => {
      setGenerated({ invoiceNo, today: invoiceDate, sellerName, sellerAddress, buyerName, buyerEmail, buyerPhone, items, total: getTotal(), notes, bankName, acctName, acctNo, accepted })
      setLoading(false)
      setStep(4)
    }, 300)
  }

  function handleReset() {
    Alert.alert('Reset Invoice', 'Start a new invoice? All input fields will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setSellerName('')
          setSellerAddress('')
          setBuyerName('')
          setBuyerEmail('')
          setBuyerPhone('')
          setItems([{ description: '', qty: '1', price: '0' }])
          setBankName('')
          setAcctName('')
          setAcctNo('')
          setAccepted([])
          setNotes('Thank you for your business. We appreciate your trust and look forward to working with you again.')
          setGenerated(null)
          setShowPdf(false)
          setStep(1)
        }
      }
    ])
  }

  async function shareInvoice() {
    if (!generated) return
    const lines = [
      `INVOICE — ${generated.invoiceNo}`,
      `Date: ${generated.today}`,
      ``,
      `From: ${generated.sellerName}${generated.sellerAddress ? '\n' + generated.sellerAddress : ''}`,
      generated.buyerName ? `\nBilled To: ${generated.buyerName}` : '',
      generated.buyerEmail ? generated.buyerEmail : '',
      generated.buyerPhone ? generated.buyerPhone : '',
      ``,
      `ITEMS:`,
      ...generated.items.map((it: Item, i: number) =>
        `${i + 1}. ${it.description}  Qty: ${it.qty} x ${selectedCurrency.symbol}${parseFloat(it.price).toLocaleString()} = ${selectedCurrency.symbol}${getItemAmt(it).toLocaleString()}`
      ),
      ``,
      `TOTAL: ${selectedCurrency.symbol}${generated.total.toLocaleString()}`,
      generated.notes ? `\nNotes: ${generated.notes}` : '',
      `\nGenerated by DigitalReceipt.ng`,
    ].filter(Boolean).join('\n')
    await Share.share({ message: lines, title: `Invoice ${generated.invoiceNo}` })
  }

  const PdfContent = () => (
    <ScrollView style={styles.pdfScroll} contentContainerStyle={{ padding: 24 }}>
      {/* Letterhead */}
      <View style={styles.pdfHeader}>
        <View>
          <Text style={styles.pdfInvoiceWord}>INVOICE</Text>
          <Text style={styles.pdfInvoiceNo}>{generated?.invoiceNo || invoiceNo}</Text>
          <Text style={styles.pdfDate}>Date: {generated?.today || invoiceDate}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.pdfBizName}>{generated?.sellerName || sellerName || 'Your Business'}</Text>
          {(generated?.sellerAddress || sellerAddress) ? <Text style={styles.pdfBizSub}>{generated?.sellerAddress || sellerAddress}</Text> : null}
        </View>
      </View>

      <View style={styles.pdfDivider} />

      {(generated?.buyerName || buyerName) ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.pdfSectionLabel}>BILLED TO</Text>
          <Text style={styles.pdfBuyerName}>{generated?.buyerName || buyerName}</Text>
          {(generated?.buyerEmail || buyerEmail) ? <Text style={styles.pdfBuyerSub}>{generated?.buyerEmail || buyerEmail}</Text> : null}
          {(generated?.buyerPhone || buyerPhone) ? <Text style={styles.pdfBuyerSub}>{generated?.buyerPhone || buyerPhone}</Text> : null}
        </View>
      ) : null}

      <View style={styles.pdfDivider} />

      {/* Items */}
      <View style={styles.pdfTableHead}>
        <Text style={[styles.pdfTableHeadTxt, { flex: 3 }]}>Description</Text>
        <Text style={[styles.pdfTableHeadTxt, { flex: 1, textAlign: 'center' }]}>Qty</Text>
        <Text style={[styles.pdfTableHeadTxt, { flex: 2, textAlign: 'right' }]}>Unit</Text>
        <Text style={[styles.pdfTableHeadTxt, { flex: 2, textAlign: 'right' }]}>Amount</Text>
      </View>
      {(generated?.items || items).map((it: Item, i: number) => (
        <View key={i} style={[styles.pdfTableRow, i % 2 === 0 && { backgroundColor: '#f9fafb' }]}>
          <Text style={[styles.pdfTableCell, { flex: 3 }]}>{it.description || '—'}</Text>
          <Text style={[styles.pdfTableCell, { flex: 1, textAlign: 'center' }]}>{it.qty}</Text>
          <Text style={[styles.pdfTableCell, { flex: 2, textAlign: 'right' }]}>{selectedCurrency.symbol}{parseFloat(it.price || '0').toLocaleString()}</Text>
          <Text style={[styles.pdfTableCell, { flex: 2, textAlign: 'right', fontWeight: '700' }]}>{selectedCurrency.symbol}{getItemAmt(it).toLocaleString()}</Text>
        </View>
      ))}

      <View style={styles.pdfDivider} />

      <View style={styles.pdfTotalRow}>
        <Text style={styles.pdfTotalLabel}>TOTAL</Text>
        <Text style={styles.pdfTotalAmt}>{selectedCurrency.symbol}{(generated?.total ?? getTotal()).toLocaleString()}</Text>
      </View>

      {((generated?.bankName || bankName) || (generated?.acctName || acctName) || (generated?.acctNo || acctNo) || (generated?.accepted?.length || accepted.length) > 0) ? (
        <>
          <View style={styles.pdfDivider} />
          <Text style={styles.pdfSectionLabel}>PAYMENT DETAILS</Text>
          {(generated?.bankName || bankName) ? <Text style={styles.pdfPayLine}><Text style={styles.pdfPayKey}>Bank: </Text>{generated?.bankName || bankName}</Text> : null}
          {(generated?.acctName || acctName) ? <Text style={styles.pdfPayLine}><Text style={styles.pdfPayKey}>Account Name: </Text>{generated?.acctName || acctName}</Text> : null}
          {(generated?.acctNo || acctNo) ? <Text style={styles.pdfPayLine}><Text style={styles.pdfPayKey}>Account No: </Text>{generated?.acctNo || acctNo}</Text> : null}
          {(generated?.accepted?.length || accepted.length) > 0 ? <Text style={styles.pdfPayLine}><Text style={styles.pdfPayKey}>Accepted: </Text>{(generated?.accepted || accepted).join(', ')}</Text> : null}
        </>
      ) : null}

      {(generated?.notes || notes) ? (
        <>
          <View style={styles.pdfDivider} />
          <Text style={styles.pdfSectionLabel}>NOTES</Text>
          <Text style={styles.pdfNotes}>{generated?.notes || notes}</Text>
        </>
      ) : null}

      <View style={styles.pdfFooterBar}>
        <Text style={styles.pdfFooterTxt}>Generated by DigitalReceipt.ng</Text>
      </View>
    </ScrollView>
  )

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header Bar with Back Button & Title */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Free Invoice Generator</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Progress Bar */}
      <ScreenHeader step={step} title={STEP_TITLES[step - 1]} />

      {/* PDF Modal */}
      <Modal visible={showPdf} animationType="slide" onRequestClose={() => setShowPdf(false)}>
        <View style={{ flex: 1, backgroundColor: '#e5e7eb' }}>
          <View style={styles.pdfTopBar}>
            <TouchableOpacity onPress={() => setShowPdf(false)} style={[styles.pdfCloseBtn, { flexDirection: 'row', alignItems: 'center' }]}>
              <Ionicons name="close-sharp" size={18} color="#fff" />
              <Text style={styles.pdfCloseTxt}> Close</Text>
            </TouchableOpacity>
            <Text style={styles.pdfTopTitle}>Invoice Preview</Text>
            <TouchableOpacity onPress={shareInvoice} style={styles.pdfShareBtn}>
              <Text style={styles.pdfShareTxt}>Share</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pdfPage}>
            <PdfContent />
          </View>
        </View>
      </Modal>

      {/* Main Step ScrollView */}
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* ── STEP 1: Details (Business Info + Client Info) ── */}
        {step === 1 && (
          <View style={styles.invoiceCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="business-outline" size={20} color={GREEN} />
              <Text style={styles.sectionHeaderTitle}>1. Your Business Information</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Name <Text style={styles.reqStar}>*</Text></Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Acme Enterprises Ltd"
                placeholderTextColor="#9ca3af"
                value={sellerName}
                onChangeText={setSellerName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Address</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 123 Main Street, Victoria Island, Lagos"
                placeholderTextColor="#9ca3af"
                value={sellerAddress}
                onChangeText={setSellerAddress}
              />
            </View>

            <View style={styles.rowTwoCols}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Invoice Code</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: '#f1f5f9', color: '#64748b' }]}
                  value={invoiceNo}
                  editable={false}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Invoice Date</Text>
                <TextInput
                  style={styles.inputField}
                  value={invoiceDate}
                  onChangeText={setInvoiceDate}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Billed To */}
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-outline" size={20} color={GREEN} />
              <Text style={styles.sectionHeaderTitle}>2. Billed To (Client Details)</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Client / Company Name <Text style={styles.reqStar}>*</Text></Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Dangote Cement / John Doe"
                placeholderTextColor="#9ca3af"
                value={buyerName}
                onChangeText={setBuyerName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Client Email (Optional)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="client@example.com"
                placeholderTextColor="#9ca3af"
                value={buyerEmail}
                onChangeText={setBuyerEmail}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Client Phone (Optional)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="+234 801 234 5678"
                placeholderTextColor="#9ca3af"
                value={buyerPhone}
                onChangeText={setBuyerPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Form Action Buttons (Inside Form Card - Full Width) */}
            <View style={styles.inlineActionRow}>
              <TouchableOpacity
                style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
                onPress={handleNext}
                disabled={loading}
              >
                <Text style={styles.btnPrimaryText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 2: Items & Currency ── */}
        {step === 2 && (
          <View style={styles.invoiceCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="bag-handle-outline" size={20} color={GREEN} />
              <Text style={styles.sectionHeaderTitle}>Line Items &amp; Currency</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Billing Currency</Text>
              <TouchableOpacity style={styles.currencySelector} onPress={() => setShowCurrencyOptions(!showCurrencyOptions)}>
                <Text style={styles.currencyText}>{selectedCurrency.symbol} — {selectedCurrency.label} ({selectedCurrency.code})</Text>
                <Ionicons name={showCurrencyOptions ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
              </TouchableOpacity>
              {showCurrencyOptions && (
                <View style={styles.currencyOptionsWrap}>
                  {CURRENCIES.map(c => (
                    <TouchableOpacity
                      key={c.code}
                      style={[styles.currencyOption, currency === c.code && styles.currencyOptionActive]}
                      onPress={() => { setCurrency(c.code); setShowCurrencyOptions(false) }}
                    >
                      <Text style={[styles.currencyOptionSymbol, currency === c.code && { color: '#fff' }]}>{c.symbol}</Text>
                      <Text style={[styles.currencyOptionLabel, currency === c.code && { color: '#fff' }]}>{c.label}</Text>
                      <Text style={[styles.currencyOptionCode, currency === c.code && { color: 'rgba(255,255,255,0.7)' }]}>{c.code}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.cardDivider} />

            {/* Items List */}
            <Text style={styles.fieldLabel}>Items / Services Provided</Text>
            {items.map((item, idx) => (
              <View key={idx} style={styles.itemCardRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.itemIdxBadge}>{idx + 1}</Text>
                  <TextInput
                    style={[styles.inputField, { flex: 1 }]}
                    placeholder="Item or service description *"
                    placeholderTextColor="#9ca3af"
                    value={item.description}
                    onChangeText={v => updateItem(idx, 'description', v)}
                  />
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(idx)} style={styles.deleteIconBtn}>
                      <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.itemInputsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subFieldLabel}>Qty</Text>
                    <TextInput
                      style={styles.inputField}
                      value={item.qty}
                      onChangeText={v => updateItem(idx, 'qty', v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.subFieldLabel}>Unit Price ({selectedCurrency.symbol})</Text>
                    <TextInput
                      style={styles.inputField}
                      value={item.price}
                      onChangeText={v => updateItem(idx, 'price', v)}
                      keyboardType="numeric"
                      placeholder="0.00"
                    />
                  </View>
                  <View style={{ flex: 2, alignItems: 'flex-end', justifyContent: 'center', paddingTop: 14 }}>
                    <Text style={styles.subFieldLabel}>Amount</Text>
                    <Text style={styles.itemCalculatedAmt}>
                      {selectedCurrency.symbol}{getItemAmt(item).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
              <Ionicons name="add-circle-outline" size={18} color={GREEN} style={{ marginRight: 6 }} />
              <Text style={styles.addItemTxt}>Add Another Item</Text>
            </TouchableOpacity>

            <View style={styles.cardDivider} />

            <View style={styles.totalBanner}>
              <Text style={styles.totalBannerLabel}>Total Invoice Amount</Text>
              <Text style={styles.totalBannerValue}>{selectedCurrency.symbol}{getTotal().toLocaleString()}</Text>
            </View>

            {/* Form Action Buttons */}
            <View style={styles.inlineActionRow}>
              <TouchableOpacity style={styles.btnSecondary} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#334155" style={{ marginRight: 6 }} />
                <Text style={styles.btnSecondaryText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1 }, loading && { opacity: 0.6 }]}
                onPress={handleNext}
                disabled={loading}
              >
                <Text style={styles.btnPrimaryText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 3: Payment Details & Notes ── */}
        {step === 3 && (
          <View style={styles.invoiceCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="card-outline" size={20} color={GREEN} />
              <Text style={styles.sectionHeaderTitle}>Bank Transfer Details</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bank Name</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. First Bank of Nigeria"
                placeholderTextColor="#9ca3af"
                value={bankName}
                onChangeText={setBankName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Acme Enterprises Ltd"
                placeholderTextColor="#9ca3af"
                value={acctName}
                onChangeText={setAcctName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Account Number</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 0123456789"
                placeholderTextColor="#9ca3af"
                value={acctNo}
                onChangeText={setAcctNo}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Accepted Payment Methods</Text>
              <TouchableOpacity style={styles.currencySelector} onPress={() => setShowPaymentOptions(!showPaymentOptions)}>
                <Text style={{ color: accepted.length ? '#0f172a' : '#9ca3af', fontSize: 14, fontWeight: '500' }}>
                  {accepted.length ? accepted.join(', ') : 'Tap to select payment options…'}
                </Text>
                <Ionicons name={showPaymentOptions ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
              </TouchableOpacity>
              {showPaymentOptions && (
                <View style={styles.optionsWrap}>
                  {PAYMENT_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.optionRow}
                      onPress={() => {
                        setAccepted(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])
                      }}
                    >
                      <Ionicons name={accepted.includes(opt) ? "checkbox" : "square-outline"} size={20} color={GREEN} style={{ marginRight: 10 }} />
                      <Text style={styles.optionLabel}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.cardDivider} />

            {/* Notes */}
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="document-text-outline" size={20} color={GREEN} />
              <Text style={styles.sectionHeaderTitle}>Notes &amp; Terms</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.inputField, { height: 90, textAlignVertical: 'top' }]}
                placeholderTextColor="#9ca3af"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Form Action Buttons */}
            <View style={styles.inlineActionRow}>
              <TouchableOpacity style={styles.btnSecondary} onPress={handleBack}>
                <Ionicons name="arrow-back" size={18} color="#334155" style={{ marginRight: 6 }} />
                <Text style={styles.btnSecondaryText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1 }, loading && { opacity: 0.6 }]}
                onPress={handleNext}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.btnPrimaryText}>Review Invoice</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 4: Review & Export ── */}
        {step === 4 && (
          <View style={styles.invoiceCard}>
            {/* Header */}
            <View style={styles.invHeader}>
              <View>
                <Text style={styles.invTitle}>Invoice</Text>
                <Text style={styles.invNo}>{generated?.invoiceNo || invoiceNo}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.invBiz}>{generated?.sellerName || sellerName || 'Your Business'}</Text>
                {(generated?.sellerAddress || sellerAddress) ? <Text style={styles.invBizSub}>{generated?.sellerAddress || sellerAddress}</Text> : null}
                <Text style={styles.invDate}>{generated?.today || invoiceDate}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Billed To */}
            {(generated?.buyerName || buyerName) ? (
              <>
                <Text style={styles.billedLabel}>BILLED TO</Text>
                <Text style={styles.buyerName}>{generated?.buyerName || buyerName}</Text>
                {(generated?.buyerEmail || buyerEmail) ? <Text style={styles.buyerSub}>{generated?.buyerEmail || buyerEmail}</Text> : null}
                {(generated?.buyerPhone || buyerPhone) ? <Text style={styles.buyerSub}>{generated?.buyerPhone || buyerPhone}</Text> : null}
                <View style={styles.cardDivider} />
              </>
            ) : null}

            {/* Items table */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderLeft}>Item / Service</Text>
              <Text style={styles.tableHeaderRight}>Amount</Text>
            </View>
            {(generated?.items || items).map((it: Item, i: number) => (
              <View key={i} style={styles.tableRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tableDesc}>{i + 1}.  {it.description || 'Item'}</Text>
                  <Text style={styles.tableQty}>Qty: {it.qty}  ×  {selectedCurrency.symbol}{parseFloat(it.price || '0').toLocaleString()}</Text>
                </View>
                <Text style={styles.tableAmt}>{selectedCurrency.symbol}{getItemAmt(it).toLocaleString()}</Text>
              </View>
            ))}

            <View style={styles.cardDivider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmt}>{selectedCurrency.symbol}{(generated?.total ?? getTotal()).toLocaleString()}</Text>
            </View>

            {((generated?.bankName || bankName) || (generated?.acctName || acctName) || (generated?.acctNo || acctNo) || (generated?.accepted?.length || accepted.length) > 0) ? (
              <>
                <View style={styles.cardDivider} />
                <Text style={styles.billedLabel}>PAYMENT DETAILS</Text>
                {(generated?.bankName || bankName) ? <View style={styles.payRow}><Text style={styles.payKey}>Bank:</Text><Text style={styles.payVal}>{generated?.bankName || bankName}</Text></View> : null}
                {(generated?.acctName || acctName) ? <View style={styles.payRow}><Text style={styles.payKey}>Acct Name:</Text><Text style={styles.payVal}>{generated?.acctName || acctName}</Text></View> : null}
                {(generated?.acctNo || acctNo) ? <View style={styles.payRow}><Text style={styles.payKey}>Acct No:</Text><Text style={styles.payVal}>{generated?.acctNo || acctNo}</Text></View> : null}
                {(generated?.accepted?.length || accepted.length) > 0 ? <View style={styles.payRow}><Text style={styles.payKey}>Accepted:</Text><Text style={styles.payVal}>{(generated?.accepted || accepted).join(', ')}</Text></View> : null}
              </>
            ) : null}

            {(generated?.notes || notes) ? (
              <>
                <View style={styles.cardDivider} />
                <Text style={styles.notesLabel}>NOTES</Text>
                <Text style={styles.notesText}>{generated?.notes || notes}</Text>
              </>
            ) : null}

            <Text style={styles.footer}>Generated by DigitalReceipt.ng</Text>

            <View style={{ marginTop: 24, gap: 12 }}>
              <TouchableOpacity style={[styles.btnPrimary, { width: '100%' }]} onPress={() => setShowPdf(true)}>
                <Ionicons name="eye-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnPrimaryText}>View PDF Invoice</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btnPrimary, { width: '100%', backgroundColor: '#0f172a' }]} onPress={shareInvoice}>
                <Ionicons name="share-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnPrimaryText}>Share Invoice</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSecondary} onPress={handleReset}>
                <Ionicons name="refresh-outline" size={18} color="#334155" style={{ marginRight: 6 }} />
                <Text style={styles.btnSecondaryText}>Create New Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#ffffff' },

  // Nav Bar (Title & Back Button on Same Row)
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },

  // Stepper Header Bar
  stepProgressWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stepSubTitle: { fontSize: 14, fontWeight: '700', color: GREEN },
  headerStep: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  progressRow: { flexDirection: 'row', height: 4, gap: 6 },
  progressSeg: { flex: 1, backgroundColor: '#e2e8f0', borderRadius: 2 },
  progressSegActive: { backgroundColor: GREEN },

  container: { flex: 1, backgroundColor: '#f8fafc' },
  invoiceCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  
  // Section Headers & Card Fields
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: GREEN },
  cardDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },

  fieldGroup: { marginBottom: 16 },
  rowTwoCols: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  subFieldLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  reqStar: { color: '#dc2626' },
  inputField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },

  // Currency & Dropdown
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  currencyText: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  currencyOptionsWrap: { backgroundColor: '#ffffff', borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: '#cbd5e1', overflow: 'hidden' },
  currencyOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  currencyOptionActive: { backgroundColor: GREEN },
  currencyOptionSymbol: { fontSize: 15, fontWeight: '800', color: GREEN, width: 32 },
  currencyOptionLabel: { flex: 1, fontSize: 14, color: '#0f172a' },
  currencyOptionCode: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  // Line items
  itemCardRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemIdxBadge: { fontSize: 12, fontWeight: '800', color: GREEN, width: 22 },
  deleteIconBtn: { padding: 6, marginLeft: 4 },
  itemInputsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  itemCalculatedAmt: { fontSize: 14, fontWeight: '800', color: GREEN },

  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#f0fdf4', borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0', marginTop: 4 },
  addItemTxt: { fontSize: 14, color: GREEN, fontWeight: '700' },

  totalBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  totalBannerLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  totalBannerValue: { fontSize: 18, fontWeight: '900', color: GREEN },

  // Inline Form Action Buttons
  inlineActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  btnPrimary: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnPrimaryText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnSecondaryText: { color: '#334155', fontWeight: '700', fontSize: 14 },

  // Review card
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invTitle: { fontSize: 26, fontWeight: '900', color: '#111827' },
  invNo: { fontSize: 12, color: '#9a7c3f', marginTop: 2 },
  invBiz: { fontSize: 14, fontWeight: '700', color: '#6b7280', textAlign: 'right' },
  invBizSub: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  invDate: { fontSize: 13, color: '#374151', marginTop: 4 },
  billedLabel: { fontSize: 11, fontWeight: '800', color: GREEN, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  buyerName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  buyerSub: { fontSize: 13, color: '#6b7280' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  tableHeaderLeft: { fontSize: 13, fontWeight: '800', color: '#111827' },
  tableHeaderRight: { fontSize: 13, fontWeight: '800', color: '#111827' },
  tableRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tableDesc: { fontSize: 14, color: '#374151', fontWeight: '500' },
  tableQty: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  tableAmt: { fontSize: 14, fontWeight: '700', color: '#111827', minWidth: 80, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  totalAmt: { fontSize: 18, fontWeight: '900', color: '#111827' },
  payRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  payKey: { fontSize: 13, fontWeight: '700', color: '#374151', width: 95 },
  payVal: { flex: 1, fontSize: 14, color: '#374151' },
  optionsWrap: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginTop: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  optionLabel: { fontSize: 14, color: '#374151' },
  notesLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  notesText: { fontSize: 13, color: '#374151' },
  footer: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 20 },

  // PDF modal
  pdfTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 14, paddingTop: Platform.OS === 'ios' ? 48 : 16 },
  pdfTopTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pdfCloseBtn: { padding: 6 },
  pdfCloseTxt: { color: '#fff', fontSize: 14 },
  pdfShareBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  pdfShareTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pdfPage: { flex: 1, margin: 12, backgroundColor: '#fff', borderRadius: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 6, overflow: 'hidden' },
  pdfScroll: { flex: 1, backgroundColor: '#fff' },
  pdfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  pdfInvoiceWord: { fontSize: 28, fontWeight: '900', color: GREEN, letterSpacing: 2 },
  pdfInvoiceNo: { fontSize: 12, color: '#9a7c3f', marginTop: 2 },
  pdfDate: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  pdfBizName: { fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'right' },
  pdfBizSub: { fontSize: 11, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  pdfDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 14 },
  pdfSectionLabel: { fontSize: 10, fontWeight: '800', color: GREEN, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  pdfBuyerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  pdfBuyerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  pdfTableHead: { flexDirection: 'row', backgroundColor: GREEN, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 2 },
  pdfTableHeadTxt: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  pdfTableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 9, borderRadius: 2 },
  pdfTableCell: { fontSize: 13, color: '#374151' },
  pdfTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  pdfTotalLabel: { fontSize: 14, fontWeight: '800', color: '#111827', letterSpacing: 1 },
  pdfTotalAmt: { fontSize: 20, fontWeight: '900', color: GREEN },
  pdfPayLine: { fontSize: 13, color: '#374151', marginBottom: 5 },
  pdfPayKey: { fontWeight: '700', color: '#111827' },
  pdfNotes: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
  pdfFooterBar: { marginTop: 32, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, alignItems: 'center' },
  pdfFooterTxt: { fontSize: 11, color: '#9ca3af' },
})
