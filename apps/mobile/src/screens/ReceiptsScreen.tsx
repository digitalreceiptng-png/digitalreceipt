import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput, Share, Modal, ScrollView, Platform, SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { supabase } from '../lib/supabase'
import { Receipt } from '../types'
import { formatAmount, formatDate } from '../lib/formatters'

const GREEN = '#1a3728'
const BG_LIGHT = '#f9fafb'
const CARD_BG = '#ffffff'
const BORDER_COLOR = '#e5e7eb'
const TEXT_DARK = '#111827'
const TEXT_MUTED = '#6b7280'

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active: { bg: '#e6f4ea', text: '#137333' },
  cancelled: { bg: '#fce8e6', text: '#c5221f' },
  expired: { bg: '#fef7e0', text: '#b06000' },
}

const CATEGORY_OPTIONS = [
  'All Categories',
  'Sales',
  'Bank Deposit',
  'Transfer from',
  'Transfer to',
  'Airtime',
  'Mobile Data',
  'Cash Deposit',
  'Electricity',
  'TV',
  'Services',
  'Refund',
  'Online Payment',
  'Savings',
  'Add Money',
]

const STATUS_OPTIONS = [
  { label: 'All Status', key: 'all' },
  { label: 'Successful', key: 'active' },
  { label: 'Pending', key: 'pending' },
  { label: 'Failed', key: 'cancelled' },
  { label: 'To be paid', key: 'to_be_paid' },
  { label: 'Reversed', key: 'expired' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ReceiptsScreen({ navigation }: any) {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Expenditures/taxes — server-side
  type ExpEntry = { id: string; label: string; value: number; type: 'fixed' | 'percent' }
  const [expEntries, setExpEntries] = useState<ExpEntry[]>([])
  const [editingExpId, setEditingExpId] = useState<string | null>(null)
  const [expLabelInput, setExpLabelInput] = useState('')
  const [expValInput, setExpValInput] = useState('')
  const [expTypeInput, setExpTypeInput] = useState<'fixed' | 'percent'>('fixed')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All Categories')
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [activeMonth, setActiveMonth] = useState<string | null>(null)
  
  // Dropdown Modal Visibility
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)

  // Groups & Selection
  const [groupName, setGroupName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [groups, setGroups] = useState<{ id: string; name: string; color: string }[]>([])
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  // Installments & payments maps
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
      supabase.from('receipts').select('*').eq('user_id', session.user.id).neq('status', 'deleted').order('created_at', { ascending: false }),
      fetch(`${BASE}/api/receipt-groups`, { headers: { Authorization: `Bearer ${tok}` } }),
      fetch(`${BASE}/api/installments/summary`, { headers: { Authorization: `Bearer ${tok}` } }),
      fetch(`${BASE}/api/expenditures`, { headers: { Authorization: `Bearer ${tok}` } }),
    ])

    if (receiptsRes.data) {
      setReceipts(receiptsRes.data)

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

  // Filter Logic
  const filtered = receipts.filter(r => {
    if (search) {
      const s = search.toLowerCase()
      const matchName = r.buyer_name?.toLowerCase().includes(s)
      const matchNum = r.receipt_number?.toLowerCase().includes(s)
      const matchPhone = r.buyer_phone?.toLowerCase().includes(s)
      const matchMethod = r.payment_method?.toLowerCase().includes(s)
      if (!matchName && !matchNum && !matchPhone && !matchMethod) return false
    }

    if (activeGroup) {
      if ((r as any).group_id !== activeGroup) return false
    } else if (activeCategory !== 'All Categories') {
      const catLower = activeCategory.toLowerCase()
      const pm = r.payment_method?.toLowerCase() || ''
      const itemsStr = r.items?.map(i => i.description.toLowerCase()).join(' ') || ''
      const notes = r.notes?.toLowerCase() || ''
      if (!pm.includes(catLower) && !itemsStr.includes(catLower) && !notes.includes(catLower)) {
        return false
      }
    }

    if (activeStatus !== 'all') {
      if (activeStatus === 'to_be_paid') {
        const inst = instMap[r.id]
        if (!inst || inst.paidCount >= inst.total) return false
      } else if (r.status !== activeStatus) {
        return false
      }
    }

    if (activeMonth) {
      const dateObj = new Date(r.transaction_date || r.created_at)
      const monthName = MONTHS[dateObj.getMonth()]
      if (monthName !== activeMonth) return false
    }

    return true
  })

  // Synchronized Financial Calculations for Current Filter/Month
  const filteredActive = filtered.filter(r => r.status === 'active')
  const totalRevenue = filteredActive.reduce((sum, r) => sum + Number(r.amount_paid ?? r.total_amount ?? 0), 0)
  const vatRemoved = filteredActive.reduce((sum, r) => sum + Number((r as any).vat_amount || 0), 0)
  const revenueAfterVat = totalRevenue - vatRemoved

  function resolvedExp(e: ExpEntry) {
    return e.type === 'percent' ? (revenueAfterVat * (e.value || 0)) / 100 : (e.value || 0)
  }
  const customExpenditureTotal = expEntries.reduce((s, e) => s + resolvedExp(e), 0)
  const totalOut = vatRemoved + customExpenditureTotal
  const totalBalance = revenueAfterVat - customExpenditureTotal

  // Export functions
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
        <tr><td>Total Revenue</td><td class="r">${fmt(totalRevenue)}</td></tr>
        <tr><td>VAT Removed</td><td class="r red">− ${fmt(vatRemoved)}</td></tr>
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

  if (loading) return <View style={styles.center}><ActivityIndicator color={GREEN} size="large" /></View>

  const currentMonthLabel = activeMonth || MONTHS[new Date().getMonth()]

  return (
    <View style={styles.container}>
      {/* Top Header Navigation */}
      <SafeAreaView style={{ backgroundColor: GREEN }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : null} style={styles.headerLeft}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transactions</Text>
          <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.headerRight}>
            <Text style={styles.downloadText}>Download</Text>
          </TouchableOpacity>
        </View>

        {/* Top Filter Buttons (Categories & Status) */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.dropdownPill, showCategoryDropdown && styles.dropdownPillActive]}
            onPress={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowStatusDropdown(false); }}
          >
            <Text style={[styles.dropdownText, (showCategoryDropdown || activeCategory !== 'All Categories' || activeGroup) && styles.dropdownTextActive]} numberOfLines={1}>
              {activeGroup ? groups.find(g => g.id === activeGroup)?.name || 'Group' : activeCategory}
            </Text>
            <Ionicons
              name={showCategoryDropdown ? "caret-up" : "caret-down"}
              size={12}
              color={(showCategoryDropdown || activeCategory !== 'All Categories' || activeGroup) ? GREEN : TEXT_MUTED}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dropdownPill, showStatusDropdown && styles.dropdownPillActive]}
            onPress={() => { setShowStatusDropdown(!showStatusDropdown); setShowCategoryDropdown(false); }}
          >
            <Text style={[styles.dropdownText, (showStatusDropdown || activeStatus !== 'all') && styles.dropdownTextActive]} numberOfLines={1}>
              {STATUS_OPTIONS.find(s => s.key === activeStatus)?.label || 'All Status'}
            </Text>
            <Ionicons
              name={showStatusDropdown ? "caret-up" : "caret-down"}
              size={12}
              color={(showStatusDropdown || activeStatus !== 'all') ? GREEN : TEXT_MUTED}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={GREEN} />}
      >
        {/* Search Bar & Custom Groups */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={TEXT_MUTED} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer, receipt no, amount..."
              placeholderTextColor={TEXT_MUTED}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={styles.groupManageBtn} onPress={() => { setShowGroupsModal(true); setCreatingGroup(false) }}>
            <Ionicons name="folder-outline" size={18} color={GREEN} />
          </TouchableOpacity>
        </View>

        {selectMode && (
          <View style={styles.selectBar}>
            <Text style={styles.selectBarText}>{selected.length} selected</Text>
            <TouchableOpacity onPress={() => { setSelectMode(false); setSelected([]) }}>
              <Text style={styles.cancelSelect}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Month Selector & Analysis Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <TouchableOpacity style={styles.monthPicker} onPress={() => setShowMonthDropdown(!showMonthDropdown)}>
              <Text style={styles.monthText}>{currentMonthLabel}</Text>
              <Ionicons name="caret-down" size={11} color={TEXT_DARK} style={{ marginLeft: 5 }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.analysisBtn} onPress={() => setShowAnalysisModal(true)}>
              <Text style={styles.analysisBtnText}>Analysis</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>
              In <Text style={styles.totalValIn}>₦{totalRevenue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
            </Text>
            <Text style={styles.totalLabel}>
              Out <Text style={styles.totalValOut}>₦{totalOut.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
            </Text>
          </View>
        </View>

        {/* Receipt List */}
        <View style={styles.listContainer}>
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={TEXT_MUTED} />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          ) : (
            filtered.map((item, index) => {
              const isSelected = selected.includes(item.id)
              const inst = instMap[item.id]
              const isIncome = item.status === 'active'
              const statusCfg = STATUS_COLOR[item.status] || { bg: '#f1f5f9', text: '#475569' }

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.txItem, isSelected && styles.txItemSelected]}
                  onPress={() => selectMode ? toggleSelect(item.id) : navigation.navigate('ReceiptDetail', { receipt: item })}
                  onLongPress={() => { setSelectMode(true); toggleSelect(item.id) }}
                  activeOpacity={0.7}
                >
                  {selectMode && (
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={20}
                      color={GREEN}
                      style={{ marginRight: 12 }}
                    />
                  )}

                  {/* Left Circle Icon */}
                  <View style={styles.txIconContainer}>
                    <Ionicons
                      name={isIncome ? "arrow-up-outline" : "arrow-down-outline"}
                      size={20}
                      color={GREEN}
                    />
                  </View>

                  {/* Middle Information */}
                  <View style={styles.txMiddle}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {item.buyer_name || 'Standard Receipt'}
                    </Text>
                    <Text style={styles.txSub}>
                      {formatDate(item.transaction_date || item.created_at)}
                    </Text>
                    <Text style={styles.txRef}>
                      #{item.receipt_number} {item.payment_method ? `• ${item.payment_method}` : ''}
                    </Text>
                    {inst && inst.total > 0 && (
                      <View style={styles.instBadge}>
                        <Text style={styles.instBadgeText}>{inst.paidCount}/{inst.total} Paid</Text>
                      </View>
                    )}
                  </View>

                  {/* Right Amount & Status */}
                  <View style={styles.txRight}>
                    <Text style={styles.txAmount}>
                      {isIncome ? '' : '-'}₦{Number(item.total_amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[styles.statusText, { color: statusCfg.text }]}>
                        {item.status === 'active' ? 'Successful' : item.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* ── CATEGORIES DROPDOWN MODAL ── */}
      <Modal visible={showCategoryDropdown} transparent animationType="fade" onRequestClose={() => setShowCategoryDropdown(false)}>
        <TouchableOpacity style={styles.dropdownBackdrop} activeOpacity={1} onPress={() => setShowCategoryDropdown(false)}>
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <TouchableOpacity style={[styles.dropdownPillModal, styles.dropdownPillActive]}>
                <Text style={[styles.dropdownText, styles.dropdownTextActive]}>
                  {activeGroup ? groups.find(g => g.id === activeGroup)?.name : activeCategory}
                </Text>
                <Ionicons name="caret-up" size={12} color={GREEN} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.dropdownPillModal} onPress={() => { setShowCategoryDropdown(false); setShowStatusDropdown(true); }}>
                <Text style={styles.dropdownText}>
                  {STATUS_OPTIONS.find(s => s.key === activeStatus)?.label || 'All Status'}
                </Text>
                <Ionicons name="caret-down" size={12} color={TEXT_MUTED} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.categoryGrid}>
              {CATEGORY_OPTIONS.map(cat => {
                const isSel = activeCategory === cat && !activeGroup
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.gridTile, isSel && styles.gridTileActive]}
                    onPress={() => {
                      setActiveCategory(cat)
                      setActiveGroup(null)
                      setShowCategoryDropdown(false)
                    }}
                  >
                    <Text style={[styles.gridTileText, isSel && styles.gridTileTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                )
              })}

              {groups.map(g => {
                const isSel = activeGroup === g.id
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.gridTile, isSel && styles.gridTileActive]}
                    onPress={() => {
                      setActiveGroup(g.id)
                      setShowCategoryDropdown(false)
                    }}
                  >
                    <Text style={[styles.gridTileText, isSel && styles.gridTileTextActive]}>{g.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── STATUS DROPDOWN MODAL ── */}
      <Modal visible={showStatusDropdown} transparent animationType="fade" onRequestClose={() => setShowStatusDropdown(false)}>
        <TouchableOpacity style={styles.dropdownBackdrop} activeOpacity={1} onPress={() => setShowStatusDropdown(false)}>
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <TouchableOpacity style={styles.dropdownPillModal} onPress={() => { setShowStatusDropdown(false); setShowCategoryDropdown(true); }}>
                <Text style={styles.dropdownText}>{activeCategory}</Text>
                <Ionicons name="caret-down" size={12} color={TEXT_MUTED} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.dropdownPillModal, styles.dropdownPillActive]}>
                <Text style={[styles.dropdownText, styles.dropdownTextActive]}>
                  {STATUS_OPTIONS.find(s => s.key === activeStatus)?.label || 'All Status'}
                </Text>
                <Ionicons name="caret-up" size={12} color={GREEN} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusGrid}>
              {STATUS_OPTIONS.map(st => {
                const isSel = activeStatus === st.key
                return (
                  <TouchableOpacity
                    key={st.key}
                    style={[styles.statusTile, isSel && styles.statusTileActive]}
                    onPress={() => {
                      setActiveStatus(st.key)
                      setShowStatusDropdown(false)
                    }}
                  >
                    <Text style={[styles.gridTileText, isSel && styles.gridTileTextActive]}>{st.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── MONTH SELECTOR MODAL ── */}
      <Modal visible={showMonthDropdown} transparent animationType="fade" onRequestClose={() => setShowMonthDropdown(false)}>
        <TouchableOpacity style={styles.dropdownBackdrop} activeOpacity={1} onPress={() => setShowMonthDropdown(false)}>
          <View style={[styles.dropdownModalCard, { maxHeight: 480 }]}>
            <Text style={styles.modalSheetTitle}>Select Month</Text>
            <ScrollView contentContainerStyle={styles.categoryGrid} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.gridTile, { width: '100%', marginBottom: 4 }, activeMonth === null && styles.gridTileActive]}
                onPress={() => { setActiveMonth(null); setShowMonthDropdown(false); }}
              >
                <Text style={[styles.gridTileText, activeMonth === null && styles.gridTileTextActive]}>All Months</Text>
              </TouchableOpacity>
              {MONTHS.map(m => {
                const isSel = activeMonth === m
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.gridTile, isSel && styles.gridTileActive]}
                    onPress={() => { setActiveMonth(m); setShowMonthDropdown(false); }}
                  >
                    <Text style={[styles.gridTileText, isSel && styles.gridTileTextActive]}>{m}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── FINANCIAL ANALYSIS MODAL (Synchronized Calculations) ── */}
      <Modal visible={showAnalysisModal} transparent animationType="slide" onRequestClose={() => setShowAnalysisModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Financial Analysis ({currentMonthLabel})</Text>
              <TouchableOpacity onPress={() => setShowAnalysisModal(false)}>
                <Ionicons name="close" size={22} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Calculated from currently active receipts</Text>

            <ScrollView style={{ maxHeight: 380, marginVertical: 12 }}>
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Total Revenue (In)</Text>
                <Text style={styles.finVal}>₦{totalRevenue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.finDivider} />
              
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>VAT Removed</Text>
                <Text style={[styles.finVal, { color: '#dc2626' }]}>– ₦{vatRemoved.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.finDivider} />

              <View style={styles.finRow}>
                <Text style={[styles.finLabel, { fontWeight: '700', color: TEXT_DARK }]}>Revenue after VAT</Text>
                <Text style={[styles.finVal, { fontWeight: '700', color: GREEN }]}>₦{revenueAfterVat.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.finDivider} />

              {expEntries.map(e => (
                <View key={e.id} style={styles.finRow}>
                  {editingExpId === e.id ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <TextInput
                        style={styles.expInput}
                        value={expLabelInput}
                        onChangeText={setExpLabelInput}
                        placeholder="Label"
                      />
                      <TouchableOpacity onPress={() => setExpTypeInput(t => (t === 'fixed' ? 'percent' : 'fixed'))} style={styles.expToggle}>
                        <Text style={{ fontWeight: '700', color: TEXT_DARK }}>{expTypeInput === 'percent' ? '%' : '₦'}</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.expInput, { width: 60 }]}
                        value={expValInput}
                        onChangeText={setExpValInput}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                      <TouchableOpacity onPress={() => saveExp(e.id)} style={styles.expSave}>
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.finLabel}>{e.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.finVal, { color: '#d97706' }]}>– ₦{resolvedExp(e).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
                        <TouchableOpacity onPress={() => startEditExp(e)}><Ionicons name="pencil" size={15} color={TEXT_MUTED} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => removeExp(e.id)}><Ionicons name="trash-outline" size={15} color="#dc2626" /></TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addExpBtn} onPress={addExp}>
                <Ionicons name="add-circle-outline" size={16} color={GREEN} style={{ marginRight: 6 }} />
                <Text style={styles.addExpTxt}>Add Expenditure / Tax</Text>
              </TouchableOpacity>
              <View style={styles.finDivider} />

              <View style={styles.finRow}>
                <Text style={[styles.finLabel, { fontWeight: '800', fontSize: 15, color: TEXT_DARK }]}>Net Balance</Text>
                <Text style={[styles.finVal, { fontWeight: '900', fontSize: 17, color: totalBalance >= 0 ? GREEN : '#dc2626' }]}>
                  ₦{totalBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowAnalysisModal(false)}>
              <Text style={styles.modalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── EXPORT MODAL ── */}
      <Modal visible={showExportModal} transparent animationType="slide" onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Export Receipts</Text>
            <Text style={styles.modalSub}>Select columns & export format</Text>

            <ScrollView style={{ maxHeight: 240, marginVertical: 8 }}>
              {ALL_COLUMNS.map(col => (
                <TouchableOpacity key={col.key} style={styles.colRow} onPress={() => toggleCol(col.key)}>
                  <View style={[styles.colCheck, selectedCols.includes(col.key) && styles.colCheckActive]}>
                    {selectedCols.includes(col.key) && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </View>
                  <Text style={styles.colLabel}>{col.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.exportDivider} />
            <TouchableOpacity style={styles.exportBtn} onPress={viewPrint}>
              <Ionicons name="print-outline" size={20} color={GREEN} style={{ marginRight: 14 }} />
              <Text style={styles.exportBtnText}>View & Print</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={downloadPdf}>
              <Ionicons name="document-text-outline" size={20} color={GREEN} style={{ marginRight: 14 }} />
              <Text style={styles.exportBtnText}>Download as PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
              <Ionicons name="stats-chart-outline" size={20} color={GREEN} style={{ marginRight: 14 }} />
              <Text style={styles.exportBtnText}>Download as CSV</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowExportModal(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: TEXT_MUTED, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── GROUPS MODAL ── */}
      <Modal visible={showGroupsModal} transparent animationType="slide" onRequestClose={() => setShowGroupsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {!creatingGroup ? (
              <>
                <Text style={styles.modalTitle}>Receipt Groups</Text>
                <Text style={styles.modalSub}>Filter or organize receipts</Text>

                <ScrollView style={{ maxHeight: 260 }}>
                  {groups.length === 0 ? (
                    <Text style={{ color: TEXT_MUTED, marginVertical: 20, textAlign: 'center' }}>No groups yet. Create one to organize receipts.</Text>
                  ) : (
                    groups.map(g => (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.groupRow, activeGroup === g.id && styles.groupRowActive]}
                        onPress={() => { setActiveGroup(activeGroup === g.id ? null : g.id); setShowGroupsModal(false) }}
                        onLongPress={() => deleteGroup(g.id)}
                      >
                        <Ionicons name="folder-outline" size={20} color={activeGroup === g.id ? GREEN : TEXT_MUTED} style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.groupName, activeGroup === g.id && { color: GREEN }]}>{g.name}</Text>
                          <Text style={{ color: TEXT_MUTED, fontSize: 12 }}>{receipts.filter(r => (r as any).group_id === g.id).length} receipts</Text>
                        </View>
                        {activeGroup === g.id && <Ionicons name="checkmark-circle" size={18} color={GREEN} />}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                <TouchableOpacity style={styles.modalBtn} onPress={() => { setCreatingGroup(true); setSelectMode(true) }}>
                  <Text style={styles.modalBtnText}>+ Create New Group</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowGroupsModal(false)} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ color: TEXT_MUTED, fontSize: 14 }}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>New Group</Text>
                <Text style={styles.modalSub}>Enter a name and select receipts behind</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Group name"
                  placeholderTextColor={TEXT_MUTED}
                  value={groupName}
                  onChangeText={setGroupName}
                  autoFocus
                />
                <Text style={{ color: GREEN, marginBottom: 14 }}>{selected.length} receipts selected</Text>

                <TouchableOpacity style={styles.modalBtn} onPress={async () => {
                  if (!groupName.trim()) { Alert.alert('Required', 'Enter a group name.'); return }
                  if (selected.length === 0) { Alert.alert('Select receipts', 'Select at least one receipt.'); return }
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

                <TouchableOpacity onPress={() => { setCreatingGroup(false); setSelectMode(false); setSelected([]) }} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ color: TEXT_MUTED, fontSize: 14 }}>Cancel</Text>
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
  container: { flex: 1, backgroundColor: BG_LIGHT },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG_LIGHT },
  
  // Header Bar
  headerBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: GREEN,
  },
  headerLeft: { width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { width: 80, alignItems: 'flex-end' },
  downloadText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Filter Row
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    backgroundColor: GREEN,
  },
  dropdownPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dropdownPillActive: {
    backgroundColor: '#e6f4ea',
    borderWidth: 1,
    borderColor: GREEN,
  },
  dropdownText: { fontSize: 13, color: TEXT_DARK, fontWeight: '600' },
  dropdownTextActive: { color: GREEN, fontWeight: '700' },

  // Scroll Content
  scrollBody: { flex: 1, backgroundColor: BG_LIGHT },

  // Search Section
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  searchInput: { flex: 1, color: TEXT_DARK, fontSize: 13, padding: 0 },
  groupManageBtn: {
    backgroundColor: CARD_BG,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },

  // Summary Card (Month + Analysis)
  summaryCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthPicker: { flexDirection: 'row', alignItems: 'center' },
  monthText: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  analysisBtn: {
    backgroundColor: '#e6f4ea',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#c8e6d0',
  },
  analysisBtnText: { color: GREEN, fontSize: 12, fontWeight: '700' },
  totalsRow: { flexDirection: 'row', gap: 20, marginTop: 12 },
  totalLabel: { fontSize: 13, color: TEXT_MUTED },
  totalValIn: { color: TEXT_DARK, fontWeight: '700' },
  totalValOut: { color: TEXT_DARK, fontWeight: '700' },

  // List Container
  listContainer: { paddingHorizontal: 16, marginTop: 10, paddingBottom: 100 },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  txItemSelected: { borderColor: GREEN, backgroundColor: '#f0f5f2' },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txMiddle: { flex: 1, gap: 2 },
  txTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  txSub: { fontSize: 11, color: TEXT_MUTED },
  txRef: { fontSize: 11, color: '#9ca3af', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  instBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  instBadgeText: { fontSize: 10, color: '#1d4ed8', fontWeight: '700' },
  txRight: { alignItems: 'flex-end', gap: 6 },
  txAmount: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  statusPill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: TEXT_MUTED, fontSize: 14, marginTop: 10 },

  selectBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: GREEN,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectBarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cancelSelect: { color: '#FFF', fontSize: 14 },

  // Dropdown Overlays / Modals
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 100 : 70,
  },
  dropdownModalCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    maxHeight: 480,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownModalHeader: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  dropdownPillModal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 10 },
  gridTile: {
    width: '31%',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  gridTileActive: {
    backgroundColor: '#e6f4ea',
    borderColor: GREEN,
  },
  gridTileText: { fontSize: 11, color: TEXT_DARK, textAlign: 'center', fontWeight: '600' },
  gridTileTextActive: { color: GREEN, fontWeight: '700' },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusTile: {
    width: '48%',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  statusTileActive: {
    backgroundColor: '#e6f4ea',
    borderColor: GREEN,
  },

  modalSheetTitle: { color: TEXT_DARK, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Bottom Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  modalSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  modalBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  modalBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  finLabel: { fontSize: 13, color: TEXT_MUTED },
  finVal: { fontSize: 13, color: TEXT_DARK, fontWeight: '600' },
  finDivider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: 6 },
  addExpBtn: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  addExpTxt: { color: GREEN, fontSize: 13, fontWeight: '600' },
  expInput: { backgroundColor: '#f9fafb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, color: TEXT_DARK, fontSize: 12, flex: 1, borderWidth: 1, borderColor: BORDER_COLOR },
  expToggle: { backgroundColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  expSave: { backgroundColor: GREEN, borderRadius: 6, padding: 6 },

  colRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  colCheck: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#d1d5db', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  colCheckActive: { backgroundColor: GREEN, borderColor: GREEN },
  colLabel: { fontSize: 14, color: TEXT_DARK },
  exportDivider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: 8 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  exportBtnText: { fontSize: 15, color: TEXT_DARK, fontWeight: '500' },

  groupRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  groupRowActive: { backgroundColor: '#f0f5f2' },
  groupName: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  modalInput: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, color: TEXT_DARK, fontSize: 14, marginVertical: 12, borderWidth: 1, borderColor: BORDER_COLOR },
})
