import React, { useCallback, useEffect, useState } from 'react'
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
  AppState,
  Linking,
  Platform,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Ionicons } from '@expo/vector-icons'
import { useIAP, type Purchase } from 'expo-iap'
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
const APPLE_WALLET_PRODUCTS = [
  { id: 'new.digitalreceipt.wallet.500', credit: 500 },
  { id: 'new.digitalreceipt.wallet.1000', credit: 1000 },
  { id: 'new.digitalreceipt.wallet.2000', credit: 2000 },
  { id: 'new.digitalreceipt.wallet.5000', credit: 5000 },
  { id: 'new.digitalreceipt.wallet.10000', credit: 10000 },
]

async function fetchWithTimeout(url: string, options: RequestInit, ms = 15000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Network request timed out. Please check your internet connection.')), ms)
    ),
  ])
}

function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out.')), ms)),
  ])
}

async function upgradeGuestAccount(email: string, password: string, needsPassword: boolean) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Your guest session has expired.')

  if (user.is_anonymous) {
    if (user.user_metadata?.guest_account_upgrade_pending === true) return 'confirmation-pending'
    if (!email.trim()) throw new Error('Enter an email address to continue.')

    const { error } = await supabase.auth.updateUser(
      { email: email.trim(), data: { guest_account_upgrade_pending: true } },
      { emailRedirectTo: 'digitalreceipt://auth-callback' }
    )
    if (error) throw error
    return 'email-sent'
  }

  if (needsPassword && user.user_metadata?.guest_account_upgrade_pending === true) {
    if (!password) throw new Error('Choose a password to finish creating your account.')
    const { error } = await supabase.auth.updateUser({
      password,
      data: { ...user.user_metadata, guest_account_upgrade_pending: false },
    })
    if (error) throw error
    return 'account-created'
  }

  throw new Error('Account setup is already complete.')
}

interface GuestAccountEmailProps {
  readonly accountEmail: string
  readonly emailConfirmationSent: boolean
  readonly savingAccount: boolean
  readonly onEmailChange: (value: string) => void
  readonly onSubmit: () => void
  readonly onCheckEmail: () => void
}

interface GuestAccountPasswordProps {
  readonly accountEmail: string
  readonly accountPassword: string
  readonly savingAccount: boolean
  readonly onPasswordChange: (value: string) => void
  readonly onSubmit: () => void
}

interface GuestAccountCardProps extends GuestAccountEmailProps, GuestAccountPasswordProps {
  readonly isGuest: boolean
  readonly needsAccountPassword: boolean
  readonly showAccountForm: boolean
  readonly onShowForm: () => void
}

function GuestAccountEmailForm({ accountEmail, emailConfirmationSent, savingAccount, onEmailChange, onSubmit, onCheckEmail }: GuestAccountEmailProps) {
  return (
    <>
      <TextInput
        style={styles.amountInput}
        placeholder="Email address"
        placeholderTextColor="#94a3b8"
        keyboardType="email-address"
        autoCapitalize="none"
        value={accountEmail}
        onChangeText={onEmailChange}
        editable={!emailConfirmationSent}
      />
      <TouchableOpacity style={styles.primaryBtn} onPress={emailConfirmationSent ? onCheckEmail : onSubmit} disabled={savingAccount}>
        {savingAccount ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{emailConfirmationSent ? 'I confirmed my email' : 'Send confirmation email'}</Text>}
      </TouchableOpacity>
    </>
  )
}

function GuestAccountPasswordForm({ accountEmail, accountPassword, savingAccount, onPasswordChange, onSubmit }: GuestAccountPasswordProps) {
  return (
    <>
      <Text style={styles.cardSub}>Email confirmed: {accountEmail}. Set a password to sign in on other devices.</Text>
      <TextInput
        style={styles.amountInput}
        placeholder="Create a password"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        value={accountPassword}
        onChangeText={onPasswordChange}
      />
      <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit} disabled={savingAccount}>
        {savingAccount ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Set password</Text>}
      </TouchableOpacity>
    </>
  )
}

function GuestAccountCard({
  isGuest,
  needsAccountPassword,
  showAccountForm,
  onShowForm,
  ...formProps
}: GuestAccountCardProps) {
  const title = isGuest ? 'Using a guest account' : 'Finish setting up your account'
  const description = isGuest
    ? 'You can buy and use receipts now. Create an account later to access this wallet and your receipts on other devices.'
    : 'Set a password to access this wallet and your receipts on other devices.'

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{description}</Text>
      {!showAccountForm && (
        <TouchableOpacity onPress={onShowForm}>
          <Text style={{ color: FOREST_GREEN, fontWeight: '700' }}>Create account for cross-device access</Text>
        </TouchableOpacity>
      )}
      {showAccountForm && needsAccountPassword && <GuestAccountPasswordForm {...formProps} />}
      {showAccountForm && !needsAccountPassword && <GuestAccountEmailForm {...formProps} />}
    </View>
  )
}

