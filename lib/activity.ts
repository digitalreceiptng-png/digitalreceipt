import { createAdminClient } from '@/lib/supabase/admin'

export type ActivityType =
  | 'receipt_created'
  | 'receipt_merged'
  | 'payment_recorded'
  | 'request_approved'
  | 'request_rejected'
  | 'installment_added'
  | 'installment_paid'
  | 'reminder_set'
  | 'reminder_sent'
  | 'profile_switched'
  | 'company_added'
  | 'wallet_topped_up'
  | 'receipt_emailed'
  | 'receipt_group_created'
  | 'receipt_group_moved'
  | 'form_created'
  | 'form_deleted'
  | 'form_updated'

export async function logActivity({
  userId,
  type,
  title,
  description,
  entityId,
  entityType,
  meta,
}: {
  userId: string
  type: ActivityType
  title: string
  description?: string
  entityId?: string
  entityType?: string
  meta?: Record<string, unknown>
}) {
  try {
    const db = createAdminClient()
    await db.from('user_activities').insert({
      user_id: userId,
      type,
      title,
      description: description ?? null,
      entity_id: entityId ?? null,
      entity_type: entityType ?? null,
      meta: meta ?? null,
    })
  } catch (e) {
    // Non-critical — never block the main flow
    console.error('[activity] Failed to log:', e)
  }
}
