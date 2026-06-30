/**
 * SpeexJS Observability — Setup & Barrel Export
 * Wires together metrics, tracing, and N+1 detection.
 */

import type { SuperApp } from '../index.js'
import type { RouteContext } from '../router/index.js'
import { DatabaseConnection } from '../database/connection.js'
import { MetricsStore } from './metrics.js'
import { Tracer } from './tracer.js'
import { NPlusOneDetector, normalizeSQL } from './n-plus-one.js'

export { MetricsStore } from './metrics.js'
export type { MetricLabels } from './metrics.js'
export { Tracer } from './tracer.js'
export { NPlusOneDetector, normalizeSQL } from './n-plus-one.js'
export type { NPlusOneCandidate, NPlusOneConfig } from './n-plus-one.js'

let store: MetricsStore | null = null
let tracer: Tracer | null = null
let nPlusOneDetector: NPlusOneDetector | null = null
let observabilityEnabled = false
let systemMetricsTimer: ReturnType<typeof setInterval> | null = null
let metricsUpdateInterval: ReturnType<typeof setInterval> | null = null

function startSystemMetricsCollection(): void {
  if (systemMetricsTimer !== null || store === null) return

  const memRssGauge = store.gauge('process_memory_rss_bytes', 'Resident set size in bytes')
  const memHeapTotalGauge = store.gauge('process_memory_heap_total_bytes', 'Total heap memory in bytes')
  const memHeapUsedGauge = store.gauge('process_memory_heap_used_bytes', 'Used heap memory in bytes')

  systemMetricsTimer = setInterval(() => {
    if (store === null) return
    const mem = process.memoryUsage()
    memRssGauge.set(mem.rss)
    memHeapTotalGauge.set(mem.heapTotal)
    memHeapUsedGauge.set(mem.heapUsed)
  }, 10000)

  if (systemMetricsTimer && typeof systemMetricsTimer.unref === 'function') {
    systemMetricsTimer.unref()
  }
}

function stopSystemMetricsCollection(): void {
  if (systemMetricsTimer !== null) {
    clearInterval(systemMetricsTimer)
    systemMetricsTimer = null
  }
}

function updatePercentileGauges(): void {
  if (store === null) return

  const httpDur = store.getHistogram('http_request_duration_seconds')
  if (httpDur !== undefined) {
    store.gauge('http_request_duration_p50_seconds', 'HTTP request duration p50 in seconds').set(httpDur.p50() / 1000)
    store.gauge('http_request_duration_p95_seconds', 'HTTP request duration p95 in seconds').set(httpDur.p95() / 1000)
    store.gauge('http_request_duration_p99_seconds', 'HTTP request duration p99 in seconds').set(httpDur.p99() / 1000)
  }

  const dbDur = store.getHistogram('db_query_duration_milliseconds')
  if (dbDur !== undefined) {
    store.gauge('db_query_duration_p50_milliseconds', 'Database query duration p50 in ms').set(dbDur.p50())
    store.gauge('db_query_duration_p95_milliseconds', 'Database query duration p95 in ms').set(dbDur.p95())
    store.gauge('db_query_duration_p99_milliseconds', 'Database query duration p99 in ms').set(dbDur.p99())
  }
}

function updateNPlusOneGauges(): void {
  if (store === null || nPlusOneDetector === null) return
  const candidates = nPlusOneDetector.getCandidates()
  store.gauge('n_plus_one_detections_total', 'Number of detected N+1 query patterns').set(candidates.length)
}

function createHttpMetricsMiddleware(): (ctx: RouteContext, next: () => Promise<void>) => Promise<void> {
  if (store === null || tracer === null) {
    return async (_ctx: RouteContext, next: () => Promise<void>) => next()
  }

  const reqCounter = store.counter('http_requests_total', 'Total number of HTTP requests')
  const errCounter = store.counter('http_errors_total', 'Total number of HTTP errors (status >= 400)')
  const durationHistogram = store.histogram('http_request_duration_seconds', 'HTTP request duration in seconds')
  const activeGauge = store.gauge('http_requests_active', 'Number of currently active HTTP requests')

  return async (ctx: RouteContext, next: () => Promise<void>) => {
    if (!observabilityEnabled) return next()

    const method = ctx.request.method
    const path = ctx.request.path
    activeGauge.inc()

    if (tracer !== null) {
      await tracer.withTraceAsync(`HTTP ${method} ${path}`, async () => {
        const start = performance.now()
        try {
          await next()
        } catch (err: unknown) {
          const duration = performance.now() - start
          reqCounter.inc()
          errCounter.inc()
          durationHistogram.observe(duration)
          throw err
        }

        const duration = performance.now() - start
        const status = ctx.response.statusCode
        reqCounter.inc()
        if (status >= 400) errCounter.inc()
        durationHistogram.observe(duration)
      })
    } else {
      const start = performance.now()
      try {
        await next()
      } catch (err: unknown) {
        const duration = performance.now() - start
        reqCounter.inc()
        errCounter.inc()
        durationHistogram.observe(duration)
        throw err
      }
      const duration = performance.now() - start
      const status = ctx.response.statusCode
      reqCounter.inc()
      if (status >= 400) errCounter.inc()
      durationHistogram.observe(duration)
    }

    activeGauge.dec()
  }
}

