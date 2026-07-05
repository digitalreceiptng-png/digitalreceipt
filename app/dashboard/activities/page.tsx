import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { getEffectiveUserId } from '@/lib/effective-user'
import {
  FileText, CreditCard, GitMerge, CheckCircle2, XCircle,
  CalendarCheck, Bell, RefreshCw, Building2, Wallet, Mail,
  Folder, Clock, ClipboardList, Trash2, UserPlus, UserMinus,
  ShieldCheck, ArrowDownLeft, ArrowUpRight, Users,
} from 'lucide-react'

// ── Activity type config ──────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  receipt_created:       { label: 'Receipt Issued',       icon: FileText,       color: '#15803d', bg: '#f0fdf4' },
  payment_recorded:      { label: 'Payment Recorded',     icon: CreditCard,     color: '#1d4ed8', bg: '#eff6ff' },
  receipt_merged:        { label: 'Receipt Merged',       icon: GitMerge,       color: '#c2410c', bg: '#fff7ed' },
  request_approved:      { label: 'Request Approved',     icon: CheckCircle2,   color: '#15803d', bg: '#f0fdf4' },
  request_rejected:      { label: 'Request Rejected',     icon: XCircle,        color: '#dc2626', bg: '#fef2f2' },
  installment_added:     { label: 'Installment Added',    icon: CalendarCheck,  color: '#7c3aed', bg: '#f5f3ff' },
  installment_paid:      { label: 'Installment Paid',     icon: CalendarCheck,  color: '#15803d', bg: '#f0fdf4' },
  reminder_set:          { label: 'Reminder Set',         icon: Bell,           color: '#b45309', bg: '#fffbeb' },
  reminder_sent:         { label: 'Reminder Sent',        icon: Bell,           color: '#b45309', bg: '#fffbeb' },
  profile_switched:      { label: 'Profile Switched',     icon: RefreshCw,      color: '#7c3aed', bg: '#f5f3ff' },
  company_added:         { label: 'Company Added',        icon: Building2,      color: '#0e7490', bg: '#ecfeff' },
  wallet_topped_up:      { label: 'Wallet Top-up',        icon: Wallet,         color: '#15803d', bg: '#f0fdf4' },
  receipt_emailed:       { label: 'Receipt Emailed',      icon: Mail,           color: '#1d4ed8', bg: '#eff6ff' },
  receipt_group_created: { label: 'Group Created',        icon: Folder,         color: '#7c3aed', bg: '#f5f3ff' },
  receipt_group_moved:   { label: 'Moved to Group',       icon: Folder,         color: '#7c3aed', bg: '#f5f3ff' },
  form_created:          { label: 'Form Created',         icon: ClipboardList,  color: '#0e7490', bg: '#ecfeff' },
  form_updated:          { label: 'Form Updated',         icon: ClipboardList,  color: '#b45309', bg: '#fffbeb' },
  form_deleted:          { label: 'Form Deleted',         icon: Trash2,         color: '#dc2626', bg: '#fef2f2' },
  // Synthesised types
  wallet_debit:          { label: 'Wallet Debit',         icon: ArrowUpRight,   color: '#dc2626', bg: '#fef2f2' },
  wallet_credit:         { label: 'Wallet Credit',        icon: ArrowDownLeft,  color: '#15803d', bg: '#f0fdf4' },
  staff_added:           { label: 'Staff Added',          icon: UserPlus,       color: '#0e7490', bg: '#ecfeff' },
  staff_removed:         { label: 'Staff Removed',        icon: UserMinus,      color: '#dc2626', bg: '#fef2f2' },
  receipt_verified:      { label: 'Receipt Verified',     icon: ShieldCheck,    color: '#15803d', bg: '#f0fdf4' },
  form_submission:       { label: 'Form Request',         icon: ClipboardList,  color: '#7c3aed', bg: '#f5f3ff' },
}

