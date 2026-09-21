import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { getActiveScopeId, setActiveScopeId, fetchScopes, StaffScope } from '../lib/activeScope'

const G = '#1a3728'

function signOut() {
  Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
  ])
}

function PageHeader() {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.faviconWrap}>
        <Ionicons name="grid" size={26} color={G} />
      </View>
      <Text style={styles.heading}>More</Text>
    </View>
  )
}

function NavItem({ navigation, iconName, label, screen, danger }: { navigation: any; iconName: keyof typeof Ionicons.glyphMap; label: string; screen?: string; danger?: boolean }) {
  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.7}
      onPress={screen ? () => navigation.navigate(screen) : signOut}
    >
      <View style={[styles.itemIconWrap, danger && { backgroundColor: '#fef2f2' }]}>
        <Ionicons name={iconName} size={18} color={danger ? '#dc2626' : G} />
      </View>
      <Text style={[styles.itemLabel, danger && { color: '#dc2626' }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={16} color="#94a3b8" />}
    </TouchableOpacity>
  )
}

function SwitchAccountItem({ visible, activeName, onPress }: { visible: boolean; activeName?: string; onPress: () => void }) {
  if (!visible) return null
  return (
    <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.itemIconWrap}>
        <Ionicons name="business-outline" size={18} color={G} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.switchLabel}>Switch Account</Text>
        {!!activeName && <Text style={styles.itemSub}>Issuing for {activeName}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
    </TouchableOpacity>
  )
}

function SwitchAccountModal({ visible, onClose, scopes, activeId, switching, onChoose }: {
  visible: boolean; onClose: () => void; scopes: StaffScope[]; activeId: string
  switching: string | null; onChoose: (scope: StaffScope) => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Issue receipts under</Text>
          {scopes.map(scope => (
            <TouchableOpacity
              key={scope.id}
              style={styles.scopeRow}
              onPress={() => onChoose(scope)}
              disabled={switching !== null}
            >
              <View style={styles.itemIconWrap}>
                <Ionicons name="business-outline" size={18} color={G} />
              </View>
              <Text style={[styles.scopeName, scope.id === activeId && { color: G, fontWeight: '700' }]}>
                {scope.name}{scope.isMain ? ' (Main)' : ''}
              </Text>
              {switching === scope.id
                ? <ActivityIndicator color={G} size="small" />
                : scope.id === activeId && <Ionicons name="checkmark-sharp" size={20} color={G} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={{ marginTop: 12, alignItems: 'center', padding: 8 }} onPress={onClose}>
            <Text style={{ color: '#6b7280', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function MoreScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const [meta, setMeta] = useState<any>(null)
  const [scopes, setScopes] = useState<StaffScope[]>([])
  const [activeId, setActiveId] = useState('main')
  const [switchOpen, setSwitchOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setMeta(user?.app_metadata ?? {})
      if (!user?.app_metadata?.is_staff) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const [{ scopes: fetchedScopes }, currentActiveId] = await Promise.all([
        fetchScopes(session.access_token),
        getActiveScopeId(),
      ])
      setScopes(fetchedScopes)
      setActiveId(currentActiveId)
    })()
  }, [])

  const isStaff = meta?.is_staff === true
  const accessLevel: string = meta?.access_level ?? 'full'
  const isGenerateOnly = isStaff && accessLevel === 'generate_only'
  const activeScope = scopes.find(s => s.id === activeId) ?? scopes.find(s => s.isMain)
  const canSwitchProfiles = isStaff && scopes.length > 1

  async function chooseScope(scope: StaffScope) {
    if (scope.id === activeId) { setSwitchOpen(false); return }
    setSwitching(scope.id)
    try {
      await setActiveScopeId(scope.id)
      setActiveId(scope.id)
    } finally {
      setSwitching(null)
      setSwitchOpen(false)
    }
  }

  const topPadding = Math.max(insets.top + 8, Platform.OS === 'ios' ? 16 : 12)

  const switchAccountModal = (
    <SwitchAccountModal
      visible={switchOpen}
      onClose={() => setSwitchOpen(false)}
      scopes={scopes}
      activeId={activeId}
      switching={switching}
      onChoose={chooseScope}
    />
  )

  if (isGenerateOnly) {
    return (
      <View style={[styles.container, { paddingTop: topPadding, paddingHorizontal: 16 }]}>
        <PageHeader />
        <View style={styles.sectionCard}>
          <SwitchAccountItem visible={canSwitchProfiles} activeName={activeScope?.name} onPress={() => setSwitchOpen(true)} />
          {canSwitchProfiles && <View style={styles.divider} />}
          <TouchableOpacity style={styles.item} onPress={signOut}>
            <View style={[styles.itemIconWrap, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            </View>
            <Text style={[styles.itemLabel, { color: '#dc2626' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        {switchAccountModal}
      </View>
    )
  }

  if (isStaff) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: topPadding, paddingBottom: 100 }}>
        <PageHeader />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigation</Text>
          <View style={styles.sectionCard}>
            <NavItem navigation={navigation} iconName="home-outline" label="Overview" screen="Dashboard" />
            <View style={styles.divider} />
            <NavItem navigation={navigation} iconName="receipt-outline" label="Receipts" screen="ReceiptsList" />
            <View style={styles.divider} />
            <NavItem navigation={navigation} iconName="add-circle-outline" label="New Receipt" screen="CreateReceipt" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>
          <View style={styles.sectionCard}>
            <NavItem navigation={navigation} iconName="checkmark-circle-outline" label="Verify Receipt" screen="Verify" />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <SwitchAccountItem visible={canSwitchProfiles} activeName={activeScope?.name} onPress={() => setSwitchOpen(true)} />
            {canSwitchProfiles && <View style={styles.divider} />}
            <TouchableOpacity style={styles.item} onPress={signOut}>
              <View style={[styles.itemIconWrap, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              </View>
              <Text style={[styles.itemLabel, { color: '#dc2626' }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
        {switchAccountModal}
      </ScrollView>
    )
  }

  const SECTIONS: Array<{ title: string; items: Array<{ iconName: keyof typeof Ionicons.glyphMap; label: string; screen: string }> }> = [
    {
      title: 'Receipts',
      items: [
        { iconName: 'mail-unread-outline', label: 'Receipt Requests', screen: 'Requests' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { iconName: 'document-text-outline', label: 'Free Invoice', screen: 'PublicGenerate' },
        { iconName: 'checkmark-circle-outline', label: 'Verify Receipt', screen: 'Verify' },
      ],
    },
    {
      title: 'Account',
      items: [
        { iconName: 'person-outline', label: 'My Profile', screen: 'Profile' },
        { iconName: 'wallet-outline', label: 'Wallet', screen: 'Wallet' },
        { iconName: 'people-outline', label: 'Staff Management', screen: 'Staff' },
        { iconName: 'color-palette-outline', label: 'Branding & Settings', screen: 'Branding' },
      ],
    },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: topPadding, paddingBottom: 100 }}>
      <PageHeader />
      {SECTIONS.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <View key={item.label}>
                {idx > 0 && <View style={styles.divider} />}
                <NavItem navigation={navigation} iconName={item.iconName} label={item.label} screen={item.screen} />
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.item} onPress={signOut}>
            <View style={[styles.itemIconWrap, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            </View>
            <Text style={[styles.itemLabel, { color: '#dc2626' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerContainer: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  faviconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#e6ede8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#cce0d3',
  },
  heading: { fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 64 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  itemIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f5f2', marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '600' },
  switchLabel: { fontSize: 15, color: '#0f172a', fontWeight: '600' },
  itemSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  scopeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  scopeName: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500' },
})
