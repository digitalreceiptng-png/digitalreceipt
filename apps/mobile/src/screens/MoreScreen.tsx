import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { supabase } from '../lib/supabase'

const G = '#1a3728'

export default function MoreScreen({ navigation }: any) {
  const [meta, setMeta] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMeta(user?.app_metadata ?? {}))
  }, [])

  const isStaff = meta?.is_staff === true
  const accessLevel: string = meta?.access_level ?? 'full'
  const isGenerateOnly = isStaff && accessLevel === 'generate_only'

  async function signOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  function NavItem({ icon, label, screen, danger }: { icon: string; label: string; screen?: string; danger?: boolean }) {
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={screen ? () => navigation.navigate(screen) : signOut}
      >
        <Text style={styles.itemIcon}>{icon}</Text>
        <Text style={[styles.itemLabel, danger && { color: '#dc2626' }]}>{label}</Text>
        {!danger && <Text style={styles.itemArrow}>›</Text>}
      </TouchableOpacity>
    )
  }

  // generate_only staff: only sign out
  if (isGenerateOnly) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>More</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.item} onPress={signOut}>
            <Text style={styles.itemIcon}>🚪</Text>
            <Text style={[styles.itemLabel, { color: '#dc2626' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // partial / full staff: limited navigation + sign out, no owner-only tools
  if (isStaff) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.heading}>More</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigation</Text>
          <View style={styles.sectionCard}>
            <NavItem icon="🏠" label="Overview" screen="Dashboard" />
            <View style={styles.divider} />
            <NavItem icon="🧾" label="Receipts" screen="ReceiptsList" />
            <View style={styles.divider} />
            <NavItem icon="➕" label="New Receipt" screen="CreateReceipt" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>
          <View style={styles.sectionCard}>
            <NavItem icon="✅" label="Verify Receipt" screen="Verify" />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.item} onPress={signOut}>
              <Text style={styles.itemIcon}>🚪</Text>
              <Text style={[styles.itemLabel, { color: '#dc2626' }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    )
  }

  // Regular owner: full menu
  const SECTIONS = [
    {
      title: 'Receipts',
      items: [
        { icon: '📬', label: 'Receipt Requests', screen: 'Requests' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { icon: '📄', label: 'Free Invoice', screen: 'PublicGenerate' },
        { icon: '✅', label: 'Verify Receipt', screen: 'Verify' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: '👤', label: 'My Profile', screen: 'Profile' },
        { icon: '💰', label: 'Wallet', screen: 'Wallet' },
        { icon: '👥', label: 'Staff Management', screen: 'Staff' },
        { icon: '🎨', label: 'Branding & Settings', screen: 'Branding' },
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
                <NavItem icon={item.icon} label={item.label} screen={item.screen} />
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.item} onPress={signOut}>
            <Text style={styles.itemIcon}>🚪</Text>
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
  itemIcon: { fontSize: 20, marginRight: 14 },
  itemLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  itemArrow: { color: '#9ca3af', fontSize: 20 },
})
