import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { supabase } from '../lib/supabase'

const G = '#1a3728'

export default function StaffLoginScreen({ onBack }: { onBack: () => void }) {
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'contact' | 'otp'>('contact')
  const [loading, setLoading] = useState(false)

  async function sendOtp() {
    if (!contact.trim()) { Alert.alert('Required', 'Enter your email or phone number.'); return }
    setLoading(true)
    try {
      if (contactType === 'email') {
        const { error } = await supabase.auth.signInWithOtp({ email: contact.trim() })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: contact.trim() })
        if (error) throw error
      }
      setStep('otp')
      Alert.alert('Code Sent', `A 6-digit login code was sent to ${contact.trim()}.`)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send login code.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (!otp.trim() || otp.length < 6) { Alert.alert('Required', 'Enter the 6-digit code.'); return }
    setLoading(true)
    try {
      const verifyPayload = contactType === 'email'
        ? { email: contact.trim(), token: otp.trim(), type: 'email' as const }
        : { phone: contact.trim(), token: otp.trim(), type: 'sms' as const }

      const { error: verifyError } = await supabase.auth.verifyOtp(verifyPayload)
      if (verifyError) throw verifyError

      // Check that this contact belongs to an active staff member
      const query = supabase
        .from('staff_members')
        .select('id, access_level, status')
        .eq('status', 'active')

      const { data: staffRecord, error: staffError } = contactType === 'email'
        ? await query.eq('email', contact.trim()).single()
        : await query.eq('phone', contact.trim()).single()

      if (staffError || !staffRecord) {
        await supabase.auth.signOut()
        throw new Error('No active staff account found for this contact. Please contact your administrator.')
      }

      // Session is now set — AppNavigator will detect it and show the app
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>🔗  Staff Login</Text>
          <Text style={s.headerSub}>Enter using your assigned email or phone number</Text>
        </View>

        <View style={s.card}>
          {step === 'contact' ? (
            <>
              {/* Toggle */}
              <View style={s.toggleRow}>
                {(['email', 'phone'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.toggleBtn, contactType === t && s.toggleBtnActive]}
                    onPress={() => { setContactType(t); setContact('') }}
                  >
                    <Text style={[s.toggleText, contactType === t && s.toggleTextActive]}>
                      {t === 'email' ? '✉  Email' : '📱  Phone'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>
                {contactType === 'email' ? 'Email address' : 'Phone number'}
              </Text>
              <TextInput
                style={s.input}
                value={contact}
                onChangeText={setContact}
                placeholder={contactType === 'email' ? 'you@example.com' : '+234 80...'}
                placeholderTextColor="#9ca3af"
                keyboardType={contactType === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
                autoFocus
              />
              <Text style={s.hint}>
                Use the {contactType === 'email' ? 'email' : 'phone number'} your employer added you with
              </Text>

              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={sendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Login Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.noticeBanner}>
                <Text style={s.noticeText}>
                  A 6-digit code was sent to{' '}
                  <Text style={{ fontWeight: '700', color: '#111827' }}>{contact}</Text>.
                </Text>
                <TouchableOpacity onPress={() => { setStep('contact'); setOtp('') }}>
                  <Text style={s.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Verification code</Text>
              <TextInput
                style={[s.input, s.otpInput]}
                value={otp}
                onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="------"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={verifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Verify & Sign In</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.resendBtn} onPress={sendOtp} disabled={loading}>
                <Text style={s.resendText}>Didn't receive it? Resend code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backText}>‹  Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 48 },
  header: { marginBottom: 24, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: G, marginBottom: 6 },
  headerSub: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  toggleBtn: { flex: 1, padding: 11, borderRadius: 10, alignItems: 'center', backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent' },
  toggleBtnActive: { backgroundColor: '#f0f5f2', borderColor: G },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  toggleTextActive: { color: G, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 13, fontSize: 15, color: '#111827', backgroundColor: '#fafafa', marginBottom: 8 },
  otpInput: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 10 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 18 },
  btn: { backgroundColor: G, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noticeBanner: { backgroundColor: '#f0f5f2', borderRadius: 10, padding: 12, marginBottom: 18, borderLeftWidth: 3, borderLeftColor: G, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },
  changeLink: { fontSize: 12, color: G, fontWeight: '700', marginLeft: 10 },
  resendBtn: { alignItems: 'center', paddingVertical: 12 },
  resendText: { fontSize: 13, color: '#6b7280' },
  backBtn: { alignItems: 'center', marginTop: 28 },
  backText: { fontSize: 14, color: G, fontWeight: '600' },
})