function instrumentDatabase(): void {
  if (store === null || nPlusOneDetector === null) return

  const queryCounter = store.counter('db_queries_total', 'Total number of database queries')
  const slowCounter = store.counter('db_slow_queries_total', 'Total number of slow database queries (>100ms)')
  const durationHistogram = store.histogram('db_query_duration_milliseconds', 'Database query duration in milliseconds')

  const nPlusOneRef = nPlusOneDetector

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalPatchedRaw: any = DatabaseConnection.prototype.raw

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DatabaseConnection.prototype.raw = async function (this: any, sql: string, bindings?: unknown[]) {
    if (!observabilityEnabled) return originalPatchedRaw.call(this, sql, bindings)

    const start = performance.now()
    try {
      return await originalPatchedRaw.call(this, sql, bindings)
    } finally {
      const duration = performance.now() - start
      queryCounter.inc()
      durationHistogram.observe(duration)
      if (duration > 100) slowCounter.inc()

      const normalized = normalizeSQL(sql)
      nPlusOneRef.recordQuery(sql, normalized, duration)
    }
  }
}

export function setupObservability(app: SuperApp): void {
  if (observabilityEnabled) return
  observabilityEnabled = true

  store = new MetricsStore()
  tracer = new Tracer()
  nPlusOneDetector = new NPlusOneDetector({ threshold: 3 })

  // 1. Register Prometheus metrics endpoint
  app.router.get('/_speex/metrics', async (ctx) => {
    if (store === null) {
      ctx.response.status(503).send('Observability not initialized\n')
      return
    }
    updatePercentileGauges()
    updateNPlusOneGauges()
    const output = store.prometheusFormatted()
    ctx.response.type('text/plain; charset=utf-8').send(output)
  })

  // 2. Add HTTP metrics middleware
  const httpMiddleware = createHttpMetricsMiddleware()
  app.use(httpMiddleware)

  // 3. Instrument database queries
  instrumentDatabase()

  // 4. Start system metrics collection
  startSystemMetricsCollection()

  // 5. Periodic metric updates
  metricsUpdateInterval = setInterval(() => {
    if (store === null) return
    updatePercentileGauges()
    updateNPlusOneGauges()
  }, 15000)

  if (metricsUpdateInterval && typeof metricsUpdateInterval.unref === 'function') {
    metricsUpdateInterval.unref()
  }

  // 6. Cleanup on shutdown
  app.onShutdown(() => {
    stopSystemMetricsCollection()
    if (metricsUpdateInterval !== null) {
      clearInterval(metricsUpdateInterval)
      metricsUpdateInterval = null
    }
    if (nPlusOneDetector !== null) nPlusOneDetector.clear()
    if (store !== null) store.resetAll()
    observabilityEnabled = false
  })
}

export function isObservabilityEnabled(): boolean {
  return observabilityEnabled
}

export function getMetricsStore(): MetricsStore | null {
  return store
}

export function getTracer(): Tracer | null {
  return tracer
}

export function getNPlusOneDetector(): NPlusOneDetector | null {
  return nPlusOneDetector
}

export function disableObservability(): void {
  stopSystemMetricsCollection()
  if (metricsUpdateInterval !== null) {
    clearInterval(metricsUpdateInterval)
    metricsUpdateInterval = null
  }
  if (nPlusOneDetector !== null) nPlusOneDetector.clear()
  if (store !== null) store.resetAll()
  store = null
  tracer = null
  nPlusOneDetector = null
  observabilityEnabled = false
}
