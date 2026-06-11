import { createAdminClient } from '@/lib/supabase/admin'
import { ScrollText, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Audit Log | Admin Console' }

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ACTION_COLORS: Record<string, string> = {
  approve:   'bg-green-50 text-green-700',
  reject:    'bg-red-50 text-red-700',
  delete:    'bg-red-50 text-red-700',
  create:    'bg-blue-50 text-blue-700',
  update:    'bg-amber-50 text-amber-700',
  publish:   'bg-forest/10 text-forest',
  unpublish: 'bg-surface text-ink-muted',
}

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k))
  return key ? ACTION_COLORS[key] : 'bg-surface text-ink-muted'
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; admin?: string }>
}) {
  const { page: pageStr, admin: adminFilter } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const PAGE_SIZE = 50
  const from = (page - 1) * PAGE_SIZE

  const db = createAdminClient()

  let query = db
    .from('audit_log')
    .select('id, action, target_type, target_id, metadata, created_at, admins(id), profiles:admins!inner(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (adminFilter) query = query.eq('admin_id', adminFilter)

  const { data: logs, count } = await query

  const { data: admins } = await db
    .from('admins')
    .select('id, profiles(full_name)')
    .order('created_at', { ascending: true })

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>Audit Log</h1>
        <p className="text-sm text-ink-muted mt-0.5">All admin actions, most recent first</p>
      </div>

      {/* Filters */}
      <form className="flex items-center gap-3">
        <select
          name="admin"
          defaultValue={adminFilter ?? ''}
          className="px-3.5 py-2 border border-border rounded-xl text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
        >
          <option value="">All admins</option>
          {(admins ?? []).map((a: any) => (
            <option key={a.id} value={a.id}>{a.profiles?.full_name ?? a.id}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium hover:bg-forest-bright transition-colors">
          Filter
        </button>
        {adminFilter && (
          <a href="/admin/audit-log" className="text-sm text-ink-muted hover:text-forest transition-colors">Clear</a>
        )}
      </form>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">
            {count ?? 0} {(count ?? 0) === 1 ? 'entry' : 'entries'}
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-ink-dim">Page {page} of {totalPages}</span>
          )}
        </div>

        {!logs || logs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText size={24} className="text-ink-dim mx-auto mb-2" />
            <p className="text-sm text-ink-muted">No log entries yet</p>
            <p className="text-xs text-ink-dim mt-1">Admin actions will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log: any) => (
              <div key={log.id} className="px-5 py-3.5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0 mt-0.5">
                  <Shield size={14} className="text-ink-dim" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink">{log.profiles?.full_name ?? 'Admin'}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actionColor(log.action)}`}>{log.action}</span>
                    {log.target_type && (
                      <span className="text-xs text-ink-dim">on <span className="font-medium text-ink-muted">{log.target_type}</span></span>
                    )}
                    {log.target_id && (
                      <span className="text-xs font-mono text-ink-dim truncate max-w-[120px]">{log.target_id}</span>
                    )}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="text-xs text-ink-dim mt-1 font-mono">{JSON.stringify(log.metadata)}</p>
                  )}
                </div>
                <span className="text-xs text-ink-dim shrink-0 mt-0.5">{formatDate(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
            {page > 1 ? (
              <a href={`/admin/audit-log?page=${page - 1}${adminFilter ? `&admin=${adminFilter}` : ''}`} className="text-sm text-forest hover:underline">← Previous</a>
            ) : <span />}
            {page < totalPages ? (
              <a href={`/admin/audit-log?page=${page + 1}${adminFilter ? `&admin=${adminFilter}` : ''}`} className="text-sm text-forest hover:underline">Next →</a>
            ) : <span />}
          </div>
        )}
      </div>
    </div>
  )
}
