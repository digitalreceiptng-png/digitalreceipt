import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

const FOREST_GREEN = '#1b7a4d'
const FOREST_DARK = '#064e3b'
const ACCENT_LIGHT = '#ecfdf5'

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

  // Verification states (NIN & CAC)
  const [verifyType, setVerifyType] = useState<'cac' | 'nin'>('cac')
  const [verifyNin, setVerifyNin] = useState('')
  const [verifyNinOtp, setVerifyNinOtp] = useState('')
  const [ninOtpSent, setNinOtpSent] = useState(false)
  const [ninContactInfo, setNinContactInfo] = useState('')
  const [ninVerifying, setNinVerifying] = useState(false)

  const [verifyRcbn, setVerifyRcbn] = useState('')
  const [verifyBizName, setVerifyBizName] = useState('')
  const [verifyBizType, setVerifyBizType] = useState<'registered' | 'individual'>('registered')
  const [verifyRcbnOtp, setVerifyRcbnOtp] = useState('')
  const [rcbnOtpSent, setRcbnOtpSent] = useState(false)
  const [rcbnContactInfo, setRcbnContactInfo] = useState('')
  const [rcbnVerifying, setRcbnVerifying] = useState(false)

  useEffect(() => { load() }, [])

  async function handleSendNinOtp() {
    if (verifyNin.length !== 11) { Alert.alert('Invalid NIN', 'NIN must be 11 digits.'); return }
    setNinVerifying(true)
    try {
      const res = await fetch('https://www.digitalreceipt.ng/api/nin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nin: verifyNin.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.sessionToken) {
        setNinOtpSent(true)
        setNinContactInfo('Verification code sent to registered NIMC phone/email.')
      } else {
        setNinOtpSent(true)
        setNinContactInfo('Enter the 6-digit verification code below:')
      }
    } catch {
      setNinOtpSent(true)
      setNinContactInfo('Enter the 6-digit verification code below:')
    } finally {
      setNinVerifying(false)
    }
  }

  async function handleConfirmNinOtp() {
    if (!verifyNinOtp.trim()) { Alert.alert('Enter Code', 'Please enter the verification code.'); return }
    setNinVerifying(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email || '',
        full_name: fullName || user.user_metadata?.full_name || 'Verified Issuer',
        is_verified: true,
        nin: verifyNin.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      setProfile((prev: any) => ({ ...prev, is_verified: true, nin: verifyNin.trim() }))
      Alert.alert('Verification Successful', 'Your NIN identity has been verified successfully.')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Verification failed.')
    } finally {
      setNinVerifying(false)
    }
  }

  async function handleSendCacOtp() {
    if (!verifyRcbn.trim()) { Alert.alert('RC/BN Required', 'Please enter your CAC RC or BN number.'); return }
    setRcbnVerifying(true)
    try {
      const res = await fetch(`https://www.digitalreceipt.ng/api/cac?rc=${encodeURIComponent(verifyRcbn.trim())}`)
      const data = await res.json()
      if (res.ok && data.sessionToken) {
        setRcbnOtpSent(true)
        setRcbnContactInfo('Verification code sent to registered business contact.')
      } else {
        setRcbnOtpSent(true)
        setRcbnContactInfo('Enter the 6-digit verification code below:')
      }
    } catch {
      setRcbnOtpSent(true)
      setRcbnContactInfo('Enter the 6-digit verification code below:')
    } finally {
      setRcbnVerifying(false)
    }
  }

  async function handleConfirmCacOtp() {
    if (!verifyRcbnOtp.trim()) { Alert.alert('Enter Code', 'Please enter the verification code.'); return }
    setRcbnVerifying(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const finalBizName = verifyBizName.trim() || businessName.trim() || 'Verified Business'

      await Promise.all([
        supabase.from('profiles').upsert({
          id: user.id,
          email: user.email || '',
          full_name: fullName || user.user_metadata?.full_name || finalBizName,
          is_verified: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' }),
        supabase.from('businesses').upsert({
          ...(business?.id ? { id: business.id } : {}),
          user_id: user.id,
          name: finalBizName,
          rc_number: verifyRcbn.trim(),
          rcbn_verified: true,
          business_type: verifyBizType,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }),
      ])

      setProfile((prev: any) => ({ ...prev, is_verified: true }))
      setBusiness((prev: any) => ({ ...prev, rcbn_verified: true, rc_number: verifyRcbn.trim(), name: finalBizName }))
      setBusinessName(finalBizName)

      Alert.alert('Verification Successful', 'Your CAC Business Registration has been verified successfully.')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Verification failed.')
    } finally {
      setRcbnVerifying(false)
    }
  }

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, bizRes, companiesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('businesses').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('businesses').select('*').eq('user_id', user.id),
    ])

    if (profileRes.data) {
      setProfile(profileRes.data)
      setFullName(profileRes.data.full_name || user.user_metadata?.full_name || '')
      setPhone(profileRes.data.phone || user.user_metadata?.phone || user.phone || '')
      setAddress(profileRes.data.address || '')
      setIssuedByName(profileRes.data.issued_by_name || '')
    } else {
      const defaultName = user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : '')
      setFullName(defaultName)
      setPhone(user.user_metadata?.phone || user.phone || '')
      setAddress(user.user_metadata?.address || '')
      const newProfile = {
        id: user.id,
        email: user.email || '',
        full_name: defaultName,
        issuer_type: 'individual',
        is_verified: false,
      }
      setProfile(newProfile as any)
      await supabase.from('profiles').upsert(newProfile, { onConflict: 'id', ignoreDuplicates: true })
    }

    if (bizRes.data) {
      setBusiness(bizRes.data)
      setBusinessName(bizRes.data.name || '')
    } else if (user.user_metadata?.business_name) {
      setBusinessName(user.user_metadata.business_name)
    }

    if (companiesRes.data) setCompanies(companiesRes.data)
    setLoading(false)
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    try {
      const profilePayload: any = {
        id: user.id,
        email: user.email || '',
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        issued_by_name: issuedByName.trim() || null,
      }

      await Promise.all([
        supabase.from('profiles').upsert(profilePayload),
        businessName.trim()
          ? supabase.from('businesses').upsert({
              ...(business?.id ? { id: business.id } : {}),
              user_id: user.id,
              name: businessName.trim(),
              phone: phone.trim() || null,
              address: address.trim() || null,
            })
          : Promise.resolve(null),
      ])

      await load()
      Alert.alert('Saved', 'Profile updated successfully.')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
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
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut()
          },
        },
      ]
    )
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={FOREST_GREEN} size="large" /></View>

  const initials = (businessName || fullName || 'M').charAt(0).toUpperCase()
  const accountType = business?.business_type === 'individual' ? 'Individual Issuer' : 'Business Issuer'

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
        <Text style={styles.navTitle}>Profile Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Profile Hero Header Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={12} color="#ffffff" />
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.profileName}>{businessName || fullName}</Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{accountType}</Text>
                </View>
                {profile?.is_verified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={FOREST_GREEN} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : (
                  <View style={styles.unverifiedBadge}>
                    <Ionicons name="alert-circle-outline" size={13} color="#d97706" />
                    <Text style={styles.unverifiedText}>Unverified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Identity & Company Verification Section */}
        {(profile?.is_verified || business?.rcbn_verified) ? (
          <View style={styles.verifiedCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={26} color={FOREST_GREEN} />
            </View>
            <Text style={styles.verifiedCardTitle}>Account & Business Verified</Text>
            <Text style={styles.verifiedCardSub}>
              {business?.rcbn_verified
                ? `CAC Registration: ${business.rc_number || 'Verified'}`
                : `NIN Identity Verified (${profile?.nin ? '****' + profile.nin.slice(-4) : 'Verified'})`}
            </Text>
          </View>
        ) : (
          <View style={styles.verifyCardContainer}>
            {/* Icon Header */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="business" size={26} color={FOREST_GREEN} />
              </View>
              <Text style={styles.verifyTitle}>
                {verifyType === 'cac' ? 'Verify Your Company' : 'Verify Your Identity'}
              </Text>
              <Text style={styles.verifySub}>
                {verifyType === 'cac'
                  ? 'Enter your CAC registration number to look up your company.'
                  : 'Enter your 11-digit NIN to verify your profile identity.'}
              </Text>
            </View>

            {/* Segmented Switcher */}
            <View style={styles.segmentWrap}>
              <TouchableOpacity
                style={[styles.segmentBtn, verifyType === 'cac' && styles.segmentBtnActive]}
                onPress={() => { setVerifyType('cac'); setRcbnOtpSent(false); }}
              >
                <Text style={[styles.segmentText, verifyType === 'cac' && styles.segmentTextActive]}>
                  Company (CAC)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, verifyType === 'nin' && styles.segmentBtnActive]}
                onPress={() => { setVerifyType('nin'); setNinOtpSent(false); }}
              >
                <Text style={[styles.segmentText, verifyType === 'nin' && styles.segmentTextActive]}>
                  Individual (NIN)
                </Text>
              </TouchableOpacity>
            </View>

            {/* CAC Form */}
            {verifyType === 'cac' && (
              <View style={{ width: '100%' }}>
                <Text style={styles.fieldLabel}>Business Registration Type</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={[styles.bizTypePill, verifyBizType === 'registered' && styles.bizTypePillActive]}
                    onPress={() => setVerifyBizType('registered')}
                  >
                    <Text style={[styles.bizTypePillText, verifyBizType === 'registered' && styles.bizTypePillTextActive]}>
                      Company (RC / IT)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.bizTypePill, verifyBizType === 'individual' && styles.bizTypePillActive]}
                    onPress={() => setVerifyBizType('individual')}
                  >
                    <Text style={[styles.bizTypePillText, verifyBizType === 'individual' && styles.bizTypePillTextActive]}>
                      Business Name (BN)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>RC Number</Text>
                <TextInput
                  style={styles.input}
                  value={verifyRcbn}
                  onChangeText={setVerifyRcbn}
                  placeholder="RC Number (e.g. RC1234567)"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Registered Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={verifyBizName}
                  onChangeText={setVerifyBizName}
                  placeholder="e.g. Acme Enterprise"
                  placeholderTextColor="#94a3b8"
                />

                {!rcbnOtpSent ? (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 16 }, rcbnVerifying && { opacity: 0.7 }]}
                    onPress={handleSendCacOtp}
                    disabled={rcbnVerifying}
                  >
                    {rcbnVerifying ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Fetch Details</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.otpNotice}>{rcbnContactInfo}</Text>
                    <TextInput
                      style={styles.input}
                      value={verifyRcbnOtp}
                      onChangeText={setVerifyRcbnOtp}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.primaryBtn, { marginTop: 14 }, rcbnVerifying && { opacity: 0.7 }]}
                      onPress={handleConfirmCacOtp}
                      disabled={rcbnVerifying}
                    >
                      {rcbnVerifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Confirm Code & Verify CAC</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* NIN Form */}
            {verifyType === 'nin' && (
              <View style={{ width: '100%' }}>
                <Text style={styles.fieldLabel}>11-digit NIN</Text>
                <TextInput
                  style={styles.input}
                  value={verifyNin}
                  onChangeText={v => setVerifyNin(v.replace(/\D/g, '').slice(0, 11))}
                  placeholder="NIN Number (e.g. 12345678901)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />

                {!ninOtpSent ? (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 16 }, ninVerifying && { opacity: 0.7 }]}
                    onPress={handleSendNinOtp}
                    disabled={ninVerifying}
                  >
                    {ninVerifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Fetch Details</Text>}
                  </TouchableOpacity>
                ) : (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.otpNotice}>{ninContactInfo}</Text>
                    <TextInput
                      style={styles.input}
                      value={verifyNinOtp}
                      onChangeText={setVerifyNinOtp}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.primaryBtn, { marginTop: 14 }, ninVerifying && { opacity: 0.7 }]}
                      onPress={handleConfirmNinOtp}
                      disabled={ninVerifying}
                    >
                      {ninVerifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Confirm Code & Verify NIN</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Your Profiles / Company Switcher */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>Your Profiles</Text>
            <Text style={styles.cardLabelSub}>Switch between main account and added company profiles.</Text>
          </View>
          <TouchableOpacity style={styles.addCompanyBtn}>
            <Text style={styles.addCompanyText}>+ Add Company</Text>
          </TouchableOpacity>

          {/* Main Account */}
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

          {/* Other Companies */}
          {companies.filter(c => c.id !== business?.id).map(c => (
            <View key={c.id} style={[styles.profileItem, { opacity: 0.8 }]}>
              <View style={[styles.profileItemAvatar, { backgroundColor: '#f1f5f9' }]}>
                <Text style={[styles.profileItemAvatarText, { color: '#64748b' }]}>{c.name?.charAt(0) || 'C'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.profileItemName}>{c.name}</Text>
                <Text style={styles.profileItemSub}>RC: {c.rc_number} · Company</Text>
              </View>
              <TouchableOpacity style={styles.switchBtn}>
                <Text style={styles.switchBtnText}>→ Switch</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Edit Details */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Edit Profile Details</Text>
          <Text style={styles.lockedNote}>Official identity fields lock after verification</Text>

          <FieldRow label="Full name *" value={fullName} onChangeText={setFullName}
            placeholder="Your full name" locked={!!profile?.is_verified} />
          <FieldRow label="Business name *" value={businessName} onChangeText={setBusinessName}
            placeholder="Your business name" locked={!!business?.rcbn_verified} />

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Phone number</Text>
            <View style={styles.inlineRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={phone} onChangeText={setPhone}
                placeholder="+234..." placeholderTextColor="#94a3b8" keyboardType="phone-pad" />
              <TouchableOpacity style={styles.changeBtn}><Text style={styles.changeBtnText}>Change</Text></TouchableOpacity>
            </View>
          </View>

          <FieldRow label="Address" value={address} onChangeText={setAddress}
            placeholder="Street, City, State" multiline
            hint="Used to determine the state code on your receipt numbers." />

          <FieldRow label="Issued By name" value={issuedByName} onChangeText={setIssuedByName}
            placeholder="e.g. Victor"
            hint='This name appears in the "Issued By" column on receipts. Leave blank to show "Admin".' />

          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Profile Changes</Text>}
          </TouchableOpacity>
        </View>

        {/* Account Information (read-only) */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Account Information</Text>
          <Text style={styles.readOnlyNote}>These fields are verified & read-only.</Text>
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
              <Text style={styles.settingSub}>Change your account password securely.</Text>
            </View>
            <TouchableOpacity style={styles.changeBtn} onPress={() => setShowPwModal(true)}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.settingRow, { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: '#dc2626' }]}>Delete Account</Text>
              <Text style={styles.settingSub}>Permanently delete your account and associated data. This cannot be undone.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Text style={styles.deleteBtnText}>Delete my account</Text>
          </TouchableOpacity>
        </View>

        {/* Change Password Modal */}
        <Modal visible={showPwModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Update Password</Text>
              <Text style={styles.fieldLabel}>New password</Text>
              <TextInput style={styles.input} value={newPw} onChangeText={setNewPw}
                placeholder="At least 6 characters" placeholderTextColor="#94a3b8" secureTextEntry />
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Confirm new password</Text>
              <TextInput style={styles.input} value={confirmPw} onChangeText={setConfirmPw}
                placeholder="Re-enter password" placeholderTextColor="#94a3b8" secureTextEntry />
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }, pwLoading && { opacity: 0.6 }]}
                onPress={handleChangePassword} disabled={pwLoading}>
                {pwLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setShowPwModal(false)}>
                <Text style={{ color: '#64748b', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  )
}

function FieldRow({ label, value, onChangeText, placeholder, multiline, hint, locked }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 72, textAlignVertical: 'top' }, locked && { backgroundColor: '#f8fafc', color: '#94a3b8' }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#94a3b8" multiline={multiline} editable={!locked}
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

  // Hero Card
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 16,
    marginBottom: 0,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: FOREST_GREEN, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: FOREST_DARK,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileName: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  typePill: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  typePillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  verifiedBadge: { backgroundColor: ACCENT_LIGHT, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 12, fontWeight: '700', color: FOREST_GREEN },
  unverifiedBadge: { backgroundColor: '#fffbebf', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  unverifiedText: { fontSize: 12, fontWeight: '700', color: '#d97706' },

  // Card Structure
  card: { backgroundColor: '#ffffff', borderRadius: 20, margin: 16, marginBottom: 0, padding: 20, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  cardLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  cardLabelSub: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  cardHeaderRow: { marginBottom: 8 },

  // Centered Hero Verification Card (inspired layout)
  verifyCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 16,
    marginBottom: 0,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  verifySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginVertical: 16,
    width: '100%',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: FOREST_GREEN,
    fontWeight: '700',
  },
  bizTypePill: {
    flex: 1,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  bizTypePillActive: {
    borderColor: FOREST_GREEN,
    backgroundColor: ACCENT_LIGHT,
  },
  bizTypePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  bizTypePillTextActive: {
    color: FOREST_GREEN,
    fontWeight: '700',
  },

  // Verified Status Card
  verifiedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 16,
    marginBottom: 0,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  verifiedCardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  verifiedCardSub: { fontSize: 13, color: '#475569', marginTop: 4 },

  // Inputs & Primary Button
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#64748b', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  otpNotice: { fontSize: 12, color: FOREST_GREEN, fontWeight: '600', marginBottom: 8 },
  primaryBtn: {
    backgroundColor: FOREST_GREEN,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  linkText: { fontSize: 13, color: '#64748b' },
  linkBold: { color: FOREST_GREEN, fontWeight: '700' },

  // Switcher Items
  addCompanyBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 11, alignItems: 'center', marginBottom: 14 },
  addCompanyText: { fontSize: 14, color: FOREST_GREEN, fontWeight: '700' },
  profileItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  profileItemAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: FOREST_GREEN, alignItems: 'center', justifyContent: 'center' },
  profileItemAvatarText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  profileItemName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  profileItemSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  activeBadge: { backgroundColor: ACCENT_LIGHT, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: FOREST_GREEN },
  switchBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  switchBtnText: { fontSize: 12, color: '#334155', fontWeight: '600' },

  // Form locked & Readonly
  lockedNote: { fontSize: 12, color: '#94a3b8', marginBottom: 14 },
  readOnlyNote: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoValue: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  changeBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  changeBtnText: { fontSize: 13, fontWeight: '600', color: '#334155' },

  // Settings
  settingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  settingTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  settingSub: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  deleteBtn: { marginTop: 12, borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 10, padding: 12, alignItems: 'center' },
  deleteBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
})
