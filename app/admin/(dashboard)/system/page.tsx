import { createAdminClient } from '@/lib/supabase/admin'
import { Settings, Users, FileText, CreditCard, MessageSquare, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react'
import AlertActions from './AlertActions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'System | Admin Console' }

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

export default async function SystemPage() {
  const db = createAdminClient()

  const [
    { count: userCount },
    { count: receiptCount },
    { count: ticketCount },
    { count: openTicketCount },
    { data: dbVersion },
    { data: alerts },
  ] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('receipts').select('id', { count: 'exact', head: true }),
    db.from('support_tickets').select('id', { count: 'exact', head: true }),
    db.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db.rpc('version').select(),
    db.from('system_alerts').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const unresolvedAlerts = (alerts ?? []).filter((a: any) => !a.resolved)
  const resolvedAlerts = (alerts ?? []).filter((a: any) => a.resolved)

  const stats = [
    { label: 'Total users', value: userCount ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total receipts', value: receiptCount ?? 0, icon: FileText, color: 'text-forest', bg: 'bg-forest/10' },
    { label: 'Support tickets', value: ticketCount ?? 0, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Open tickets', value: openTicketCount ?? 0, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>System</h1>
        <p className="text-sm text-ink-muted mt-0.5">Platform health and configuration</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4 space-y-3">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon size={15} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{value.toLocaleString()}</p>
              <p className="text-xs text-ink-muted mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Provider Alerts */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className={unresolvedAlerts.length > 0 ? 'text-red-500' : 'text-ink-muted'} />
            <span className="text-sm font-semibold text-ink">Provider Alerts</span>
            {unresolvedAlerts.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                {unresolvedAlerts.length} unresolved
              </span>
            )}
          </div>
          <span className="text-xs text-ink-muted">Termii · QoreID · Resend errors</span>
        </div>

        {unresolvedAlerts.length === 0 && resolvedAlerts.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle size={20} className="text-forest mx-auto mb-2" />
            <p className="text-sm text-ink-muted">No provider alerts. All systems operational.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {[...unresolvedAlerts, ...resolvedAlerts].map((alert: any) => (
              <div key={alert.id} className={`px-5 py-4 ${alert.resolved ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        alert.resolved
                          ? 'bg-surface text-ink-muted border-border'
                          : alert.alert_type === 'insufficient_funds'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                      </span>
                      <span className="text-xs font-semibold text-ink">
                        {PROVIDER_LABELS[alert.provider] ?? alert.provider}
                      </span>
                      {alert.status_code && (
                        <span className="text-xs text-ink-muted font-mono">HTTP {alert.status_code}</span>
                      )}
                      {alert.resolved && (
                        <span className="text-xs text-forest font-semibold">✓ Resolved</span>
                      )}
                    </div>

                    <p className="text-xs text-ink-muted">
                      Triggered by: <span className="font-mono text-ink">{alert.triggered_by}</span>
                      {' · '}
                      {new Date(alert.created_at).toLocaleString('en-NG', {
                        dateStyle: 'medium', timeStyle: 'short',
                      })}
                    </p>

                    {alert.raw_response && (
                      <details className="mt-2">
                        <summary className="text-xs text-ink-muted cursor-pointer hover:text-ink select-none">
                          View raw response
                        </summary>
                        <pre className="mt-1.5 text-xs bg-surface border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-ink-muted max-h-40">
                          {JSON.stringify(alert.raw_response, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <AlertActions id={alert.id} resolved={alert.resolved} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Environment */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <span className="text-sm font-semibold text-ink">Environment</span>
        </div>
        <div className="divide-y divide-border">
          {[
            { key: 'Node.js env', value: process.env.NODE_ENV ?? 'unknown' },
            { key: 'App version', value: process.env.npm_package_version ?? '—' },
            { key: 'Supabase URL', value: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/https?:\/\//, '').split('.')[0] + '.supabase.co' },
            { key: 'Admin base', value: process.env.NEXT_PUBLIC_ADMIN_BASE || '(empty — subdomain mode)' },
          ].map(({ key, value }) => (
            <div key={key} className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-sm text-ink-muted">{key}</span>
              <span className="text-sm font-mono text-ink">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature flags info */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Active modules</span>
        </div>
        <div className="divide-y divide-border">
          {[
            { name: 'Receipt generation',  status: true },
            { name: 'Identity verification (KYC)',  status: true },
            { name: 'Wallet & top-up', status: true },
            { name: 'Staff sub-accounts', status: true },
            { name: 'Support tickets', status: true },
            { name: 'Blog & content', status: true },
            { name: 'Partner logos', status: true },
            { name: 'Announcements', status: true },
          ].map(({ name, status }) => (
            <div key={name} className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-ink">{name}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status ? 'bg-forest/10 text-forest' : 'bg-surface text-ink-dim'}`}>
                {status ? 'Active' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
