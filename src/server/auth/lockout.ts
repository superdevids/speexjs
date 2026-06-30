interface AttemptEntry {
  count: number
  lockedUntil: number
}

export interface LockoutStore {
  get(key: string): AttemptEntry | undefined
  set(key: string, value: AttemptEntry): void
  delete(key: string): void
}

class MapStore implements LockoutStore {
  private store = new Map<string, AttemptEntry>()
  get(key: string): AttemptEntry | undefined {
    return this.store.get(key)
  }
  set(key: string, value: AttemptEntry): void {
    this.store.set(key, value)
  }
  delete(key: string): void {
    this.store.delete(key)
  }
}

export class AccountLockout {
  private attempts: LockoutStore
  private maxAttempts = 5
  private lockoutDuration = 900000

  constructor(config?: { maxAttempts?: number; lockoutDurationMs?: number; store?: LockoutStore }) {
    this.attempts = config?.store ?? new MapStore()
    if (config?.maxAttempts) this.maxAttempts = config.maxAttempts
    if (config?.lockoutDurationMs) this.lockoutDuration = config.lockoutDurationMs
  }

  recordAttempt(identifier: string): void {
    const entry = this.attempts.get(identifier) ?? { count: 0, lockedUntil: 0 }
    entry.count++
    if (entry.count >= this.maxAttempts) entry.lockedUntil = Date.now() + this.lockoutDuration
    this.attempts.set(identifier, entry)
  }

  isLocked(identifier: string): boolean {
    const entry = this.attempts.get(identifier)
    if (!entry) return false
    if (entry.lockedUntil < Date.now()) {
      this.attempts.delete(identifier)
      return false
    }
    return true
  }

  clear(identifier: string): void {
    this.attempts.delete(identifier)
  }

  remainingAttempts(identifier: string): number {
    const entry = this.attempts.get(identifier)
    return entry ? Math.max(0, this.maxAttempts - entry.count) : this.maxAttempts
  }
}
