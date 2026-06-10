// On admin subdomain (production): NEXT_PUBLIC_ADMIN_BASE=""
// In local dev (no subdomain):     NEXT_PUBLIC_ADMIN_BASE="/admin" (default)
// This makes links work cleanly on both: admin.digitalreceipt.ng/overview vs localhost/admin/overview
const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_BASE ?? '/admin'

export const adminHref = (path: string) => `${ADMIN_BASE}${path}`
