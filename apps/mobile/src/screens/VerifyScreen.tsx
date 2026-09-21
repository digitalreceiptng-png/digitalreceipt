import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { supabase } from '../lib/supabase'

const GREEN = '#1a3728'

export default function VerifyScreen({ navigation, onBack }: any) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

  function handleBack() {
    if (onBack) {
      onBack()
    } else if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack()
    } else if (navigation && navigation.goBack) {
      navigation.goBack()
    }
  }

  async function verify(c?: string) {
    const clean = (c || code).trim().toUpperCase()
    if (!clean) { Alert.alert('Enter a code', 'Enter a verification code or scan QR.'); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('receipts')
      .select('*, businesses(name, address)')
      .or(`unique_identifier.eq.${clean},receipt_number.eq.${clean}`)
      .single()
    setLoading(false)
    setResult(error || !data ? { error: true } : data)
    setShowCamera(false)
  }

  if (showCamera) {
    if (!permission?.granted) {
      return (
        <View style={styles.camPermission}>
          <Text style={styles.camPermText}>Camera access is needed to scan QR codes.</Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCamera(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => { setCode(data); verify(data) }}>
          <View style={styles.camOverlay}>
            <View style={styles.camFrame} />
            <Text style={styles.camHint}>Point at a DigitalReceipt QR code</Text>
          </View>
          <TouchableOpacity style={styles.camClose} onPress={() => setShowCamera(false)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="close-sharp" size={18} color="#fff" />
              <Text style={styles.camCloseText}> Close</Text>
            </View>
          </TouchableOpacity>
        </CameraView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* ── TOP PAGE HEADER BAR ── */}
      <SafeAreaView style={{ backgroundColor: '#ffffff' }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.headerLeft} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Receipt</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      {/* ── CENTERED CONTENT ── */}
      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={32} color={GREEN} />
          </View>
          <Text style={styles.label}>Verify Receipt Code</Text>
          <Text style={styles.hint}>Enter the verification code or scan the QR code printed on the receipt</Text>
          
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={v => { setCode(v.toUpperCase()); setResult(null) }}
            placeholder="DR-XXXXXXXX"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
          />

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled, { marginTop: 16 }]} onPress={() => verify()} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify Receipt</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanBtn} onPress={() => setShowCamera(true)}>
            <Ionicons name="camera-outline" size={20} color={GREEN} style={{ marginRight: 8 }} />
            <Text style={styles.scanText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>

        {result && (
          result.error
            ? <View style={styles.errorCard}>
                <Ionicons name="close-circle-outline" size={48} color="#dc2626" style={{ marginBottom: 10 }} />
                <Text style={styles.errorTitle}>Receipt Not Found</Text>
                <Text style={styles.errorSub}>No receipt found with this code. Please check and try again.</Text>
              </View>
            : <View style={styles.successCard}>
                <View style={styles.successHeader}>
                  <Ionicons name="checkmark-circle" size={40} color="#16a34a" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.successTitle}>VERIFIED RECEIPT</Text>
                    <Text style={styles.successSub}>This receipt is authentic and registered</Text>
                  </View>
                </View>
                {[
                  ['Business', result.businesses?.name || result.seller_name],
                  ['Amount', `₦${parseFloat(result.total_amount || 0).toLocaleString()}`],
                  ['Date', new Date(result.created_at).toLocaleDateString()],
                  ['Code', result.unique_identifier || result.receipt_number],
                ].map(([k, v]) => (
                  <View key={k} style={styles.resultRow}>
                    <Text style={styles.resultKey}>{k}</Text>
                    <Text style={styles.resultVal}>{v}</Text>
                  </View>
                ))}
              </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },

  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  headerRight: { width: 40 },

  scrollBody: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8ddd1',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  label: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6, textAlign: 'center' },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 18, textAlign: 'center', lineHeight: 18 },
  codeInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 3,
    fontWeight: '700',
    backgroundColor: '#fafafa',
  },
  btn: { width: '100%', backgroundColor: GREEN, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  scanBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 13,
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  scanText: { color: GREEN, fontWeight: '700', fontSize: 14 },
  
  errorCard: { backgroundColor: '#fef2f2', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  errorTitle: { fontSize: 16, fontWeight: '800', color: '#dc2626' },
  errorSub: { color: '#6b7280', marginTop: 4, textAlign: 'center', fontSize: 13 },
  
  successCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: GREEN },
  successHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  successTitle: { fontSize: 16, fontWeight: '800', color: GREEN },
  successSub: { fontSize: 12, color: '#6b7280' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  resultKey: { color: '#6b7280', fontSize: 13 },
  resultVal: { fontWeight: '700', color: '#111827', fontSize: 13 },

  camPermission: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 24 },
  camPermText: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  cancelBtn: { marginTop: 16, padding: 12 },
  cancelText: { color: '#9ca3af', fontSize: 14 },
  camOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camFrame: { width: 240, height: 240, borderWidth: 2, borderColor: '#fff', borderRadius: 16 },
  camHint: { color: '#fff', marginTop: 20, fontSize: 14 },
  camClose: { position: 'absolute', top: 48, left: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  camCloseText: { color: '#fff', fontSize: 13 },
})

