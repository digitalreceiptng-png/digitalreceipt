import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, TouchableOpacity, TextInput, Alert, SafeAreaView,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { supabase } from '../lib/supabase'
import BackRow from '../components/BackRow'

const G = '#1a3728'
const BASE = 'https://www.digitalreceipt.ng'

const TIERS = [
  { name: 'Silver',   price: '₦100',   note: 'Basic receipt',              color: '#64748b' },
  { name: 'Gold',     price: '₦200',   note: 'QR code · 5-year active',    color: '#b45309' },
  { name: 'Diamond',  price: '₦500',   note: 'QR code · Forever',          color: '#1d4ed8' },
  { name: 'Platinum', price: '₦1,000', note: 'QR · Photo attachment · Forever', color: '#6d28d9' },
]

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000]

async function fetchWithTimeout(url: string, options: RequestInit, ms = 15000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...options, signal: ctrl.signal }) }
  catch (e: any) {
    if (e.name === 'AbortError') throw new Error('Request timed out.')
    throw e
  } finally { clearTimeout(t) }
}

export default function WalletScreen({ navigation }: any) {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [amount, setAmount] = useState('')
  const [funding, setFunding] = useState(false)
  const [paystackUrl, setPaystackUrl] = useState<string | null>(null)

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

  async function handleTopUp(customAmount?: number) {
    const num = customAmount ?? parseInt(amount, 10)
    if (!num || num < 500) {
      Alert.alert('Minimum ₦500', 'Enter at least ₦500 to top up.')
      return
    }
    setFunding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { Alert.alert('Not logged in', 'Please log in again.'); return }

      const res = await fetchWithTimeout(`${BASE}/api/wallet/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: num }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not initialize payment.')
      setPaystackUrl(data.authorization_url)
    } catch (err: any) {
      Alert.alert('Top Up Failed', err.message || 'Something went wrong.')
    } finally {
      setFunding(false)
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={G} size="large" /></View>

  // In-app Paystack WebView
  if (paystackUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={s.webviewHeader}>
          <Text style={s.webviewTitle}>Fund Wallet</Text>
          <TouchableOpacity
            style={s.webviewClose}
            onPress={() => { setPaystackUrl(null); load() }}
          >
            <Text style={s.webviewCloseText}>✕ Close</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: paystackUrl }}
          style={{ flex: 1 }}
          onNavigationStateChange={navState => {
            // Paystack redirects to the callback URL after payment
            if (navState.url.includes('/dashboard/wallet') || navState.url.includes('callback')) {
              setPaystackUrl(null)
              load()
            }
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={s.center}>
              <ActivityIndicator color={G} size="large" />
            </View>
          )}
        />
      </SafeAreaView>
    )
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={G} />}>
      <BackRow navigation={navigation} />

      {/* Balance card */}
      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Available Balance</Text>
        <Text style={s.balanceValue}>₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
        <Text style={s.balanceSub}>DigitalReceipt.ng Wallet</Text>
      </View>

      {/* Top-up section */}
      <View style={s.topupCard}>
        <Text style={s.cardTitle}>Top Up Wallet</Text>
        <Text style={s.cardSub}>Minimum top-up: ₦500</Text>

        <View style={s.quickRow}>
          {QUICK_AMOUNTS.map(a => (
            <TouchableOpacity key={a} style={s.quickBtn} onPress={() => handleTopUp(a)} disabled={funding}>
              <Text style={s.quickBtnText}>₦{a.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.orText}>— or enter custom amount —</Text>
        <TextInput
          style={s.amountInput}
          placeholder="Enter amount (₦)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TouchableOpacity style={[s.topupBtn, funding && { opacity: 0.6 }]} onPress={() => handleTopUp()} disabled={funding}>
          {funding
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.topupBtnText}>Top Up via Paystack</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Receipt pricing */}
      <View style={s.pricingCard}>
        <Text style={s.cardTitle}>Receipt Pricing</Text>
        <Text style={s.cardSub}>Per receipt generated</Text>
        {TIERS.map((tier, i) => (
          <View key={tier.name}>
            {i > 0 && <View style={s.divider} />}
            <View style={s.tierRow}>
              <View style={[s.tierDot, { backgroundColor: tier.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.tierName}>{tier.name}</Text>
                <Text style={s.tierNote}>{tier.note}</Text>
              </View>
              <Text style={[s.tierPrice, { color: tier.color }]}>{tier.price}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Transaction history */}
      <Text style={s.sectionTitle}>Transaction History</Text>
      {transactions.length === 0
        ? <Text style={s.empty}>No transactions yet.</Text>
        : transactions.map(t => (
          <View key={t.id} style={s.txRow}>
            <View style={[s.txIcon, { backgroundColor: t.type === 'credit' ? '#c8ddd1' : '#fef2f2' }]}>
              <Text style={s.txIconText}>{t.type === 'credit' ? '↓' : '↑'}</Text>
            </View>
            <View style={s.txInfo}>
              <Text style={s.txDesc}>{t.description || (t.type === 'credit' ? 'Credit' : 'Debit')}</Text>
              <Text style={s.txDate}>{new Date(t.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[s.txAmount, { color: t.type === 'credit' ? G : '#dc2626' }]}>
              {t.type === 'credit' ? '+' : '-'}₦{parseFloat(t.amount || 0).toLocaleString()}
            </Text>
          </View>
        ))
      }
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { backgroundColor: G, margin: 16, borderRadius: 16, padding: 24, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },
  balanceValue: { color: '#fff', fontSize: 36, fontWeight: '800' },
  balanceSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },
  topupCard: { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 16, padding: 20 },
  pricingCard: { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 16, padding: 20 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  quickBtn: { backgroundColor: '#f0f5f2', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#c8ddd1' },
  quickBtnText: { color: G, fontWeight: '700', fontSize: 14 },
  orText: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginBottom: 12 },
  amountInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 13, fontSize: 15, color: '#111827', marginBottom: 12 },
  topupBtn: { backgroundColor: G, borderRadius: 12, padding: 15, alignItems: 'center' },
  topupBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 10 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  tierNote: { fontSize: 12, color: '#6b7280' },
  tierPrice: { fontSize: 16, fontWeight: '800' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', paddingHorizontal: 16, paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  txRow: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14 },
  txIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txIconText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  txInfo: { flex: 1 },
  txDesc: { fontWeight: '600', color: '#111827', fontSize: 14 },
  txDate: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  txAmount: { fontWeight: '700', fontSize: 15 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
  webviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: G, paddingHorizontal: 16, paddingVertical: 14 },
  webviewTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  webviewClose: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  webviewCloseText: { color: '#fff', fontWeight: '600', fontSize: 13 },
})
