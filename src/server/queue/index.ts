import { EventEmitter } from 'node:events'

export type JobHandler = (payload: unknown) => void | Promise<void>

export interface QueueOptions {
  maxSize?: number
  maxRetries?: number
  backoff?: number
  concurrency?: number
  jobTimeout?: number
}

export interface QueueJobResult {
  name: string
  payload: unknown
  attempts: number
  error?: Error
}

interface RegisteredJob {
  handler: JobHandler
  maxRetries: number
  backoff: number
  timeout: number
}

interface QueuedJob {
  name: string
  payload: unknown
  handler: JobHandler
  attempts: number
  maxRetries: number
  backoff: number
  timeout: number
}

export class Queue extends EventEmitter {
  private jobs: QueuedJob[] = []
  private activeCount = 0
  private handlers = new Map<string, RegisteredJob>()
  private maxSize: number
  private defaultConcurrency: number
  private defaultMaxRetries: number
  private defaultBackoff: number
  private defaultTimeout: number
  private stopped = false

  constructor(options: QueueOptions = {}) {
    super()
    this.maxSize = options.maxSize ?? 1000
    this.defaultConcurrency = options.concurrency ?? 1
    this.defaultMaxRetries = options.maxRetries ?? 3
    this.defaultBackoff = options.backoff ?? 1000
    this.defaultTimeout = options.jobTimeout ?? 30000
  }

  register(name: string, handler: JobHandler, opts?: { maxRetries?: number; backoff?: number; timeout?: number }): void {
    this.handlers.set(name, {
      handler,
      maxRetries: opts?.maxRetries ?? this.defaultMaxRetries,
      backoff: opts?.backoff ?? this.defaultBackoff,
      timeout: opts?.timeout ?? this.defaultTimeout,
    })
  }

  push(name: string, payload: unknown): void {
    const entry = this.handlers.get(name)
    if (!entry) throw new Error(`No handler registered for job: ${name}`)
    if (this.jobs.length >= this.maxSize) throw new Error(`Queue full (max ${this.maxSize})`)
    this.jobs.push({
      name,
      payload,
      handler: entry.handler,
      attempts: 0,
      maxRetries: entry.maxRetries,
      backoff: entry.backoff,
      timeout: entry.timeout,
    })
    this.emit('pending', { name, payload })
    this.process().catch(() => {})
  }

  private async process(): Promise<void> {
    if (this.stopped) return
    while (this.activeCount < this.defaultConcurrency && this.jobs.length > 0) {
      const job = this.jobs.shift()
      if (!job) break
      this.activeCount++
      this.executeJob(job).finally(() => {
        this.activeCount--
        this.process().catch(() => {})
      })
    }
  }

  private async executeJob(job: QueuedJob): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        job.handler(job.payload),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Job ${job.name} timed out after ${job.timeout}ms`)), job.timeout)
        }),
      ])
      this.emit('processed', {
        name: job.name,
        payload: job.payload,
        attempts: job.attempts + 1,
      } satisfies QueueJobResult)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      job.attempts++
      if (job.attempts <= job.maxRetries) {
        const delay = job.backoff * 2 ** (job.attempts - 1)
        this.emit('retry', {
          name: job.name,
          payload: job.payload,
          error,
          attempts: job.attempts,
          nextDelay: delay,
        })
        setTimeout(() => {
          this.jobs.push(job)
          this.process().catch(() => {})
        }, delay)
      } else {
        this.emit('failed', {
          name: job.name,
          payload: job.payload,
          error,
          attempts: job.attempts,
        } satisfies QueueJobResult)
      }
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  stop(): void {
    this.stopped = true
  }

  get length(): number {
    return this.jobs.length
  }

  get active(): number {
    return this.activeCount
  }
}
