export class RouteRateLimiter {
  private limits = new Map<string, { max: number; window: number }>()

  limit(path: string, max: number, windowMs: number): void {
    this.limits.set(path, { max, window: windowMs })
  }

  getLimit(path: string): { max: number; window: number } | undefined {
    return this.limits.get(path)
  }
}
