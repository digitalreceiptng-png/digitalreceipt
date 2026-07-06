import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { Receipt, Profile } from '../types'
import { formatAmount, formatDate } from '../lib/formatters'

const STATUS_COLOR: Record<string, string> = {
  active: '#1a3728',
  cancelled: '#991b1b',
  expired: '#92400e',
}

export default function DashboardScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, revenue: 0 })

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, receiptsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('receipts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (receiptsRes.data) {
      const list: Receipt[] = receiptsRes.data
      setReceipts(list)
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const thisMonth = list.filter(r => r.created_at >= monthStart && r.status === 'active')
      setStats({
        total: list.length,
        thisMonth: thisMonth.length,
        revenue: thisMonth.reduce((s, r) => s + r.total_amount, 0),
      })
    }
    setLoading(false)
    setRefreshing(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function StatBox({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    )
  }

  function ReceiptRow({ item }: { item: Receipt }) {
    return (
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ReceiptDetail', { receipt: item })}>
        <View style={styles.rowLeft}>
          <Text style={styles.buyerName}>{item.buyer_name}</Text>
          <Text style={styles.rowDate}>{formatDate(item.transaction_date)}</Text>
          <Text style={styles.receiptNo}>#{item.receipt_number}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.amount}>{formatAmount(item.total_amount, item.currency)}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#1a3728" size="large" /></View>
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {(profile?.logo_url ?? profile?.avatar_url)
          ? <Image source={{ uri: (profile.logo_url ?? profile.avatar_url)! }} style={styles.headerLogo} resizeMode="contain" />
          : <View style={styles.headerLogoFallback}>
              <Text style={styles.headerLogoInitial}>
                {(profile?.business_name || profile?.full_name || 'M').charAt(0).toUpperCase()}
              </Text>
            </View>
        }
        <Text style={styles.name}>{profile?.business_name || profile?.full_name || 'Merchant'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* New Receipt button */}
      <TouchableOpacity style={styles.newReceiptBtn} onPress={() => navigation.navigate('CreateReceipt')}>
        <Text style={styles.newReceiptText}>+ New Receipt</Text>
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Total receipts" value={String(stats.total)} />
        <StatBox label="This month" value={String(stats.thisMonth)} />
        <StatBox label="Revenue" value={formatAmount(stats.revenue, 'NGN')} />
      </View>

      {/* List */}
      <Text style={styles.sectionTitle}>Recent Receipts</Text>
      <FlatList
        data={receipts}
        keyExtractor={r => r.id}
        renderItem={({ item }) => <ReceiptRow item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#1a3728" />}
        ListEmptyComponent={<Text style={styles.empty}>No receipts yet. Tap + New to create one.</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#1a3728', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLogo: { width: 40, height: 40, borderRadius: 8 },
  headerLogoFallback: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerLogoInitial: { fontSize: 20, fontWeight: '800', color: '#fff' },
  name: { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center', flex: 1 },
  newReceiptBtn: { backgroundColor: '#1a3728', marginHorizontal: 16, marginTop: 14, marginBottom: 4, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  newReceiptText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statBox: { flex: 1, backgroundColor: '#f0f5f2', borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#1a3728' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  rowLeft: { flex: 1, gap: 3 },
  buyerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowDate: { fontSize: 12, color: '#6b7280' },
  receiptNo: { fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 14 },
})
