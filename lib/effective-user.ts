import type { User } from '@supabase/supabase-js'
import type { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns the user ID whose data should be queried: the owner's, for any
 * active staff member (regardless of access level — a staff account never
 * owns its own receipts/wallet/profile, so anything less would just 404 for
 * partial/generate_only staff instead of properly scoping to the owner).
 * Matches the staff_members lookup every other part of the app already uses
 * (the receipts list, reminder routes, etc.) — this used to instead trust
 * user.app_metadata, which only carried the owner id for access_level
 * 'full', silently breaking these routes for staff without full access.
 *
 * Feature-specific restrictions (e.g. "generate_only staff can't view the
 * wallet") are a separate concern and must be checked explicitly by the
 * caller — this only answers "whose data," not "are they allowed to."
 */
export async function getEffectiveUserId(db: ReturnType<typeof createAdminClient>, user: User): Promise<string> {
  const { data: staffRow } = await db
    .from('staff_members')
    .select('owner_id')
    .eq('staff_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  return staffRow ? staffRow.owner_id : user.id
}
