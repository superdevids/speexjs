interface AnalyticsEvent {
  method: string
  path: string
  status: number
  duration: number
  timestamp: number
}

export class Analytics {
  private events: AnalyticsEvent[] = []
  private maxEvents = 10000

  record(event: AnalyticsEvent): void {
    this.events.push(event)
    if (this.events.length > this.maxEvents) this.events.shift()
  }

  getStats(): { total: number; avgDuration: number; topPaths: Record<string, number> } {
    const topPaths: Record<string, number> = {}
    let totalDuration = 0
    for (const e of this.events) {
      topPaths[e.path] = (topPaths[e.path] ?? 0) + 1
      totalDuration += e.duration
    }
    return { total: this.events.length, avgDuration: this.events.length ? totalDuration / this.events.length : 0, topPaths }
  }

  middleware() {
    const self = this
    return async (ctx: any, next: () => Promise<void>) => {
      const start = Date.now()
      await next()
      self.record({ method: ctx.request.method, path: ctx.request.path, status: ctx.response.statusCode, duration: Date.now() - start, timestamp: Date.now() })
    }
  }
}
