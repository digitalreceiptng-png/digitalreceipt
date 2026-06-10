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
  is_active: boolean
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

    if (!user?.email) return null

    const db = createAdminClient()
    const { data: admin, error } = await db
      .from('admins')
      .select('id, email, full_name, role, is_active, created_at')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (error || !admin) return null
    return admin as AdminUser
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
      admin_email: admin.email,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    })
  } catch {
    // Non-fatal — log failure shouldn't break the action
  }
}
