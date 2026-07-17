import type { SupabaseClient, User } from '@supabase/supabase-js'

// Resolve a staff member's row robustly. Phone-invited staff may not have `staff_id` linked on the
// row yet, but their session JWT always carries app_metadata.staff_member_id — so fall back to that.
// `columns` is a PostgREST select string; returns the row or null.
export async function resolveStaffRow(db: SupabaseClient, user: User, columns: string): Promise<any> {
  const { data: byStaffId } = await db
    .from('staff_members')
    .select(columns)
    .eq('staff_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (byStaffId) return byStaffId

  const staffMemberId = user.app_metadata?.staff_member_id
  if (user.app_metadata?.is_staff && staffMemberId) {
    const { data: byId } = await db
      .from('staff_members')
      .select(columns)
      .eq('id', staffMemberId)
      .eq('is_active', true)
      .maybeSingle()
    return byId ?? null
  }
  return null
}

// A scope a staff member can issue receipts under: the main account or a specific company profile.
export interface StaffScope {
  id: string // 'main' for the main account, else the user_sub_accounts.id
  name: string
  isMain: boolean
}

export interface StaffAssignment {
  manage_all_profiles?: boolean | null
  managed_scopes?: string[] | null
}

// Normalize a managed_scopes value coming from a request body.
export function sanitizeManagedScopes(input: unknown): string[] {
  if (!Array.isArray(input)) return ['main']
  const out = input
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(v => v.trim())
    .slice(0, 50)
  return out.length ? Array.from(new Set(out)) : ['main']
}

// Accessible scopes for a staff member, ordered: main first (when allowed), then company profiles.
// Passing an empty ownerName is fine when the result is only used for access checks.
export async function getStaffScopes(
  db: SupabaseClient,
  assignment: StaffAssignment,
  ownerId: string,
  ownerName = '',
): Promise<StaffScope[]> {
  const { data: subs } = await db
    .from('user_sub_accounts')
    .select('id, business_name')
    .eq('owner_user_id', ownerId)
    .order('created_at', { ascending: true })
  const allSubs = (subs ?? []) as { id: string; business_name: string }[]

  const scopes: StaffScope[] = []
  if (assignment.manage_all_profiles) {
    scopes.push({ id: 'main', name: ownerName, isMain: true })
    for (const s of allSubs) scopes.push({ id: s.id, name: s.business_name, isMain: false })
    return scopes
  }

  const allowed = new Set(assignment.managed_scopes ?? ['main'])
  if (allowed.has('main')) scopes.push({ id: 'main', name: ownerName, isMain: true })
  for (const s of allSubs) if (allowed.has(s.id)) scopes.push({ id: s.id, name: s.business_name, isMain: false })

  // A staff member always has at least the main account.
  if (scopes.length === 0) scopes.push({ id: 'main', name: ownerName, isMain: true })
  return scopes
}

// Resolve the active scope from the cookie value ('main' or missing → main). Falls back to main/first.
export function resolveActiveScope(scopes: StaffScope[], cookieValue: string | null | undefined): StaffScope {
  if (cookieValue && cookieValue !== 'main') {
    const found = scopes.find(s => s.id === cookieValue)
    if (found) return found
  }
  return scopes.find(s => s.isMain) ?? scopes[0]
}

// Can this staff member issue under the given sub-account id? (null / 'main' → main account)
export function isScopeAccessible(scopes: StaffScope[], id: string | null): boolean {
  if (!id || id === 'main') return scopes.some(s => s.isMain)
  return scopes.some(s => s.id === id)
}
