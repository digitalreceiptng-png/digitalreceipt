import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'

const SECTIONS = [
  {
    title: 'Navigation',
    items: [
      { icon: '🏠', label: 'Overview', screen: 'Dashboard' },
      { icon: '🧾', label: 'Receipts', screen: 'ReceiptsList' },
      { icon: '➕', label: 'New Receipt', screen: 'CreateReceipt' },
      { icon: '📬', label: 'Receipt Requests', screen: 'Requests' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { icon: '🔗', label: 'Request Links', screen: 'Requests' },
      { icon: '📄', label: 'Free Invoice', screen: 'PublicGenerate' },
      { icon: '✅', label: 'Verify Receipt', screen: 'Verify' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: '💰', label: 'Wallet', screen: 'Wallet' },
      { icon: '👥', label: 'Staff Management', screen: 'Staff' },
      { icon: '🎨', label: 'Branding & Settings', screen: 'Branding' },
      { icon: '👤', label: 'My Profile', screen: 'Profile' },
    ],
  },
]

export default function MoreScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>More</Text>
      {SECTIONS.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.item, idx < section.items.length - 1 && styles.itemBorder]}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemIcon: { fontSize: 20, marginRight: 14 },
  itemLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  itemArrow: { color: '#9ca3af', fontSize: 20 },
})
