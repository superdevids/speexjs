import type { Middleware } from './index.js'

export function withRecovery(fallback?: (err: Error, ctx: any) => void): Middleware {
  return async (ctx, next) => {
    try { await next() }
    catch (err: any) {
      if (fallback) fallback(err, ctx)
      else {
        ctx.response.status(500).json({
          error: 'INTERNAL_ERROR',
          message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        })
      }
    }
  }
}
