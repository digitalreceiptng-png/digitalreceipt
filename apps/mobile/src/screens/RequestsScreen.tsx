import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { supabase } from '../lib/supabase'
import BackRow from '../components/BackRow'

export default function RequestsScreen({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'pending' | 'approved' | 'declined'>('pending')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('receipt_requests').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: 'approved' | 'declined') {
    await supabase.from('receipt_requests').update({ status }).eq('id', id)
    setRequests(p => p.map(r => r.id === id ? { ...r, status } : r))
  }

  const filtered = requests.filter(r => r.status === tab)

  return (
    <View style={styles.container}>
      <BackRow navigation={navigation} />
      <View style={styles.tabRow}>
        {(['pending', 'approved', 'declined'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#1a3728" />}>
        {loading
          ? <ActivityIndicator color="#1a3728" style={{ marginTop: 40 }} />
          : filtered.length === 0
            ? <Text style={styles.empty}>No {tab} requests.</Text>
            : filtered.map(r => (
              <View key={r.id} style={styles.card}>
                <Text style={styles.customerName}>{r.customer_name || 'Customer'}</Text>
                <Text style={styles.desc}>{r.description || 'Receipt request'}</Text>
                {r.amount && <Text style={styles.amount}>₦{parseFloat(r.amount).toLocaleString()}</Text>}
                <Text style={styles.date}>{new Date(r.created_at).toLocaleDateString()}</Text>
                {tab === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => updateStatus(r.id, 'approved')}>
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => updateStatus(r.id, 'declined')}>
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabBtn: { flex: 1, padding: 9, borderRadius: 8, alignItems: 'center', backgroundColor: '#f3f4f6' },
  tabBtnActive: { backgroundColor: '#1a3728' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  desc: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  amount: { color: '#1a3728', fontWeight: '700', fontSize: 15, marginTop: 6 },
  date: { color: '#9ca3af', fontSize: 11, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  approveBtn: { flex: 1, backgroundColor: '#1a3728', borderRadius: 8, padding: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  declineBtn: { flex: 1, backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  declineBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
})
