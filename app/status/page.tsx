'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react'

type ServiceStatus = {
  name: string
  configured: boolean
  connected: boolean
  error?: string
  latency?: number
}

type StatusData = {
  timestamp: string
  environment: string
  services: {
    [key: string]: ServiceStatus
  }
  envVars: {
    [key: string]: boolean
  }
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function fetchStatus() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStatus(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const getStatusColor = (configured: boolean, connected: boolean) => {
    if (!configured) return 'text-amber-600 bg-amber-50'
    if (!connected) return 'text-red-600 bg-red-50'
    return 'text-green-600 bg-green-50'
  }

  const getStatusIcon = (configured: boolean, connected: boolean) => {
    if (!configured) return '⚠️'
    if (!connected) return '❌'
    return '✅'
  }

  const getStatusText = (configured: boolean, connected: boolean) => {
    if (!configured) return 'Not Configured'
    if (!connected) return 'Not Connected'
    return 'Connected'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            System Status
          </h1>
          <p className="text-slate-600">
            Real-time health check of all services and environment variables
          </p>
        </div>

        {/* Refresh Button & Last Updated */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Checking...' : 'Refresh'}
          </button>

          {lastRefresh && (
            <p className="text-sm text-slate-600">
              Last checked:{' '}
              <span className="font-mono">
                {lastRefresh.toLocaleTimeString()}
              </span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-red-900">Error fetching status</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {status && (
          <>
            {/* Meta Info */}
            <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Environment
                  </p>
                  <p className="text-lg font-mono font-semibold text-slate-900 mt-1">
                    {status.environment}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Last Updated
                  </p>
                  <p className="text-sm font-mono text-slate-900 mt-1">
                    {new Date(status.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Services Status */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Service Connectivity
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {Object.entries(status.services).map(([key, service]) => (
                  <div
                    key={key}
                    className={`p-4 rounded-lg border ${getStatusColor(
                      service.configured,
                      service.connected
                    )} border-current border-opacity-20`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-sm">
                        {service.name}
                      </h3>
                      <span className="text-xl">
                        {getStatusIcon(
                          service.configured,
                          service.connected
                        )}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase opacity-75">
                        Status: {getStatusText(service.configured, service.connected)}
                      </p>

                      {service.latency && (
                        <p className="text-xs flex items-center gap-1">
                          <Clock size={12} />
                          {service.latency}ms latency
                        </p>
                      )}

                      {service.error && (
                        <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                          <p className="text-xs font-mono break-words">
                            {service.error}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Environment Variables */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Environment Variables
              </h2>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-200">
                  {Object.entries(status.envVars).map(([name, configured]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {configured ? (
                          <CheckCircle2 className="text-green-600 flex-shrink-0" size={18} />
                        ) : (
                          <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
                        )}
                        <code className="text-sm font-mono text-slate-900 truncate">
                          {name}
                        </code>
                      </div>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          configured
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {configured ? 'Set' : 'Missing'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Vars Warning */}
              {Object.entries(status.envVars).some(([_, configured]) => !configured) && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900">
                    <strong>⚠️ Missing Environment Variables Detected</strong>
                    <br />
                    Some features may not work. See{' '}
                    <code className="font-mono">VERCEL_ENV_SETUP.md</code> for setup
                    instructions.
                  </p>
                </div>
              )}
            </div>

            {/* Troubleshooting Tips */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-semibold mb-2">💡 Troubleshooting</p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>
                  • <strong>Service not connected?</strong> Check credentials in Vercel
                  settings
                </li>
                <li>
                  • <strong>Environment variables missing?</strong> Add them via Vercel
                  dashboard
                </li>
                <li>
                  • <strong>Still having issues?</strong> Check the detailed error messages
                  above
                </li>
              </ul>
            </div>
          </>
        )}

        {loading && !status && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <Clock className="animate-spin mx-auto mb-2 text-slate-400" size={32} />
              <p className="text-slate-600">Checking services...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
