import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { supabase } from '../lib/supabase'

const G = '#1a3728'
const BASE = 'https://digitalreceipt.ng'

type Step = 'contact' | 'otp' | 'login-code' | 'setup'

export default function StaffLoginScreen({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [newCode, setNewCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [step, setStep] = useState<Step>('contact')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionToken, setSessionToken] = useState('')

  function showError(msg: string) { setError(msg) }

  async function handleContactSubmit() {
    setError('')
    if (!phone.trim()) { showError('Enter your phone number.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/staff/login/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not send OTP.')
      if (data.hasLoginCode) {
        setStep('login-code')
      } else {
        setSessionToken(data.sessionToken)
        setStep('otp')
      }
    } catch (err: any) {
      showError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit() {
    setError('')
    if (!otp.trim() || otp.length < 6) { showError('Enter the 6-digit OTP.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/staff/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'otp', sessionToken, code: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Verification failed.')

      const { error: sessionErr } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: 'magiclink',
      })
      if (sessionErr) throw new Error(sessionErr.message)

      if (data.isFirstLogin) {
        setStep('setup')
      }
      // If not first login, AppNavigator detects the session automatically
    } catch (err: any) {
      showError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoginCodeSubmit() {
    setError('')
    if (!loginCode.trim()) { showError('Enter your login code.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/staff/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'login_code', phone: phone.trim(), code: loginCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Incorrect login code.')

      const { error: sessionErr } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: 'magiclink',
      })
      if (sessionErr) throw new Error(sessionErr.message)
      // Session established — AppNavigator detects it automatically
    } catch (err: any) {
      showError(err.message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetupSubmit() {
    setError('')
    if (newCode.length < 4) { showError('Login code must be at least 4 characters.'); return }
    if (newCode !== confirmCode) { showError('Codes do not match.'); return }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/api/staff/login/set-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ code: newCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save login code.')
      // Session already active — AppNavigator takes over
    } catch (err: any) {
      showError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        <View style={s.header}>
          <Text style={s.headerTitle}>🔗  Staff Login</Text>
          <Text style={s.headerSub}>
            {step === 'setup' ? 'Set up your personal login code' : 'Enter using your assigned phone number'}
          </Text>
        </View>

        <View style={s.card}>

          {/* Step 1: Phone number */}
          {step === 'contact' && (
            <>
              <Text style={s.label}>Phone number</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+234 80..."
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                autoFocus
              />
              <Text style={s.hint}>Use the phone number your employer added you with</Text>

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleContactSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Continue →</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* Step 2a: OTP (first time login) */}
          {step === 'otp' && (
            <>
              <View style={s.noticeBanner}>
                <Text style={s.noticeText}>
                  A 6-digit OTP was sent to <Text style={s.noticeStrong}>{phone}</Text>.
                </Text>
                <TouchableOpacity onPress={() => { setStep('contact'); setOtp(''); setError('') }}>
                  <Text style={s.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.label}>OTP</Text>
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

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleOtpSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Verify OTP →</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.resendBtn} onPress={handleContactSubmit} disabled={loading}>
                <Text style={s.resendText}>Didn't receive it? Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2b: Personal login code (returning staff) */}
          {step === 'login-code' && (
            <>
              <View style={s.noticeBanner}>
                <Text style={s.noticeText}>
                  Signing in as <Text style={s.noticeStrong}>{phone}</Text>.
                </Text>
                <TouchableOpacity onPress={() => { setStep('contact'); setLoginCode(''); setError('') }}>
                  <Text style={s.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Your login code</Text>
              <TextInput
                style={s.input}
                value={loginCode}
                onChangeText={setLoginCode}
                placeholder="Enter your login code"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoFocus
              />

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLoginCodeSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In →</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* Step 3: Set personal login code (first login only) */}
          {step === 'setup' && (
            <>
              <View style={s.noticeBanner}>
                <Text style={s.noticeText}>OTP verified! Set a personal login code so you won't need an OTP next time.</Text>
              </View>

              <Text style={s.label}>Choose a login code</Text>
              <TextInput
                style={s.input}
                value={newCode}
                onChangeText={setNewCode}
                placeholder="At least 4 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                autoFocus
              />

              <Text style={[s.label, { marginTop: 12 }]}>Confirm login code</Text>
              <TextInput
                style={s.input}
                value={confirmCode}
                onChangeText={setConfirmCode}
                placeholder="Re-enter your code"
                placeholderTextColor="#9ca3af"
                secureTextEntry
              />

              {!!error && <Text style={s.errorText}>{error}</Text>}

              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSetupSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Save & Go to Dashboard →</Text>}
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
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 13, fontSize: 15, color: '#111827', backgroundColor: '#fafafa', marginBottom: 8 },
  otpInput: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 10 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 18 },
  btn: { backgroundColor: G, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorText: { fontSize: 13, color: '#dc2626', backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#fecaca' },
  noticeBanner: { backgroundColor: '#f0f5f2', borderRadius: 10, padding: 12, marginBottom: 18, borderLeftWidth: 3, borderLeftColor: G, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticeText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },
  noticeStrong: { fontWeight: '700', color: '#111827' },
  changeLink: { fontSize: 12, color: G, fontWeight: '700', marginLeft: 10 },
  resendBtn: { alignItems: 'center', paddingVertical: 12 },
  resendText: { fontSize: 13, color: '#6b7280' },
  backBtn: { alignItems: 'center', marginTop: 28 },
  backText: { fontSize: 14, color: G, fontWeight: '600' },
})
