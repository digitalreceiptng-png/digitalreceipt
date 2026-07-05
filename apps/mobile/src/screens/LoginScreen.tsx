import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Image, Linking,
} from 'react-native'
import { supabase } from '../lib/supabase'

const GREEN = '#1a3728'
const COREID_BASE = 'https://api.coreid.africa'
const COREID_HEADERS = {
  'Content-Type': 'application/json',
  'app-id': 'HPZG3HB4979GB97U5EAE',
  'x-api-key': 'eb544a4386e04ce1aa581ee1f7781c92',
}

export default function LoginScreen({ country, onPublicNavigate, onChangeCountry, onStaffLink }: {
  country: any
  onPublicNavigate: (s: string) => void
  onChangeCountry: () => void
  onStaffLink: () => void
}) {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login')
  // login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  // register steps
  const [regStep, setRegStep] = useState(1)
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  // NIN
  const [nin, setNin] = useState('')
  const [ninOtp, setNinOtp] = useState('')
  const [ninOtpSent, setNinOtpSent] = useState(false)
  const [ninPhone, setNinPhone] = useState('')
  const [ninLoading, setNinLoading] = useState(false)
  // business
  const [bizName, setBizName] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [bizPhone, setBizPhone] = useState('')
  const [bizType, setBizType] = useState<'registered' | 'individual'>('registered')
  // RC/BN
  const [rcbn, setRcbn] = useState('')
  const [rcbnOtp, setRcbnOtp] = useState('')
  const [rcbnOtpSent, setRcbnOtpSent] = useState(false)
  const [rcbnContact, setRcbnContact] = useState('')
  const [rcbnLoading, setRcbnLoading] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password) { Alert.alert('Missing fields', 'Enter your email and password.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) Alert.alert('Login failed', error.message)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } })
    setGoogleLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    if (data?.url) Linking.openURL(data.url)
  }

  function validateStep1() {
    if (!regName.trim()) { Alert.alert('Required', 'Enter your full name.'); return false }
    if (!regEmail.includes('@')) { Alert.alert('Invalid email', 'Enter a valid email.'); return false }
    if (regPassword.length < 6) { Alert.alert('Weak password', 'Min 6 characters.'); return false }
    if (regPassword !== regConfirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return false }
    return true
  }

  async function sendNinOtp() {
    if (nin.length !== 11) { Alert.alert('Invalid NIN', 'NIN must be 11 digits.'); return }
    setNinLoading(true)
    try {
      const res = await fetch(`${COREID_BASE}/v1/ng/nin/verify-with-otp`, {
        method: 'POST', headers: COREID_HEADERS, body: JSON.stringify({ nin }),
      })
      const json = await res.json()
      if (!res.ok || json.status === 'error') { Alert.alert('Error', json.message || 'Could not send OTP.'); setNinLoading(false); return }
      setNinPhone(json.data?.phone_number || json.data?.masked_phone || '')
      setNinOtpSent(true)
    } catch { Alert.alert('Network error', 'Could not reach verification server.') }
    setNinLoading(false)
  }

  async function verifyNinOtp() {
    if (ninOtp.length < 4) { Alert.alert('Invalid OTP', 'Enter the OTP sent to your phone.'); return }
    setNinLoading(true)
    try {
      const res = await fetch(`${COREID_BASE}/v1/ng/nin/verify-with-otp/validate`, {
        method: 'POST', headers: COREID_HEADERS, body: JSON.stringify({ nin, otp: ninOtp }),
      })
      const json = await res.json()
      if (!res.ok || json.status === 'error') { Alert.alert('Invalid OTP', json.message || 'OTP incorrect or expired.'); setNinLoading(false); return }
      if (json.data?.first_name && !regName) setRegName(`${json.data.first_name} ${json.data.last_name || ''}`.trim())
      Alert.alert('NIN Verified ✓', 'Identity verified.', [{ text: 'Continue', onPress: () => setRegStep(3) }])
    } catch { Alert.alert('Network error', 'Could not reach verification server.') }
    setNinLoading(false)
  }

  async function sendRcbnOtp() {
    if (!rcbn.trim()) { Alert.alert('Required', 'Enter your RC or BN number.'); return }
    setRcbnLoading(true)
    try {
      const endpoint = bizType === 'individual'
        ? `${COREID_BASE}/v1/ng/cac/bn/verify-with-otp`
        : `${COREID_BASE}/v1/ng/cac/rc/verify-with-otp`
      const res = await fetch(endpoint, {
        method: 'POST', headers: COREID_HEADERS,
        body: JSON.stringify({ rc_number: rcbn.replace(/^(RC|BN)\/?/i, ''), company_name: bizName }),
      })
      const json = await res.json()
      if (!res.ok || json.status === 'error') { Alert.alert('Error', json.message || 'Could not verify.'); setRcbnLoading(false); return }
      setRcbnContact(json.data?.email || json.data?.phone_number || '')
      setRcbnOtpSent(true)
    } catch { Alert.alert('Network error', 'Could not reach verification server.') }
    setRcbnLoading(false)
  }

  async function verifyRcbnOtp() {
    if (rcbnOtp.length < 4) { Alert.alert('Invalid OTP', 'Enter the OTP.'); return }
    setRcbnLoading(true)
    try {
      const endpoint = bizType === 'individual'
        ? `${COREID_BASE}/v1/ng/cac/bn/verify-with-otp/validate`
        : `${COREID_BASE}/v1/ng/cac/rc/verify-with-otp/validate`
      const res = await fetch(endpoint, {
        method: 'POST', headers: COREID_HEADERS,
        body: JSON.stringify({ rc_number: rcbn.replace(/^(RC|BN)\/?/i, ''), otp: rcbnOtp }),
      })
      const json = await res.json()
      if (!res.ok || json.status === 'error') { Alert.alert('Invalid OTP', json.message || 'OTP incorrect or expired.'); setRcbnLoading(false); return }
      await createAccount()
    } catch { Alert.alert('Network error', 'Could not reach verification server.') }
    setRcbnLoading(false)
  }

  async function createAccount() {
    setRegLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail.trim(), password: regPassword,
        options: { data: { full_name: regName.trim() } },
      })
      if (error) { Alert.alert('Registration failed', error.message); setRegLoading(false); return }
      const userId = data?.user?.id
      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId, full_name: regName.trim(), email: regEmail.trim(), nin, updated_at: new Date().toISOString(),
        })
        await supabase.from('businesses').upsert({
          user_id: userId, name: bizName.trim(), address: bizAddress.trim(),
          phone: bizPhone.trim(), rc_number: rcbn.trim(), business_type: bizType,
          nin_verified: true, rcbn_verified: bizType === 'registered',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
      if (!data?.session) setMode('verify')
    } catch (e: any) { Alert.alert('Error', e.message) }
    setRegLoading(false)
  }

  const Divider = ({ label = 'or' }: { label?: string }) => (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  )

  const StepBar = ({ current, total }: { current: number; total: number }) => (
    <View style={styles.stepBar}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.stepDot, { backgroundColor: i < current ? GREEN : '#e5e7eb' }]} />
      ))}
    </View>
  )

  const OtpInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <TextInput
      style={styles.otpInput} value={value} onChangeText={onChange}
      placeholder="• • • • • •" placeholderTextColor="#9ca3af"
      keyboardType="number-pad" maxLength={6}
    />
  )

  const GoogleBtn = ({ label }: { label: string }) => (
    <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} disabled={googleLoading}>
      {googleLoading
        ? <ActivityIndicator color="#374151" />
        : <><Image source={{ uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png' }} style={styles.googleIcon} /><Text style={styles.googleText}>{label}</Text></>}
    </TouchableOpacity>
  )

  if (mode === 'verify') {
    return (
      <View style={styles.verifyWrap}>
        <View style={styles.verifyCard}>
          <Text style={styles.verifyEmoji}>📧</Text>
          <Text style={styles.verifyTitle}>Check your email</Text>
          <Text style={styles.verifySub}>
            We sent a confirmation link to{'\n'}
            <Text style={{ fontWeight: '700', color: '#111827' }}>{regEmail}</Text>.{'\n\n'}
            Click it to activate your account.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => setMode('login')}>
            <Text style={styles.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 12 }} onPress={async () => {
            const { error } = await supabase.auth.resend({ type: 'signup', email: regEmail })
            Alert.alert(error ? 'Error' : 'Sent', error ? error.message : 'Confirmation email resent.')
          }}>
            <Text style={styles.link}>Resend confirmation email</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f0f5f2' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <View style={styles.countryPill}>
            <Text style={styles.countryFlag}>{country?.flag}</Text>
            <Text style={styles.countryLabel}>{country?.name} · {country?.tagline}</Text>
          </View>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <Text style={styles.title}>Merchant Sign In</Text>
              <Text style={styles.subtitle}>Sign in to manage your receipts</Text>
              <GoogleBtn label="Continue with Google" />
              <Divider />
              <Text style={styles.label}>Email address</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" />
              <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#9ca3af" secureTextEntry />
              <TouchableOpacity style={[styles.btn, { marginTop: 20 }, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
              </TouchableOpacity>
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>No account? </Text>
                <TouchableOpacity onPress={() => { setMode('register'); setRegStep(1) }}>
                  <Text style={styles.link}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Free for individuals and businesses. No card required.</Text>

              <GoogleBtn label="Sign up with Google" />
              <Divider label="or sign up with email" />

              {/* Account type */}
              <Text style={styles.label}>Account type</Text>
              <View style={styles.acctTypeRow}>
                <TouchableOpacity
                  style={[styles.acctTypeBtn, bizType === 'individual' && styles.acctTypeBtnActive]}
                  onPress={() => setBizType('individual')}
                >
                  <Text style={[styles.acctTypeTitle, bizType === 'individual' && styles.acctTypeTitleActive]}>Individual</Text>
                  <Text style={styles.acctTypeSub}>Freelancer, tutor, landlord...</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.acctTypeBtn, bizType === 'registered' && styles.acctTypeBtnActive]}
                  onPress={() => setBizType('registered')}
                >
                  <Text style={[styles.acctTypeTitle, bizType === 'registered' && styles.acctTypeTitleActive]}>Business</Text>
                  <Text style={styles.acctTypeSub}>School, hospital, SME...</Text>
                </TouchableOpacity>
              </View>

              {/* Phone */}
              <Text style={[styles.label, { marginTop: 14 }]}>Phone number</Text>
              <TextInput style={styles.input} value={bizPhone} onChangeText={setBizPhone}
                placeholder="" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />

              {/* Email + Send code */}
              <Text style={[styles.label, { marginTop: 14 }]}>Email address</Text>
              <View style={styles.inlineRow}>
                <TextInput style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                  value={regEmail} onChangeText={setRegEmail}
                  placeholder="you@example.com" placeholderTextColor="#9ca3af"
                  keyboardType="email-address" autoCapitalize="none" />
                <TouchableOpacity style={styles.sendCodeBtn} onPress={async () => {
                  if (!regEmail.includes('@')) { Alert.alert('Invalid email', 'Enter a valid email.'); return }
                  Alert.alert('Code sent', `A verification code was sent to ${regEmail}`)
                }}>
                  <Text style={styles.sendCodeText}>Send code</Text>
                </TouchableOpacity>
              </View>

              {/* Password */}
              <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
              <View style={styles.pwWrap}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent' }]}
                  value={regPassword} onChangeText={setRegPassword}
                  placeholder="At least 8 characters" placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPw} />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
                  <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>

              {/* Confirm password */}
              <Text style={[styles.label, { marginTop: 14 }]}>Confirm password</Text>
              <View style={styles.pwWrap}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent' }]}
                  value={regConfirm} onChangeText={setRegConfirm}
                  placeholder="Re-enter your password" placeholderTextColor="#9ca3af"
                  secureTextEntry={!showConfirmPw} />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPw(v => !v)}>
                  <Text style={styles.eyeIcon}>{showConfirmPw ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>

              {/* NIN — Individual only */}
              {bizType === 'individual' && (
                <>
                  <Text style={[styles.label, { marginTop: 14 }]}>NIN</Text>
                  <View style={styles.inlineRow}>
                    <TextInput style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                      value={nin} onChangeText={v => { setNin(v.replace(/\D/g, '').slice(0, 11)); setNinOtpSent(false) }}
                      placeholder="12345678901" placeholderTextColor="#9ca3af"
                      keyboardType="number-pad" maxLength={11} />
                    <TouchableOpacity style={[styles.sendCodeBtn, ninLoading && { opacity: 0.6 }]}
                      onPress={sendNinOtp} disabled={ninLoading}>
                      {ninLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendCodeText}>Verify</Text>}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.fieldHint}>Your 11-digit National Identification Number.</Text>
                  {ninOtpSent && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.label}>Enter NIN OTP</Text>
                      <OtpInput value={ninOtp} onChange={v => setNinOtp(v.replace(/\D/g, ''))} />
                      <TouchableOpacity style={[styles.btn, { marginTop: 10 }, ninLoading && styles.btnDisabled]} onPress={verifyNinOtp} disabled={ninLoading}>
                        {ninLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirm NIN OTP</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* RC/BN — Business only */}
              {bizType === 'registered' && (
                <>
                  <Text style={[styles.label, { marginTop: 14 }]}>RC / BN Number</Text>
                  <View style={styles.inlineRow}>
                    <TextInput style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
                      value={rcbn} onChangeText={v => { setRcbn(v); setRcbnOtpSent(false) }}
                      placeholder="RC/XXXXXXX or BN/XXXXXXX" placeholderTextColor="#9ca3af" autoCapitalize="characters" />
                    <TouchableOpacity style={[styles.sendCodeBtn, rcbnLoading && { opacity: 0.6 }]}
                      onPress={sendRcbnOtp} disabled={rcbnLoading}>
                      {rcbnLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendCodeText}>Verify</Text>}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.fieldHint}>Your CAC registration number (RC or BN).</Text>
                  {rcbnOtpSent && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.label}>Enter RC/BN OTP</Text>
                      <OtpInput value={rcbnOtp} onChange={v => setRcbnOtp(v.replace(/\D/g, ''))} />
                      <TouchableOpacity style={[styles.btn, { marginTop: 10 }, rcbnLoading && styles.btnDisabled]} onPress={verifyRcbnOtp} disabled={rcbnLoading}>
                        {rcbnLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirm RC/BN OTP</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* Create account button */}
              <TouchableOpacity style={[styles.btn, { marginTop: 24 }, regLoading && styles.btnDisabled]} onPress={createAccount} disabled={regLoading}>
                {regLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create account  →</Text>}
              </TouchableOpacity>
              <Text style={[styles.fieldHint, { textAlign: 'center', marginTop: 8 }]}>Verify your email to continue</Text>

              <View style={[styles.switchRow, { marginTop: 12 }]}>
                <Text style={styles.switchText}>Have an account? </Text>
                <TouchableOpacity onPress={() => setMode('login')}><Text style={styles.link}>Sign In</Text></TouchableOpacity>
              </View>
            </>
          )}

          {/* Public buttons */}
          <View style={styles.publicWrap}>
            <Text style={styles.publicLabel}>No account needed</Text>
            <TouchableOpacity style={styles.staffLinkBtn} onPress={onStaffLink}>
              <Text style={styles.staffLinkText}>Staff Login</Text>
            </TouchableOpacity>
            <View style={styles.publicRow}>
              <TouchableOpacity style={styles.publicBtn} onPress={() => onPublicNavigate('generate')}>
                <Text style={styles.publicBtnText}>Generate Invoice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.publicBtn} onPress={() => onPublicNavigate('verify')}>
                <Text style={styles.publicBtnText}>Verify Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.centerBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={onChangeCountry}>
            <Text style={{ fontSize: 14, marginRight: 5 }}>🌍</Text>
            <Text style={styles.backLink}>Change country</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  countryPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a3728', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'center', marginBottom: 16 },
  countryFlag: { fontSize: 16, marginRight: 6 },
  countryLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14, elevation: 4 },
  logo: { width: 80, height: 80, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 18, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#fafafa' },
  codeInput: { fontSize: 18, letterSpacing: 4, fontWeight: '700', textAlign: 'center' },
  btn: { backgroundColor: '#1a3728', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  switchText: { color: '#6b7280', fontSize: 14 },
  link: { color: '#1a3728', fontWeight: '700', fontSize: 14 },
  backLink: { color: '#6b7280', fontSize: 13 },
  centerBtn: { alignItems: 'center', paddingVertical: 12 },
  staffLinkBtn: { alignSelf: 'center', backgroundColor: '#1a3728', borderRadius: 20, paddingHorizontal: 32, paddingVertical: 11, marginBottom: 12 },
  staffLinkText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tagline: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 10, letterSpacing: 0.3 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { color: '#9ca3af', marginHorizontal: 10, fontSize: 12 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12 },
  googleIcon: { width: 22, height: 22, marginRight: 10 },
  googleText: { fontWeight: '600', fontSize: 14, color: '#374151' },
  stepBar: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  stepDot: { flex: 1, height: 4, borderRadius: 2 },
  otpInput: { borderWidth: 2, borderColor: '#1a3728', borderRadius: 10, padding: 14, fontSize: 24, color: '#111827', backgroundColor: '#f0f5f2', textAlign: 'center', letterSpacing: 10, fontWeight: '700' },
  infoBox: { backgroundColor: '#f0f5f2', borderRadius: 10, padding: 14, marginBottom: 18, borderLeftWidth: 3, borderLeftColor: '#1a3728' },
  infoText: { fontSize: 13, color: '#1a3728', lineHeight: 20 },
  warnBox: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 14, marginBottom: 18, alignItems: 'center' },
  warnText: { fontSize: 13, color: '#92400e', textAlign: 'center' },
  hint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3, marginBottom: 18 },
  toggleBtn: { flex: 1, padding: 9, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff' },
  toggleText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  toggleTextActive: { color: '#1a3728' },
  publicWrap: { marginTop: 22, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16 },
  publicLabel: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginBottom: 10 },
  publicRow: { flexDirection: 'row', gap: 8 },
  publicBtn: { flex: 1, borderWidth: 1, borderColor: '#1a3728', borderRadius: 10, padding: 10, alignItems: 'center' },
  publicBtnText: { color: '#1a3728', fontWeight: '700', fontSize: 12 },
  verifyWrap: { flex: 1, backgroundColor: '#f0f5f2', justifyContent: 'center', padding: 24 },
  verifyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center' },
  verifyEmoji: { fontSize: 48, marginBottom: 16 },
  verifyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  verifySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  // registration new styles
  acctTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  acctTypeBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14 },
  acctTypeBtnActive: { borderColor: '#1a3728', backgroundColor: '#f0f5f2' },
  acctTypeTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 4 },
  acctTypeTitleActive: { color: '#1a3728' },
  acctTypeSub: { fontSize: 12, color: '#9ca3af' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sendCodeBtn: { backgroundColor: '#1a3728', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  sendCodeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  pwWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fafafa', marginBottom: 4, overflow: 'hidden' },
  eyeBtn: { paddingHorizontal: 12 },
  eyeIcon: { fontSize: 18 },
  fieldHint: { fontSize: 12, color: '#1a3728', marginTop: 4, marginBottom: 2 },
})
