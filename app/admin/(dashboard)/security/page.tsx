import { createAdminClient } from '@/lib/supabase/admin'
import { Shield, ShieldOff, AlertTriangle, Activity, Trash2 } from 'lucide-react'
import UnblockButton from './UnblockButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Security Shield | Admin Console' }

async function getData() {
  const db = createAdminClient()
  const now = new Date().toISOString()

  const [{ data: blocked }, { data: events }, { count: totalEvents }] = await Promise.all([
    db.from('blocked_ips')
      .select('id, ip, reason, score, blocked_at, expires_at')
      .gt('expires_at', now)
      .order('blocked_at', { ascending: false })
      .limit(50),
    db.from('security_events')
      .select('id, ip, event_type, details, path, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('security_events').select('*', { count: 'exact', head: true }),
  ])

  return { blocked: blocked ?? [], events: events ?? [], totalEvents: totalEvents ?? 0 }
}

const EVENT_COLORS: Record<string, string> = {
  sql_injection:         'bg-red-100 text-red-700',
  sql_injection_encoded: 'bg-red-100 text-red-700',
  xss:                   'bg-orange-100 text-orange-700',
  path_traversal:        'bg-yellow-100 text-yellow-700',
  command_injection:     'bg-red-100 text-red-800',
  scanner_ua:            'bg-purple-100 text-purple-700',
  scanner_probe:         'bg-blue-100 text-blue-700',
  blocked_request:       'bg-gray-100 text-gray-600',
  threat_detected:       'bg-orange-100 text-orange-700',
}

function Badge({ type }: { type: string }) {
  const cls = EVENT_COLORS[type] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
      {type.replace(/_/g, ' ')}
    </span>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function SecurityPage() {
  const { blocked, events, totalEvents } = await getData()

  const threatCount = events.filter(e => e.event_type === 'threat_detected').length
  const blockedCount = blocked.length

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Shield</h1>
          <p className="text-sm text-gray-500">Real-time threat detection and IP blocking</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-1">
            <ShieldOff className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-600">Active Blocks</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{blockedCount}</p>
          <p className="text-xs text-gray-400 mt-1">IPs blocked (last 24h)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-1">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-gray-600">Threats Detected</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{threatCount}</p>
          <p className="text-xs text-gray-400 mt-1">Recent threat events</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Total Events</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{totalEvents}</p>
          <p className="text-xs text-gray-400 mt-1">All security events logged</p>
        </div>
      </div>

      {/* Blocked IPs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ShieldOff className="w-4 h-4 text-red-500" />
            Blocked IPs
          </h2>
          <span className="text-xs text-gray-400">Auto-expire after 24h</span>
        </div>

        {blocked.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <Shield className="w-10 h-10 mx-auto mb-3 text-green-300" />
            <p className="text-sm font-medium text-gray-500">No IPs currently blocked</p>
            <p className="text-xs mt-1">The shield is active and monitoring all requests</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {blocked.map(b => (
              <div key={b.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-gray-900">{b.ip}</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">score {b.score}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {b.reason.split(', ').map((r: string) => <Badge key={r} type={r} />)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Blocked {timeAgo(b.blocked_at)} · Expires {new Date(b.expires_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'short', timeStyle: 'short' })} WAT
                  </p>
                </div>
                <UnblockButton id={b.id} ip={b.ip} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Recent Security Events
            <span className="text-xs text-gray-400 font-normal">last 100</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Path</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map(ev => {
                const details = ev.details as Record<string, unknown> | null
                const threatTypes = details?.threats as string[] | undefined
                const score = details?.score as number | undefined
                return (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{timeAgo(ev.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">{ev.ip}</td>
                    <td className="px-4 py-3"><Badge type={ev.event_type} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono max-w-[200px] truncate">{ev.path}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {score !== undefined && <span className="text-orange-600 font-semibold mr-2">score {score}</span>}
                      {threatTypes?.map((t: string) => <Badge key={t} type={t} />)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {events.length === 0 && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">No security events yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
