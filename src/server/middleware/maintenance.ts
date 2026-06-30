import type { Middleware } from './index.js'

let isDown = false
let retrySeconds = 60
let customPage: string | null = null

export function enableMaintenanceMode(retryAfter = 60): void {
  isDown = true
  retrySeconds = retryAfter
}

export function disableMaintenanceMode(): void {
  isDown = false
}

export function isInMaintenanceMode(): boolean {
  return isDown
}

export function setMaintenancePage(html: string): void { customPage = html }

export function maintenance(): Middleware {
  return (ctx, next) => {
    if (isDown) {
      ctx.response.status(503).header('retry-after', String(retrySeconds))
      if (customPage) { ctx.response.html(customPage); return }
      ctx.response.json({
        error: 'SERVICE_UNAVAILABLE', message: 'Application is in maintenance mode.'
      })
      return
    }
    return next()
  }
}
