import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

const FOREST_GREEN = '#1b7a4d'
const LIGHT_BG = '#f8fafc'

export default function BrandingScreen({ navigation }: any) {
  const [biz, setBiz] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    receipt_footer: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data) {
          setBiz({
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            receipt_footer: data.receipt_footer || '',
          })
        }
      } catch (err: any) {
        console.warn('Error loading business branding:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function save() {
    if (!biz.name.trim()) {
      Alert.alert('Required Field', 'Please enter your business name.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('businesses').upsert(
        {
          user_id: user.id,
          name: biz.name.trim(),
          address: biz.address.trim(),
          phone: biz.phone.trim(),
          email: biz.email.trim(),
          website: biz.website.trim(),
          receipt_footer: biz.receipt_footer.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      if (error) throw error

      Alert.alert('Branding Saved', 'Your business details and receipt footer have been updated.')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Branding & Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={FOREST_GREEN} size="large" />
          <Text style={styles.loadingText}>Loading branding options...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Header Bar with ONLY Chevron Back Icon & Page Title */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Branding & Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
          {/* Hero Overview Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="color-palette-outline" size={26} color={FOREST_GREEN} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Receipt & Store Branding</Text>
              <Text style={styles.heroSubtitle}>
                Customize your store information, contact details, and custom receipt notes that appear on customer receipts.
              </Text>
            </View>
          </View>

          {/* Business Information Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="business-outline" size={18} color={FOREST_GREEN} />
              </View>
              <Text style={styles.cardTitle}>Business Details</Text>
            </View>

            {/* Business Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Business Name *</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="briefcase-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={biz.name}
                  onChangeText={v => setBiz(p => ({ ...p, name: v }))}
                  placeholder="e.g. Acme Supermarket Ltd"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Address */}
            <View style={styles.field}>
              <Text style={styles.label}>Store Address</Text>
              <View style={[styles.inputWrap, { alignItems: 'flex-start', paddingTop: 12 }]}>
                <Ionicons name="location-outline" size={18} color="#94a3b8" style={[styles.inputIcon, { marginTop: 2 }]} />
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  value={biz.address}
                  onChangeText={v => setBiz(p => ({ ...p, address: v }))}
                  placeholder="e.g. 15 Allen Avenue, Ikeja, Lagos"
                  placeholderTextColor="#94a3b8"
                  multiline
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={biz.phone}
                  onChangeText={v => setBiz(p => ({ ...p, phone: v }))}
                  placeholder="e.g. +234 801 234 5678"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Business Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={biz.email}
                  onChangeText={v => setBiz(p => ({ ...p, email: v }))}
                  placeholder="e.g. contact@acmestore.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Website */}
            <View style={styles.field}>
              <Text style={styles.label}>Website URL</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="globe-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={biz.website}
                  onChangeText={v => setBiz(p => ({ ...p, website: v }))}
                  placeholder="e.g. https://acmestore.com"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Receipt Customization Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="receipt-outline" size={18} color={FOREST_GREEN} />
              </View>
              <Text style={styles.cardTitle}>Receipt Customization</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Receipt Footer Text</Text>
              <Text style={styles.subLabel}>
                Appears at the bottom of every generated receipt. Perfect for thank you notes, return policies, or social media links.
              </Text>
              <View style={[styles.inputWrap, { alignItems: 'flex-start', paddingTop: 12 }]}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color="#94a3b8" style={[styles.inputIcon, { marginTop: 2 }]} />
                <TextInput
                  style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                  value={biz.receipt_footer}
                  onChangeText={v => setBiz(p => ({ ...p, receipt_footer: v }))}
                  placeholder="e.g. Thank you for shopping with us! Returns valid within 7 days."
                  placeholderTextColor="#94a3b8"
                  multiline
                />
              </View>
            </View>

            {/* Live Receipt Preview Canvas */}
            <Text style={styles.previewHeader}>LIVE RECEIPT PREVIEW</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewTop}>
                <Text style={styles.previewBizName}>{biz.name || 'Your Business Name'}</Text>
                {!!biz.address && <Text style={styles.previewSub}>{biz.address}</Text>}
                {(!!biz.phone || !!biz.email) && (
                  <Text style={styles.previewSub}>
                    {[biz.phone, biz.email].filter(Boolean).join(' • ')}
                  </Text>
                )}
                {!!biz.website && <Text style={styles.previewSub}>{biz.website}</Text>}
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptSampleRow}>
                <Text style={styles.sampleItem}>1x Premium Item Sample</Text>
                <Text style={styles.samplePrice}>₦ 12,500.00</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.previewFooter}>
                <Text style={styles.previewFooterText}>
                  {biz.receipt_footer || 'Thank you for your business! Items sold in good condition are not returnable after 7 days.'}
                </Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={FOREST_GREEN} />
                  <Text style={styles.verifiedText}>DIGITALRECEIPT.NG VERIFIED</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.btn, saving && styles.btnDisabled]}
            activeOpacity={0.8}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="save-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Save Branding Changes</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIGHT_BG,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  container: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 12,
  },
  previewHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 10,
  },
  previewCard: {
    backgroundColor: '#fafaf9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
  },
  previewTop: {
    alignItems: 'center',
    width: '100%',
  },
  previewBizName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1c1917',
    textAlign: 'center',
    marginBottom: 2,
  },
  previewSub: {
    fontSize: 11.5,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 2,
  },
  receiptDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#d6d3d1',
    marginVertical: 12,
  },
  receiptSampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  sampleItem: {
    fontSize: 12,
    color: '#44403c',
    fontWeight: '500',
  },
  samplePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1c1917',
  },
  previewFooter: {
    alignItems: 'center',
    width: '100%',
  },
  previewFooterText: {
    fontSize: 11,
    color: '#78716c',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 16,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: FOREST_GREEN,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  btn: {
    backgroundColor: FOREST_GREEN,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: FOREST_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
})
