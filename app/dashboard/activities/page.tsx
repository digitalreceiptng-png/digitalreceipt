import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import {
  FileText, CreditCard, GitMerge, CheckCircle2, XCircle,
  CalendarCheck, Bell, RefreshCw, Building2, Wallet, Mail,
  Folder, Clock,
} from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  receipt_created:      { label: 'Receipt Issued',       icon: FileText,      color: '#15803d', bg: '#f0fdf4' },
  payment_recorded:     { label: 'Payment Recorded',     icon: CreditCard,    color: '#1d4ed8', bg: '#eff6ff' },
  receipt_merged:       { label: 'Receipt Merged',       icon: GitMerge,      color: '#c2410c', bg: '#fff7ed' },
  request_approved:     { label: 'Request Approved',     icon: CheckCircle2,  color: '#15803d', bg: '#f0fdf4' },
  request_rejected:     { label: 'Request Rejected',     icon: XCircle,       color: '#dc2626', bg: '#fef2f2' },
  installment_added:    { label: 'Installment Added',    icon: CalendarCheck, color: '#7c3aed', bg: '#f5f3ff' },
  installment_paid:     { label: 'Installment Paid',     icon: CalendarCheck, color: '#15803d', bg: '#f0fdf4' },
  reminder_set:         { label: 'Reminder Set',         icon: Bell,          color: '#b45309', bg: '#fffbeb' },
  reminder_sent:        { label: 'Reminder Sent',        icon: Bell,          color: '#b45309', bg: '#fffbeb' },
  profile_switched:     { label: 'Profile Switched',     icon: RefreshCw,     color: '#7c3aed', bg: '#f5f3ff' },
  company_added:        { label: 'Company Added',        icon: Building2,     color: '#0e7490', bg: '#ecfeff' },
  wallet_topped_up:     { label: 'Wallet Top-up',        icon: Wallet,        color: '#15803d', bg: '#f0fdf4' },
  receipt_emailed:      { label: 'Receipt Emailed',      icon: Mail,          color: '#1d4ed8', bg: '#eff6ff' },
  receipt_group_created:{ label: 'Group Created',        icon: Folder,        color: '#7c3aed', bg: '#f5f3ff' },
  receipt_group_moved:  { label: 'Moved to Group',       icon: Folder,        color: '#7c3aed', bg: '#f5f3ff' },
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

function groupByDate(activities: { created_at: string; [key: string]: unknown }[]) {
  const groups: Record<string, typeof activities> = {}
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

export default async function ActivitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: activities, error: activitiesError } = await db
    .from('user_activities')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (activitiesError) {
    console.error('[activities]', activitiesError.message)
  }

  const grouped = groupByDate(activities ?? [])

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-ink">Recent Activities</h1>
        <p className="text-sm text-ink-muted mt-1">Everything that's happened on your account, newest first.</p>
      </div>

      {(!activities || activities.length === 0) ? (
        <div className="bg-white border border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center">
          <Clock size={32} className="text-ink-dim" />
          <p className="text-sm font-medium text-ink">No activity yet</p>
          <p className="text-xs text-ink-muted">Actions like issuing receipts, recording payments, and approving requests will appear here.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">{date}</p>
            <div className="space-y-2">
              {items.map((a) => {
                const activity = a as { id: string; type: string; title: string; description: string | null; entity_id: string | null; entity_type: string | null; created_at: string }
                const cfg = TYPE_CONFIG[activity.type] ?? { label: activity.type, icon: Clock, color: '#6b7280', bg: '#f9fafb' }
                const Icon = cfg.icon
                const href = activity.entity_type === 'receipt' && activity.entity_id
                  ? `/dashboard/receipts/${activity.entity_id}`
                  : null

                const inner = (
                  <div className="flex items-start gap-3 bg-white border border-border rounded-xl px-4 py-3 transition-colors hover:border-forest/30">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                      <Icon size={14} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-ink-muted mt-0.5 truncate">{activity.description}</p>
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
