import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, formatDate } from '@/lib/formatters'
import { PlusCircle, FileText } from 'lucide-react'

const MONTHLY_LIMIT = 10

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { count: monthCount } = await supabase
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', firstOfMonth)

  const { data: recentReceipts } = await supabase
    .from('receipts')
    .select('id, receipt_number, buyer_name, total_amount, transaction_date, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const limit = profile?.monthly_limit_override ?? MONTHLY_LIMIT
  const used = monthCount ?? 0
  const atLimit = used >= limit
  const progressPct = Math.min((used / limit) * 100, 100)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-ink">Welcome back, {firstName}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {profile?.issuer_type === 'business' ? profile?.business_name ?? profile?.full_name : profile?.full_name}
          </p>
        </div>
        <Link
          href="/dashboard/receipts/new"
          className="flex items-center gap-2 bg-forest text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors shrink-0"
        >
          <PlusCircle size={16} />
          New Receipt
        </Link>
      </div>

      {/* Usage card */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-ink-muted">Receipts this month</p>
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
              You&apos;ve used all {limit} of your free receipts this month.
            </p>
            <Link
              href="/dashboard/profile#limit-request"
              className="inline-block mt-1.5 text-sm font-medium text-forest hover:underline"
            >
              Request additional receipts →
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-ink-dim text-xs border-b border-border">
                  <th className="text-left px-5 py-3 font-medium">Receipt No.</th>
                  <th className="text-left px-5 py-3 font-medium">Buyer</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentReceipts.map(r => (
                  <tr key={r.id} className="hover:bg-surface/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-muted">{r.receipt_number}</td>
                    <td className="px-5 py-3.5 text-ink">{r.buyer_name}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-ink">{formatNaira(r.total_amount)}</td>
                    <td className="px-5 py-3.5 text-ink-muted">{formatDate(r.transaction_date)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/dashboard/receipts/${r.id}`} className="text-forest/70 text-xs font-medium hover:text-forest transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