export default function WalletScreen({ navigation }: any) {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [amount, setAmount] = useState('')
  const [funding, setFunding] = useState(false)
  const [buyingProductId, setBuyingProductId] = useState<string | null>(null)
  const [pendingPurchase, setPendingPurchase] = useState<Purchase | null>(null)
  const [loadingAppleProducts, setLoadingAppleProducts] = useState(false)
  const [appleProductError, setAppleProductError] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false)
  const [needsAccountPassword, setNeedsAccountPassword] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)
  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: purchase => setPendingPurchase(purchase),
    onPurchaseError: error => {
      setBuyingProductId(null)
      if (!error.message.toLowerCase().includes('cancel')) {
        Alert.alert('Purchase failed', error.message || 'The App Store could not complete this purchase.')
      }
    },
  })

  const appleProductsById = new Map((products ?? []).map(product => [product.id, product]))
  const missingAppleProducts = APPLE_WALLET_PRODUCTS.filter(product => !appleProductsById.has(product.id))

  const loadAppleProducts = useCallback(async () => {
    setLoadingAppleProducts(true)
    setAppleProductError(null)
    try {
      await fetchProducts({ skus: APPLE_WALLET_PRODUCTS.map(product => product.id), type: 'in-app' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load Apple wallet products.'
      setAppleProductError(message)
      console.warn('Could not load Apple wallet products:', message)
    } finally {
      setLoadingAppleProducts(false)
    }
  }, [fetchProducts])

  async function load() {
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser())
      if (!user) return
      setIsGuest(user.is_anonymous === true)
      const upgradePending = user.user_metadata?.guest_account_upgrade_pending === true
      setEmailConfirmationSent(upgradePending && user.is_anonymous === true)
      setNeedsAccountPassword(upgradePending && user.is_anonymous !== true)
      if (user.email) setAccountEmail(user.email)
      if (upgradePending) setShowAccountForm(true)
      const [{ data: wallet }, { data: txns }, { data: prof }] = await withTimeout(Promise.all([
        supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
        supabase.from('wallet_transactions').select('id, type, amount, description, balance_after, created_at, receipt_id, paystack_reference').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('is_verified, issuer_type').eq('id', user.id).maybeSingle(),
      ]))
      if (wallet) setBalance(parseFloat(wallet.balance || 0))
      setTransactions(txns || [])
      if (prof) setProfile(prof)
    } catch (error: any) {
      Alert.alert('Wallet unavailable', error?.message || 'Could not load your wallet. Try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function processApplePurchase(purchase: Purchase) {
    try {
      if (purchase.purchaseState === 'pending') {
        Alert.alert('Purchase pending', 'Your purchase is awaiting App Store approval.')
        return
      }
      if (!purchase.transactionId) throw new Error('Apple did not return a transaction ID.')

      const { data: { session } } = await withTimeout(supabase.auth.getSession())
      if (!session) throw new Error('Guest session expired. Reopen the app and try again.')

      const response = await fetchWithTimeout(`${BASE}/api/wallet/apple/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ productId: purchase.productId, transactionId: purchase.transactionId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Apple could not verify the purchase.')

      await finishTransaction({ purchase, isConsumable: true })
      await load()
      Alert.alert('Wallet funded', `₦${Number(result.creditAmount).toLocaleString('en-NG')} was added to your wallet.`)
    } catch (error: any) {
      Alert.alert('Purchase not completed', error?.message || 'The purchase is not credited yet. Try again shortly.')
    } finally {
      setPendingPurchase(null)
      setBuyingProductId(null)
    }
  }

  async function buyAppleProduct(productId: string) {
    setBuyingProductId(productId)
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser())
      if (!user) throw new Error('Guest session expired. Reopen the app and try again.')
      await requestPurchase({
        request: { apple: { sku: productId, appAccountToken: user.id } },
        type: 'in-app',
      })
    } catch (error: any) {
      setBuyingProductId(null)
      Alert.alert('Purchase unavailable', error?.message || 'The App Store could not start this purchase.')
    }
  }

  async function createGuestAccount() {
    setSavingAccount(true)
    try {
      const result = await upgradeGuestAccount(accountEmail, accountPassword, needsAccountPassword)
      if (result === 'email-sent') {
        setEmailConfirmationSent(true)
        Alert.alert('Confirm your email', 'Open the confirmation link we sent, then return here to set a password. Your guest wallet and receipts stay on this account.')
      } else if (result === 'confirmation-pending') {
        setEmailConfirmationSent(true)
        Alert.alert('Confirm your email', 'Open the confirmation link we sent, then return here to continue.')
      } else if (result === 'account-created') {
        setNeedsAccountPassword(false)
        setEmailConfirmationSent(false)
        setShowAccountForm(false)
        setAccountPassword('')
        Alert.alert('Account created', 'You can now sign in on another device with this email and password.')
      }
    } catch (error: any) {
      Alert.alert('Could not create account', error?.message || 'Try again later.')
    } finally {
      setSavingAccount(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (Platform.OS === 'ios' && connected) {
      void loadAppleProducts()
    }
  }, [connected, loadAppleProducts])

  useEffect(() => {
    if (pendingPurchase) void processApplePurchase(pendingPurchase)
  }, [pendingPurchase])

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') load()
    })
    return () => sub.remove()
  }, [])

  async function finishPayment(reference: string, token: string) {
    try {
      await fetchWithTimeout(`${BASE}/api/wallet/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reference }),
      })
    } finally {
      await load()
    }
  }

  async function handleTopUp(customAmount?: number) {
    const num = customAmount ?? parseInt(amount, 10)
    const minRequired = profile?.issuer_type === 'business' ? 1000 : 500
    if (!num || num < minRequired) {
      Alert.alert(`Minimum ₦${minRequired.toLocaleString()}`, `Enter at least ₦${minRequired.toLocaleString()} to top up.`)
      return
    }

    if (profile && profile.is_verified === false) {
      Alert.alert(
        'Identity Verification Required',
        'You must complete identity verification before funding your wallet. Go to your Profile screen to verify.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => navigation?.navigate('Profile') },
        ]
      )
      return
    }

    setFunding(true)
    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession())
      if (!session) { Alert.alert('Not logged in', 'Please log in again.'); return }

      const res = await fetchWithTimeout(`${BASE}/api/wallet/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: num, platform: 'mobile' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not initialize payment.')

      const linkSub = Linking.addEventListener('url', ({ url }) => {
        if (url.startsWith('digitalreceipt://wallet')) WebBrowser.dismissBrowser()
      })
      try {
        if (WebBrowser.openAuthSessionAsync) {
          await WebBrowser.openAuthSessionAsync(data.authorization_url, 'digitalreceipt://wallet')
        } else {
          await WebBrowser.openBrowserAsync(data.authorization_url)
        }
      } finally {
        linkSub.remove()
      }
      await finishPayment(data.reference, session.access_token)
    } catch (err: any) {
      Alert.alert('Top Up Failed', err.message || 'Something went wrong.')
    } finally {
      setFunding(false)
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={FOREST_GREEN} size="large" /></View>

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

        {(isGuest || needsAccountPassword) && (
          <GuestAccountCard
            isGuest={isGuest}
            needsAccountPassword={needsAccountPassword}
            showAccountForm={showAccountForm}
            accountEmail={accountEmail}
            accountPassword={accountPassword}
            emailConfirmationSent={emailConfirmationSent}
            savingAccount={savingAccount}
            onShowForm={() => setShowAccountForm(true)}
            onEmailChange={setAccountEmail}
            onPasswordChange={setAccountPassword}
            onSubmit={createGuestAccount}
            onCheckEmail={() => { void load() }}
          />
        )}

        {/* Top-Up Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{Platform.OS === 'ios' ? 'Add wallet credit' : 'Top Up Wallet'}</Text>

          {Platform.OS === 'ios' ? (
            <>
              <Text style={styles.cardSub}>Choose an amount. Apple will show the final price before you confirm.</Text>
              {APPLE_WALLET_PRODUCTS.map(product => {
                const storeProduct = appleProductsById.get(product.id)
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.purchaseRow}
                    onPress={() => buyAppleProduct(product.id)}
                    disabled={!storeProduct || !!buyingProductId}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tierName}>₦{product.credit.toLocaleString('en-NG')} wallet credit</Text>
                      <Text style={styles.tierNote}>DigitalReceipt.ng wallet</Text>
                    </View>
                    {buyingProductId === product.id
                      ? <ActivityIndicator color={FOREST_GREEN} />
                      : <Text style={styles.tierPrice}>
                        {storeProduct?.displayPrice ?? (connected ? 'Unavailable' : 'Connecting…')}
                      </Text>}
                  </TouchableOpacity>
                )
              })}
              {appleProductError ? (
                <Text style={styles.warningText}>
                  Apple product lookup failed: {appleProductError}
                </Text>
              ) : connected && missingAppleProducts.length > 0 ? (
                <Text style={styles.warningText}>
                  Apple did not return {missingAppleProducts.map(product => `₦${product.credit.toLocaleString('en-NG')}`).join(', ')}. Confirm those product IDs are available in App Store Connect for this app.
                </Text>
              ) : null}
              <TouchableOpacity
                onPress={() => { void loadAppleProducts() }}
                disabled={!connected || loadingAppleProducts}
              >
                <Text style={{ color: FOREST_GREEN, fontWeight: '700', paddingTop: 10 }}>
                  {loadingAppleProducts ? 'Checking Apple products…' : 'Check Apple products again'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
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
                  <Text style={styles.primaryBtnText}>
                    {`Pay ₦${(Number.parseInt(amount || '0', 10) || 0).toLocaleString('en-NG')}`}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
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
  warningText: {
    color: '#b45309',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
  },
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
  purchaseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },

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
