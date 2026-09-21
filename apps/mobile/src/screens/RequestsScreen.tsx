import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, Modal, Linking, SafeAreaView,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const G = '#1a3728'
const BASE = 'https://www.digitalreceipt.ng'

const TABS = [
  { label: 'All',       value: '' },
  { label: 'Pending',   value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Rejected',  value: 'rejected' },
]

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#fef3c7', text: '#92400e' },
  confirmed: { bg: '#d1fae5', text: '#065f46' },
  rejected:  { bg: '#fee2e2', text: '#991b1b' },
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 15000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...opts, signal: ctrl.signal }) }
  catch (e: any) {
    if (e.name === 'AbortError') throw new Error('Request timed out.')
    throw e
  } finally { clearTimeout(t) }
}

export default function RequestsScreen({ navigation }: any) {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')
  const [token, setToken] = useState<string | null>(null)

  // Reject modal
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actioning, setActioning] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token ?? null))
  }, [])

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); setRefreshing(false); return }
      const params = new URLSearchParams()
      if (tab) params.set('status', tab)
      if (search.trim()) params.set('q', search.trim())
      const res = await fetchWithTimeout(`${BASE}/api/receipt-requests?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setSubmissions(data.submissions ?? [])
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [tab]))

  async function handleAction(id: string, status: 'confirmed' | 'rejected', reason?: string) {
    setActioning(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const res = await fetchWithTimeout(`${BASE}/api/receipt-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id, status, rejection_reason: reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setSubmissions(p => p.map(s => s.id === id ? { ...s, status, rejection_reason: reason } : s))
      setRejectId(null)
      setRejectReason('')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setActioning(false)
    }
  }

  function confirmAction(id: string, status: 'confirmed' | 'rejected') {
    if (status === 'rejected') {
      setRejectId(id)
      return
    }
    Alert.alert('Confirm Request', 'Mark this request as confirmed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => handleAction(id, 'confirmed') },
    ])
  }

  const filtered = submissions.filter(s =>
    !search.trim() ||
    s.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.purpose_of_payment?.toLowerCase().includes(search.toLowerCase())
  )

  function RequestCard({ item }: { item: any }) {
    const ss = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending
    const formTitle = (item.form as any)?.title
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{item.customer_name || 'Customer'}</Text>
            {item.customer_email ? <Text style={styles.customerSub}>{item.customer_email}</Text> : null}
            {item.customer_phone ? <Text style={styles.customerSub}>{item.customer_phone}</Text> : null}
          </View>
          <View style={[styles.badge, { backgroundColor: ss.bg }]}>
            <Text style={[styles.badgeText, { color: ss.text }]}>{item.status}</Text>
          </View>
        </View>

        {formTitle ? <Text style={styles.formTitle}>via {formTitle}</Text> : null}

        {item.purpose_of_payment ? (
          <Text style={styles.purpose}>{item.purpose_of_payment}</Text>
        ) : null}

        {item.item_description ? (
          <Text style={styles.detail}>Item: {item.item_description}</Text>
        ) : null}

        <View style={styles.cardMeta}>
          {item.total_amount ? (
            <Text style={styles.amount}>₦{parseFloat(item.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
          ) : null}
          {item.payment_method ? (
            <Text style={styles.metaChip}>{item.payment_method}</Text>
          ) : null}
          {item.payment_evidence_url ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.payment_evidence_url)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="attach" size={14} color={G} style={{ marginRight: 2 }} />
              <Text style={styles.evidenceLink}>Evidence</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.date}>{new Date(item.submitted_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>

        {item.status === 'rejected' && item.rejection_reason ? (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>Rejection reason</Text>
            <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
          </View>
        ) : null}

        {item.status === 'pending' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmAction(item.id, 'confirmed')}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => confirmAction(item.id, 'rejected')}>
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    )
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
        <Text style={styles.navTitle}>Receipt Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity key={t.value} style={[styles.tabBtn, tab === t.value && styles.tabBtnActive]} onPress={() => setTab(t.value)}>
              <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or purpose..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load()}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); load() }} style={styles.clearBtn}>
              <Ionicons name="close-circle-sharp" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading
          ? <View style={styles.center}><ActivityIndicator color={G} size="large" /></View>
          : (
            <FlatList
              data={filtered}
              keyExtractor={r => r.id}
              renderItem={({ item }) => <RequestCard item={item} />}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={G} />}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="clipboard-outline" size={48} color="#9ca3af" style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyText}>
                    {search || tab ? 'No requests match your filters.' : 'No receipt requests yet.'}
                  </Text>
                </View>
              }
            />
          )
        }

        {/* Reject Modal */}
        <Modal visible={!!rejectId} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Reject Request</Text>
              <Text style={styles.modalSub}>Optionally provide a reason for the customer.</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Rejection reason (optional)"
                placeholderTextColor="#9ca3af"
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[styles.rejectConfirmBtn, actioning && { opacity: 0.6 }]}
                onPress={() => rejectId && handleAction(rejectId, 'rejected', rejectReason)}
                disabled={actioning}
              >
                {actioning ? <ActivityIndicator color="#fff" /> : <Text style={styles.rejectConfirmText}>Reject Request</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setRejectId(null); setRejectReason('') }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f3f4f6' },
  tabBtnActive: { backgroundColor: G },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 8 },
  searchInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827' },
  clearBtn: { padding: 6 },
  clearBtnText: { color: '#9ca3af', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  customerSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  formTitle: { fontSize: 12, color: '#9ca3af', marginBottom: 6, fontStyle: 'italic' },
  purpose: { fontSize: 14, color: '#374151', marginBottom: 4 },
  detail: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  amount: { fontSize: 16, fontWeight: '800', color: G },
  metaChip: { fontSize: 12, backgroundColor: '#f0f5f2', color: '#374151', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, fontWeight: '600' },
  evidenceLink: { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },
  date: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  rejectionBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginTop: 10 },
  rejectionLabel: { fontSize: 11, fontWeight: '700', color: '#991b1b', marginBottom: 3, textTransform: 'uppercase' },
  rejectionText: { fontSize: 13, color: '#7f1d1d' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  confirmBtn: { flex: 1, backgroundColor: G, borderRadius: 8, padding: 11, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: { flex: 1, backgroundColor: '#fef2f2', borderRadius: 8, padding: 11, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  rejectBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', marginBottom: 14, minHeight: 80, textAlignVertical: 'top' },
  rejectConfirmBtn: { backgroundColor: '#dc2626', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  rejectConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: '#6b7280', fontSize: 14 },
})
