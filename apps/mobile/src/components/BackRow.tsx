import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'

export default function BackRow({ navigation, label = 'Back' }: { navigation: any; label?: string }) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => navigation.goBack()}>
      <Text style={styles.arrow}>‹</Text>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f5f5f5' },
  arrow: { fontSize: 26, color: '#1a3728', marginRight: 4, lineHeight: 28 },
  text: { fontSize: 15, color: '#1a3728', fontWeight: '600' },
})