type FeedItem = {
  id: string
  type: string
  title: string
  description: string | null
  entity_id: string | null
  entity_type: string | null
  created_at: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function groupByDate(activities: FeedItem[]) {
  const groups: Record<string, FeedItem[]> = {}
  for (const a of activities) {
    const d = new Date(a.created_at)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    let key: string
    if (d.toDateString() === today.toDateString()) key = 'Today'
    else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday'
    else key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  }
  return groups
}

function fmtNaira(n: number) {
  return `₦${Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}

export default async function ActivitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const effectiveUserId = getEffectiveUserId(user)

  const [
    { data: userActivities },
    { data: walletTxns },
    { data: staffMembers },
    { data: verifications },
    { data: formSubmissions },
  ] = await Promise.all([
    // Existing activity log
    db.from('user_activities')
      .select('id, type, title, description, entity_id, entity_type, created_at')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(150),

    // Wallet transactions
    db.from('wallet_transactions')
      .select('id, type, amount, description, created_at, receipt_id')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(100),

    // Staff additions/removals
    db.from('staff_members')
      .select('id, display_name, created_at, is_active, status, profiles!staff_members_staff_id_fkey(full_name)')
      .eq('owner_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(50),

    // Receipt verifications
    db.from('verifications')
      .select('id, method, created_at, receipt_id, receipts!verifications_receipt_id_fkey(receipt_number, buyer_name)')
      .eq('receipts.user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(50),

    // Form / receipt requests
    db.from('receipt_form_submissions')
      .select('id, status, created_at, form_id, buyer_name, receipt_forms!receipt_form_submissions_form_id_fkey(title)')
      .eq('issuer_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // ── Build unified feed ────────────────────────────────────────────────────
  const feed: FeedItem[] = []

  // 1. Existing activity log (deduplicate wallet events — covered separately)
  const walletActivityTypes = new Set(['wallet_topped_up'])
  for (const a of (userActivities ?? [])) {
    if (walletActivityTypes.has(a.type)) continue // shown from wallet_transactions
    feed.push({
      id: `act_${a.id}`,
      type: a.type,
      title: a.title,
      description: a.description ?? null,
      entity_id: a.entity_id ?? null,
      entity_type: a.entity_type ?? null,
      created_at: a.created_at,
    })
  }

  // 2. Wallet transactions
  for (const t of (walletTxns ?? [])) {
    const isCredit = t.amount > 0
    feed.push({
      id: `wtx_${t.id}`,
      type: isCredit ? 'wallet_credit' : 'wallet_debit',
      title: isCredit
        ? `Wallet funded — ${fmtNaira(t.amount)}`
        : `Wallet charged — ${fmtNaira(t.amount)}`,
      description: t.description ?? null,
      entity_id: t.receipt_id ?? null,
      entity_type: t.receipt_id ? 'receipt' : null,
      created_at: t.created_at,
    })
  }

  // 3. Staff additions and removals
  for (const s of (staffMembers ?? [])) {
    const name = s.display_name || (Array.isArray(s.profiles) ? (s.profiles[0] as any)?.full_name : (s.profiles as any)?.full_name) || 'Staff member'
    feed.push({
      id: `staff_${s.id}`,
      type: s.is_active ? 'staff_added' : 'staff_removed',
      title: s.is_active ? `${name} added as staff` : `${name} removed from staff`,
      description: null,
      entity_id: null,
      entity_type: 'staff',
      created_at: s.created_at,
    })
  }

  // 4. Receipt verifications (from `verifications` table — public scans of receipts)
  for (const v of (verifications ?? [])) {
    const receipt = Array.isArray(v.receipts) ? (v.receipts[0] as any) : (v.receipts as any)
    if (!receipt) continue
    feed.push({
      id: `ver_${v.id}`,
      type: 'receipt_verified',
      title: `Receipt #${receipt.receipt_number} was verified`,
      description: `Buyer: ${receipt.buyer_name} · Method: ${v.method}`,
      entity_id: v.receipt_id ?? null,
      entity_type: 'receipt',
      created_at: v.created_at,
    })
  }

  // 5. Form submissions (receipt requests)
  for (const f of (formSubmissions ?? [])) {
    const formTitle = Array.isArray(f.receipt_forms) ? (f.receipt_forms[0] as any)?.title : (f.receipt_forms as any)?.title
    feed.push({
      id: `fsub_${f.id}`,
      type: 'form_submission',
      title: `Receipt request from ${f.buyer_name ?? 'Unknown'}`,
      description: formTitle ? `Form: ${formTitle} · Status: ${f.status}` : `Status: ${f.status}`,
      entity_id: f.id,
      entity_type: 'form_submission',
      created_at: f.created_at,
    })
  }

  // Sort all by time descending, limit to 300
  feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const topFeed = feed.slice(0, 300)

  const grouped = groupByDate(topFeed)

  const hrefFor = (item: FeedItem) => {
    if (item.entity_type === 'receipt' && item.entity_id) return `/dashboard/receipts/${item.entity_id}`
    if (item.entity_type === 'form_submission' && item.entity_id) return `/dashboard/receipt-requests/${item.entity_id}`
    return null
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-ink">Activities</h1>
          <p className="text-sm text-ink-muted mt-1">Everything that's happened on this account, newest first.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Users size={13} />
          <span>{topFeed.length} events</span>
        </div>
      </div>

      {topFeed.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center">
          <Clock size={32} className="text-ink-dim" />
          <p className="text-sm font-medium text-ink">No activity yet</p>
          <p className="text-xs text-ink-muted">Issuing receipts, recording payments, adding staff, and more will appear here.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">{date}</p>
            <div className="space-y-2">
              {items.map((activity) => {
                const cfg = TYPE_CONFIG[activity.type] ?? { label: activity.type.replace(/_/g, ' '), icon: Clock, color: '#6b7280', bg: '#f9fafb' }
                const Icon = cfg.icon
                const href = hrefFor(activity)

                const inner = (
                  <div className="flex items-start gap-3 bg-white border border-border rounded-xl px-4 py-3 transition-colors hover:border-forest/30">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                      <Icon size={14} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-ink-muted mt-0.5">{activity.description}</p>
                      )}
                      <p className="text-xs text-ink-dim mt-1">{timeAgo(activity.created_at)}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                )

                return href ? (
                  <Link key={activity.id} href={href}>{inner}</Link>
                ) : (
                  <div key={activity.id}>{inner}</div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
