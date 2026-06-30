/**
 * SpeexJS Observability — Distributed Tracer
 * Lightweight distributed tracing using AsyncLocalStorage.
 */

import { randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { performance } from 'node:perf_hooks'

export interface TraceContext {
  traceId: string
  rootSpan: Span
  activeSpan: Span
}

export class Span {
  readonly traceId: string
  readonly spanId: string
  readonly parentSpanId: string | null
  readonly name: string
  readonly startTime: number
  endTime: number | null = null
  status: 'ok' | 'error' = 'ok'
  errorMessage: string | null = null

  constructor(name: string, traceId: string, parentSpanId: string | null = null) {
    this.name = name
    this.traceId = traceId
    this.spanId = randomUUID()
    this.parentSpanId = parentSpanId
    this.startTime = performance.now()
  }

  setError(message: string): this {
    this.status = 'error'
    this.errorMessage = message
    return this
  }

  finish(): this {
    this.endTime = performance.now()
    return this
  }

  get durationMs(): number {
    if (this.endTime === null) return 0
    return this.endTime - this.startTime
  }

  toJSON(): Record<string, unknown> {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      startTime: this.startTime,
      endTime: this.endTime,
      durationMs: this.durationMs,
      status: this.status,
      errorMessage: this.errorMessage,
    }
  }
}

export class Tracer {
  private storage = new AsyncLocalStorage<TraceContext>()
  private completedSpans: Span[] = []
  private maxCompleted = 1000

  async withTraceAsync<R>(name: string, fn: () => Promise<R>): Promise<R> {
    const traceId = randomUUID()
    const rootSpan = new Span(name, traceId)

    const ctx: TraceContext = { traceId, rootSpan, activeSpan: rootSpan }

    return this.storage.run(ctx, async () => {
      try {
        const result = await fn()
        rootSpan.finish()
        this.completeSpan(rootSpan)
        return result
      } catch (err: unknown) {
        rootSpan.setError(err instanceof Error ? err.message : String(err))
        rootSpan.finish()
        this.completeSpan(rootSpan)
        throw err
      }
    })
  }

  startSpan(name: string): Span {
    const ctx = this.storage.getStore()
    if (ctx === undefined) return new Span(name, 'no-trace')
    const span = new Span(name, ctx.traceId, ctx.activeSpan.spanId)
    ctx.activeSpan = span
    return span
  }

  endSpan(span: Span): void {
    span.finish()
    this.completeSpan(span)
    const ctx = this.storage.getStore()
    if (ctx !== undefined && ctx.activeSpan === span) {
      ctx.activeSpan = ctx.rootSpan
    }
  }

  getTraceId(): string | undefined {
    return this.storage.getStore()?.traceId
  }

  getActiveSpan(): Span | undefined {
    return this.storage.getStore()?.activeSpan
  }

  getCompletedSpans(): Span[] {
    return [...this.completedSpans]
  }

  clearCompletedSpans(): void {
    this.completedSpans = []
  }

  private completeSpan(span: Span): void {
    this.completedSpans.push(span)
    if (this.completedSpans.length > this.maxCompleted) {
      this.completedSpans.splice(0, this.completedSpans.length - this.maxCompleted)
    }
  }
}
