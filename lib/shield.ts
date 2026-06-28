// Threat detection engine — Edge runtime compatible

export interface ThreatDetection {
  type: string
  score: number
}

const THREAT_PATTERNS: { regex: RegExp; type: string; score: number }[] = [
  // SQL Injection
  {
    regex: /union[\s+/*]select|select[\s+].*[\s+]from[\s+]|insert[\s+]into|drop[\s+]table|delete[\s+]from|exec[\s+]*\(|xp_cmdshell/i,
    type: 'sql_injection', score: 15,
  },
  {
    regex: /'\s*(or|and)\s*['"\d]|--[\s$]|;\s*(drop|delete|insert|update|select)/i,
    type: 'sql_injection', score: 12,
  },
  {
    regex: /%27|%22.*%3d.*%27|%3c.*%3e/i,
    type: 'sql_injection_encoded', score: 10,
  },
  // XSS
  {
    regex: /<script[\s>]|<\/script>|javascript\s*:|onerror\s*=|onload\s*=|<iframe[\s>]|<object[\s>]|<embed[\s>]/i,
    type: 'xss', score: 12,
  },
  {
    regex: /document\.(cookie|write|location)|window\.(location|open)|eval\s*\(/i,
    type: 'xss', score: 10,
  },
  // Path Traversal
  {
    regex: /\.\.[\\/]|%2e%2e[\\/]|%252e%252e|\.\.%2f|\.\.%5c/i,
    type: 'path_traversal', score: 10,
  },
  // Command Injection
  {
    regex: /[;&|`]\s*(bash|sh|cmd|powershell|wget|curl|nc\s|netcat|python|perl|ruby|php)\s/i,
    type: 'command_injection', score: 15,
  },
  // Scanner Probes
  {
    regex: /wp-(?:admin|login|config|content)|phpmyadmin|\.env$|\/etc\/passwd|\/proc\/self|web\.config|\.git\/config|\.htaccess/i,
    type: 'scanner_probe', score: 8,
  },
  {
    regex: /\.(php|asp|aspx|jsp|cgi|pl|sh|bat)\?|\/cgi-bin\/|\/xmlrpc\.php|\/solr\//i,
    type: 'scanner_probe', score: 6,
  },
]

export const SCANNER_UAS = [
  'sqlmap', 'nikto', 'masscan', 'nmap', 'dirbuster', 'gobuster',
  'burpsuite', 'zaproxy', 'acunetix', 'openvas', 'metasploit',
  'havij', 'w3af', 'wfuzz', 'hydra', 'nuclei', 'zgrab', 'httpx',
  'python-requests/2', 'go-http-client/1', 'libwww-perl',
]

export const BLOCK_THRESHOLD = 20  // auto-block at this score
export const ALERT_THRESHOLD = 10  // email warning at this score

// ── In-memory state (per edge instance) ──────────────────────────────────────
const violationScores = new Map<string, { score: number; events: string[]; lastSeen: number }>()
const blockedIpsCache = new Set<string>()
let lastDbSync = 0
const DB_SYNC_INTERVAL_MS = 5 * 60 * 1000 // sync blocked IPs from DB every 5 min

export function analyzeRequest(
  fullUrl: string,
  userAgent: string,
): ThreatDetection[] {
  const threats: ThreatDetection[] = []

  // Known scanner user agents
  const uaLower = (userAgent ?? '').toLowerCase()
  const matchedUA = SCANNER_UAS.find(ua => uaLower.includes(ua))
  if (matchedUA) threats.push({ type: 'scanner_ua', score: 20 })

  // Attack patterns in URL
  let toCheck = fullUrl
  try { toCheck = decodeURIComponent(fullUrl) } catch {}

  for (const { regex, type, score } of THREAT_PATTERNS) {
    if (regex.test(toCheck)) threats.push({ type, score })
  }

  return threats
}

export function recordViolation(ip: string, threats: ThreatDetection[]): number {
  const existing = violationScores.get(ip) ?? { score: 0, events: [], lastSeen: 0 }
  const addedScore = threats.reduce((s, t) => s + t.score, 0)
  const newScore = existing.score + addedScore
  violationScores.set(ip, {
    score: newScore,
    events: [...existing.events, ...threats.map(t => t.type)].slice(-20),
    lastSeen: Date.now(),
  })
  return newScore
}

export function isBlockedInMemory(ip: string): boolean {
  return blockedIpsCache.has(ip)
}

export function addToMemoryBlock(ip: string) {
  blockedIpsCache.add(ip)
}

export function shouldSyncDb(): boolean {
  return Date.now() - lastDbSync > DB_SYNC_INTERVAL_MS
}

export function markDbSynced() {
  lastDbSync = Date.now()
}
