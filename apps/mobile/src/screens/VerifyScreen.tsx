import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { supabase } from '../lib/supabase'
import BackRow from '../components/BackRow'

export default function VerifyScreen({ navigation }: any) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

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
      <View style={{ flex: 1 }}>
        <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => { setCode(data); verify(data) }}>
          <View style={styles.camOverlay}>
            <View style={styles.camFrame} />
            <Text style={styles.camHint}>Point at a DigitalReceipt QR code</Text>
          </View>
          <TouchableOpacity style={styles.camClose} onPress={() => setShowCamera(false)}>
            <Text style={styles.camCloseText}>✕ Close</Text>
          </TouchableOpacity>
        </CameraView>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <BackRow navigation={navigation} />
      <Text style={styles.heading}>Verify Receipt</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Enter Verification Code</Text>
        <Text style={styles.hint}>Enter the code printed on the receipt</Text>
        <TextInput
          style={styles.codeInput} value={code}
          onChangeText={v => { setCode(v.toUpperCase()); setResult(null) }}
          placeholder="DR-XXXXXXXX" placeholderTextColor="#9ca3af" autoCapitalize="characters"
        />
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled, { marginTop: 12 }]} onPress={() => verify()} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify Receipt</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.scanBtn} onPress={() => setShowCamera(true)}>
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={styles.scanText}>Scan QR Code</Text>
        </TouchableOpacity>
      </View>

      {result && (
        result.error
          ? <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>❌</Text>
              <Text style={styles.errorTitle}>Receipt Not Found</Text>
              <Text style={styles.errorSub}>No receipt found with this code. Please check and try again.</Text>
            </View>
          : <View style={styles.successCard}>
              <View style={styles.successHeader}>
                <Text style={styles.successIcon}>✅</Text>
                <View>
                  <Text style={styles.successTitle}>VERIFIED RECEIPT</Text>
                  <Text style={styles.successSub}>This receipt is authentic</Text>
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
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  heading: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 14 },
  codeInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, fontSize: 18, color: '#111827', textAlign: 'center', letterSpacing: 4, fontWeight: '700', backgroundColor: '#fafafa' },
  btn: { backgroundColor: '#1a3728', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#1a3728', borderRadius: 10 },
  scanIcon: { fontSize: 18, marginRight: 8 },
  scanText: { color: '#1a3728', fontWeight: '700', fontSize: 14 },
  errorCard: { backgroundColor: '#fef2f2', borderRadius: 14, padding: 24, alignItems: 'center' },
  errorIcon: { fontSize: 40, marginBottom: 10 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  errorSub: { color: '#6b7280', marginTop: 4, textAlign: 'center', fontSize: 13 },
  successCard: { backgroundColor: '#f0f5f2', borderRadius: 14, padding: 20, borderWidth: 2, borderColor: '#1a3728' },
  successHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  successIcon: { fontSize: 36, marginRight: 12 },
  successTitle: { fontSize: 16, fontWeight: '800', color: '#1a3728' },
  successSub: { fontSize: 12, color: '#6b7280' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#c8ddd1' },
  resultKey: { color: '#6b7280', fontSize: 13 },
  resultVal: { fontWeight: '600', color: '#111827', fontSize: 13 },
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
