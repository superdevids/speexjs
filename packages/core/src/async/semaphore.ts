/**
 * Semaphore for controlling concurrent access to a resource.
 *
 * @example
 * const sem = new Semaphore(2)
 * await sem.use(async () => {
 *   // Only 2 callers at a time
 *   await doSomething()
 * })
 */
export class Semaphore {
  private _available: number
  private _waiting: Array<() => void> = []

  constructor(concurrency: number) {
    if (concurrency < 1) throw new RangeError('Semaphore concurrency must be >= 1')
    this._available = concurrency
  }

  get available(): number {
    return this._available
  }

  acquire(): Promise<() => void> {
    if (this._available > 0) {
      this._available--
      return Promise.resolve(this._release.bind(this))
    }
    return new Promise<() => void>((resolve) => {
      this._waiting.push(() => {
        this._available--
        resolve(this._release.bind(this))
      })
    })
  }

  async use<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire()
    try {
      return await fn()
    } finally {
      release()
    }
  }

  private _release(): void {
    this._available++
    if (this._waiting.length > 0) {
      const next = this._waiting.shift()
      if (next) next()
    }
  }
}

export default Semaphore
