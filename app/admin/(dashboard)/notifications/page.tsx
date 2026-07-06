import { createAdminClient } from '@/lib/supabase/admin'
import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import AlertActions from '../system/AlertActions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Notifications | Admin Console' }

const PROVIDER_LABELS: Record<string, string> = {
  termii: 'Termii (SMS)',
  qoreid: 'QoreID (Identity)',
  resend: 'Resend (Email)',
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  insufficient_funds: 'Insufficient Funds',
  auth_failed: 'Auth Failed',
  service_down: 'Service Down',
}

const ALERT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  insufficient_funds: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100' },
  auth_failed:        { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100' },
  service_down:       { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
}

export default async function NotificationsPage() {
  const db = createAdminClient()
  const { data: alerts } = await db
    .from('system_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const unresolved = (alerts ?? []).filter((a: any) => !a.resolved)
  const resolved   = (alerts ?? []).filter((a: any) => a.resolved)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
          <Bell size={18} className="text-forest" />
        </div>
        <div>
          <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>Notifications</h1>
          <p className="text-sm text-ink-muted mt-0.5">Provider errors and system alerts</p>
        </div>
        {unresolved.length > 0 && (
          <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
            {unresolved.length} unresolved
          </span>
        )}
      </div>

      {/* Unresolved */}
      {unresolved.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-widest uppercase text-ink-muted">Unresolved</p>
          {unresolved.map((alert: any) => {
            const colors = ALERT_TYPE_COLORS[alert.alert_type] ?? { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' }
            return (
              <div key={alert.id} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className={`px-4 py-2 flex items-center gap-2 ${colors.bg} border-b ${colors.border}`}>
                  <AlertTriangle size={13} className={colors.text} />
                  <span className={`text-xs font-bold ${colors.text}`}>
                    {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                  </span>
                  <span className="text-xs text-ink-muted ml-auto">
                    {new Date(alert.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-ink">
                        {PROVIDER_LABELS[alert.provider] ?? alert.provider}
                      </p>
                      <p className="text-xs text-ink-muted">
                        Route: <span className="font-mono text-ink">{alert.triggered_by}</span>
                        {alert.status_code && <span className="ml-2 font-mono">· HTTP {alert.status_code}</span>}
                      </p>
                    </div>
                    <AlertActions id={alert.id} resolved={false} />
                  </div>
                  {alert.raw_response && (
                    <details>
                      <summary className="text-xs text-ink-muted cursor-pointer hover:text-ink select-none">
                        View raw response
                      </summary>
                      <pre className="mt-1.5 text-xs bg-surface border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-ink-muted max-h-48">
                        {JSON.stringify(alert.raw_response, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* All clear */}
      {unresolved.length === 0 && (
        <div className="bg-white rounded-xl border border-border px-5 py-10 text-center">
          <CheckCircle size={24} className="text-forest mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink">All clear</p>
          <p className="text-xs text-ink-muted mt-1">No unresolved provider alerts.</p>
        </div>
      )}

      {/* Resolved history */}
      {resolved.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-ink-muted">Resolved</p>
          <div className="bg-white rounded-xl border border-border divide-y divide-border">
            {resolved.map((alert: any) => (
              <div key={alert.id} className="px-4 py-3 flex items-center justify-between gap-4 opacity-60">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">
                      {PROVIDER_LABELS[alert.provider] ?? alert.provider}
                    </span>
                    <span className="text-xs text-ink-muted">·</span>
                    <span className="text-xs text-ink-muted">{ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}</span>
                    {alert.status_code && <span className="text-xs font-mono text-ink-muted">HTTP {alert.status_code}</span>}
                  </div>
                  <p className="text-xs text-ink-muted">
                    {new Date(alert.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' · '}<span className="font-mono">{alert.triggered_by}</span>
                  </p>
                </div>
                <AlertActions id={alert.id} resolved={true} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
