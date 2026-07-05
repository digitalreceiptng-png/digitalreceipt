import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', active: true, tagline: 'Verifiable Digital Receipt' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', active: false, tagline: 'Verifiable Digital Receipt' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', active: false, tagline: 'Verifiable Digital Receipt' },
]

export default function CountrySelectScreen({ onSelect }: { onSelect: (c: any) => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.sub}>Verifiable Digital Receipts</Text>
      </View>

      <Text style={styles.heading}>Select your country</Text>
      <Text style={styles.hint}>Choose your country to get started</Text>

      {COUNTRIES.map(c => (
        <TouchableOpacity
          key={c.code}
          onPress={() => { if (c.active) onSelect(c) }}
          disabled={!c.active}
          activeOpacity={0.7}
          style={[styles.card, !c.active && styles.cardDisabled, c.active && styles.cardActive]}
        >
          <Text style={styles.flag}>{c.flag}</Text>
          <View style={styles.cardText}>
            <Text style={[styles.countryName, !c.active && styles.textMuted]}>{c.name}</Text>
            <Text style={styles.tagline}>{c.tagline}</Text>
          </View>
          {!c.active
            ? <View style={styles.soonBadge}><Text style={styles.soonText}>Coming Soon</Text></View>
            : <Text style={styles.arrow}>›</Text>}
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2', justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 90, height: 90 },
  sub: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 6 },
  hint: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 28 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 2, borderColor: '#e5e7eb' },
  cardActive: { borderColor: '#1a3728' },
  cardDisabled: { opacity: 0.55 },
  flag: { fontSize: 32, marginRight: 14 },
  cardText: { flex: 1 },
  countryName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  textMuted: { color: '#9ca3af' },
  tagline: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  soonBadge: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  soonText: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  arrow: { color: '#1a3728', fontSize: 24 },
})
