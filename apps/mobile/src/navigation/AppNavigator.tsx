import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, ActivityIndicator, View, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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

function CustomTabBar({ state, descriptors, navigation }: any) {
  const iconNames: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }> = {
    Dashboard: { active: 'home', inactive: 'home-outline', label: 'Home' },
    Receipts: { active: 'receipt', inactive: 'receipt-outline', label: 'Receipts' },
    'New Receipt': { active: 'add-circle', inactive: 'add-circle-outline', label: 'New' },
    More: { active: 'grid', inactive: 'grid-outline', label: 'More' },
  }

  return (
    <View style={styles.floatingTabBar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key]
        const isFocused = state.index === index
        const meta = iconNames[route.name] || { active: 'ellipse', inactive: 'ellipse-outline', label: route.name }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            style={[styles.tabItem, isFocused && styles.tabItemActive]}
          >
            <Ionicons
              name={isFocused ? meta.active : meta.inactive}
              size={20}
              color={isFocused ? '#ffffff' : '#64748b'}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {meta.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function HomeTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Receipts" component={ReceiptsScreen} />
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
  const [country, setCountry] = useState<any>({ code: 'NG', name: 'Nigeria', tagline: 'Verifiable Digital Receipt' })
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
    return <VerifyScreen onBack={() => setPublicScreen(null)} />
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
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeTabs} />
        <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
        <Stack.Screen name="CreateReceipt" component={CreateReceiptScreen} />
        <Stack.Screen name="PublicGenerate" component={PublicGenerateScreen} />
        <Stack.Screen name="ReceiptsList" component={ReceiptsList} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Staff" component={StaffScreen} />
        <Stack.Screen name="StaffDetail" component={StaffDetailScreen} />
        <Stack.Screen name="Branding" component={BrandingScreen} />
        <Stack.Screen name="Requests" component={RequestsScreen} />
        <Stack.Screen name="Verify" component={VerifyScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f5f2' },
  floatingTabBar: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 7,
    paddingHorizontal: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 2,
  },
  tabItemActive: {
    backgroundColor: GREEN,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
})
