import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const FOREST_GREEN = '#1b7a4d'
const FOREST_DARK = '#064e3b'
const ACCENT_LIGHT = '#ecfdf5'
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
      supabase.from('wallet_transactions').select('id, type, amount, description, balance_after, created_at, receipt_id, paystack_reference').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
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

  if (loading) return <View style={styles.center}><ActivityIndicator color={FOREST_GREEN} size="large" /></View>

  // In-app Paystack WebView
  if (paystackUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View style={styles.webviewHeader}>
          <Text style={styles.webviewTitle}>Fund Wallet via Paystack</Text>
          <TouchableOpacity
            style={styles.webviewClose}
            onPress={() => { setPaystackUrl(null); load() }}
          >
            <Ionicons name="close" size={16} color="#ffffff" />
            <Text style={styles.webviewCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: paystackUrl }}
          style={{ flex: 1, backgroundColor: '#ffffff' }}
          onNavigationStateChange={navState => {
            if (navState.url.includes('/dashboard/wallet') || navState.url.includes('callback')) {
              setPaystackUrl(null)
              load()
            }
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator color={FOREST_GREEN} size="large" />
            </View>
          )}
        />
      </SafeAreaView>
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
        <Text style={styles.navTitle}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={FOREST_GREEN} />
        }
      >
        {/* Balance Hero Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
            <View style={styles.badgePill}>
              <Ionicons name="wallet-outline" size={13} color="#34d399" />
              <Text style={styles.badgePillText}>NGN Wallet</Text>
            </View>
          </View>
          <Text style={styles.balanceValue}>
            ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.balanceSub}>DigitalReceipt.ng Issuer Account</Text>
        </View>

        {/* Top-Up Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Up Wallet</Text>

          <Text style={styles.cardSub}>Select quick amount (Min ₦500)</Text>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.quickBtn, amount === String(a) && styles.quickBtnActive]}
                onPress={() => setAmount(String(a))}
                disabled={funding}
              >
                <Text style={[styles.quickBtnText, amount === String(a) && styles.quickBtnTextActive]}>
                  ₦{a.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.orText}>— or enter custom amount —</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="Enter amount in ₦ (min. 500)"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, funding && { opacity: 0.7 }]}
            onPress={() => handleTopUp()}
            disabled={funding}
          >
            {funding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Top Up via Paystack</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Pricing Tiers Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receipt Pricing Tiers</Text>
          <Text style={styles.cardSub}>Deduction rate per generated receipt</Text>
          {TIERS.map((tier, i) => (
            <View key={tier.name}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.tierRow}>
                <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierNote}>{tier.note}</Text>
                </View>
                <Text style={[styles.tierPrice, { color: tier.color }]}>{tier.price}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Transaction History Section */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={32} color="#cbd5e1" />
              <Text style={styles.empty}>No wallet transactions yet.</Text>
            </View>
          ) : (
            transactions.map(t => (
              <View key={t.id} style={styles.txRow}>
                <View
                  style={[
                    styles.txIcon,
                    { backgroundColor: t.type === 'credit' ? ACCENT_LIGHT : '#fef2f2' },
                  ]}
                >
                  <Ionicons
                    name={t.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={t.type === 'credit' ? FOREST_GREEN : '#dc2626'}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc}>{t.description || (t.type === 'credit' ? 'Credit' : 'Debit')}</Text>
                  <Text style={styles.txDate}>
                    {new Date(t.created_at).toLocaleDateString()}{t.balance_after != null ? ` · Bal: ₦${parseFloat(t.balance_after).toLocaleString()}` : ''}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: t.type === 'credit' ? FOREST_GREEN : '#dc2626' }]}>
                  {t.type === 'credit' ? '+' : '-'}₦{parseFloat(t.amount || 0).toLocaleString()}
                </Text>
              </View>
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

  // Balance Card
  balanceCard: {
    backgroundColor: FOREST_DARK,
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: FOREST_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePillText: { color: '#34d399', fontSize: 11, fontWeight: '700' },
  balanceValue: { color: '#ffffff', fontSize: 34, fontWeight: '800', marginTop: 10, letterSpacing: -0.5 },
  balanceSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },

  // Card Structures
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#64748b', marginBottom: 16 },

  // Top-Up Controls
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  quickBtn: { backgroundColor: '#f8fafc', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  quickBtnActive: { backgroundColor: FOREST_GREEN, borderColor: FOREST_GREEN },
  quickBtnText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  quickBtnTextActive: { color: '#ffffff' },
  orText: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 },
  amountInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 14,
    backgroundColor: '#ffffff',
  },
  primaryBtn: {
    backgroundColor: FOREST_GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },

  // Pricing Tiers
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  tierNote: { fontSize: 12, color: '#64748b' },
  tierPrice: { fontSize: 15, fontWeight: '800' },

  // Transactions
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginHorizontal: 20, marginBottom: 10 },
  txRow: {
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
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  txIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txDesc: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  txDate: { color: '#64748b', fontSize: 12, marginTop: 2 },
  txAmount: { fontWeight: '800', fontSize: 15 },
  emptyWrap: { alignItems: 'center', marginTop: 30, marginBottom: 20 },
  empty: { color: '#94a3b8', fontSize: 14, marginTop: 8 },

  // WebView Header
  webviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: FOREST_DARK, paddingHorizontal: 16, paddingVertical: 14 },
  webviewTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  webviewClose: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  webviewCloseText: { color: '#ffffff', fontWeight: '600', fontSize: 13, marginLeft: 4 },
})
