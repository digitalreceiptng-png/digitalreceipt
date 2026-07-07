import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native'
import { supabase } from '../lib/supabase'
import BackRow from '../components/BackRow'

const G = '#1a3728'
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
        const d = await res.json()
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
        const d = await res.json()
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
        const d = await res.json()
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
      const data = await res.json()
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
      const data = await res.json()
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
      const data = await res.json()
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
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <BackRow navigation={navigation} />

      {/* Header card */}
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
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity style={s.nameEditSave} onPress={saveName} disabled={savingName}>
                {savingName ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.nameEditSaveText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.nameEditCancel} onPress={() => setEditingName(false)}>
                <Text style={s.nameEditCancelText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.memberName}>{displayName}</Text>
              <TouchableOpacity onPress={() => { setNameDraft(member.display_name || ''); setEditingName(true) }}>
                <Text style={s.editIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={s.memberContact}>{member.email || member.phone}</Text>
          <Text style={s.memberRole}>{member.role || 'Staff'}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: member.is_active ? '#c8ddd1' : '#fef3c7' }]}>
          <Text style={[s.statusText, { color: member.is_active ? G : '#92400e' }]}>
            {member.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Active / Inactive toggle */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Account Status</Text>
        <TouchableOpacity
          style={[s.toggleBtn, { backgroundColor: member.is_active ? '#fef3c7' : '#f0f5f2', borderColor: member.is_active ? '#f59e0b' : G }]}
          onPress={toggleActive}
          disabled={savingActive}
        >
          {savingActive
            ? <ActivityIndicator color={G} size="small" />
            : <Text style={[s.toggleBtnText, { color: member.is_active ? '#92400e' : G }]}>
                {member.is_active ? '⏸ Deactivate Staff' : '▶ Activate Staff'}
              </Text>}
        </TouchableOpacity>
      </View>

      {/* Access level */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Access Level</Text>
        {savingAccess && <ActivityIndicator color={G} style={{ marginBottom: 8 }} />}
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
              <Text style={[s.accessLabel, member.access_level === al.key && { color: G }]}>{al.label}</Text>
            </View>
            <Text style={s.accessDesc}>{al.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Actions</Text>
        <TouchableOpacity style={s.actionBtn} onPress={loadActivities}>
          <Text style={s.actionBtnText}>📊 View Activities</Text>
          <Text style={s.actionArrow}>›</Text>
        </TouchableOpacity>
        <View style={s.divider} />
        <TouchableOpacity style={s.actionBtn} onPress={() => { setShowRemove(true); setRemoveStep('confirm'); setRemoveOtp(''); setRemoveError('') }}>
          <Text style={[s.actionBtnText, { color: '#dc2626' }]}>🗑 Remove Staff Member</Text>
          <Text style={[s.actionArrow, { color: '#dc2626' }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Member since */}
      {member.created_at && (
        <Text style={s.memberSince}>
          Added {new Date(member.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      )}

      {/* Activities Modal */}
      <Modal visible={showActivities} animationType="slide" onRequestClose={() => setShowActivities(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>{displayName}'s Activities</Text>
              <Text style={s.modalSub}>Receipts issued by this staff member</Text>
            </View>
            <TouchableOpacity style={s.modalClose} onPress={() => setShowActivities(false)}>
              <Text style={s.modalCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          {activitiesLoading
            ? <ActivityIndicator color={G} size="large" style={{ marginTop: 60 }} />
            : activities.length === 0
              ? <Text style={s.empty}>No receipts issued yet.</Text>
              : (
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
              )
          }
        </View>
      </Modal>

      {/* Remove Modal */}
      <Modal visible={showRemove} animationType="fade" transparent onRequestClose={() => setShowRemove(false)}>
        <View style={s.overlay}>
          <View style={s.removeCard}>
            <View style={s.removeHeader}>
              <Text style={s.removeTitle}>Remove Staff Member</Text>
              <TouchableOpacity onPress={() => setShowRemove(false)}>
                <Text style={{ fontSize: 20, color: '#6b7280' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {removeStep === 'confirm' ? (
              <View style={{ padding: 20, gap: 16 }}>
                <View style={s.removeWarning}>
                  <Text style={s.removeWarningText}>
                    ⚠️ This will remove <Text style={{ fontWeight: '700' }}>{displayName}</Text> and immediately log them out. A confirmation code will be sent to your phone.
                  </Text>
                </View>
                {removeError ? <Text style={s.errorText}>{removeError}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#f3f4f6' }]} onPress={() => setShowRemove(false)}>
                    <Text style={[s.btnText, { color: '#374151' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#dc2626' }, removeLoading && { opacity: 0.6 }]} onPress={initiateRemove} disabled={removeLoading}>
                    {removeLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Code</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ padding: 20, gap: 16 }}>
                <Text style={{ color: '#374151', fontSize: 14 }}>
                  Enter the code sent to <Text style={{ fontWeight: '700' }}>{maskedPhone}</Text>.
                </Text>
                <TextInput
                  style={s.otpInput}
                  value={removeOtp}
                  onChangeText={v => setRemoveOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="------"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {removeError ? <Text style={s.errorText}>{removeError}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#f3f4f6' }]} onPress={() => { setRemoveStep('confirm'); setRemoveOtp(''); setRemoveError('') }}>
                    <Text style={[s.btnText, { color: '#374151' }]}>Back</Text>
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
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>Didn't receive it? Resend code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  headerCard: { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: G, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  memberName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  memberContact: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  memberRole: { color: G, fontSize: 12, fontWeight: '700', marginTop: 3, textTransform: 'capitalize' },
  editIcon: { fontSize: 14 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameInput: { flex: 1, borderWidth: 1, borderColor: G, borderRadius: 8, padding: 8, fontSize: 14, color: '#111827' },
  nameEditSave: { backgroundColor: G, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  nameEditSaveText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  nameEditCancel: { padding: 8 },
  nameEditCancelText: { color: '#9ca3af', fontSize: 16 },
  section: { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  toggleBtn: { borderWidth: 1.5, borderRadius: 10, padding: 14, alignItems: 'center' },
  toggleBtnText: { fontWeight: '700', fontSize: 14 },
  accessCard: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 13, marginBottom: 10, backgroundColor: '#fafafa' },
  accessCardActive: { borderColor: G, backgroundColor: '#f0f5f2' },
  accessTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioActive: { borderColor: G },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: G },
  accessLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  accessDesc: { fontSize: 12, color: '#6b7280', lineHeight: 17, paddingLeft: 28 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  actionBtnText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  actionArrow: { color: '#9ca3af', fontSize: 20 },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  memberSince: { textAlign: 'center', color: '#9ca3af', fontSize: 12, paddingTop: 8, paddingBottom: 24 },
  // Activities modal
  modalContainer: { flex: 1, backgroundColor: '#f0f5f2' },
  modalHeader: { backgroundColor: G, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  modalClose: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  modalCloseText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  activityRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  activityName: { fontWeight: '700', color: '#111827', fontSize: 14 },
  activityMeta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  activityAmount: { fontWeight: '800', color: G, fontSize: 15 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14 },
  // Remove modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  removeCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  removeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  removeTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  removeWarning: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: '#dc2626' },
  removeWarningText: { color: '#dc2626', fontSize: 13, lineHeight: 19 },
  errorText: { color: '#dc2626', fontSize: 13, backgroundColor: '#fef2f2', borderRadius: 8, padding: 10 },
  otpInput: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, padding: 14, fontSize: 24, letterSpacing: 10, textAlign: 'center', fontWeight: '800', color: '#111827' },
  btn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
