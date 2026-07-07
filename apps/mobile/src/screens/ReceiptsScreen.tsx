import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput, Share, Modal, ScrollView,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { Receipt } from '../types'
import { formatAmount, formatDate } from '../lib/formatters'

const GREEN = '#1a3728'

const STATUS_COLOR: Record<string, string> = {
  active: '#1a3728',
  cancelled: '#991b1b',
  expired: '#92400e',
}

export default function ReceiptsScreen({ navigation }: any) {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [financial, setFinancial] = useState({ totalRevenue: 0, vatRemoved: 0, expenditure: 0 })
  const [editExp, setEditExp] = useState(false)
  const [expInput, setExpInput] = useState('0')
  const [search, setSearch] = useState('')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [groups, setGroups] = useState<{ id: string; name: string; receiptIds: string[] }[]>([])
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  const ALL_COLUMNS = [
    { key: 'receipt_number', label: 'Receipt No.' },
    { key: 'buyer_name', label: 'Customer' },
    { key: 'buyer_phone', label: 'Phone' },
    { key: 'buyer_email', label: 'Email' },
    { key: 'total_amount', label: 'Amount / Payments' },
    { key: 'created_at', label: 'Date & Time' },
    { key: 'transaction_date', label: 'Txn Date' },
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'vat_amount', label: 'VAT' },
    { key: 'status', label: 'Status' },
    { key: 'installments', label: 'Installments' },
    { key: 'issued_by', label: 'Issued By' },
  ]
  const [selectedCols, setSelectedCols] = useState<string[]>([
    'receipt_number', 'buyer_name', 'total_amount', 'created_at', 'transaction_date', 'payment_method', 'status', 'installments',
  ])

  function toggleCol(key: string) {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) {
      setReceipts(data)
      const active = data.filter((r: Receipt) => r.status === 'active')
      const totalRevenue = active.reduce((s: number, r: Receipt) => s + r.total_amount, 0)
      const vatRemoved = active.reduce((s: number, r: Receipt) => s + ((r as any).vat_amount || 0), 0)
      setFinancial(prev => ({ ...prev, totalRevenue, vatRemoved }))
    }
    setLoading(false)
    setRefreshing(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const groupFiltered = activeGroup
    ? receipts.filter(r => groups.find(g => g.id === activeGroup)?.receiptIds.includes(r.id))
    : receipts

  const filtered = groupFiltered.filter(r =>
    !search || r.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.receipt_number?.toLowerCase().includes(search.toLowerCase())
  )

  async function exportCSV() {
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key))
    const header = cols.map(c => c.label).join(',')
    const rows = filtered.map(r =>
      cols.map(c => {
        const val = (r as any)[c.key]
        if (c.key === 'total_amount' || c.key === 'vat_amount') return val ? `₦${parseFloat(val).toLocaleString()}` : '₦0'
        if (c.key === 'created_at' || c.key === 'transaction_date') return val ? formatDate(val) : ''
        return val ?? ''
      }).join(',')
    )
    await Share.share({ message: [header, ...rows].join('\n'), title: 'Receipts Export (CSV)' })
    setShowExportModal(false)
  }

  async function exportPDF() {
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key))
    const lines = [
      'RECEIPTS EXPORT',
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      cols.map(c => c.label).join(' | '),
      '─'.repeat(60),
      ...filtered.map(r =>
        cols.map(c => {
          const val = (r as any)[c.key]
          if (c.key === 'total_amount' || c.key === 'vat_amount') return val ? `₦${parseFloat(val).toLocaleString()}` : '₦0'
          if (c.key === 'created_at' || c.key === 'transaction_date') return val ? formatDate(val) : ''
          return val ?? ''
        }).join(' | ')
      ),
    ].join('\n')
    await Share.share({ message: lines, title: 'Receipts Export (PDF)' })
    setShowExportModal(false)
  }

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function createGroup() {
    if (!groupName.trim()) { Alert.alert('Required', 'Enter a group name.'); return }
    if (selected.length === 0) { Alert.alert('Select receipts', 'Select at least one receipt to add to the group.'); return }
    const newGroup = { id: Date.now().toString(), name: groupName.trim(), receiptIds: [...selected] }
    setGroups(prev => [...prev, newGroup])
    Alert.alert('Group Created', `"${groupName.trim()}" created with ${selected.length} receipt(s).`)
    setGroupName('')
    setSelected([])
    setSelectMode(false)
    setShowGroupModal(false)
  }

  function deleteGroup(id: string) {
    Alert.alert('Delete Group', 'Remove this group? Receipts are not deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setGroups(prev => prev.filter(g => g.id !== id))
        if (activeGroup === id) setActiveGroup(null)
      }},
    ])
  }

  const revenueAfterVat = financial.totalRevenue - financial.vatRemoved
  const totalBalance = revenueAfterVat - financial.expenditure

  if (loading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>

  return (
    <View style={styles.container}>

      {/* ── Fixed header ─────────────────────────────────────────────── */}
      <View style={styles.fixedHeader}>
        {/* Search + export toolbar */}
        <View style={styles.toolbar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.toolBtn} onPress={() => { setSelectMode(true); setShowGroupModal(true) }}>
            <Text style={styles.toolBtnText}>Group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowExportModal(true)}>
            <Text style={styles.toolBtnText}>⬇</Text>
          </TouchableOpacity>
        </View>

        {/* Groups chips */}
        {groups.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupsRow} contentContainerStyle={{ paddingHorizontal: 10, gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.groupChip, activeGroup === null && styles.groupChipActive]}
              onPress={() => setActiveGroup(null)}
            >
              <Text style={[styles.groupChipText, activeGroup === null && styles.groupChipTextActive]}>All</Text>
            </TouchableOpacity>
            {groups.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.groupChip, activeGroup === g.id && styles.groupChipActive]}
                onPress={() => setActiveGroup(activeGroup === g.id ? null : g.id)}
                onLongPress={() => deleteGroup(g.id)}
              >
                <Text style={[styles.groupChipText, activeGroup === g.id && styles.groupChipTextActive]}>
                  {g.name} ({g.receiptIds.length})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {selectMode && (
          <View style={styles.selectBar}>
            <Text style={styles.selectBarText}>{selected.length} selected</Text>
            <TouchableOpacity onPress={() => { setSelectMode(false); setSelected([]) }}>
              <Text style={styles.cancelSelect}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Financial Summary */}
        <View style={styles.finCard}>
          <Text style={styles.finTitle}>Financial Summary</Text>
          <Text style={styles.finSub}>Based on all active receipts</Text>
          <View style={styles.finDivider} />
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Total Revenue</Text>
            <Text style={styles.finVal}>₦{financial.totalRevenue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.finDivider} />
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>VAT Removed</Text>
            <Text style={[styles.finVal, { color: '#dc2626' }]}>– ₦{financial.vatRemoved.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.finDivider} />
          <View style={styles.finRow}>
            <Text style={[styles.finLabel, { fontWeight: '700' }]}>Revenue after VAT</Text>
            <Text style={[styles.finVal, { fontWeight: '700' }]}>₦{revenueAfterVat.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.finDivider} />
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Expenditure</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {editExp ? (
                <TextInput
                  style={styles.expInput}
                  value={expInput}
                  onChangeText={setExpInput}
                  keyboardType="numeric"
                  autoFocus
                  onBlur={() => { setFinancial(prev => ({ ...prev, expenditure: parseFloat(expInput) || 0 })); setEditExp(false) }}
                />
              ) : (
                <>
                  <Text style={[styles.finVal, { color: '#92400e' }]}>– ₦{financial.expenditure.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
                  <TouchableOpacity onPress={() => { setExpInput(String(financial.expenditure)); setEditExp(true) }}>
                    <Text style={{ fontSize: 16 }}>✏️</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.addExpBtn} onPress={() => { setExpInput(''); setEditExp(true) }}>
            <Text style={styles.addExpTxt}>+ Add Expenditure / Tax</Text>
          </TouchableOpacity>
          <View style={styles.finDivider} />
          <View style={styles.finRow}>
            <Text style={[styles.finLabel, { fontWeight: '800', fontSize: 15 }]}>Total Balance</Text>
            <Text style={[styles.finVal, { fontWeight: '900', fontSize: 16 }]}>
              ₦{totalBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Section heading */}
        <Text style={styles.sectionTitle}>Receipts ({filtered.length})</Text>
      </View>

      {/* ── Scrollable receipt list ───────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        renderItem={({ item, index }) => {
          const isSelected = selected.includes(item.id)
          return (
            <TouchableOpacity
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => selectMode ? toggleSelect(item.id) : navigation.navigate('ReceiptDetail', { receipt: item })}
              onLongPress={() => { setSelectMode(true); toggleSelect(item.id) }}
            >
              <Text style={styles.rowNum}>{index + 1}</Text>
              {selectMode && <Text style={styles.checkbox}>{isSelected ? '☑' : '☐'}</Text>}
              <View style={styles.rowLeft}>
                <Text style={styles.buyerName}>{item.buyer_name}</Text>
                <Text style={styles.rowDate}>{formatDate(item.transaction_date)}</Text>
                <Text style={styles.receiptNo}>#{item.receipt_number}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.amount}>{formatAmount(item.total_amount, item.currency)}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={GREEN} />}
        ListEmptyComponent={<Text style={styles.empty}>No receipts found.</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Export Receipts</Text>
            <Text style={styles.modalSub}>Select columns to include</Text>
            {ALL_COLUMNS.map(col => (
              <TouchableOpacity key={col.key} style={styles.colRow} onPress={() => toggleCol(col.key)}>
                <View style={[styles.colCheck, selectedCols.includes(col.key) && styles.colCheckActive]}>
                  {selectedCols.includes(col.key) && <Text style={styles.colCheckMark}>✓</Text>}
                </View>
                <Text style={styles.colLabel}>{col.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.exportDivider} />
            <TouchableOpacity style={styles.exportBtn} onPress={exportPDF}>
              <Text style={styles.exportBtnIcon}>📄</Text>
              <Text style={styles.exportBtnText}>Download as PDF</Text>
            </TouchableOpacity>
            <View style={styles.exportDivider} />
            <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
              <Text style={styles.exportBtnIcon}>📊</Text>
              <Text style={styles.exportBtnText}>Download as CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowExportModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal visible={showGroupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <Text style={styles.modalSub}>Long-press receipts to select, then tap Create.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group name"
              placeholderTextColor="#9ca3af"
              value={groupName}
              onChangeText={setGroupName}
            />
            <Text style={styles.modalSub}>{selected.length} receipt(s) selected</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={createGroup}>
              <Text style={styles.modalBtnText}>Create Group</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowGroupModal(false); setSelectMode(false); setSelected([]) }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fixedHeader: { backgroundColor: '#f9fafb' },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, gap: 7, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 13, color: '#111827' },
  toolBtn: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#e5e7eb' },
  toolBtnText: { fontSize: 12, color: '#374151', fontWeight: '700' },
  groupsRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 8 },
  groupChip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#f9fafb' },
  groupChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  groupChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  groupChipTextActive: { color: '#fff' },
  selectBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 8 },
  selectBarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelSelect: { color: '#fff', fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, backgroundColor: '#f9fafb' },
  row: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  rowSelected: { borderWidth: 2, borderColor: GREEN },
  rowNum: { fontSize: 12, fontWeight: '700', color: '#9ca3af', width: 24, textAlign: 'right', marginRight: 10 },
  checkbox: { fontSize: 20, marginRight: 10, color: GREEN },
  rowLeft: { flex: 1, gap: 3 },
  buyerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rowDate: { fontSize: 12, color: '#6b7280' },
  receiptNo: { fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 14 },
  // financial
  finCard: { backgroundColor: '#f0f5f2', marginHorizontal: 16, marginTop: 12, marginBottom: 0, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#c8ddd1' },
  finTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  finSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  finDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finLabel: { fontSize: 13, color: '#374151', flex: 1 },
  finVal: { fontSize: 13, fontWeight: '600', color: '#111827' },
  addExpBtn: { paddingVertical: 4 },
  addExpTxt: { fontSize: 12, color: GREEN, fontWeight: '600' },
  expInput: { borderBottomWidth: 1, borderColor: GREEN, fontSize: 13, color: '#111827', minWidth: 80, textAlign: 'right', paddingVertical: 2 },
  // modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#6b7280', marginBottom: 14 },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827', marginBottom: 12 },
  modalBtn: { backgroundColor: GREEN, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalCancel: { textAlign: 'center', color: '#6b7280', fontSize: 14, paddingVertical: 8 },
  colRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  colCheck: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: '#d1d5db', marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  colCheckActive: { backgroundColor: GREEN, borderColor: GREEN },
  colCheckMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  colLabel: { fontSize: 15, color: '#111827' },
  exportDivider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  exportBtnIcon: { fontSize: 20, marginRight: 14 },
  exportBtnText: { fontSize: 16, color: '#111827', fontWeight: '500' },
})
