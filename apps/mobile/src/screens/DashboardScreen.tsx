import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Image, ScrollView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { Receipt, Profile } from '../types'
import { formatAmount, formatDate } from '../lib/formatters'
import { getActiveScopeId, fetchScopes, StaffScope } from '../lib/activeScope'

const GREEN = '#1a3728'

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active: { bg: '#e6f4ea', text: '#137333' },
  cancelled: { bg: '#fce8e6', text: '#c5221f' },
  expired: { bg: '#fef7e0', text: '#b06000' },
}

export default function DashboardScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [business, setBusiness] = useState<any>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, revenue: 0 })
  const [isStaffUser, setIsStaffUser] = useState(false)
  const [staffScopes, setStaffScopes] = useState<StaffScope[]>([])
  const [activeScopeId, setActiveScopeId] = useState('main')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAuthUser(user)

    const staff = !!user.app_metadata?.is_staff
    setIsStaffUser(staff)

    const scopesPromise = staff
      ? supabase.auth.getSession().then(({ data: { session } }) =>
          session ? Promise.all([fetchScopes(session.access_token), getActiveScopeId()]) : null)
      : Promise.resolve(null)

    const [profileRes, bizRes, receiptsRes, scopesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('businesses').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('receipts').select('*').eq('user_id', user.id).neq('status', 'deleted').order('created_at', { ascending: false }).limit(20),
      scopesPromise,
    ])

    if (scopesResult) {
      const [{ scopes }, currentActiveId] = scopesResult
      setStaffScopes(scopes)
      setActiveScopeId(currentActiveId)
    }

    if (profileRes.data) setProfile(profileRes.data)
    if (bizRes.data) setBusiness(bizRes.data)
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

  function ReceiptRow({ item }: { item: Receipt }) {
    const statusCfg = STATUS_COLOR[item.status] || { bg: '#f1f5f9', text: '#475569' }
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ReceiptDetail', { receipt: item })}
      >
        <View style={styles.receiptAvatar}>
          <Ionicons name="document-text-outline" size={20} color={GREEN} />
        </View>
        <View style={styles.rowLeft}>
          <Text style={styles.buyerName} numberOfLines={1}>{item.buyer_name || 'Customer'}</Text>
          <View style={styles.metaLine}>
            <Text style={styles.receiptNo}>#{item.receipt_number}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.rowDate}>{formatDate(item.transaction_date)}</Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.amount}>{formatAmount(item.total_amount, item.currency)}</Text>
          <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.badgeText, { color: statusCfg.text }]}>{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>
  }

  const activeScope = staffScopes.find(s => s.id === activeScopeId) ?? staffScopes.find(s => s.isMain)
  const userDisplayName =
    profile?.business_name ||
    business?.name ||
    profile?.full_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.business_name ||
    authUser?.user_metadata?.name ||
    (authUser?.email ? authUser.email.split('@')[0] : null) ||
    'Merchant'

  const headerName = isStaffUser
    ? (activeScope?.name || userDisplayName)
    : userDisplayName

  const headerLogoUri = isStaffUser
    ? (activeScope?.logoUrl ?? null)
    : (profile?.logo_url ?? profile?.avatar_url ?? business?.logo_url ?? null)

  const quickActions = [
    { key: 'new', label: 'New Receipt', icon: 'add-outline', route: 'CreateReceipt' },
    { key: 'wallet', label: 'Wallet', icon: 'wallet-outline', route: 'Wallet' },
    { key: 'verify', label: 'Verify', icon: 'qr-code-outline', route: 'Verify' },
    { key: 'staff', label: 'Staff', icon: 'people-outline', route: 'Staff' },
  ]

  return (
    <View style={styles.container}>
      <FlatList
        data={receipts.slice(0, 3)}
        keyExtractor={r => r.id}
        renderItem={({ item }) => <ReceiptRow item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={GREEN} />}
        ListHeaderComponent={
          <>
            {/* Top User Header Bar */}
            <View style={styles.userBar}>
              <TouchableOpacity
                style={styles.userInfo}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Profile')}
              >
                {headerLogoUri
                  ? <Image source={{ uri: headerLogoUri }} style={styles.userAvatar} resizeMode="cover" />
                  : <View style={styles.userAvatarFallback}>
                      <Ionicons name="person-outline" size={20} color={GREEN} />
                    </View>
                }
                <View>
                  <Text style={styles.greetingText}>Good {getTimeOfDay()},</Text>
                  <Text style={styles.userName}>{headerName}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Hero Revenue Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroSub}>Monthly Revenue</Text>
                  <Text style={styles.heroBalance}>{formatAmount(stats.revenue, 'NGN')}</Text>
                </View>
                <View style={styles.heroPill}>
                  <Ionicons name="trending-up" size={12} color="#34d399" />
                  <Text style={styles.heroPillText}>Active</Text>
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroStatsGrid}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatVal}>{stats.total}</Text>
                  <Text style={styles.heroStatLbl}>Total Issued</Text>
                </View>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatVal}>{stats.thisMonth}</Text>
                  <Text style={styles.heroStatLbl}>This Month</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions Grid */}
            <Text style={styles.sectionHeader}>Quick Actions</Text>
            <View style={styles.quickActionsContainer}>
              {quickActions.map(act => (
                <TouchableOpacity
                  key={act.key}
                  style={styles.actionBtn}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate(act.route)}
                >
                  <View style={styles.actionIconCircle}>
                    <Ionicons name={act.icon as any} size={20} color={GREEN} />
                  </View>
                  <Text style={styles.actionLabel}>{act.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Activity Header */}
            <View style={styles.recentHeaderRow}>
              <Text style={styles.sectionHeader}>Recent Receipts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Receipts')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={32} color="#cbd5e1" />
            <Text style={styles.emptyText}>No receipts created yet</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 85 }}
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingBottom: 6,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: { width: 38, height: 38, borderRadius: 19 },
  userAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f5f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  greetingText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  userName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  // Hero Card
  heroCard: {
    backgroundColor: GREEN,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 18,
    padding: 14,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  heroBalance: { fontSize: 26, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroPillText: { color: '#34d399', fontSize: 11, fontWeight: '700' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 10 },
  heroStatsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  heroStatItem: { alignItems: 'center' },
  heroStatVal: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  heroStatLbl: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  // Section Headers
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginHorizontal: 18, marginTop: 12, marginBottom: 8 },
  recentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 18 },
  seeAllText: { fontSize: 12, color: GREEN, fontWeight: '700' },

  // Quick Actions Grid
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  actionBtn: { alignItems: 'center', width: '22%' },
  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#334155', textAlign: 'center' },

  // Receipt Row
  row: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  receiptAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f5f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowLeft: { flex: 1, gap: 2 },
  buyerName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  receiptNo: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  dot: { fontSize: 10, color: '#cbd5e1' },
  rowDate: { fontSize: 11, color: '#64748b' },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  // Empty State
  emptyContainer: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 6, fontWeight: '500' },
})
