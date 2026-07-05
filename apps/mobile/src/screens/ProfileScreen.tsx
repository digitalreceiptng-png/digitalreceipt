import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import BackRow from '../components/BackRow'

const GREEN = '#1a3728'

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [business, setBusiness] = useState<any>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit fields
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [issuedByName, setIssuedByName] = useState('')

  // Password modal
  const [showPwModal, setShowPwModal] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, bizRes, companiesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('businesses').select('*').eq('user_id', user.id).single(),
      supabase.from('businesses').select('*').eq('user_id', user.id),
    ])

    if (profileRes.data) {
      setProfile(profileRes.data)
      setFullName(profileRes.data.full_name || '')
      setPhone(profileRes.data.phone || '')
      setAddress(profileRes.data.address || '')
      setIssuedByName(profileRes.data.issued_by_name || '')
    }
    if (bizRes.data) {
      setBusiness(bizRes.data)
      setBusinessName(bizRes.data.name || '')
    }
    if (companiesRes.data) setCompanies(companiesRes.data)
    setLoading(false)
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await Promise.all([
      supabase.from('profiles').update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        issued_by_name: issuedByName.trim() || null,
      }).eq('id', user.id),
      business && supabase.from('businesses').update({
        name: businessName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      }).eq('id', business.id),
    ])
    setSaving(false)
    Alert.alert('Saved', 'Profile updated successfully.')
  }

  async function handleChangePassword() {
    if (newPw.length < 6) { Alert.alert('Too short', 'Password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { Alert.alert('Mismatch', 'Passwords do not match.'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    Alert.alert('Done', 'Password updated.')
    setShowPwModal(false)
    setNewPw('')
    setConfirmPw('')
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all receipts, wallet and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account', style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut()
          },
        },
      ]
    )
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>

  const initials = (businessName || fullName || 'M').charAt(0).toUpperCase()
  const accountType = business?.business_type === 'individual' ? 'Individual Issuer' : 'Business Issuer'

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <BackRow navigation={navigation} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <Text style={styles.headerSub}>Manage your issuer information. This appears on all your receipts.</Text>
      </View>

      {/* Profile card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Profile</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.profileName}>{businessName || fullName}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
            <View style={styles.row}>
              <Text style={styles.profileType}>{accountType}</Text>
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Your Profiles / Switch */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardLabel}>Your Profiles</Text>
          <Text style={styles.cardLabelSub}>Switch between your main account and added company profiles.</Text>
        </View>
        <TouchableOpacity style={styles.addCompanyBtn}>
          <Text style={styles.addCompanyText}>+ Add Company</Text>
        </TouchableOpacity>

        {/* Main account */}
        <View style={styles.profileItem}>
          <View style={styles.profileItemAvatar}>
            <Text style={styles.profileItemAvatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.profileItemName}>{businessName || fullName}</Text>
            <Text style={styles.profileItemSub}>{business?.business_type || 'business'} · Main account</Text>
          </View>
          <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>
        </View>

        {/* Other companies */}
        {companies.filter(c => c.id !== business?.id).map(c => (
          <View key={c.id} style={[styles.profileItem, { opacity: 0.7 }]}>
            <View style={[styles.profileItemAvatar, { backgroundColor: '#f3f4f6' }]}>
              <Text style={[styles.profileItemAvatarText, { color: '#6b7280' }]}>{c.name?.charAt(0) || 'C'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.profileItemName}>{c.name}</Text>
              <Text style={styles.profileItemSub}>RC: {c.rc_number} · Company</Text>
            </View>
            <TouchableOpacity style={styles.switchBtn}>
              <Text style={styles.switchBtnText}>→ Switch Here</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Edit Details */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Edit Details</Text>
        <Text style={styles.lockedNote}>Name locked after verification</Text>

        <FieldRow label="Full name *" value={fullName} onChangeText={setFullName}
          placeholder="Your full name" locked={!!profile?.nin_verified} />
        <FieldRow label="Business name *" value={businessName} onChangeText={setBusinessName}
          placeholder="Your business name" locked={!!business?.rcbn_verified} />

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Phone number</Text>
          <View style={styles.inlineRow}>
            <TextInput style={[styles.input, { flex: 1 }]} value={phone} onChangeText={setPhone}
              placeholder="+234..." placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
            <TouchableOpacity style={styles.changeBtn}><Text style={styles.changeBtnText}>Change</Text></TouchableOpacity>
          </View>
        </View>

        <FieldRow label="Address" value={address} onChangeText={setAddress}
          placeholder="Street, City, State" multiline
          hint="Used to determine the state code on your receipt numbers." />

        <FieldRow label="Issued By name" value={issuedByName} onChangeText={setIssuedByName}
          placeholder="e.g. Victor"
          hint='This name appears in the "Issued By" column on receipts. Leave blank to show "Admin".' />

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </View>

      {/* Account Information (read-only) */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Account Information</Text>
        <Text style={styles.readOnlyNote}>These fields are read-only. Contact support to make changes.</Text>
        <InfoRow label="Email address" value={profile?.email || ''} />
        <InfoRow label="Account type" value={accountType} />
        {business?.rc_number && <InfoRow label="RC Number" value={business.rc_number} />}
        {profile?.nin && <InfoRow label="NIN" value={'****' + profile.nin.slice(-4)} />}
      </View>

      {/* Account Settings */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Account Settings</Text>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Update Password</Text>
            <Text style={styles.settingSub}>Change your account password.</Text>
          </View>
          <TouchableOpacity style={styles.changeBtn} onPress={() => setShowPwModal(true)}>
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.settingRow, { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: '#dc2626' }]}>Delete Account</Text>
            <Text style={styles.settingSub}>Permanently delete your account and all associated receipts, wallet, and data. This cannot be undone.</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteBtnText}>Delete my account</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Change Password Modal */}
      <Modal visible={showPwModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Password</Text>
            <Text style={styles.fieldLabel}>New password</Text>
            <TextInput style={styles.input} value={newPw} onChangeText={setNewPw}
              placeholder="At least 6 characters" placeholderTextColor="#9ca3af" secureTextEntry />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Confirm new password</Text>
            <TextInput style={styles.input} value={confirmPw} onChangeText={setConfirmPw}
              placeholder="Re-enter password" placeholderTextColor="#9ca3af" secureTextEntry />
            <TouchableOpacity style={[styles.saveBtn, { marginTop: 16 }, pwLoading && { opacity: 0.6 }]}
              onPress={handleChangePassword} disabled={pwLoading}>
              {pwLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setShowPwModal(false)}>
              <Text style={{ color: '#6b7280', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

function FieldRow({ label, value, onChangeText, placeholder, multiline, hint, locked }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 72, textAlignVertical: 'top' }, locked && { backgroundColor: '#f9fafb', color: '#9ca3af' }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#9ca3af" multiline={multiline} editable={!locked}
      />
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, margin: 16, marginBottom: 0, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardLabel: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardLabelSub: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  cardHeaderRow: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  // Profile card
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  profileEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  profileType: { fontSize: 12, color: '#6b7280' },
  verifiedBadge: { backgroundColor: '#c8ddd1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  verifiedText: { fontSize: 12, fontWeight: '700', color: GREEN },
  // Profiles switcher
  addCompanyBtn: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 14 },
  addCompanyText: { fontSize: 14, color: GREEN, fontWeight: '700' },
  profileItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  profileItemAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  profileItemAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  profileItemName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  profileItemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  activeBadge: { backgroundColor: '#c8ddd1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: GREEN },
  switchBtn: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  switchBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  // Edit form
  lockedNote: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#fafafa' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  changeBtn: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  changeBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  saveBtn: { backgroundColor: GREEN, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Read-only info
  readOnlyNote: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  infoLabel: { fontSize: 13, color: '#6b7280' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '600' },
  // Settings
  settingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  settingTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  settingSub: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  deleteBtn: { marginTop: 12, borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 10, padding: 12, alignItems: 'center' },
  deleteBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  signOutBtn: { margin: 16, marginTop: 20, borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 14, padding: 14, alignItems: 'center' },
  signOutText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
})
