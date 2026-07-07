import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import BackRow from '../components/BackRow'

const G = '#1a3728'

const ROLES = ['Staff', 'Manager', 'Admin']

const ACCESS_LEVELS = [
  {
    key: 'full',
    label: 'Full Access',
    desc: 'All features — create, edit, delete, manage receipts and settings.',
  },
  {
    key: 'partial',
    label: 'Partial Access',
    desc: 'Can view receipts but cannot delete, edit, or update payment.',
  },
  {
    key: 'generate_only',
    label: 'Generate Receipt Only',
    desc: 'Can only generate receipts. After generating, may email, download, print, SMS, add to group, or copy link. Cannot schedule, split, merge, or update payment.',
  },
]

export default function StaffScreen({ navigation }: any) {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [staffName, setStaffName] = useState('')
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const [contactValue, setContactValue] = useState('')
  const [role, setRole] = useState('Staff')
  const [access, setAccess] = useState('full')

  // OTP flow
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const res = await fetch('https://www.digitalreceipt.ng/api/staff', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json()
        setStaff(data.members || [])
      } catch {}
      setLoading(false)
    })()
  }, [])

  function validateContact() {
    if (!staffName.trim()) { Alert.alert('Required', 'Enter staff member name.'); return false }
    if (contactType === 'email') {
      if (!contactValue.trim() || !contactValue.includes('@')) { Alert.alert('Invalid email', 'Enter a valid email address.'); return false }
    } else {
      if (!contactValue.trim() || contactValue.replace(/\D/g, '').length < 10) { Alert.alert('Invalid phone', 'Enter a valid phone number.'); return false }
    }
    return true
  }

  async function sendOtp() {
    if (!validateContact()) return
    setSending(true)
    try {
      // Send OTP via Supabase auth (email) or SMS edge function
      if (contactType === 'email') {
        const { error } = await supabase.auth.signInWithOtp({ email: contactValue.trim() })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: contactValue.trim() })
        if (error) throw error
      }
      setOtpSent(true)
      Alert.alert('Code Sent', `A login code has been sent to ${contactValue.trim()}.`)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send OTP')
    } finally {
      setSending(false)
    }
  }

  async function verifyAndAdd() {
    if (!otp.trim() || otp.length < 4) { Alert.alert('Required', 'Enter the OTP.'); return }
    setVerifying(true)
    try {
      // Verify OTP
      const verifyPayload = contactType === 'email'
        ? { email: contactValue.trim(), token: otp.trim(), type: 'email' as const }
        : { phone: contactValue.trim(), token: otp.trim(), type: 'sms' as const }

      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp(verifyPayload)
      if (verifyError) throw verifyError

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('staff_members').insert({
        owner_id: user.id,
        display_name: staffName.trim(),
        email: contactType === 'email' ? contactValue.trim() : null,
        phone: contactType === 'phone' ? contactValue.trim() : null,
        role: role.toLowerCase(),
        access_level: access,
        is_active: true,
        status: 'active',
        created_at: new Date().toISOString(),
      }).select().single()

      if (error) throw error

      setStaff(p => [data, ...p])
      setStaffName('')
      setContactValue('')
      setOtp('')
      setOtpSent(false)
      Alert.alert('Added!', `${staffName} has been added as a staff member.`)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  function resetForm() {
    setStaffName('')
    setContactValue('')
    setOtp('')
    setOtpSent(false)
    setRole('Staff')
    setAccess('full')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <BackRow navigation={navigation} />

      {/* Add Staff Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Staff Member</Text>

        {/* Staff name */}
        <Text style={styles.label}>Staff Name</Text>
        <TextInput
          style={styles.input}
          value={staffName}
          onChangeText={setStaffName}
          placeholder="Full name"
          placeholderTextColor="#9ca3af"
          autoCapitalize="words"
          editable={!otpSent}
        />

        {/* Contact type toggle */}
        <Text style={[styles.label, { marginTop: 14 }]}>Add via</Text>
        <View style={styles.toggleRow}>
          {(['email', 'phone'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, contactType === t && styles.toggleBtnActive]}
              onPress={() => { setContactType(t); setContactValue(''); setOtpSent(false); setOtp('') }}
              disabled={otpSent}
            >
              <Text style={[styles.toggleText, contactType === t && styles.toggleTextActive]}>
                {t === 'email' ? '✉ Email' : '📱 Phone Number'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact input */}
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={contactValue}
          onChangeText={setContactValue}
          placeholder={contactType === 'email' ? 'staff@example.com' : '+234 80...'}
          placeholderTextColor="#9ca3af"
          keyboardType={contactType === 'email' ? 'email-address' : 'phone-pad'}
          autoCapitalize="none"
          editable={!otpSent}
        />

        {!otpSent ? (
          <>
            {/* Role */}
            <Text style={[styles.label, { marginTop: 14 }]}>Role</Text>
            <View style={styles.chipRow}>
              {ROLES.map(r => (
                <TouchableOpacity key={r} style={[styles.chip, role === r && styles.chipActive]} onPress={() => setRole(r)}>
                  <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Access level */}
            <Text style={[styles.label, { marginTop: 16 }]}>Access Level</Text>
            {ACCESS_LEVELS.map(al => (
              <TouchableOpacity
                key={al.key}
                style={[styles.accessCard, access === al.key && styles.accessCardActive]}
                onPress={() => setAccess(al.key)}
                activeOpacity={0.8}
              >
                <View style={styles.accessTop}>
                  <View style={[styles.accessRadio, access === al.key && styles.accessRadioActive]}>
                    {access === al.key && <View style={styles.accessRadioDot} />}
                  </View>
                  <Text style={[styles.accessLabel, access === al.key && { color: G }]}>{al.label}</Text>
                </View>
                <Text style={styles.accessDesc}>{al.desc}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.btn, { marginTop: 18 }, sending && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={sending}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP to Verify</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.otpNotice}>
              <Text style={styles.otpNoticeText}>
                A verification code was sent to {contactValue}. Share it with {staffName || 'the staff member'} to confirm.
              </Text>
            </View>
            <Text style={[styles.label, { marginTop: 14 }]}>Enter OTP</Text>
            <TextInput
              style={[styles.input, { letterSpacing: 8, fontSize: 20, textAlign: 'center', fontWeight: '700' }]}
              value={otp}
              onChangeText={v => setOtp(v.replace(/\D/g, ''))}
              placeholder="------"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.btn, { marginTop: 14 }, verifying && styles.btnDisabled]}
              onPress={verifyAndAdd}
              disabled={verifying}
            >
              {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Add Staff</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Staff List */}
      <Text style={styles.listTitle}>Staff Members</Text>

      {loading
        ? <ActivityIndicator color={G} style={{ marginTop: 20 }} />
        : staff.length === 0
          ? <Text style={styles.empty}>No staff members yet.</Text>
          : staff.map(m => (
            <View key={m.id} style={styles.staffRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(m.display_name || m.email || m.phone || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{m.display_name || m.email || m.phone}</Text>
                <Text style={styles.staffContact}>{m.email || m.phone}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                  <Text style={styles.staffRole}>{m.role || 'Staff'}</Text>
                  <Text style={styles.staffAccess}>
                    {m.access_level === 'full' ? '· Full Access' : m.access_level === 'partial' ? '· Partial Access' : '· Generate Only'}
                  </Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: m.status === 'active' ? '#c8ddd1' : '#fef3c7' }]}>
                <Text style={[styles.badgeText, { color: m.status === 'active' ? G : '#92400e' }]}>{m.status || 'Pending'}</Text>
              </View>
            </View>
          ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: G, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#fafafa' },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent' },
  toggleBtnActive: { backgroundColor: '#f0f5f2', borderColor: G },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  toggleTextActive: { color: G, fontWeight: '700' },

  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, padding: 9, borderRadius: 8, alignItems: 'center', backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: G },
  chipText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  chipTextActive: { color: '#fff' },

  accessCard: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 13, marginBottom: 10, backgroundColor: '#fafafa' },
  accessCardActive: { borderColor: G, backgroundColor: '#f0f5f2' },
  accessTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  accessRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  accessRadioActive: { borderColor: G },
  accessRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: G },
  accessLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  accessDesc: { fontSize: 12, color: '#6b7280', lineHeight: 17, paddingLeft: 28 },

  otpNotice: { backgroundColor: '#f0f5f2', borderRadius: 10, padding: 12, marginTop: 12, borderLeftWidth: 3, borderLeftColor: G },
  otpNoticeText: { fontSize: 13, color: '#374151', lineHeight: 18 },

  btn: { backgroundColor: G, borderRadius: 10, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#6b7280', fontSize: 13 },

  listTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', paddingHorizontal: 16, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  staffRow: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f0f5f2', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 17, fontWeight: '800', color: G },
  staffInfo: { flex: 1 },
  staffName: { fontWeight: '700', color: '#111827', fontSize: 15 },
  staffContact: { color: '#6b7280', fontSize: 12 },
  staffRole: { color: G, fontSize: 12, fontWeight: '700' },
  staffAccess: { color: '#9ca3af', fontSize: 12 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
})
