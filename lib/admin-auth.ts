import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MFA_COOKIE = 'admin_mfa'
const MFA_TTL_MS = 60 * 60 * 12 * 1000 // 12 hours — matches the cookie's maxAge in /api/admin/otp

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

    // Require the OTP (2FA) step to have actually been completed for this
    // browser — a valid password + admins-table row alone is not enough.
    // Without this check, the email-OTP step was purely a client-side UI
    // gate: signInWithPassword() already issues a fully authorized session,
    // and nothing server-side ever verified OTP completion.
    const mfaToken = (await cookies()).get(MFA_COOKIE)?.value
    if (!mfaToken) return null
    const mfaTokenHash = crypto.createHash('sha256').update(mfaToken).digest('hex')
    const { data: otpRow } = await db
      .from('admin_otps')
      .select('mfa_token_hash, mfa_verified_at')
      .eq('user_id', user.id)
      .single()
    if (
      !otpRow?.mfa_token_hash ||
      otpRow.mfa_token_hash !== mfaTokenHash ||
      !otpRow.mfa_verified_at ||
      Date.now() - new Date(otpRow.mfa_verified_at).getTime() > MFA_TTL_MS
    ) {
      return null
    }

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
