import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import BackRow from '../components/BackRow'

export default function BrandingScreen({ navigation }: any) {
  const [biz, setBiz] = useState({ name: '', address: '', phone: '', email: '', website: '', receipt_footer: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('businesses').select('*').eq('user_id', user.id).single()
      if (data) setBiz({ name: data.name || '', address: data.address || '', phone: data.phone || '', email: data.email || '', website: data.website || '', receipt_footer: data.receipt_footer || '' })
      setLoading(false)
    })()
  }, [])

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('businesses').upsert({ user_id: user!.id, ...biz, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) Alert.alert('Error', error.message)
    else Alert.alert('Saved', 'Business info updated successfully.')
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#1a3728" size="large" /></View>

  const fields = [
    { label: 'Business Name', key: 'name', opts: { placeholder: 'Your business name' } },
    { label: 'Address', key: 'address', opts: { placeholder: 'Full address', multiline: true } },
    { label: 'Phone', key: 'phone', opts: { placeholder: '+234...', keyboardType: 'phone-pad' } },
    { label: 'Email', key: 'email', opts: { placeholder: 'business@email.com', keyboardType: 'email-address', autoCapitalize: 'none' } },
    { label: 'Website', key: 'website', opts: { placeholder: 'https://...', autoCapitalize: 'none' } },
  ] as any[]

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <BackRow navigation={navigation} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Information</Text>
        {fields.map(({ label, key, opts }) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={[styles.input, opts.multiline && { height: 70, textAlignVertical: 'top' }]} value={biz[key as keyof typeof biz]} onChangeText={v => setBiz(p => ({ ...p, [key]: v }))} placeholderTextColor="#9ca3af" {...opts} />
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Receipt Customization</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Receipt Footer Text</Text>
          <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={biz.receipt_footer} onChangeText={v => setBiz(p => ({ ...p, receipt_footer: v }))} placeholder="Thank you for your business!" placeholderTextColor="#9ca3af" multiline />
        </View>
      </View>
      <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Changes</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5f2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a3728', marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 11, fontSize: 14, color: '#111827', backgroundColor: '#fafafa' },
  btn: { backgroundColor: '#1a3728', borderRadius: 12, padding: 15, alignItems: 'center', margin: 16 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
