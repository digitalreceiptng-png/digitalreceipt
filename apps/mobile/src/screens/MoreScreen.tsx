import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native'
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

function NavItem({ navigation, iconName, label, screen, danger }: { navigation: any; iconName: keyof typeof Ionicons.glyphMap; label: string; screen?: string; danger?: boolean }) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={screen ? () => navigation.navigate(screen) : signOut}
    >
      <View style={styles.itemIconWrap}>
        <Ionicons name={iconName} size={20} color={danger ? '#dc2626' : G} />
      </View>
      <Text style={[styles.itemLabel, danger && { color: '#dc2626' }]}>{label}</Text>
      {!danger && <Text style={styles.itemArrow}>›</Text>}
    </TouchableOpacity>
  )
}

function SwitchAccountItem({ visible, activeName, onPress }: { visible: boolean; activeName?: string; onPress: () => void }) {
  if (!visible) return null
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemIconWrap}>
        <Ionicons name="business-outline" size={20} color={G} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.switchLabel}>Switch Account</Text>
        {!!activeName && <Text style={styles.itemSub}>Issuing for {activeName}</Text>}
      </View>
      <Text style={styles.itemArrow}>›</Text>
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
                <Ionicons name="business-outline" size={20} color={G} />
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
      <View style={styles.container}>
        <Text style={styles.heading}>More</Text>
        <View style={styles.sectionCard}>
          <SwitchAccountItem visible={canSwitchProfiles} activeName={activeScope?.name} onPress={() => setSwitchOpen(true)} />
          {canSwitchProfiles && <View style={styles.divider} />}
          <TouchableOpacity style={styles.item} onPress={signOut}>
            <View style={styles.itemIconWrap}>
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
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
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.heading}>More</Text>

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
              <View style={styles.itemIconWrap}>
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>More</Text>
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
            <View style={styles.itemIconWrap}>
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            </View>
            <Text style={[styles.itemLabel, { color: '#dc2626' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20, paddingHorizontal: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 50 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  itemIconWrap: { width: 28, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  itemIcon: { fontSize: 20, marginRight: 14 },
  itemLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  // Like itemLabel but without flex:1 — used when stacked above a subtitle inside a column
  // wrapper, where flex:1 on the Text collapses its height and clips the line above it.
  switchLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  itemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  itemArrow: { color: '#9ca3af', fontSize: 20 },
  // Switch account modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 14 },
  scopeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  scopeName: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
})
