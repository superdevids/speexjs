import { performance } from 'node:perf_hooks'
import type { SuperApp } from '../index.js'

export interface ProfilerResult {
  route: string
  method: string
  samples: number
  minMs: number
  maxMs: number
  avgMs: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  memoryDelta: number
}

export class RouteProfiler {
  constructor(private app: SuperApp) {}

  async profileAll(options: { samples?: number; warmup?: boolean } = {}): Promise<ProfilerResult[]> {
    const samples = options.samples ?? 50
    const warmup = options.warmup !== false
    const results: ProfilerResult[] = []
    const routes = (this.app.router as any).getRoutes?.() ?? []

    if (routes.length === 0) {
      console.log('  No routes found to profile.')
      return []
    }

    for (const route of routes) {
      const methods: string[] = route.methods ?? ['GET']
      for (const method of methods) {
        const path = route.path ?? '/'
        const concretePath = path.replace(/:([a-zA-Z_]+)/g, (_: string, name: string) => {
          const mocks: Record<string, string> = { id: '1', slug: 'test', uuid: '00000000-0000-0000-0000-000000000000' }
          return mocks[name] ?? '1'
        })
        if (warmup) {
          try {
            await this.invokeRoute(method, concretePath)
          } catch {
            /* warmup */
          }
        }
        const result = await this.profileRoute(method, concretePath, samples)
        results.push(result)
      }
    }
    return results
  }

  async profileRoute(method: string, path: string, samples = 50): Promise<ProfilerResult> {
    const timings: number[] = []
    let memBefore = 0
    let memAfter = 0

    for (let i = 0; i < samples; i++) {
      memBefore = process.memoryUsage().heapUsed
      const start = performance.now()
      try {
        await this.invokeRoute(method, path)
      } catch {
        /* ignore */
      }
      const elapsed = performance.now() - start
      memAfter = process.memoryUsage().heapUsed
      timings.push(elapsed)
    }

    timings.sort((a, b) => a - b)
    const total = timings.reduce((s, v) => s + v, 0)

    return {
      route: path,
      method,
      samples,
      minMs: timings[0] ?? 0,
      maxMs: timings[timings.length - 1] ?? 0,
      avgMs: Math.round((total / samples) * 100) / 100,
      p50Ms: this.percentile(timings, 50),
      p95Ms: this.percentile(timings, 95),
      p99Ms: this.percentile(timings, 99),
      memoryDelta: Math.round((memAfter - memBefore) / 1024),
    }
  }

  saveReport(results: ProfilerResult[], outputPath = 'profile-report.html'): void {
    const { writeFileSync } = require('node:fs')
    const html = this.generateHtmlReport(results)
    writeFileSync(outputPath, html, 'utf-8')
    console.log(`  Report saved: ${outputPath}`)
  }

  generateHtmlReport(results: ProfilerResult[]): string {
    const rows = results
      .map((r) => {
        const color = r.p95Ms > 500 ? '#ef4444' : r.p95Ms > 200 ? '#f59e0b' : '#22c55e'
        return `<tr><td>${r.method}</td><td>${r.route}</td><td style="color:${color}">${r.p50Ms.toFixed(1)}</td><td style="color:${color}">${r.p95Ms.toFixed(1)}</td><td>${r.p99Ms.toFixed(1)}</td><td>${r.avgMs.toFixed(1)}</td><td>${r.minMs.toFixed(1)}</td><td>${r.maxMs.toFixed(1)}</td><td>${r.samples}</td></tr>`
      })
      .join('\n')

    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>SpeexJS Profile Report</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;padding:2rem}h1{color:#60a5fa}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{padding:.75rem;text-align:left;border-bottom:1px solid #1e293b}th{color:#94a3b8;font-weight:600;font-size:.875rem;text-transform:uppercase;letter-spacing:.05em}td{font-family:'SF Mono',Monaco,monospace;font-size:.875rem}.fast{color:#22c55e}.medium{color:#f59e0b}.slow{color:#ef4444}.summary{margin:1rem 0;padding:1rem;background:#1e293b;border-radius:8px}p{color:#94a3b8}</style></head><body><h1>⚡ SpeexJS Profile Report</h1><p>Generated: ${new Date().toISOString()} | Routes: ${results.length}</p><table><thead><tr><th>Method</th><th>Route</th><th>p50</th><th>p95</th><th>p99</th><th>Avg</th><th>Min</th><th>Max</th><th>Samples</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
  }

  private async invokeRoute(method: string, path: string): Promise<void> {
    const route = this.app.router.resolve(method, path)
    if (!route) return
    const response: any = {
      _body: null,
      statusCode: 200,
      headersSent: false,
      status: function (c: number) {
        this.statusCode = c
        return this
      },
      json: function (d: any) {
        this._body = d
        return this
      },
      html: function (h: string) {
        this._body = h
        return this
      },
      send: function (s: string) {
        this._body = s
        return this
      },
      type: function () {
        return this
      },
      header: function () {
        return this
      },
      redirect: function () {
        return this
      },
      stream: async function () {},
      flush: async function () {},
      cookie: function () {
        return this
      },
    }
    await route.handler({
      request: { method, path, params: route.params, query: {}, headers: new Map(), body: async () => ({}), json: async () => ({}) },
      response,
      params: route.params,
      query: {},
      container: this.app.container,
    } as any)
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0
    const idx = Math.ceil((p / 100) * sorted.length) - 1
    return Math.round((sorted[Math.max(0, Math.min(idx, sorted.length - 1))] ?? 0) * 100) / 100
  }
}
