import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput, Share, Modal, ScrollView,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
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
  // Expenditures/taxes — server-side, synced with the web financial summary.
  type ExpEntry = { id: string; label: string; value: number; type: 'fixed' | 'percent' }
  const [expEntries, setExpEntries] = useState<ExpEntry[]>([])
  const [editingExpId, setEditingExpId] = useState<string | null>(null)
  const [expLabelInput, setExpLabelInput] = useState('')
  const [expValInput, setExpValInput] = useState('')
  const [expTypeInput, setExpTypeInput] = useState<'fixed' | 'percent'>('fixed')
  const [search, setSearch] = useState('')
  const [groupName, setGroupName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [groups, setGroups] = useState<{ id: string; name: string; color: string }[]>([])
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [finExpanded, setFinExpanded] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  // Installment schedule counts + payment counts per receipt (for the paid badge)
  const [instMap, setInstMap] = useState<Record<string, { total: number; paidCount: number; hasOverdue: boolean }>>({})
  const [payCount, setPayCount] = useState<Record<string, { count: number; sum: number }>>({})

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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setToken(session.access_token)
    const tok = session.access_token
    const BASE = 'https://www.digitalreceipt.ng'

    const [receiptsRes, groupsRes, instRes, expRes] = await Promise.all([
      supabase.from('receipts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      fetch(`${BASE}/api/receipt-groups`, { headers: { Authorization: `Bearer ${tok}` } }),
      fetch(`${BASE}/api/installments/summary`, { headers: { Authorization: `Bearer ${tok}` } }),
      fetch(`${BASE}/api/expenditures`, { headers: { Authorization: `Bearer ${tok}` } }),
    ])

    if (receiptsRes.data) {
      setReceipts(receiptsRes.data)
      const active = receiptsRes.data.filter((r: Receipt) => r.status === 'active')
      const totalRevenue = active.reduce((s: number, r: Receipt) => s + r.total_amount, 0)
      const vatRemoved = active.reduce((s: number, r: Receipt) => s + ((r as any).vat_amount || 0), 0)
      setFinancial(prev => ({ ...prev, totalRevenue, vatRemoved }))

      // Count payment receipts (children) per parent, for the "payments made" numerator
      const pc: Record<string, { count: number; sum: number }> = {}
      for (const r of receiptsRes.data as any[]) {
        if (r.parent_receipt_id) {
          const e = pc[r.parent_receipt_id] ?? (pc[r.parent_receipt_id] = { count: 0, sum: 0 })
          e.count++
          e.sum += Number(r.total_amount || 0)
        }
      }
      setPayCount(pc)
    }

    if (groupsRes.ok) {
      const gData = await groupsRes.json()
      setGroups(gData.groups ?? [])
    }

    if (instRes.ok) {
      const iData = await instRes.json()
      setInstMap(iData.instMap ?? {})
    }

    if (expRes.ok) {
      const eData = await expRes.json()
      setExpEntries(Array.isArray(eData.expenditures) ? eData.expenditures : [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  // ── Expenditure/tax helpers (server-side, synced with web) ──
  const netRevenue = financial.totalRevenue - financial.vatRemoved
  function resolvedExp(e: ExpEntry) {
    return e.type === 'percent' ? (netRevenue * (e.value || 0)) / 100 : (e.value || 0)
  }
  const totalExpenditure = expEntries.reduce((s, e) => s + resolvedExp(e), 0)

  async function apiExp(method: string, body?: any, qs = '') {
    const tok = token
    return fetch(`https://www.digitalreceipt.ng/api/expenditures${qs}`, {
      method,
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async function addExp() {
    try {
      const res = await apiExp('POST', { label: 'New expenditure/tax', value: 0, type: 'fixed', sort_order: expEntries.length })
      if (!res.ok) return
      const { expenditure } = await res.json()
      setExpEntries(prev => [...prev, expenditure])
      setEditingExpId(expenditure.id)
      setExpLabelInput(expenditure.label)
      setExpValInput('')
      setExpTypeInput('fixed')
    } catch {}
  }

  function startEditExp(e: ExpEntry) {
    setEditingExpId(e.id)
    setExpLabelInput(e.label)
    setExpValInput(String(e.value))
    setExpTypeInput(e.type)
  }

  function saveExp(id: string) {
    const label = expLabelInput.trim() || 'Expenditure'
    const value = parseFloat(expValInput) || 0
    const type = expTypeInput
    setExpEntries(prev => prev.map(e => (e.id === id ? { ...e, label, value, type } : e)))
    setEditingExpId(null)
    apiExp('PATCH', { id, label, value, type }).catch(() => {})
  }

  function removeExp(id: string) {
    setExpEntries(prev => prev.filter(e => e.id !== id))
    apiExp('DELETE', undefined, `?id=${encodeURIComponent(id)}`).catch(() => {})
  }

  useFocusEffect(useCallback(() => { load() }, []))

  const groupFiltered = activeGroup
    ? receipts.filter(r => (r as any).group_id === activeGroup)
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

  // Build a styled HTML document (receipts + financial summary incl. expenditures)
  // used for both the print preview and the downloadable PDF.
  function buildExportHtml() {
    const cols = ALL_COLUMNS.filter(c => selectedCols.includes(c.key))
    const fmt = (n: number) => '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })
    const headers = cols.map(c => `<th>${c.label}</th>`).join('')
    const rows = filtered.map(r => {
      const cells = cols.map(c => {
        const val = (r as any)[c.key]
        let out: string = val ?? ''
        if (c.key === 'total_amount' || c.key === 'vat_amount') out = val ? fmt(Number(val)) : '₦0'
        else if (c.key === 'created_at' || c.key === 'transaction_date') out = val ? formatDate(val) : ''
        return `<td>${out}</td>`
      }).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    const expRows = expEntries
      .filter(e => resolvedExp(e) > 0)
      .map(e => `<tr><td>${e.label}</td><td class="r red">− ${fmt(resolvedExp(e))}</td></tr>`)
      .join('')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
      body{font-family:Arial,sans-serif;color:#0f1f13;font-size:11px;padding:16px;}
      h1{font-size:16px;margin:0 0 2px;} .sub{color:#4a6b55;font-size:10px;margin-bottom:14px;}
      h2{font-size:12px;color:#1a6b2f;margin:18px 0 6px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#f4faf6;text-align:left;padding:6px;border-bottom:2px solid #c8e6d0;font-size:10px;color:#4a6b55;}
      td{padding:6px;border-bottom:1px solid #e0ede5;} .r{text-align:right;} .red{color:#b91c1c;} .green{color:#1a6b2f;}
      .tot{font-weight:bold;border-top:2px solid #1a6b2f;}
    </style></head><body>
      <h1>Receipts Export</h1>
      <p class="sub">Generated ${new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })} · ${filtered.length} receipt${filtered.length !== 1 ? 's' : ''}</p>
      <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
      <h2>Financial Summary</h2>
      <table>
        <tr><td>Total Revenue</td><td class="r">${fmt(financial.totalRevenue)}</td></tr>
        <tr><td>VAT Removed</td><td class="r red">− ${fmt(financial.vatRemoved)}</td></tr>
        <tr><td><b>Revenue after VAT</b></td><td class="r"><b>${fmt(revenueAfterVat)}</b></td></tr>
        ${expRows}
        <tr class="tot"><td>Total Balance</td><td class="r ${totalBalance < 0 ? 'red' : 'green'}">${totalBalance < 0 ? '− ' : ''}${fmt(totalBalance)}</td></tr>
      </table>
    </body></html>`
  }

  async function viewPrint() {
    try { await Print.printAsync({ html: buildExportHtml() }) } catch (e) { console.error(e) }
    setShowExportModal(false)
  }

  async function downloadPdf() {
    try {
      const { uri } = await Print.printToFileAsync({ html: buildExportHtml() })
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf' })
    } catch (e) { console.error(e) }
    setShowExportModal(false)
  }

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function deleteGroup(id: string) {
    Alert.alert('Delete Group', 'Remove this group? Receipts will be ungrouped.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setGroups(prev => prev.filter(g => g.id !== id))
        if (activeGroup === id) setActiveGroup(null)
        try {
          await fetch(`https://www.digitalreceipt.ng/api/receipt-groups/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        } catch {}
      }},
    ])
  }

  const revenueAfterVat = netRevenue
  const totalBalance = revenueAfterVat - totalExpenditure

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
          <TouchableOpacity style={styles.toolBtn} onPress={() => { setShowGroupsModal(true); setCreatingGroup(false) }}>
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
                  {g.name} ({receipts.filter(r => (r as any).group_id === g.id).length})
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

        {/* Financial Summary — collapsible */}
        <View style={styles.finCard}>
          <TouchableOpacity style={styles.finTitleRow} onPress={() => setFinExpanded(v => !v)} activeOpacity={0.7}>
            <Text style={styles.finTitle}>Financial Summary</Text>
            <Text style={styles.finChevron}>{finExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {finExpanded && (
            <>
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
              {expEntries.map(e => (
                <View key={e.id} style={styles.finRow}>
                  {editingExpId === e.id ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <TextInput
                        style={[styles.expInput, { flex: 1, textAlign: 'left' }]}
                        value={expLabelInput}
                        onChangeText={setExpLabelInput}
                        placeholder="Label"
                      />
                      <TouchableOpacity
                        onPress={() => setExpTypeInput(t => (t === 'fixed' ? 'percent' : 'fixed'))}
                        style={styles.expToggle}
                      >
                        <Text style={{ fontWeight: '700', color: '#111827' }}>{expTypeInput === 'percent' ? '%' : '₦'}</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.expInput, { minWidth: 56 }]}
                        value={expValInput}
                        onChangeText={setExpValInput}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                      <TouchableOpacity onPress={() => saveExp(e.id)} style={styles.expSave}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.finLabel}>{e.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.finVal, { color: '#92400e' }]}>– ₦{resolvedExp(e).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
                        <TouchableOpacity onPress={() => startEditExp(e)}><Text style={{ fontSize: 15 }}>✏️</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => removeExp(e.id)}><Text style={{ fontSize: 15, color: '#dc2626' }}>✕</Text></TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addExpBtn} onPress={addExp}>
                <Text style={styles.addExpTxt}>+ Add Expenditure / Tax</Text>
              </TouchableOpacity>
              <View style={styles.finDivider} />
              <View style={styles.finRow}>
                <Text style={[styles.finLabel, { fontWeight: '800', fontSize: 15 }]}>Total Balance</Text>
                <Text style={[styles.finVal, { fontWeight: '900', fontSize: 16 }]}>
                  ₦{totalBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </>
          )}
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
          const inst = instMap[item.id]
          const fullyPaid = !!inst && inst.paidCount >= inst.total
          const instColors = fullyPaid
            ? { bg: '#dcfce7', fg: '#15803d' }
            : inst?.hasOverdue
              ? { bg: '#fee2e2', fg: '#b91c1c' }
              : { bg: '#dbeafe', fg: '#1d4ed8' }
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
                {inst && inst.total > 0 && (
                  <View style={[styles.instBadge, { backgroundColor: instColors.bg }]}>
                    <Text style={[styles.instBadgeText, { color: instColors.fg }]}>{inst.paidCount}/{inst.total} Paid</Text>
                  </View>
                )}
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
            <TouchableOpacity style={styles.exportBtn} onPress={viewPrint}>
              <Text style={styles.exportBtnIcon}>🖨️</Text>
              <Text style={styles.exportBtnText}>View & Print</Text>
            </TouchableOpacity>
            <View style={styles.exportDivider} />
            <TouchableOpacity style={styles.exportBtn} onPress={downloadPdf}>
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

      {/* Groups Modal — view existing + create new */}
      <Modal visible={showGroupsModal} transparent animationType="slide" onRequestClose={() => { setShowGroupsModal(false); setCreatingGroup(false); setSelectMode(false); setSelected([]) }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {!creatingGroup ? (
              <>
                <Text style={styles.modalTitle}>Groups</Text>
                {groups.length === 0 ? (
                  <Text style={[styles.modalSub, { marginBottom: 20 }]}>No groups yet. Create one to organise your receipts.</Text>
                ) : (
                  <>
                    <Text style={styles.modalSub}>Tap to filter · Long-press to delete</Text>
                    {groups.map(g => (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.groupListRow, activeGroup === g.id && styles.groupListRowActive]}
                        onPress={() => { setActiveGroup(activeGroup === g.id ? null : g.id); setShowGroupsModal(false) }}
                        onLongPress={() => deleteGroup(g.id)}
                      >
                        <Text style={styles.groupListIcon}>📁</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.groupListName, activeGroup === g.id && { color: GREEN }]}>{g.name}</Text>
                          <Text style={styles.groupListCount}>{receipts.filter(r => (r as any).group_id === g.id).length} receipt{receipts.filter(r => (r as any).group_id === g.id).length !== 1 ? 's' : ''}</Text>
                        </View>
                        {activeGroup === g.id && <Text style={{ color: GREEN, fontWeight: '700', fontSize: 13 }}>✓ Active</Text>}
                      </TouchableOpacity>
                    ))}
                    {activeGroup && (
                      <TouchableOpacity style={styles.clearGroupBtn} onPress={() => { setActiveGroup(null); setShowGroupsModal(false) }}>
                        <Text style={styles.clearGroupText}>✕ Clear filter</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
                <TouchableOpacity style={styles.modalBtn} onPress={() => { setCreatingGroup(true); setSelectMode(true) }}>
                  <Text style={styles.modalBtnText}>+ Create New Group</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowGroupsModal(false); setCreatingGroup(false) }}>
                  <Text style={styles.modalCancel}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>New Group</Text>
                <Text style={styles.modalSub}>Long-press receipts behind to select them, then name and save.</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Group name"
                  placeholderTextColor="#9ca3af"
                  value={groupName}
                  onChangeText={setGroupName}
                  autoFocus
                />
                <Text style={[styles.modalSub, { marginBottom: 14 }]}>{selected.length} receipt{selected.length !== 1 ? 's' : ''} selected</Text>
                <TouchableOpacity style={styles.modalBtn} onPress={async () => {
                  if (!groupName.trim()) { Alert.alert('Required', 'Enter a group name.'); return }
                  if (selected.length === 0) { Alert.alert('Select receipts', 'Long-press receipts to select at least one.'); return }
                  const BASE = 'https://www.digitalreceipt.ng'
                  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                  try {
                    const res = await fetch(`${BASE}/api/receipt-groups`, { method: 'POST', headers, body: JSON.stringify({ name: groupName.trim() }) })
                    const data = await res.json()
                    if (!res.ok) { Alert.alert('Error', data.error || 'Could not create group'); return }
                    const newGroup = data.group
                    await fetch(`${BASE}/api/receipts/assign-group`, { method: 'PATCH', headers, body: JSON.stringify({ receiptIds: selected, groupId: newGroup.id }) })
                    setGroups(prev => [...prev, newGroup])
                    setReceipts(prev => prev.map(r => selected.includes(r.id) ? { ...r, group_id: newGroup.id } as any : r))
                  } catch (e: any) { Alert.alert('Error', e.message); return }
                  setGroupName('')
                  setSelected([])
                  setSelectMode(false)
                  setCreatingGroup(false)
                  setShowGroupsModal(false)
                }}>
                  <Text style={styles.modalBtnText}>Save Group</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setCreatingGroup(false); setSelectMode(false); setSelected([]) }}>
                  <Text style={styles.modalCancel}>Back</Text>
                </TouchableOpacity>
              </>
            )}
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
  instBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  instBadgeText: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 14 },
  // financial
  finCard: { backgroundColor: '#f0f5f2', marginHorizontal: 16, marginTop: 12, marginBottom: 0, borderRadius: 14, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderWidth: 1, borderColor: '#c8ddd1' },
  finTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  finTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  finChevron: { fontSize: 11, color: '#6b7280' },
  finSub: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  finDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finLabel: { fontSize: 13, color: '#374151', flex: 1 },
  finVal: { fontSize: 13, fontWeight: '600', color: '#111827' },
  addExpBtn: { paddingVertical: 4 },
  addExpTxt: { fontSize: 12, color: GREEN, fontWeight: '600' },
  expInput: { borderBottomWidth: 1, borderColor: GREEN, fontSize: 13, color: '#111827', minWidth: 80, textAlign: 'right', paddingVertical: 2 },
  expToggle: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#f9fafb' },
  expSave: { backgroundColor: GREEN, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
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
  groupListRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  groupListRowActive: { backgroundColor: '#f0f5f2', marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 8 },
  groupListIcon: { fontSize: 20 },
  groupListName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  groupListCount: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  clearGroupBtn: { alignItems: 'center', paddingVertical: 10 },
  clearGroupText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
})
