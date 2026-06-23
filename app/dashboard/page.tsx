import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate } from '@/lib/formatters'
import { PlusCircle, FileText, FilePlus2, Bell } from 'lucide-react'
import { cookies } from 'next/headers'

const FREE_MONTHLY_QUOTA = 5

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single()

  // Active company sub-account
  const jar = await cookies()
  const activeSubId = jar.get('active_sub_account')?.value ?? null
  let activeSubAccount: { business_name: string; rc_number: string } | null = null
  if (activeSubId) {
    const { data: sub } = await db.from('user_sub_accounts').select('business_name, rc_number').eq('id', activeSubId).eq('owner_user_id', user.id).single()
    activeSubAccount = sub ?? null
  }

  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // Free quota is SHARED across all profiles — always query by main user_id with no sub-account filter
  const { count: monthlyUsed } = await db
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('receipt_type', 'silver')
    .eq('charged_amount', 0)
    .gte('created_at', firstOfMonth)

  // Pending receipt requests
  const { count: pendingRequestCount } = await db
    .from('receipt_form_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('issuer_id', user.id)
    .eq('status', 'pending')

  // Recent receipts scoped to the active profile
  let recentQ = db
    .from('receipts')
    .select('id, receipt_number, receipt_type, buyer_name, total_amount, amount_paid, balance_due, transaction_date, created_at, status, merged_into_id, parent_receipt_id, notes')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (activeSubId && activeSubAccount) {
    recentQ = recentQ.eq('sub_account_id', activeSubId)
  } else {
    recentQ = recentQ.is('sub_account_id', null)
  }

  const { data: recentReceipts } = await recentQ

  // Fetch payment receipts for recent receipts with outstanding balance
  const recentIds = (recentReceipts ?? []).filter((r: any) => r.balance_due > 0).map((r: any) => r.id)
  const { data: recentPaymentRows } = recentIds.length > 0
    ? await db.from('receipts').select('id, parent_receipt_id, total_amount, created_at').in('parent_receipt_id', recentIds).order('created_at', { ascending: true })
    : { data: [] }
  const recentPaymentMap: Record<string, { amount: number; created_at: string }[]> = {}
  for (const p of (recentPaymentRows ?? [])) {
    if (!recentPaymentMap[p.parent_receipt_id]) recentPaymentMap[p.parent_receipt_id] = []
    recentPaymentMap[p.parent_receipt_id].push({ amount: Number(p.total_amount), created_at: p.created_at })
  }

  const used        = monthlyUsed ?? 0
  const limit       = FREE_MONTHLY_QUOTA
  const atLimit     = used >= limit
  const progressPct = Math.min((used / limit) * 100, 100)

  // Display name: active company takes priority
  const displayName = activeSubAccount
    ? activeSubAccount.business_name
    : profile?.issuer_type === 'business'
      ? profile?.business_name || profile?.full_name?.split(' ')[0]
      : profile?.full_name?.split(' ')[0]

  const subTitle = activeSubAccount
    ? `RC: ${activeSubAccount.rc_number}`
    : profile?.issuer_type === 'business' ? profile?.business_name ?? profile?.full_name : profile?.full_name

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-ink">Welcome back{displayName ? `, ${displayName}` : ''}</h1>
          <p className="text-sm text-ink-muted mt-1">{subTitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/free-invoice"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-border text-ink-muted hover:border-forest/40 hover:text-forest bg-white"
          >
            <FilePlus2 size={15} />
            <span className="hidden sm:inline">Free Invoice</span>
            <span className="sm:hidden">Invoice</span>
          </Link>
          <Link
            href="/dashboard/receipts/new"
            className="flex items-center gap-2 bg-forest text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
          >
            <PlusCircle size={16} />
            <span className="hidden sm:inline">New Receipt</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      {/* Receipt request notification */}
      {(pendingRequestCount ?? 0) > 0 && (
        <Link
          href="/dashboard/receipt-requests?status=pending"
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors hover:bg-amber-100"
          style={{ background: '#fffbeb', borderColor: '#fbbf24' }}
        >
          <div className="relative shrink-0">
            <Bell size={20} style={{ color: '#d97706' }} />
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white font-bold"
              style={{ fontSize: '10px', background: '#dc2626', padding: '0 4px' }}
            >
              {pendingRequestCount}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
              {pendingRequestCount === 1
                ? 'You have 1 pending receipt request'
                : `You have ${pendingRequestCount} pending receipt requests`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
              Tap to review and approve or decline
            </p>
          </div>
          <span className="text-xs font-semibold shrink-0" style={{ color: '#d97706' }}>Review →</span>
        </Link>
      )}

      {/* Usage card */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-ink-muted">Free receipts this month</p>
            <p className="font-heading text-3xl text-ink mt-0.5">
              {used}{' '}
              <span className="text-lg font-sans font-normal text-ink-dim">of {limit}</span>
            </p>
          </div>
          {atLimit ? (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
              Limit reached
            </span>
          ) : (
            <span className="text-xs bg-surface text-ink-muted border border-border px-2.5 py-1 rounded-full">
              {limit - used} remaining
            </span>
          )}
        </div>

        <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${atLimit ? 'bg-amber-500' : 'bg-forest'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {atLimit && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-sm text-amber-800">
              {"You've used all 5 free receipts for this month. Your free quota resets on the 1st."}
            </p>
            <Link
              href="/dashboard/wallet"
              className="inline-block mt-1.5 text-sm font-medium text-forest hover:underline"
            >
              Fund wallet for more →
            </Link>
          </div>
        )}
      </div>

      {/* Recent receipts */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-medium text-ink">Recent Receipts</h2>
          <Link href="/dashboard/receipts" className="text-sm text-forest/70 hover:text-forest transition-colors">
            View all
          </Link>
        </div>

        {!recentReceipts?.length ? (
          <div className="py-12 text-center">
            <FileText size={28} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No receipts yet.</p>
            <Link
              href="/dashboard/receipts/new"
              className="inline-block mt-3 text-sm text-forest font-medium hover:underline"
            >
              Generate your first receipt →
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {recentReceipts.map(r => {
                const isMerged = !!(r as any).parent_receipt_id || !!(r as any).merged_into_id
                return (
                  <Link key={r.id} href={`/dashboard/receipts/${r.id}`} className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-surface/60 active:bg-surface transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{r.buyer_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="font-mono text-xs text-ink-dim">{r.receipt_number}</p>
                        <span className="text-xs font-semibold px-1.5 py-0 rounded-full capitalize" style={{ background: '#e8f5ec', color: '#0d6b1e' }}>{(r as any).receipt_type}</span>
                        {isMerged && (
                          <span className="text-xs font-semibold px-1.5 py-0 rounded-full" style={{ background: '#ede9fe', color: '#6d28d9' }}>Merged</span>
                        )}
                      </div>
                      {isMerged && (r as any).notes && (
                        <p className="text-xs text-ink-muted mt-0.5 truncate">{(r as any).notes}</p>
                      )}
                      <p className="text-xs text-ink-muted mt-1">{formatDate(isMerged ? r.created_at : r.transaction_date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-ink">{formatNaira(r.total_amount)}</p>
                      {!isMerged && (r as any).balance_due > 0 && (
                        <p className="text-xs font-semibold mt-0.5" style={{ color: '#856404' }}>
                          ₦{Number((r as any).balance_due).toLocaleString('en-NG', { minimumFractionDigits: 2 })} due
                        </p>
                      )}
                      <div className="mt-1"><StatusBadge status={r.status} /></div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-ink-dim text-xs border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">Receipt No.</th>
                    <th className="text-left px-5 py-3 font-medium">Customer</th>
                    <th className="text-left px-5 py-3 font-medium">Type</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-left px-5 py-3 font-medium">Date &amp; Time</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentReceipts.map(r => {
                    const isMerged = !!(r as any).parent_receipt_id || !!(r as any).merged_into_id
                    return (
                    <tr key={r.id} className="hover:bg-surface/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-ink-muted">{r.receipt_number}</td>
                      <td className="px-5 py-3.5 text-ink">
                        <span className="block">{r.buyer_name}</span>
                        {isMerged && (r as any).notes && (
                          <span className="block text-xs text-ink-muted truncate max-w-[160px]">{(r as any).notes}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: '#e8f5ec', color: '#0d6b1e' }}>
                            {(r as any).receipt_type}
                          </span>
                          {isMerged && (
                            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#6d28d9' }}>Merged</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right align-top">
                        <span className="block font-medium text-ink text-sm">{formatNaira(r.total_amount)}</span>
                        {!isMerged && (r as any).balance_due > 0 && (() => {
                          const childSum = (recentPaymentMap[r.id] ?? []).reduce((s: number, p: any) => s + p.amount, 0)
                          const initialPaid = Number((r as any).amount_paid ?? 0) - childSum
                          return (
                            <>
                              {initialPaid > 0 && (
                                <span className="block text-xs font-medium text-green-700">
                                  ₦{initialPaid.toLocaleString('en-NG', { minimumFractionDigits: 2 })} paid
                                </span>
                              )}
                              {(recentPaymentMap[r.id] ?? []).map((p: any, i: number) => (
                                <span key={i} className="block text-xs font-medium text-green-700">
                                  ₦{p.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} paid
                                </span>
                              ))}
                              <span className="block text-xs font-semibold" style={{ color: '#856404' }}>
                                ₦{Number((r as any).balance_due).toLocaleString('en-NG', { minimumFractionDigits: 2 })} due
                              </span>
                            </>
                          )
                        })()}
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted align-top">
                        <span className="block h-5 leading-5 text-xs">{formatDate(r.transaction_date)} {new Date((r as any).created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        {(r as any).balance_due > 0 && (() => {
                          const childSum = (recentPaymentMap[r.id] ?? []).reduce((s: number, p: any) => s + p.amount, 0)
                          const initialPaid = Number((r as any).amount_paid ?? 0) - childSum
                          return (
                            <>
                              {initialPaid > 0 && (
                                <span className="block h-5 leading-5 text-xs text-green-700">
                                  {new Date((r as any).created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date((r as any).created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                              )}
                              {(recentPaymentMap[r.id] ?? []).map((p: any, i: number) => (
                                <span key={i} className="block h-5 leading-5 text-xs text-green-700">
                                  {new Date(p.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(p.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                              ))}
                            </>
                          )
                        })()}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/dashboard/receipts/${r.id}`} className="text-forest/70 text-xs font-medium hover:text-forest transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    expired: 'bg-gray-100 text-gray-500 border-gray-200',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs border font-medium capitalize ${map[status] ?? map.active}`}>
      {status}
    </span>
  )
}
