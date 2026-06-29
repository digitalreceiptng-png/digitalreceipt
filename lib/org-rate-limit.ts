// In-memory rate limiter for staff PIN verification.
// Keyed by "orgSlug:ip" — resets on server restart, acceptable for PIN gate.

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

interface Entry { attempts: number; lockedUntil: number }

const store = new Map<string, Entry>()

export function checkRateLimit(key: string): { allowed: boolean; attemptsLeft: number; lockedUntil?: number } {
  const now = Date.now()
  const e = store.get(key)
  if (!e) return { allowed: true, attemptsLeft: MAX_ATTEMPTS }
  if (e.lockedUntil > now) return { allowed: false, attemptsLeft: 0, lockedUntil: e.lockedUntil }
  if (e.attempts >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_MS
    store.set(key, { ...e, lockedUntil })
    return { allowed: false, attemptsLeft: 0, lockedUntil }
  }
  return { allowed: true, attemptsLeft: MAX_ATTEMPTS - e.attempts }
}

export function recordFailedAttempt(key: string): { attemptsLeft: number; locked: boolean; lockedUntil?: number } {
  const now = Date.now()
  const e = store.get(key) ?? { attempts: 0, lockedUntil: 0 }
  const attempts = e.attempts + 1
  if (attempts >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_MS
    store.set(key, { attempts, lockedUntil })
    return { attemptsLeft: 0, locked: true, lockedUntil }
  }
  store.set(key, { attempts, lockedUntil: 0 })
  return { attemptsLeft: MAX_ATTEMPTS - attempts, locked: false }
}

export function resetAttempts(key: string) {
  store.delete(key)
}
