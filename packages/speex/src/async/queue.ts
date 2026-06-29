export interface QueueOptions {
  concurrency?: number
}

/**
 * Priority-based async task queue with concurrency control.
 *
 * @example
 * const queue = new Queue({ concurrency: 2 })
 * const result = await queue.add(() => fetch('/api/data'))
 */
export class Queue<T = unknown> {
  private _tasks: Array<{
    priority: number
    task: () => Promise<T>
    resolve: (value: T) => void
    reject: (reason: unknown) => void
  }> = []
  private _running = 0
  private _paused = false
  private _idleResolve: (() => void) | null = null
  private _maxConcurrency: number

  constructor(options?: QueueOptions) {
    this._maxConcurrency = options?.concurrency ?? 1
    if (this._maxConcurrency < 1) this._maxConcurrency = 1
  }

  get pending(): number {
    return this._tasks.length
  }

  get running(): number {
    return this._running
  }

  add<R>(task: () => Promise<R>, options?: { priority?: number }): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this._tasks.push({
        priority: options?.priority ?? 0,
        task: task as unknown as () => Promise<T>,
        resolve: resolve as (value: T) => void,
        reject,
      })
      this._tasks.sort((a, b) => b.priority - a.priority)
      this._process()
    })
  }

  pause(): void {
    this._paused = true
  }

  resume(): void {
    this._paused = false
    this._process()
  }

  clear(): void {
    const err = new Error('Queue cleared')
    for (const t of this._tasks) t.reject(err)
    this._tasks = []
  }

  onIdle(): Promise<void> {
    if (this._running === 0 && this._tasks.length === 0) return Promise.resolve()
    return new Promise<void>((resolve) => {
      this._idleResolve = resolve
    })
  }

  private _process(): void {
    if (this._paused) return
    while (this._running < this._maxConcurrency && this._tasks.length > 0) {
      const item = this._tasks.shift()!
      this._running++
      item
        .task()
        .then((result) => item.resolve(result))
        .catch((err) => item.reject(err))
        .finally(() => {
          this._running--
          this._process()
          if (this._running === 0 && this._tasks.length === 0 && this._idleResolve) {
            this._idleResolve()
            this._idleResolve = null
          }
        })
    }
  }
}

export default Queue
