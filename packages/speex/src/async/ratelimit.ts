/**
 * Rate limiter that restricts the number of requests within a sliding time window.
 *
 * @example
 * const limiter = new RateLimiter({ maxRequests: 5, perWindow: 1000 })
 * if (limiter.tryAcquire()) {
 *   // Allowed
 * }
 *
 * @example
 * const limiter = new RateLimiter({ maxRequests: 2, perWindow: 1000 })
 * await limiter.acquire()
 * await limiter.acquire()
 * // Third call waits until the window rolls
 */
export class RateLimiter {
  private _maxRequests: number
  private _perWindow: number
  private _timestamps: number[] = []

  constructor(options: { maxRequests: number; perWindow: number }) {
    if (options.maxRequests < 1) throw new RangeError('maxRequests must be >= 1')
    if (options.perWindow < 1) throw new RangeError('perWindow must be >= 1')
    this._maxRequests = options.maxRequests
    this._perWindow = options.perWindow
  }

  private _prune(): void {
    const now = Date.now()
    const cutoff = now - this._perWindow
    while (this._timestamps.length > 0) {
      const ts = this._timestamps[0]
      if (ts === undefined || ts > cutoff) break
      this._timestamps.shift()
    }
  }

  /**
   * Check if a request is allowed without waiting.
   */
  tryAcquire(): boolean {
    this._prune()
    if (this._timestamps.length < this._maxRequests) {
      this._timestamps.push(Date.now())
      return true
    }
    return false
  }

  /**
   * Wait until a request is allowed.
   */
  async acquire(): Promise<void> {
    while (true) {
      this._prune()
      if (this._timestamps.length < this._maxRequests) {
        this._timestamps.push(Date.now())
        return
      }
      const oldest = this._timestamps[0] ?? Date.now()
      const waitMs = oldest + this._perWindow - Date.now()
      if (waitMs > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, waitMs))
      }
    }
  }

  /**
   * Current number of pending requests in the window.
   */
  get pending(): number {
    this._prune()
    return this._timestamps.length
  }
}

export default RateLimiter
