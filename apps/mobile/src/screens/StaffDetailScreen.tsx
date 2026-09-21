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
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const FOREST_GREEN = '#1b7a4d'
const FOREST_DARK = '#064e3b'
const ACCENT_LIGHT = '#ecfdf5'
const BASE = 'https://www.digitalreceipt.ng'

async function fetchWithTimeout(url: string, options: RequestInit, ms = 15000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...options, signal: ctrl.signal }) }
  catch (e: any) {
    if (e.name === 'AbortError') throw new Error('Request timed out.')
    throw e
  } finally { clearTimeout(t) }
}

const ACCESS_LEVELS = [
  { key: 'generate_only', label: 'Generate Receipt Only', desc: 'Can only generate receipts. No dashboard access.' },
  { key: 'partial', label: 'Partial Access', desc: 'Can view receipts but cannot edit, delete, or update payment.' },
  { key: 'full', label: 'All Access', desc: 'Full dashboard access — same as the account owner.' },
]

export default function StaffDetailScreen({ route, navigation }: any) {
  const initialMember = route.params?.member ?? {}
  const [member, setMember] = useState<any>(initialMember)
  const [token, setToken] = useState<string | null>(null)

  // Rename
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(member.display_name || '')
  const [savingName, setSavingName] = useState(false)

  // Access level
  const [savingAccess, setSavingAccess] = useState(false)

  // Active toggle
  const [savingActive, setSavingActive] = useState(false)

  // Activities
  const [showActivities, setShowActivities] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // Remove staff
  const [showRemove, setShowRemove] = useState(false)
  const [removeStep, setRemoveStep] = useState<'confirm' | 'otp'>('confirm')
  const [sessionToken, setSessionToken] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [removeOtp, setRemoveOtp] = useState('')
  const [removeLoading, setRemoveLoading] = useState(false)
  const [removeError, setRemoveError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null)
    })
  }, [])

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }

  async function safeJson(res: Response) {
    try {
      const text = await res.text()
      return text && text.trim() ? JSON.parse(text) : {}
    } catch {
      return {}
    }
  }

  async function saveName() {
    if (!nameDraft.trim() || !token) return
    setSavingName(true)
    try {
      const res = await fetchWithTimeout(`${BASE}/api/staff/${member.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ display_name: nameDraft.trim() }),
      })
      if (res.ok) {
        setMember((p: any) => ({ ...p, display_name: nameDraft.trim() }))
        setEditingName(false)
      } else {
        const d = await safeJson(res)
        Alert.alert('Error', d.error || 'Could not save name')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSavingName(false)
    }
  }

  async function changeAccessLevel(level: string) {
    if (!token) return
    setSavingAccess(true)
    try {
      const res = await fetchWithTimeout(`${BASE}/api/staff/${member.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ access_level: level }),
      })
      if (res.ok) {
        setMember((p: any) => ({ ...p, access_level: level }))
      } else {
        const d = await safeJson(res)
        Alert.alert('Error', d.error || 'Could not update access level')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSavingAccess(false)
    }
  }

  async function toggleActive() {
    if (!token) return
    const newActive = !member.is_active
    setSavingActive(true)
    try {
      const res = await fetchWithTimeout(`${BASE}/api/staff/${member.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: newActive }),
      })
      if (res.ok) {
        setMember((p: any) => ({ ...p, is_active: newActive }))
      } else {
        const d = await safeJson(res)
        Alert.alert('Error', d.error || 'Could not update status')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSavingActive(false)
    }
  }

  async function loadActivities() {
    if (!token) return
    setShowActivities(true)
    setActivitiesLoading(true)
    setActivities([])
    try {
      const res = await fetchWithTimeout(`${BASE}/api/staff/${member.id}/activities`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await safeJson(res)
      setActivities(data.receipts ?? [])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setActivitiesLoading(false)
    }
  }

  async function initiateRemove() {
    if (!token) return
    setRemoveLoading(true)
    setRemoveError('')
    try {
      const res = await fetchWithTimeout(`${BASE}/api/staff/${member.id}/remove/initiate`, {
        method: 'POST',
        headers: authHeaders(),
        body: '{}',
      })
      const data = await safeJson(res)
      if (!res.ok) { setRemoveError(data.error || 'Could not send code.'); setRemoveLoading(false); return }
      setSessionToken(data.sessionToken)
      setMaskedPhone(data.masked)
      setRemoveStep('otp')
    } catch (e: any) {
      setRemoveError(e.message)
    } finally {
      setRemoveLoading(false)
    }
  }

  async function confirmRemove() {
    if (!token || !removeOtp.trim()) return
    setRemoveLoading(true)
    setRemoveError('')
    try {
      const res = await fetchWithTimeout(`${BASE}/api/staff/${member.id}/remove/confirm`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ sessionToken, code: removeOtp.trim() }),
      })
      const data = await safeJson(res)
      if (!res.ok) { setRemoveError(data.error || 'Incorrect code.'); setRemoveLoading(false); return }
      setShowRemove(false)
      Alert.alert('Removed', `${member.display_name || 'Staff member'} has been removed and logged out.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (e: any) {
      setRemoveError(e.message)
    } finally {
      setRemoveLoading(false)
    }
  }

  const displayName = member.display_name || member.email || member.phone || 'Staff Member'
  const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?'

  return (
    <SafeAreaView style={s.safeContainer}>
      {/* Integrated Header Bar with Back Button & Page Title */}
      <View style={s.navBar}>
        <TouchableOpacity
          style={s.backButton}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>Staff Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Header Card */}
        <View style={s.headerCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <View style={s.nameEditRow}>
                <TextInput
                  style={s.nameInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoFocus
                  placeholder="Full name"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity style={s.nameEditSave} onPress={saveName} disabled={savingName}>
                  {savingName ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.nameEditSaveText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.nameEditCancel} onPress={() => setEditingName(false)}>
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.memberName}>{displayName}</Text>
                <TouchableOpacity onPress={() => { setNameDraft(member.display_name || ''); setEditingName(true) }}>
                  <Ionicons name="pencil" size={15} color="#475569" />
                </TouchableOpacity>
              </View>
            )}
            <Text style={s.memberContact}>{member.email || member.phone}</Text>
            <Text style={s.memberRole}>{member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Staff'}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: member.is_active ? ACCENT_LIGHT : '#fffbebf' }]}>
            <Text style={[s.statusText, { color: member.is_active ? FOREST_GREEN : '#d97706' }]}>
              {member.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Active / Inactive Toggle */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Account Status</Text>
          <TouchableOpacity
            style={[
              s.toggleBtn,
              {
                backgroundColor: member.is_active ? '#fffbebf' : ACCENT_LIGHT,
                borderColor: member.is_active ? '#f59e0b' : FOREST_GREEN,
              },
            ]}
            onPress={toggleActive}
            disabled={savingActive}
          >
            {savingActive ? (
              <ActivityIndicator color={FOREST_GREEN} size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Ionicons
                  name={member.is_active ? 'pause-outline' : 'play-outline'}
                  size={16}
                  color={member.is_active ? '#d97706' : FOREST_GREEN}
                />
                <Text style={[s.toggleBtnText, { color: member.is_active ? '#d97706' : FOREST_GREEN }]}>
                  {member.is_active ? 'Deactivate Staff' : 'Activate Staff'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Access Level */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Access Level</Text>
          {savingAccess && <ActivityIndicator color={FOREST_GREEN} style={{ marginBottom: 8 }} />}
          {ACCESS_LEVELS.map(al => (
            <TouchableOpacity
              key={al.key}
              style={[s.accessCard, member.access_level === al.key && s.accessCardActive]}
              onPress={() => changeAccessLevel(al.key)}
              disabled={savingAccess}
              activeOpacity={0.8}
            >
              <View style={s.accessTop}>
                <View style={[s.radio, member.access_level === al.key && s.radioActive]}>
                  {member.access_level === al.key && <View style={s.radioDot} />}
                </View>
                <Text style={[s.accessLabel, member.access_level === al.key && { color: FOREST_GREEN }]}>{al.label}</Text>
              </View>
              <Text style={s.accessDesc}>{al.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Actions</Text>
          <TouchableOpacity style={s.actionBtn} onPress={loadActivities}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="stats-chart-outline" size={18} color="#334155" />
              <Text style={s.actionBtnText}>View Activities</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.actionBtn} onPress={() => { setShowRemove(true); setRemoveStep('confirm'); setRemoveOtp(''); setRemoveError('') }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text style={[s.actionBtnText, { color: '#dc2626' }]}>Remove Staff Member</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* Member Since */}
        {member.created_at && (
          <Text style={s.memberSince}>
            Added {new Date(member.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        )}

        {/* Activities Modal */}
        <Modal visible={showActivities} animationType="slide" onRequestClose={() => setShowActivities(false)}>
          <SafeAreaView style={s.modalContainer}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>{displayName}'s Activities</Text>
                <Text style={s.modalSub}>Receipts issued by this staff member</Text>
              </View>
              <TouchableOpacity style={s.modalClose} onPress={() => setShowActivities(false)}>
                <Ionicons name="close" size={16} color="#ffffff" />
                <Text style={s.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            {activitiesLoading ? (
              <ActivityIndicator color={FOREST_GREEN} size="large" style={{ marginTop: 60 }} />
            ) : activities.length === 0 ? (
              <Text style={s.empty}>No receipts issued yet.</Text>
            ) : (
              <FlatList
                data={activities}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <View style={s.activityRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityName}>{item.buyer_name || '—'}</Text>
                      <Text style={s.activityMeta}>
                        {item.receipt_number} · {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={s.activityAmount}>
                      {item.currency ?? '₦'}{Number(item.total_amount ?? 0).toLocaleString()}
                    </Text>
                  </View>
                )}
              />
            )}
          </SafeAreaView>
        </Modal>

        {/* Remove Modal */}
        <Modal visible={showRemove} animationType="fade" transparent onRequestClose={() => setShowRemove(false)}>
          <View style={s.overlay}>
            <View style={s.removeCard}>
              <View style={s.removeHeader}>
                <Text style={s.removeTitle}>Remove Staff Member</Text>
                <TouchableOpacity onPress={() => setShowRemove(false)}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {removeStep === 'confirm' ? (
                <View style={{ padding: 20, gap: 16 }}>
                  <View style={s.removeWarning}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                      <Ionicons name="warning-outline" size={18} color="#dc2626" style={{ marginTop: 2 }} />
                      <Text style={[s.removeWarningText, { flex: 1 }]}>
                        This will remove <Text style={{ fontWeight: '700' }}>{displayName}</Text> and immediately log them out. A confirmation code will be sent to your phone.
                      </Text>
                    </View>
                  </View>
                  {removeError ? <Text style={s.errorText}>{removeError}</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#f1f5f9' }]} onPress={() => setShowRemove(false)}>
                      <Text style={[s.btnText, { color: '#334155' }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.btn, { flex: 1, backgroundColor: '#dc2626' }, removeLoading && { opacity: 0.6 }]}
                      onPress={initiateRemove}
                      disabled={removeLoading}
                    >
                      {removeLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Code</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ padding: 20, gap: 16 }}>
                  <Text style={{ color: '#334155', fontSize: 14 }}>
                    Enter the code sent to <Text style={{ fontWeight: '700' }}>{maskedPhone}</Text>.
                  </Text>
                  <TextInput
                    style={s.otpInput}
                    value={removeOtp}
                    onChangeText={v => setRemoveOtp(v.replace(/\D/g, '').slice(0, 6))}
                    placeholder="------"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  {removeError ? <Text style={s.errorText}>{removeError}</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#f1f5f9' }]} onPress={() => { setRemoveStep('confirm'); setRemoveOtp(''); setRemoveError('') }}>
                      <Text style={[s.btnText, { color: '#334155' }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.btn, { flex: 1, backgroundColor: '#dc2626' }, (removeLoading || removeOtp.length < 6) && { opacity: 0.6 }]}
                      onPress={confirmRemove}
                      disabled={removeLoading || removeOtp.length < 6}
                    >
                      {removeLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Confirm Remove</Text>}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={initiateRemove} disabled={removeLoading} style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>Didn't receive it? Resend code</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#f8fafc' },

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

  // Cards
  headerCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: FOREST_GREEN, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 20 },
  memberName: { fontSize: 17, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  memberContact: { color: '#64748b', fontSize: 13, marginTop: 2 },
  memberRole: { color: FOREST_GREEN, fontSize: 12, fontWeight: '700', marginTop: 4, textTransform: 'capitalize' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },

  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameInput: { flex: 1, borderWidth: 1, borderColor: FOREST_GREEN, borderRadius: 8, padding: 8, fontSize: 14, color: '#0f172a' },
  nameEditSave: { backgroundColor: FOREST_GREEN, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  nameEditSaveText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  nameEditCancel: { padding: 8 },

  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  toggleBtn: { borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  toggleBtnText: { fontWeight: '700', fontSize: 14 },

  accessCard: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 13, marginBottom: 10, backgroundColor: '#ffffff' },
  accessCardActive: { borderColor: FOREST_GREEN, backgroundColor: ACCENT_LIGHT },
  accessTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioActive: { borderColor: FOREST_GREEN },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: FOREST_GREEN },
  accessLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  accessDesc: { fontSize: 12, color: '#64748b', lineHeight: 17, paddingLeft: 28 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  actionBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  memberSince: { textAlign: 'center', color: '#94a3b8', fontSize: 12, paddingTop: 4, paddingBottom: 24 },

  // Activities Modal
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { backgroundColor: FOREST_DARK, paddingVertical: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  modalSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  modalClose: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  modalCloseText: { color: '#ffffff', fontSize: 13, fontWeight: '600', marginLeft: 4 },
  activityRow: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  activityName: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  activityMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  activityAmount: { fontWeight: '800', color: FOREST_GREEN, fontSize: 15 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 14 },

  // Remove Modal
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', padding: 20 },
  removeCard: { backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden' },
  removeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  removeTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  removeWarning: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#dc2626' },
  removeWarningText: { color: '#dc2626', fontSize: 13, lineHeight: 19 },
  errorText: { color: '#dc2626', fontSize: 13, backgroundColor: '#fef2f2', borderRadius: 8, padding: 10 },
  otpInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 24, letterSpacing: 10, textAlign: 'center', fontWeight: '800', color: '#0f172a' },
  btn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
})
