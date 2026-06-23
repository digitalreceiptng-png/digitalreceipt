import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate } from '@/lib/formatters'
import { PlusCircle, FileText, FilePlus2 } from 'lucide-react'
import ReceiptsSummary from './ReceiptsSummary'
import ReceiptsListClient from './ReceiptsListClient'
import { cookies } from 'next/headers'

const PAGE_SIZE = 20

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; group?: string }>
}) {
  const { q, page, sort, group } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()

  // If this user is a staff member, show owner's receipts (filtered by permissions)
  const { data: staffRow } = await db.from('staff_members').select('owner_id, can_view_all_receipts').eq('staff_id', user.id).eq('is_active', true).maybeSingle()
  const viewingUserId = staffRow ? staffRow.owner_id : user.id
  const isStaff = !!staffRow

  const currentPage = Math.max(1, parseInt(page ?? '1'))
  const offset = (currentPage - 1) * PAGE_SIZE
  const search = q?.trim() ?? ''

  // Active sub-account (company profile switcher)
  const jar = await cookies()
  const activeSubId = !isStaff ? (jar.get('active_sub_account')?.value ?? null) : null

  // Load active sub-account details for display
  let activeSubAccount: { id: string; business_name: string; rc_number: string } | null = null
  if (activeSubId) {
    const { data: sub } = await db.from('user_sub_accounts').select('id, business_name, rc_number').eq('id', activeSubId).eq('owner_user_id', viewingUserId).single()
    activeSubAccount = sub ?? null
    if (!activeSubAccount) { /* cookie stale — ignore */ }
  }

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    recent:     { column: 'created_at',       ascending: false },
    date_asc:   { column: 'transaction_date', ascending: true  },
    date_desc:  { column: 'transaction_date', ascending: false },
    amount_asc: { column: 'total_amount',     ascending: true  },
    amount_desc:{ column: 'total_amount',     ascending: false },
  }
  const activeSort = sortMap[sort ?? ''] ?? sortMap.recent

  // Fetch groups for this user
  const { data: groups } = await db
    .from('receipt_groups')
    .select('id, name, color')
    .eq('user_id', viewingUserId)
    .order('created_at', { ascending: true })

  let query = db
    .from('receipts')
    .select('id, receipt_number, buyer_name, total_amount, amount_paid, balance_due, transaction_date, created_at, status, issued_by_staff_id, group_id, profiles!receipts_issued_by_staff_id_fkey(full_name)', { count: 'exact' })
    .eq('user_id', viewingUserId)
    .is('parent_receipt_id', null)
    .order(activeSort.column, { ascending: activeSort.ascending })
    .range(offset, offset + PAGE_SIZE - 1)

  // Staff with view_all=false only see receipts they created
  if (isStaff && !staffRow.can_view_all_receipts) {
    query = query.eq('issued_by_staff_id', user.id)
  }

  // Sub-account filter — scope to active company profile or main account
  if (activeSubId && activeSubAccount) {
    query = query.eq('sub_account_id', activeSubId)
  } else if (!isStaff) {
    query = query.is('sub_account_id', null)
  }

  // Group filter — 'none' (General) shows all receipts; a UUID filters to that group
  if (group && group !== 'none') {
    query = query.eq('group_id', group)
  }

  if (search) {
    query = query.or(`receipt_number.ilike.%${search}%,buyer_name.ilike.%${search}%`)
  }

  const { data: receipts, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Fetch all receipts for summary + export (not paginated), scoped to active profile
  let allReceiptsQ = db
    .from('receipts')
    .select('id, receipt_number, receipt_type, buyer_name, buyer_phone, buyer_email, total_amount, amount_paid, balance_due, tax, transaction_date, created_at, status, payment_method, issued_by_staff_id, seller_name')
    .eq('user_id', viewingUserId)
    .eq('status', 'active')
    .is('parent_receipt_id', null)
    .order('transaction_date', { ascending: false })

  if (activeSubId && activeSubAccount) {
    allReceiptsQ = allReceiptsQ.eq('sub_account_id', activeSubId)
  } else if (!isStaff) {
    allReceiptsQ = allReceiptsQ.is('sub_account_id', null)
  }

  const { data: allReceipts } = await allReceiptsQ

  const totalRevenue = allReceipts?.reduce((s, r) => s + (Number(r.total_amount) || 0), 0) ?? 0
  const totalVat = allReceipts?.reduce((s, r) => s + (Number(r.tax) || 0), 0) ?? 0

  // Group-specific summary (only when a named group is selected)
  let groupRevenue: number | null = null
  let groupVat: number | null = null
  if (group && group !== 'none') {
    const { data: groupReceipts } = await db
      .from('receipts')
      .select('total_amount, tax')
      .eq('user_id', viewingUserId)
      .eq('group_id', group)
      .eq('status', 'active')
      .is('parent_receipt_id', null)
    groupRevenue = groupReceipts?.reduce((s, r) => s + (Number(r.total_amount) || 0), 0) ?? 0
    groupVat = groupReceipts?.reduce((s, r) => s + (Number(r.tax) || 0), 0) ?? 0
  }

  // Fetch installment schedules for visible receipts to show overdue / paid indicators
  const receiptIds = receipts?.map(r => r.id) ?? []
  const { data: installments } = receiptIds.length > 0
    ? await db.from('installment_schedules').select('receipt_id, due_date, paid_at').in('receipt_id', receiptIds)
    : { data: [] }

  const now = new Date()

  // Map: receiptId → { paidCount, total, hasOverdue }
  const instMap: Record<string, { paidCount: number; total: number; hasOverdue: boolean }> = {}
  for (const inst of (installments ?? [])) {
    if (!instMap[inst.receipt_id]) instMap[inst.receipt_id] = { paidCount: 0, total: 0, hasOverdue: false }
    instMap[inst.receipt_id].total++
    if (inst.paid_at) instMap[inst.receipt_id].paidCount++
    else if (new Date(inst.due_date) < now) instMap[inst.receipt_id].hasOverdue = true
  }

  // Fetch payment receipts (children) for receipts with outstanding balance
  const balanceReceiptIds = (receipts ?? []).filter((r: any) => r.balance_due > 0).map((r: any) => r.id)
  const { data: paymentRows } = balanceReceiptIds.length > 0
    ? await db.from('receipts').select('id, parent_receipt_id, total_amount, created_at').in('parent_receipt_id', balanceReceiptIds).order('created_at', { ascending: true })
    : { data: [] }

  // Map: parentReceiptId → payment entries (for current page)
  const paymentMap: Record<string, { amount: number; created_at: string }[]> = {}
  for (const p of (paymentRows ?? [])) {
    if (!paymentMap[p.parent_receipt_id]) paymentMap[p.parent_receipt_id] = []
    paymentMap[p.parent_receipt_id].push({ amount: Number(p.total_amount), created_at: p.created_at })
  }

  // Fetch payment children for ALL receipts (used in export)
  const allBalanceIds = (allReceipts ?? []).filter((r: any) => r.balance_due > 0).map((r: any) => r.id)
  const { data: allPaymentRows } = allBalanceIds.length > 0
    ? await db.from('receipts').select('id, parent_receipt_id, total_amount, created_at').in('parent_receipt_id', allBalanceIds).order('created_at', { ascending: true })
    : { data: [] }
  const allPaymentMap: Record<string, { amount: number; created_at: string }[]> = {}
  for (const p of (allPaymentRows ?? [])) {
    if (!allPaymentMap[p.parent_receipt_id]) allPaymentMap[p.parent_receipt_id] = []
    allPaymentMap[p.parent_receipt_id].push({ amount: Number(p.total_amount), created_at: p.created_at })
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-ink">Receipts</h1>
        <div className="flex items-center gap-2">
          {/* ExportButton moved into ReceiptsListClient to access editable labels */}
          <Link href="/free-invoice" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-border text-ink-muted hover:border-forest/40 hover:text-forest bg-white">
            <FilePlus2 size={15} />
            <span className="hidden sm:inline">Free Invoice</span>
            <span className="sm:hidden">Invoice</span>
          </Link>
          <Link href="/dashboard/receipts/new" className="flex items-center gap-2 bg-forest text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
            <PlusCircle size={16} />
            <span className="hidden sm:inline">New Receipt</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      <ReceiptsListClient
        receipts={receipts ?? []}
        groups={groups ?? []}
        instMap={instMap}
        paymentMap={paymentMap}
        isStaff={isStaff}
        count={count ?? 0}
        currentPage={currentPage}
        totalPages={totalPages}
        search={search}
        sort={sort}
        activeGroup={group ?? null}
        allReceipts={allReceipts ?? []}
        allPaymentMap={allPaymentMap}
        totalRevenue={totalRevenue}
        totalVat={totalVat}
      />

      {/* Show group summary when a named group is active, otherwise overall summary */}
      <ReceiptsSummary
        totalRevenue={groupRevenue !== null ? groupRevenue : totalRevenue}
        totalVat={groupVat !== null ? groupVat : totalVat}
      />
    </div>
  )
}
