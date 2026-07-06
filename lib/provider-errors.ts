import { createAdminClient } from '@/lib/supabase/admin'

export class InsufficientFundsError extends Error {
  constructor(public readonly provider: string, public readonly raw: string) {
    super(`PROVIDER_INSUFFICIENT_FUNDS:${provider}`)
    this.name = 'InsufficientFundsError'
  }
}

export function isInsufficientFunds(status: number, body: unknown): boolean {
  if (status === 402) return true
  const t = JSON.stringify(body ?? '').toLowerCase()
  return (
    t.includes('insufficient') ||
    t.includes('low balance') ||
    t.includes('no credit') ||
    t.includes('out of credit') ||
    t.includes('no funds') ||
    t.includes('wallet balance') ||
    t.includes('top up') ||
    t.includes('topup') ||
    t.includes('account balance')
  )
}

export async function reportProviderAlert(
  provider: string,
  alertType: string,
  statusCode: number,
  rawResponse: unknown,
  triggeredBy: string
): Promise<void> {
  try {
    const db = createAdminClient()
    await db.from('system_alerts').insert({
      provider,
      alert_type: alertType,
      status_code: statusCode,
      raw_response: rawResponse as any,
      triggered_by: triggeredBy,
    })
  } catch (err) {
    console.error('[reportProviderAlert] Failed to log alert:', err)
  }
}
