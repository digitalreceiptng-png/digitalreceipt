// On admin subdomain (production): NEXT_PUBLIC_ADMIN_BASE=""
// In local dev (no subdomain):     NEXT_PUBLIC_ADMIN_BASE="/admin" (default)
// Strip accidental surrounding quotes (e.g. if set to `""` in Vercel UI)
const raw = process.env.NEXT_PUBLIC_ADMIN_BASE ?? '/admin'
const ADMIN_BASE = raw.replace(/^"+|"+$/g, '')

export const adminHref = (path: string) => `${ADMIN_BASE}${path}`
