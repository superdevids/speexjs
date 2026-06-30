import type { Middleware } from '../middleware/index.js'
import type { CheckOptions } from './types.js'
import { hasPermission, hasRole } from './core.js'

export interface RBACProvider {
  getUserPermissions(ctx: any): string[]
  getUserRoles(ctx: any): string[]
}

let provider: RBACProvider = {
  getUserPermissions: () => [],
  getUserRoles: () => [],
}

export function setRBACProvider(p: RBACProvider): void {
  provider = p
}

export function requirePermission(permission: string | string[], options?: CheckOptions): Middleware {
  return (ctx, next) => {
    const perms = provider.getUserPermissions(ctx)
    if (!hasPermission(perms, permission, options)) {
      ctx.response.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      })
      return
    }
    return next()
  }
}

export function requireRole(role: string | string[], options?: CheckOptions): Middleware {
  return (ctx, next) => {
    const roles = provider.getUserRoles(ctx)
    if (!hasRole(roles, role, options)) {
      ctx.response.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have the required role to access this resource',
      })
      return
    }
    return next()
  }
}

export function requireAuth(): Middleware {
  return (ctx, next) => {
    const perms = provider.getUserPermissions(ctx)
    if (perms.length === 0) {
      ctx.response.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication is required',
      })
      return
    }
    return next()
  }
}
