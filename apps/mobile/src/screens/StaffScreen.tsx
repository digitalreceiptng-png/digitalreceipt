import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const FOREST_GREEN = '#1b7a4d'
const FOREST_DARK = '#064e3b'
const ACCENT_LIGHT = '#ecfdf5'

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
    desc: 'Can only generate receipts. After generating, may email, download, print, SMS, or copy link.',
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
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const res = await fetch('https://www.digitalreceipt.ng/api/staff', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const text = await res.text()
        const data = text ? JSON.parse(text) : null
        if (data?.members) {
          setStaff(data.members)
          setLoading(false)
          return
        }
      } catch (e) {
        console.log('API fetch staff error:', e)
      }

      // Fallback: Direct database query
      try {
        const { data: members, error } = await supabase
          .from('staff_members')
          .select('id, display_name, email, phone, role, access_level, is_active, created_at')
          .eq('owner_id', session.user.id)
          .order('created_at', { ascending: false })

        if (!error && members) {
          setStaff(members)
        }
      } catch (dbErr) {
        console.log('DB staff query error:', dbErr)
      } finally {
        setLoading(false)
      }
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

  async function addStaffMember() {
    if (!validateContact()) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      let addedMember: any = null

      // 1. Try backend API POST
      try {
        const res = await fetch('https://www.digitalreceipt.ng/api/staff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            display_name: staffName.trim(),
            email: contactType === 'email' ? contactValue.trim() : null,
            phone: contactType === 'phone' ? contactValue.trim() : null,
            role: role.toLowerCase(),
            access_level: access,
          }),
        })

        const text = await res.text()
        let resData: any = null
        if (text && text.trim()) {
          try { resData = JSON.parse(text) } catch {}
        }

        if (res.ok && resData?.member) {
          addedMember = resData.member
        } else if (resData?.error) {
          throw new Error(resData.error)
        }
      } catch (apiErr: any) {
        if (apiErr?.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('JSON')) {
          throw apiErr
        }
      }

      // 2. Direct Supabase insert fallback
      if (!addedMember) {
        const { data: inserted, error: insertError } = await supabase
          .from('staff_members')
          .insert({
            owner_id: session.user.id,
            display_name: staffName.trim(),
            email: contactType === 'email' ? contactValue.trim() : null,
            phone: contactType === 'phone' ? contactValue.trim() : null,
            role: role.toLowerCase(),
            access_level: access,
            is_active: true,
            status: 'active',
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (insertError) {
          if (insertError.message?.includes('row-level security')) {
            throw new Error('Database RLS Error: Please run supabase-staff-rls.sql in Supabase Dashboard to allow staff creation.')
          }
          throw insertError
        }
        addedMember = inserted
      }

      setStaff(prev => [addedMember, ...prev])
      resetForm()
      Alert.alert('Staff Added!', `${staffName.trim()} has been added successfully.`)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add staff member')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setStaffName('')
    setContactValue('')
    setRole('Staff')
    setAccess('full')
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Integrated Header Bar with Back Button & Page Title */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Staff Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Add Staff Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Staff Member</Text>
          <Text style={styles.cardSub}>Grant team members access to issue or manage receipts.</Text>

          {/* Staff name */}
          <Text style={styles.fieldLabel}>Staff Name *</Text>
          <TextInput
            style={styles.input}
            value={staffName}
            onChangeText={setStaffName}
            placeholder="e.g. Victor Okafor"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
          />

          {/* Contact type toggle */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Add via</Text>
          <View style={styles.toggleRow}>
            {(['email', 'phone'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.toggleBtn, contactType === t && styles.toggleBtnActive]}
                onPress={() => { setContactType(t); setContactValue('') }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={t === 'email' ? "mail-outline" : "call-outline"} size={16} color={contactType === t ? FOREST_GREEN : '#64748b'} />
                  <Text style={[styles.toggleText, contactType === t && styles.toggleTextActive]}>
                    {t === 'email' ? 'Email Address' : 'Phone Number'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contact input */}
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={contactValue}
            onChangeText={setContactValue}
            placeholder={contactType === 'email' ? 'staff@example.com' : '+234 80...'}
            placeholderTextColor="#94a3b8"
            keyboardType={contactType === 'email' ? 'email-address' : 'phone-pad'}
            autoCapitalize="none"
          />

          {/* Role */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Role</Text>
          <View style={styles.chipRow}>
            {ROLES.map(r => (
              <TouchableOpacity key={r} style={[styles.chip, role === r && styles.chipActive]} onPress={() => setRole(r)}>
                <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Access level */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Access Level</Text>
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
                <Text style={[styles.accessLabel, access === al.key && { color: FOREST_GREEN }]}>{al.label}</Text>
              </View>
              <Text style={styles.accessDesc}>{al.desc}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 18 }, submitting && { opacity: 0.6 }]}
            onPress={addStaffMember}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Add Staff Member</Text>}
          </TouchableOpacity>
        </View>

        {/* Staff Members List */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.listTitle}>STAFF MEMBERS ({staff.length})</Text>

          {loading ? (
            <ActivityIndicator color={FOREST_GREEN} style={{ marginTop: 20 }} />
          ) : staff.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={32} color="#cbd5e1" />
              <Text style={styles.empty}>No staff members added yet.</Text>
            </View>
          ) : (
            staff.map(m => (
              <TouchableOpacity
                key={m.id}
                style={styles.staffRow}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('StaffDetail', { member: m })}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(m.display_name || m.email || m.phone || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{m.display_name || m.email || m.phone}</Text>
                  <Text style={styles.staffContact}>{m.email || m.phone}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={styles.staffRole}>{m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : 'Staff'}</Text>
                    <Text style={styles.staffAccess}>
                      {m.access_level === 'full' ? '· Full Access' : m.access_level === 'partial' ? '· Partial Access' : '· Generate Only'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.badge, { backgroundColor: m.is_active ? ACCENT_LIGHT : '#fffbebf' }]}>
                    <Text style={[styles.badgeText, { color: m.is_active ? FOREST_GREEN : '#d97706' }]}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Top Nav Bar
  navBar: {
    height: 54,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 4,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },

  // Form Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 16,
    marginBottom: 0,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#64748b', marginBottom: 14 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  toggleBtnActive: { backgroundColor: ACCENT_LIGHT, borderColor: FOREST_GREEN },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: FOREST_GREEN, fontWeight: '700' },

  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: FOREST_GREEN },
  chipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: '#ffffff' },

  accessCard: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 13, marginBottom: 10, backgroundColor: '#ffffff' },
  accessCardActive: { borderColor: FOREST_GREEN, backgroundColor: ACCENT_LIGHT },
  accessTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  accessRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  accessRadioActive: { borderColor: FOREST_GREEN },
  accessRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: FOREST_GREEN },
  accessLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  accessDesc: { fontSize: 12, color: '#64748b', lineHeight: 17, paddingLeft: 28 },

  primaryBtn: {
    backgroundColor: FOREST_GREEN,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },

  // List Section
  listTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, letterSpacing: 0.8 },
  staffRow: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: FOREST_GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  staffInfo: { flex: 1 },
  staffName: { fontWeight: '800', color: '#0f172a', fontSize: 15 },
  staffContact: { color: '#64748b', fontSize: 12, marginTop: 2 },
  staffRole: { color: FOREST_GREEN, fontSize: 12, fontWeight: '700' },
  staffAccess: { color: '#94a3b8', fontSize: 12 },
  badge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', marginTop: 30, marginBottom: 20 },
  empty: { color: '#94a3b8', fontSize: 14, marginTop: 8 },
})
