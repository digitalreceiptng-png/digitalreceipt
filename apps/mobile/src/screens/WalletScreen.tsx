import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { supabase } from '../lib/supabase'
import BackRow from '../components/BackRow'

export default function WalletScreen({ navigation }: any) {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: wallet }, { data: txns }] = await Promise.all([
      supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    ])
    if (wallet) setBalance(parseFloat(wallet.balance || 0))
    setTransactions(txns || [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <View style={styles.center}><ActivityIndicator color="#1a3728" size="large" /></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#1a3728" />}>
      <BackRow navigation={navigation} />
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceValue}>₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.balanceSub}>DigitalReceipt.ng Wallet</Text>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>

      {transactions.length === 0
        ? <Text style={styles.empty}>No transactions yet.</Text>
        : transactions.map(t => (
          <View key={t.id} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: t.type === 'credit' ? '#c8ddd1' : '#fef2f2' }]}>
              <Text style={styles.iconText}>{t.type === 'credit' ? '↓' : '↑'}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowDesc}>{t.description || (t.type === 'credit' ? 'Credit' : 'Debit')}</Text>
              <Text style={styles.rowDate}>{new Date(t.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.rowAmount, { color: t.type === 'credit' ? '#1a3728' : '#dc2626' }]}>
              {t.type === 'credit' ? '+' : '-'}₦{parseFloat(t.amount || 0).toLocaleString()}
            </Text>
          </View>
        ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { backgroundColor: '#1a3728', margin: 16, borderRadius: 16, padding: 24, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },
  balanceValue: { color: '#fff', fontSize: 36, fontWeight: '800' },
  balanceSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', paddingHorizontal: 16, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  rowInfo: { flex: 1 },
  rowDesc: { fontWeight: '600', color: '#111827', fontSize: 14 },
  rowDate: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  rowAmount: { fontWeight: '700', fontSize: 15 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
})
