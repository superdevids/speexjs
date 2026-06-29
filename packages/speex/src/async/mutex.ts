/**
 * Mutex for exclusive access to a critical section.
 *
 * @example
 * const mutex = new Mutex()
 * const release = await mutex.acquire()
 * try {
 *   // Exclusive access
 * } finally {
 *   release()
 * }
 *
 * @example
 * const mutex = new Mutex()
 * const result = await mutex.use(async () => {
 *   return await fetch('/api/data')
 * })
 */
export class Mutex {
  private _locked = false
  private _waiting: Array<() => void> = []

  /**
   * Acquire the lock. Returns a release function to be called when done.
   */
  acquire(): Promise<() => void> {
    if (!this._locked) {
      this._locked = true
      return Promise.resolve(this._release.bind(this))
    }
    return new Promise<() => void>(resolve => {
      this._waiting.push(() => {
        resolve(this._release.bind(this))
      })
    })
  }

  /**
   * Run a function with the lock held and automatically release it.
   */
  async use<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire()
    try {
      return await fn()
    } finally {
      release()
    }
  }

  /**
   * Whether the mutex is currently locked.
   */
  get locked(): boolean {
    return this._locked
  }

  private _release(): void {
    if (this._waiting.length > 0) {
      const next = this._waiting.shift()
      if (next) next()
    } else {
      this._locked = false
    }
  }
}

export default Mutex
