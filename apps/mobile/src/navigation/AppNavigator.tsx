import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, ActivityIndicator, View, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

import CountrySelectScreen from '../screens/CountrySelectScreen'
import LoginScreen from '../screens/LoginScreen'
import StaffLoginScreen from '../screens/StaffLoginScreen'
import VerifyScreen from '../screens/VerifyScreen'
import PublicGenerateScreen from '../screens/PublicGenerateScreen'
import DashboardScreen from '../screens/DashboardScreen'
import CreateReceiptScreen from '../screens/CreateReceiptScreen'
import ReceiptDetailScreen from '../screens/ReceiptDetailScreen'
import ProfileScreen from '../screens/ProfileScreen'
import MoreScreen from '../screens/MoreScreen'
import ReceiptsScreen from '../screens/ReceiptsScreen'
import WalletScreen from '../screens/WalletScreen'
import StaffScreen from '../screens/StaffScreen'
import StaffDetailScreen from '../screens/StaffDetailScreen'
import BrandingScreen from '../screens/BrandingScreen'
import RequestsScreen from '../screens/RequestsScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const GREEN = '#1a3728'

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '🏠',
    Receipts: '🧾',
    'New Receipt': '➕',
    More: '☰',
  }
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[name] ?? '•'}</Text>
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: '#374151',
        tabBarStyle: { borderTopColor: '#d1d5db', borderTopWidth: 1, paddingBottom: 4, backgroundColor: '#fff', elevation: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: GREEN },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Overview' }} />
      <Tab.Screen name="Receipts" component={ReceiptsScreen} options={{ title: 'Receipts' }} />
      <Tab.Screen name="New Receipt" component={CreateReceiptScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  )
}

// Simple receipts list tab screen (navigates to DashboardScreen list view)
function ReceiptsList({ navigation }: any) {
  return <DashboardScreen navigation={navigation} />
}

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [country, setCountry] = useState<any>(null)
  const [publicScreen, setPublicScreen] = useState<string | null>(null)
  const [showStaffLogin, setShowStaffLogin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    )
  }

  if (!country) {
    return <CountrySelectScreen onSelect={setCountry} />
  }

  if (publicScreen === 'generate') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: GREEN, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setPublicScreen(null)}>
            <Text style={{ color: '#fff', fontSize: 22 }}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <PublicGenerateScreen />
      </View>
    )
  }

  if (publicScreen === 'verify') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: GREEN, paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setPublicScreen(null)}>
            <Text style={{ color: '#fff', fontSize: 16, marginRight: 16 }}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Verify Receipt</Text>
        </View>
        <VerifyScreen />
      </View>
    )
  }

  if (!session) {
    if (showStaffLogin) {
      return <StaffLoginScreen onBack={() => setShowStaffLogin(false)} />
    }
    return (
      <LoginScreen
        country={country}
        onPublicNavigate={(screen) => setPublicScreen(screen)}
        onChangeCountry={() => setCountry(null)}
        onStaffLink={() => setShowStaffLogin(true)}
      />
    )
  }

  const logoHeader = {
    headerLeft: () => (
      <Image source={require('../../assets/logo.png')} style={{ width: 36, height: 36, marginLeft: 4 }} resizeMode="contain" />
    ),
    headerBackVisible: false,
    headerTitle: () => null,
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: GREEN },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} options={logoHeader} />
        <Stack.Screen name="CreateReceipt" component={CreateReceiptScreen} options={logoHeader} />
        <Stack.Screen name="PublicGenerate" component={PublicGenerateScreen} options={{ ...logoHeader, headerTitle: () => <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Free Invoice</Text> }} />
        <Stack.Screen name="ReceiptsList" component={ReceiptsList} options={logoHeader} />
        <Stack.Screen name="Wallet" component={WalletScreen} options={logoHeader} />
        <Stack.Screen name="Staff" component={StaffScreen} options={logoHeader} />
        <Stack.Screen name="StaffDetail" component={StaffDetailScreen} options={{ ...logoHeader, headerBackVisible: true, headerTitle: () => <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Staff Member</Text> }} />
        <Stack.Screen name="Branding" component={BrandingScreen} options={logoHeader} />
        <Stack.Screen name="Requests" component={RequestsScreen} options={logoHeader} />
        <Stack.Screen name="Verify" component={VerifyScreen} options={logoHeader} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={logoHeader} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f5f2' },
})
