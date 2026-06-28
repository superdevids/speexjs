import type { Middleware } from '../middleware/index.js'
import { HttpStatus } from '../http/status.js'
import type { AuthManager } from './index.js'
import { SessionGuard } from './session-guard.js'
import { TokenGuard } from './token-guard.js'

export function authMiddleware(guardName?: string): Middleware {
  return async (ctx, next) => {
    const authManager = ctx.container.resolve('auth') as AuthManager
    const guard = authManager.guard(guardName)

    let user = null

    if (guard instanceof SessionGuard) {
      guard.setContext(ctx.request, ctx.response)
      user = await guard.user()
    } else if (guard instanceof TokenGuard) {
      const token = ctx.request.bearerToken()
      if (token !== undefined) {
        user = await guard.user(token)
      }
    }

    if (user === null) {
      const ctxAny = ctx as unknown as Record<string, unknown>
      ctxAny.user = null

      if (ctx.request.wantsJson()) {
        ctx.response.status(HttpStatus.UNAUTHORIZED).json({
          error: 'Unauthenticated',
          message: 'Authentication is required to access this resource',
        })
        return
      }

      if (authManager.getLoginPath() !== undefined) {
        ctx.response.redirect(authManager.getLoginPath()!, HttpStatus.FOUND)
        return
      }

      ctx.response.status(HttpStatus.UNAUTHORIZED).json({
        error: 'Unauthenticated',
        message: 'Authentication is required to access this resource',
      })
      return
    }

    const ctxAny = ctx as unknown as Record<string, unknown>
    ctxAny.user = user
    ctxAny.auth = guard

    await next()
  }
}

export function guestMiddleware(): Middleware {
  return async (ctx, next) => {
    const authManager = ctx.container.resolve('auth') as AuthManager
    const guard = authManager.guard()

    let user = null

    if (guard instanceof SessionGuard) {
      guard.setContext(ctx.request, ctx.response)
      user = await guard.user()
    }

    if (user !== null) {
      if (ctx.request.wantsJson()) {
        ctx.response.status(HttpStatus.FORBIDDEN).json({
          error: 'Forbidden',
          message: 'Already authenticated',
        })
        return
      }

      ctx.response.redirect('/', HttpStatus.FOUND)
      return
    }

    await next()
  }
}
