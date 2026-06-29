'use client'

import { useState } from 'react'
import { X, Shield, ShieldOff, Clock, Globe, Terminal, AlertTriangle, Eye } from 'lucide-react'

const ATTACK_LABELS: Record<string, { label: string; color: string; intent: string }> = {
  sql_injection:         { label: 'SQL Injection',       color: 'bg-red-100 text-red-700 border-red-200',         intent: 'Tried to access or manipulate the database by injecting SQL commands' },
  sql_injection_encoded: { label: 'SQL Injection (enc)', color: 'bg-red-100 text-red-700 border-red-200',         intent: 'Encoded SQL injection to bypass basic filters and attack the database' },
  xss:                   { label: 'XSS',                 color: 'bg-orange-100 text-orange-700 border-orange-200', intent: 'Tried to inject malicious scripts to steal sessions or deface the site' },
  path_traversal:        { label: 'Path Traversal',      color: 'bg-yellow-100 text-yellow-700 border-yellow-200', intent: 'Tried to navigate outside allowed directories to read sensitive server files' },
  command_injection:     { label: 'Command Injection',   color: 'bg-red-100 text-red-800 border-red-300',         intent: 'Attempted to execute operating system commands on the server' },
  scanner_ua:            { label: 'Scanner Tool',        color: 'bg-purple-100 text-purple-700 border-purple-200', intent: 'Using an automated hacking or vulnerability scanning tool' },
  scanner_probe:         { label: 'Scanner Probe',       color: 'bg-blue-100 text-blue-700 border-blue-200',      intent: 'Probing known vulnerability endpoints (e.g. /wp-admin, /.env, /phpinfo)' },
  blocked_request:       { label: 'Blocked Request',     color: 'bg-gray-100 text-gray-600 border-gray-200',      intent: 'Continued sending requests after being blocked' },
  threat_detected:       { label: 'Threat Detected',     color: 'bg-orange-100 text-orange-700 border-orange-200', intent: 'Suspicious request pattern matching known attack signatures' },
}

const COUNTRY_NAMES: Record<string, string> = {
  AF:'Afghanistan',AM:'Armenia',AO:'Angola',AR:'Argentina',AU:'Australia',AZ:'Azerbaijan',
  BD:'Bangladesh',BE:'Belgium',BR:'Brazil',BY:'Belarus',CA:'Canada',CN:'China',
  CO:'Colombia',DE:'Germany',DZ:'Algeria',EG:'Egypt',ES:'Spain',ET:'Ethiopia',
  FR:'France',GB:'United Kingdom',GH:'Ghana',HK:'Hong Kong',ID:'Indonesia',IN:'India',
  IQ:'Iraq',IR:'Iran',IT:'Italy',JP:'Japan',KE:'Kenya',KP:'North Korea',KR:'South Korea',
  KZ:'Kazakhstan',LY:'Libya',MA:'Morocco',MX:'Mexico',MY:'Malaysia',NG:'Nigeria',
  NL:'Netherlands',PK:'Pakistan',PL:'Poland',RO:'Romania',RU:'Russia',SA:'Saudi Arabia',
  SD:'Sudan',SE:'Sweden',SG:'Singapore',SY:'Syria',TH:'Thailand',TR:'Turkey',
  UA:'Ukraine',US:'United States',UZ:'Uzbekistan',VN:'Vietnam',ZA:'South Africa',
}

interface Event {
  id: string
  event_type: string
  details: Record<string, unknown> | null
  path: string
  user_agent: string
  created_at: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' })
}

function parseUA(ua: string) {
  if (!ua) return 'Unknown'
  if (/sqlmap/i.test(ua)) return '🛠️ sqlmap (SQL injection tool)'
  if (/nikto/i.test(ua)) return '🛠️ Nikto (web scanner)'
  if (/nmap/i.test(ua)) return '🛠️ Nmap (port scanner)'
  if (/masscan/i.test(ua)) return '🛠️ Masscan (mass scanner)'
  if (/python-requests/i.test(ua)) return '🤖 Python script'
  if (/curl/i.test(ua)) return '🤖 cURL (automated)'
  if (/wget/i.test(ua)) return '🤖 wget (automated)'
  if (/go-http-client/i.test(ua)) return '🤖 Go HTTP client (bot)'
  if (/zgrab/i.test(ua)) return '🛠️ ZGrab (scanner)'
  if (/shodan/i.test(ua)) return '🔍 Shodan (internet scanner)'
  if (/censys/i.test(ua)) return '🔍 Censys (internet scanner)'
  if (/Chrome/i.test(ua)) return '🌐 Chrome browser'
  if (/Firefox/i.test(ua)) return '🌐 Firefox browser'
  if (/Safari/i.test(ua)) return '🌐 Safari browser'
  return ua.slice(0, 60)
}

