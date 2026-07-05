import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  analyzeRequest,
  recordViolation,
  isBlockedInMemory,
  addToMemoryBlock,
  shouldSyncDb,
  markDbSynced,
  BLOCK_THRESHOLD,
  ALERT_THRESHOLD,
} from '@/lib/shield'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'ayvicola@gmail.com'

// ── Shield helpers (all fire-and-forget, Edge-compatible fetch) ────────────────

async function syncBlockedIpsFromDb() {
  if (!shouldSyncDb()) return
  markDbSynced()
  try {
    const now = new Date().toISOString()
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blocked_ips?select=ip&expires_at=gt.${now}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    if (res.ok) {
      const rows: { ip: string }[] = await res.json()
      rows.forEach(r => addToMemoryBlock(r.ip))
    }
  } catch {}
}

async function persistSecurityEvent(
  ip: string, eventType: string, details: object, path: string, ua: string, country?: string
) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/security_events`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ip, event_type: eventType, details: { ...details, country }, path, user_agent: ua }),
    })
  } catch {}
}

async function persistBlockedIp(ip: string, reason: string, score: number, country?: string) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/blocked_ips`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        ip,
        reason,
        score,
        country,
        blocked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
  } catch {}
}

// Fetch + update the cumulative score for an IP across all edge instances.
// Returns the new total score so any instance can decide to block.
async function getAndIncrementDbScore(ip: string, addScore: number, reason: string): Promise<number> {
  try {
    // Read current score from threat_scores table
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/threat_scores?ip=eq.${encodeURIComponent(ip)}&select=score`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    const rows: { score: number }[] = res.ok ? await res.json() : []
    const current = rows[0]?.score ?? 0
    const newScore = current + addScore

    // Upsert the new score (merge-duplicates on ip)
    await fetch(`${SUPABASE_URL}/rest/v1/threat_scores`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        ip,
        score: newScore,
        reason,
        last_seen: new Date().toISOString(),
      }),
    })

    return newScore
  } catch {
    return addScore // fall back to just the local score
  }
}

async function sendAlertEmail(
  ip: string, score: number, threats: string[], path: string, ua: string
) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const isBlock = score >= BLOCK_THRESHOLD
  const subject = isBlock
    ? `🚨 BLOCKED: Attack detected from ${ip} — DigitalReceipt.ng`
    : `⚠️ WARNING: Suspicious activity from ${ip} — DigitalReceipt.ng`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'security@digitalreceipt.ng',
        to: ADMIN_EMAIL,
        subject,
        html: `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px 16px;background:#f3f4f6;">
  <div style="background:${isBlock ? '#7f1d1d' : '#78350f'};border-radius:12px 12px 0 0;padding:24px 28px;">
    <p style="font-size:32px;margin:0;">${isBlock ? '🚨' : '⚠️'}</p>
    <h1 style="font-size:20px;font-weight:800;color:#fff;margin:8px 0 4px;">${isBlock ? 'IP BLOCKED — Attack Detected' : 'Suspicious Activity Detected'}</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0;">DigitalReceipt.ng Security Shield</p>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px;border:1px solid #e5e7eb;border-top:none;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 0;color:#6b7280;width:140px;font-weight:500;">IP Address</td>
        <td style="padding:10px 0;font-weight:700;font-family:monospace;font-size:15px;">${ip}</td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6;background:#fafafa;">
        <td style="padding:10px 6px;color:#6b7280;font-weight:500;">Threat Score</td>
        <td style="padding:10px 6px;font-weight:700;color:${isBlock ? '#dc2626' : '#d97706'};font-size:16px;">${score} / ${BLOCK_THRESHOLD}</td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 0;color:#6b7280;font-weight:500;">Attack Types</td>
        <td style="padding:10px 0;font-weight:600;">${threats.map(t => `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:12px;margin:0 2px;">${t.replace(/_/g, ' ')}</span>`).join(' ')}</td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6;background:#fafafa;">
        <td style="padding:10px 6px;color:#6b7280;font-weight:500;">Target Path</td>
        <td style="padding:10px 6px;font-family:monospace;font-size:13px;color:#374151;">${path}</td>
      </tr>
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 0;color:#6b7280;font-weight:500;">User Agent</td>
        <td style="padding:10px 0;font-size:12px;color:#6b7280;word-break:break-all;">${(ua ?? '').slice(0, 150)}</td>
      </tr>
      <tr style="background:#fafafa;">
        <td style="padding:10px 6px;color:#6b7280;font-weight:500;">Time (WAT)</td>
        <td style="padding:10px 6px;">${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' })}</td>
      </tr>
    </table>

    <div style="margin-top:20px;padding:16px;background:${isBlock ? '#fef2f2' : '#fffbeb'};border-radius:8px;border-left:4px solid ${isBlock ? '#dc2626' : '#f59e0b'};">
      <p style="margin:0;font-size:13px;font-weight:700;color:${isBlock ? '#991b1b' : '#92400e'};">
        ${isBlock
          ? '🛡️ Action Taken: This IP has been automatically blocked for 24 hours. All future requests will be rejected with a 403 page.'
          : '👁️ Monitoring: Score not yet at block threshold. Next suspicious request from this IP will trigger a block.'}
      </p>
    </div>

    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      DigitalReceipt.ng Security Shield · Automated notification
    </p>
  </div>
</body>
</html>`,
      }),
    })
  } catch {}
}

// ── Security response headers ─────────────────────────────────────────────────
function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://flagcdn.com https://res.cloudinary.com https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co https://api.paystack.co https://api.resend.com",
      "frame-src https://js.paystack.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')
  )
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  return res
}

// ── Block page HTML ────────────────────────────────────────────────────────────
const BLOCK_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Access Denied — DigitalReceipt.ng</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0b1512;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
  .card{text-align:center;max-width:400px;}
  .icon{font-size:56px;margin-bottom:20px;display:block;}
  h1{font-size:22px;font-weight:800;margin-bottom:12px;color:#f0fdf4;}
  p{font-size:14px;color:rgba(255,255,255,0.55);line-height:1.6;}
  .badge{display:inline-block;margin-top:24px;padding:6px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:20px;font-size:12px;color:rgba(255,255,255,0.4);}
</style>
</head>
<body>
  <div class="card">
    <span class="icon">🛡️</span>
    <h1>Access Denied</h1>
    <p>Your IP address has been blocked due to suspicious activity detected by our security system.</p>
    <p style="margin-top:12px;">If you believe this is a mistake, contact <a href="mailto:support@digitalreceipt.ng" style="color:#4ade80;text-decoration:none;">support@digitalreceipt.ng</a></p>
    <span class="badge">DigitalReceipt.ng Security Shield</span>
  </div>
</body>
</html>`

// ── Main proxy ────────────────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // ── Subdomain detection ────────────────────────────────────────────────────
  const isAdminSubdomain =
    hostname.startsWith('admin.') ||
    hostname === 'admin.localhost' ||
    hostname.startsWith('admin.localhost:')

  if (isAdminSubdomain && pathname !== '/admin' && !pathname.startsWith('/admin/') && !pathname.startsWith('/api')) {
    const newPath = pathname === '/' ? '/admin' : `/admin${pathname}`
    url.pathname = newPath
    return NextResponse.rewrite(url)
  }

  // ── Threat Shield ──────────────────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  const ua = request.headers.get('user-agent') ?? ''
  // Vercel injects x-vercel-ip-country on all edge requests (ISO 3166-1 alpha-2)
  const country = request.headers.get('x-vercel-ip-country') ?? undefined

  // Sync blocked IPs from DB periodically (fire-and-forget)
  syncBlockedIpsFromDb().catch(() => {})

  // Analyze request for threats first — needed for the IP-block decision below
  const threats = analyzeRequest(request.url, ua)

  // Only block if the current request shows active attack signals.
  // Previously-flagged IPs navigating normally are always allowed through.
  if (isBlockedInMemory(ip) && threats.length > 0) {
    persistSecurityEvent(ip, 'blocked_request', { path: pathname }, pathname, ua, country).catch(() => {})
    return applySecurityHeaders(new NextResponse(BLOCK_PAGE, {
      status: 403,
      headers: { 'Content-Type': 'text/html' },
    }))
  }

  if (threats.length > 0) {
    const localScore = recordViolation(ip, threats)
    const threatTypes = [...new Set(threats.map(t => t.type))]
    const reason = threatTypes.join(', ')

    // Get the true cumulative score across all edge instances from DB
    const totalScore = await getAndIncrementDbScore(ip, threats.reduce((s, t) => s + t.score, 0), reason)

    await persistSecurityEvent(ip, 'threat_detected', { threats: threatTypes, score: totalScore }, pathname, ua, country).catch(() => {})

    if (totalScore >= BLOCK_THRESHOLD) {
      // Auto-block: persist to DB + memory + notify
      addToMemoryBlock(ip)
      persistBlockedIp(ip, reason, totalScore, country).catch(() => {})
      sendAlertEmail(ip, totalScore, threatTypes, pathname, ua).catch(() => {})
      return applySecurityHeaders(new NextResponse(BLOCK_PAGE, {
        status: 403,
        headers: { 'Content-Type': 'text/html' },
      }))
    } else if (totalScore >= ALERT_THRESHOLD) {
      sendAlertEmail(ip, totalScore, threatTypes, pathname, ua).catch(() => {})
    }
  }

  // ── Supabase session refresh ───────────────────────────────────────────────
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Dashboard protection ───────────────────────────────────────────────────
  if (!user && pathname.startsWith('/dashboard')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Staff access control (three tiers) ────────────────────────────────────
  if (user && pathname.startsWith('/dashboard') && user.app_metadata?.is_staff) {
    const accessLevel = user.app_metadata?.access_level

    if (accessLevel === 'full') {
      // All access — no restrictions
    } else if (accessLevel === 'partial') {
      // Partial access — receipts section only (read-only enforced in layout/UI)
      if (!pathname.startsWith('/dashboard/receipts')) {
        return NextResponse.redirect(new URL('/dashboard/receipts', request.url))
      }
    } else {
      // generate_only (or unset) — receipt creation only
      if (!pathname.startsWith('/dashboard/receipts/new')) {
        return NextResponse.redirect(new URL('/dashboard/receipts/new', request.url))
      }
    }
  }

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !user) {
    const adminLogin = request.nextUrl.clone()
    adminLogin.pathname = '/admin/login'
    return NextResponse.redirect(adminLogin)
  }

  return applySecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
