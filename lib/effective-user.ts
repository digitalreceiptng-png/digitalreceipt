import type { User } from '@supabase/supabase-js'

/**
 * Returns the user ID whose data should be queried.
 * For full-access staff, this is the owner's user ID so they see the owner's data.
 * For everyone else it's their own user ID.
 */
export function getEffectiveUserId(user: User): string {
  if (
    user.app_metadata?.is_staff &&
    user.app_metadata?.access_level === 'full' &&
    user.app_metadata?.owner_user_id
  ) {
    return user.app_metadata.owner_user_id as string
  }
  return user.id
}