export default function ViewIPButton({ ip, country }: { ip: string; country?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    events: Event[]
    blocked: { reason: string; score: number; blocked_at: string; expires_at: string; country?: string } | null
    threat: { score: number; reason: string; last_seen: string } | null
  } | null>(null)

  async function load() {
    setOpen(true)
    if (data) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/security/ip-events?ip=${encodeURIComponent(ip)}`)
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }

  // Aggregate attack types across all events
  const attackTypes = new Set<string>()
  const targetPaths = new Map<string, number>()
  data?.events.forEach(ev => {
    attackTypes.add(ev.event_type)
    const threats = (ev.details?.threats as string[] | undefined) ?? []
    threats.forEach(t => attackTypes.add(t))
    if (ev.path) targetPaths.set(ev.path, (targetPaths.get(ev.path) ?? 0) + 1)
  })
  const topPaths = [...targetPaths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const countryName = country ? (COUNTRY_NAMES[country.toUpperCase()] ?? country) : null
  const lastUA = data?.events[0]?.user_agent ?? ''

  return (
    <>
      <button
        onClick={load}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
      >
        <Eye size={12} /> View
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Slide-over panel */}
          <div className="relative ml-auto w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                  <ShieldOff size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="font-mono font-bold text-gray-900 text-base">{ip}</p>
                  {countryName && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      {country && (
                        <img src={`https://flagcdn.com/16x12/${country.toLowerCase()}.png`} width={16} height={12} alt={countryName} style={{ borderRadius: 2 }} />
                      )}
                      {countryName}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-500">
                <X size={18} />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : data ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Score + status */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <p className="text-xs text-red-500 font-medium mb-1">Threat Score</p>
                    <p className="text-2xl font-bold text-red-700">{data.threat?.score ?? data.blocked?.score ?? '—'}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <p className="text-xs text-orange-500 font-medium mb-1">Total Events</p>
                    <p className="text-2xl font-bold text-orange-700">{data.events.length}</p>
                  </div>
                  <div className={`rounded-xl p-4 border ${data.blocked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-100'}`}>
                    <p className={`text-xs font-medium mb-1 ${data.blocked ? 'text-red-500' : 'text-green-500'}`}>Status</p>
                    <p className={`text-sm font-bold ${data.blocked ? 'text-red-700' : 'text-green-700'}`}>
                      {data.blocked ? '🚫 Blocked' : '⚠️ Monitored'}
                    </p>
                    {data.blocked && (
                      <p className="text-[10px] text-red-400 mt-0.5">
                        Expires {formatDate(data.blocked.expires_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* What they used */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal size={14} className="text-gray-500" />
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tool / Browser Used</p>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{parseUA(lastUA)}</p>
                  {lastUA && <p className="text-xs text-gray-400 mt-1 break-all">{lastUA.slice(0, 120)}{lastUA.length > 120 ? '…' : ''}</p>}
                </div>

                {/* What they tried to do */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-orange-500" />
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">What They Tried To Do</p>
                  </div>
                  <div className="space-y-2">
                    {[...attackTypes].filter(t => ATTACK_LABELS[t]).map(t => {
                      const info = ATTACK_LABELS[t]
                      return (
                        <div key={t} className={`flex items-start gap-3 p-3 rounded-xl border ${info.color}`}>
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border shrink-0 ${info.color}`}>
                            {info.label}
                          </span>
                          <p className="text-xs leading-relaxed">{info.intent}</p>
                        </div>
                      )
                    })}
                    {attackTypes.size === 0 && (
                      <p className="text-sm text-gray-400">No specific attack patterns recorded</p>
                    )}
                  </div>
                </div>

                {/* Pages they targeted */}
                {topPaths.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe size={14} className="text-blue-500" />
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pages / Endpoints Targeted</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                      {topPaths.map(([path, count]) => (
                        <div key={path} className="flex items-center justify-between px-4 py-2.5">
                          <span className="font-mono text-xs text-gray-700 truncate flex-1 mr-3">{path}</span>
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
                            {count}×
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event timeline */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} className="text-gray-500" />
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Attack Timeline</p>
                    <span className="text-xs text-gray-400">({data.events.length} events)</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {data.events.map(ev => {
                      const info = ATTACK_LABELS[ev.event_type]
                      const threats = (ev.details?.threats as string[] | undefined) ?? []
                      return (
                        <div key={ev.id} className="flex gap-3 text-xs">
                          <div className="w-16 text-gray-400 shrink-0 pt-0.5">{timeAgo(ev.created_at)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${info?.color ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {info?.label ?? ev.event_type.replace(/_/g, ' ')}
                              </span>
                              {threats.map(t => {
                                const ti = ATTACK_LABELS[t]
                                return ti ? (
                                  <span key={t} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ti.color}`}>{ti.label}</span>
                                ) : null
                              })}
                            </div>
                            <p className="font-mono text-gray-500 truncate mt-0.5">{ev.path}</p>
                          </div>
                          <div className="text-gray-300 shrink-0 pt-0.5 text-[10px]">
                            {formatDate(ev.created_at).split(',')[1]?.trim()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
