function getNigeriaHour(): number {
  // WAT = UTC+1
  return new Date(Date.now() + 60 * 60 * 1000).getUTCHours()
}

function isDaytime(): boolean {
  const hour = getNigeriaHour()
  // Daytime: 08:00–20:59 WAT (9pm onwards = night)
  return hour >= 8 && hour < 21
}

import { isInsufficientFunds, reportProviderAlert, InsufficientFundsError } from './provider-errors'

export async function sendTermiiSms(to: string, message: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.TERMII_API_KEY
  const daySenderId = process.env.TERMII_SENDER_ID ?? 'D-Receipt'

  if (!apiKey) throw new Error('TERMII_API_KEY not configured')

  const day = isDaytime()
  const from    = day ? daySenderId : 'N-Alert'
  const channel = day ? 'generic'   : 'dnd'

  const payload = {
    api_key: apiKey,
    to,
    from,
    sms: message,
    type: 'plain',
    channel,
  }

  const res = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  console.log('[Termii SMS]', { to, from, channel, status: res.status, response: data })

  // Termii returns message_id on success; any error body or non-OK status = failure
  const isError =
    !res.ok ||
    data.code === 'error' ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('error')) ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('invalid')) ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('fail')) ||
    (!data.message_id && !data.messages && data.code !== 'ok')

  if (isError) {
    if (isInsufficientFunds(res.status, data)) {
      await reportProviderAlert('termii', 'insufficient_funds', res.status, data, 'lib/termii')
      throw new InsufficientFundsError('termii', JSON.stringify(data))
    }
    throw new Error(`Termii SMS failed (${res.status}): ${JSON.stringify(data)}`)
  }

  return data
}
