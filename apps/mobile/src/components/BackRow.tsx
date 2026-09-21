import React from 'react'
import { TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function BackRow({ navigation }: { navigation: any; label?: string }) {
  if (!navigation) return null
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => navigation.goBack()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="chevron-back" size={24} color="#0f172a" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 12,
    paddingBottom: 10,
    alignSelf: 'flex-start',
  },
})
