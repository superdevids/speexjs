export class AccountLockout {
  private attempts = new Map<string, { count: number; lockedUntil: number }>()
  private maxAttempts = 5
  private lockoutDuration = 900000

  constructor(config?: { maxAttempts?: number; lockoutDurationMs?: number }) {
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
    if (entry.lockedUntil < Date.now()) { this.attempts.delete(identifier); return false }
    return true
  }

  clear(identifier: string): void { this.attempts.delete(identifier) }

  remainingAttempts(identifier: string): number {
    const entry = this.attempts.get(identifier)
    return entry ? Math.max(0, this.maxAttempts - entry.count) : this.maxAttempts
  }
}
