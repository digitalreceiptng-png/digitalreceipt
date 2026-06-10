import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminRole =
  | 'super_admin'
  | 'support_agent'
  | 'finance_admin'
  | 'kyc_reviewer'
  | 'content_manager'
  | 'analyst'

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: AdminRole
  created_at: string
}

// Returns the authenticated admin user, or null if not authenticated / not an admin.
// Uses service role client to bypass RLS on the admins table.
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const db = createAdminClient()

    // Check admins table (id + role only)
    const { data: admin, error } = await db
      .from('admins')
      .select('id, role, created_at')
      .eq('id', user.id)
      .single()

    if (error || !admin) return null

    // Get display name from profiles table
    const { data: profile } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    return {
      id: admin.id,
      email: user.email ?? '',
      full_name: profile?.full_name ?? user.email ?? 'Admin',
      role: admin.role as AdminRole,
      created_at: admin.created_at,
    }
  } catch {
    return null
  }
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  support_agent: 'Support Agent',
  finance_admin: 'Finance Admin',
  kyc_reviewer: 'KYC Reviewer',
  content_manager: 'Content Manager',
  analyst: 'Analyst',
}

// Write a record to the audit_log table
export async function logAdminAction(
  admin: AdminUser,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  try {
    const db = createAdminClient()
    await db.from('audit_log').insert({
      admin_id: admin.id,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: details,
    })
  } catch {
    // Non-fatal — log failure shouldn't break the action
  }
}
