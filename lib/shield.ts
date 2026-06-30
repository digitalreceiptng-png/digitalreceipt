// Threat detection engine — Edge runtime compatible

export interface ThreatDetection {
  type: string
  score: number
}

const THREAT_PATTERNS: { regex: RegExp; type: string; score: number }[] = [
  // ── SQL Injection ─────────────────────────────────────────────────────────────
  {
    regex: /union[\s+/*]+select|select[\s+].*[\s+]from[\s+]|insert[\s+]into|drop[\s+]table|delete[\s+]from|exec[\s+]*\(|xp_cmdshell|sp_executesql/i,
    type: 'sql_injection', score: 15,
  },
  {
    regex: /'\s*(or|and)\s*['"\d=]|--[\s$]|;\s*(drop|delete|insert|update|select)|\/\*.*\*\//i,
    type: 'sql_injection', score: 12,
  },
  {
    regex: /benchmark\s*\(|sleep\s*\(\d|waitfor\s+delay|pg_sleep|information_schema|sys\.tables|sysobjects/i,
    type: 'sql_injection', score: 15,
  },
  {
    regex: /%27|%22.*%3d.*%27|%3c.*%3e|0x[0-9a-f]{4,}|char\s*\(\d+\)|nchar\s*\(/i,
    type: 'sql_injection_encoded', score: 10,
  },
  // Blind / time-based SQLi
  {
    regex: /and\s+\d+=\d+|or\s+\d+=\d+|and\s+1=1|or\s+1=1|and\s+true|or\s+true/i,
    type: 'sql_injection', score: 8,
  },

  // ── XSS ───────────────────────────────────────────────────────────────────────
  {
    regex: /<script[\s>]|<\/script>|javascript\s*:|vbscript\s*:|onerror\s*=|onload\s*=|onmouseover\s*=|onfocus\s*=|onclick\s*=|<iframe[\s>]|<object[\s>]|<embed[\s>]|<svg[\s>]/i,
    type: 'xss', score: 12,
  },
  {
    regex: /document\.(cookie|write|location)|window\.(location|open)|eval\s*\(|setTimeout\s*\(|setInterval\s*\(|Function\s*\(/i,
    type: 'xss', score: 10,
  },
  {
    regex: /%3cscript|%3c\/script|javascript%3a|%22%3e%3cscript|&#x3c;script|&lt;script/i,
    type: 'xss', score: 10,
  },
  // DOM-based XSS sinks
  {
    regex: /innerHTML\s*=|outerHTML\s*=|insertAdjacentHTML|document\.write\s*\(|location\.href\s*=/i,
    type: 'xss', score: 8,
  },

  // ── Path Traversal ────────────────────────────────────────────────────────────
  {
    regex: /\.\.[\\/]|%2e%2e[\\/]|%252e%252e|\.\.%2f|\.\.%5c|\.\.%255c|%c0%af|%c1%9c/i,
    type: 'path_traversal', score: 10,
  },
  {
    regex: /\/etc\/(?:passwd|shadow|hosts|group|issue|crontab)|\/proc\/self\/(?:environ|cmdline|mem)|\/var\/log\//i,
    type: 'path_traversal', score: 20,
  },
  {
    regex: /c:\\windows\\|c:\\boot\.ini|c:\\winnt\\system32|boot\.ini|win\.ini|system32/i,
    type: 'path_traversal', score: 12,
  },

  // ── Command Injection ─────────────────────────────────────────────────────────
  {
    regex: /[;&|`]\s*(bash|sh|cmd|powershell|wget|curl|nc\s|netcat|python|perl|ruby|php)\s/i,
    type: 'command_injection', score: 15,
  },
  {
    regex: /\$\(.*\)|`[^`]+`|\|\s*(cat|ls|id|whoami|uname|ifconfig|ipconfig)\b/i,
    type: 'command_injection', score: 12,
  },
  {
    regex: /;\s*(cat|ls|id|whoami|uname|ping|nslookup|curl|wget)\s|&&\s*(cat|ls|id|whoami)/i,
    type: 'command_injection', score: 10,
  },

  // ── SSRF ──────────────────────────────────────────────────────────────────────
  {
    regex: /169\.254\.169\.254|metadata\.google\.internal|instance-data|169\.254\.170\.2/i,
    type: 'ssrf', score: 20,
  },
  {
    regex: /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|0x7f000001|017700000001|2130706433/i,
    type: 'ssrf', score: 15,
  },
  {
    regex: /10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\./i,
    type: 'ssrf', score: 12,
  },

  // ── Prototype Pollution ───────────────────────────────────────────────────────
  {
    regex: /__proto__|constructor\[prototype\]|prototype\.pollution|\["__proto__"\]/i,
    type: 'prototype_pollution', score: 15,
  },

  // ── Template Injection ────────────────────────────────────────────────────────
  {
    regex: /\{\{.*\}\}|\$\{.*\}|<%.*%>|#\{.*\}|@\{.*\}/,
    type: 'template_injection', score: 8,
  },

  // ── Secret / Config File Probes ───────────────────────────────────────────────
  {
    regex: /\.git\/(config|HEAD|index|COMMIT_EDITMSG|packed-refs)|\/\.env(?:\.|[?#]|$)|\/\.env\.(local|production|development|staging)|\/config\/secrets|\/wp-config\.php/i,
    type: 'secret_file_probe', score: 20,
  },
  {
    regex: /\/\.ssh\/|\/\.aws\/credentials|\/\.docker|\/\.kube\/config|\/secrets\.yml|\/credentials\.json/i,
    type: 'secret_file_probe', score: 20,
  },

  // ── Scanner Probes ────────────────────────────────────────────────────────────
  {
    regex: /wp-(?:admin|login|config|content|includes)|phpmyadmin|mysqladmin|\/etc\/passwd|\/etc\/shadow/i,
    type: 'scanner_probe', score: 12,
  },
  {
    regex: /\.(php|asp|aspx|jsp|cgi|pl|sh|bat)\?|\/cgi-bin\/|\/xmlrpc\.php|\/solr\/|\/actuator\/|\/console\/|\/manager\/html|\/struts|\/jmx-console/i,
    type: 'scanner_probe', score: 8,
  },
  {
    regex: /\/admin\/config|\/debug\/|\/test\.(php|asp)|\/info\.php|\/phpinfo|\/server-status|\/server-info/i,
    type: 'scanner_probe', score: 10,
  },
  {
    regex: /\/swagger|\/openapi\.json|\/api-docs|\/graphql\?.*__schema|introspection/i,
    type: 'scanner_probe', score: 6,
  },
  // Shell upload probes
  {
    regex: /c99\.php|r57\.php|shell\.php|cmd\.php|webshell|b374k|weevely|laudanum/i,
    type: 'webshell_probe', score: 20,
  },
]

export const SCANNER_UAS = [
  // SQL injection tools
  'sqlmap', 'havij', 'bbqsql', 'blind-sql',
  // Web app scanners
  'nikto', 'w3af', 'acunetix', 'appscan', 'nessus', 'openvas', 'nexpose',
  'qualys', 'webinspect', 'burpsuite', 'zaproxy', 'skipfish',
  // Network scanners
  'masscan', 'nmap', 'zmap',
  // Directory/path fuzzers
  'dirbuster', 'gobuster', 'feroxbuster', 'ffuf', 'wfuzz', 'dirb', 'dirsearch',
  // Exploit frameworks
  'metasploit', 'hydra', 'medusa', 'patator',
  // Recon / internet-wide scanners
  'nuclei', 'zgrab', 'httpx', 'l9scan', 'leakix', 'shodan', 'censys',
  'binaryedge', 'netlas', 'fofa', 'zoomeye', 'onyphe',
  // Automated HTTP tools (high-signal bots)
  'python-requests/2', 'go-http-client/1', 'libwww-perl', 'lwp-request',
  'peach', 'arachni',
]

export const BLOCK_THRESHOLD = 16
export const ALERT_THRESHOLD = 8

// ── Per-IP rate limiting ──────────────────────────────────────────────────────
interface RateEntry { count: number; windowStart: number }
const rateLimitMap = new Map<string, RateEntry>()
const RATE_WINDOW_MS = 60_000    // 1-minute window
const RATE_LIMIT_PUBLIC = 120    // 120 req/min for general traffic
const RATE_LIMIT_API = 60        // 60 req/min for API routes
const RATE_LIMIT_AUTH = 10       // 10 req/min for auth routes (login/OTP)
const RATE_LIMIT_RECEIPTS = 30   // 30 req/min for receipt creation

export interface RateLimitResult {
  limited: boolean
  count: number
  limit: number
  windowSeconds: number
}

export function checkRateLimit(ip: string, pathname: string): RateLimitResult {
  let limit = RATE_LIMIT_PUBLIC
  if (/\/api\/auth\/|\/api\/otp\/|\/auth\//.test(pathname)) limit = RATE_LIMIT_AUTH
  else if (/\/api\/receipts$|\/api\/org\/.+\/receipts$/.test(pathname)) limit = RATE_LIMIT_RECEIPTS
  else if (pathname.startsWith('/api/')) limit = RATE_LIMIT_API

  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return { limited: false, count: 1, limit, windowSeconds: RATE_WINDOW_MS / 1000 }
  }
  entry.count++

  return { limited: entry.count > limit, count: entry.count, limit, windowSeconds: RATE_WINDOW_MS / 1000 }
}

// ── In-memory state ───────────────────────────────────────────────────────────
const violationScores = new Map<string, { score: number; events: string[]; lastSeen: number }>()
const blockedIpsCache = new Set<string>()
let lastDbSync = 0
const DB_SYNC_INTERVAL_MS = 5 * 60 * 1000

export function analyzeRequest(fullUrl: string, userAgent: string): ThreatDetection[] {
  const threats: ThreatDetection[] = []

  // Known scanner user agents (exact substring match, lowercased)
  const uaLower = (userAgent ?? '').toLowerCase()
  const matchedUA = SCANNER_UAS.find(ua => uaLower.includes(ua))
  if (matchedUA) threats.push({ type: 'scanner_ua', score: 20 })

  // Attack patterns in URL (try decoded first, then raw)
  const toCheck = (() => {
    try { return decodeURIComponent(fullUrl) } catch { return fullUrl }
  })()

  for (const { regex, type, score } of THREAT_PATTERNS) {
    if (regex.test(toCheck)) threats.push({ type, score })
    // Also test raw URL to catch double-encoded attacks
    else if (toCheck !== fullUrl && regex.test(fullUrl)) threats.push({ type, score })
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
