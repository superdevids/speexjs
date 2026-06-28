import { SessionGuard } from './session-guard.js'
import { TokenGuard } from './token-guard.js'
import { authMiddleware } from './middleware.js'
import type { Middleware } from '../middleware/index.js'

export type Guard = SessionGuard | TokenGuard

export class AuthManager {
  private guards = new Map<string, Guard>()
  private defaultGuardName = 'web'
  private loginPath: string | undefined = '/login'

  guard(name: string, guardInstance: Guard): this
  guard(name?: string): Guard
  guard(name?: string, guardInstance?: Guard): this | Guard {
    if (guardInstance !== undefined) {
      this.guards.set(name!, guardInstance)
      return this
    }

    const guardName = name ?? this.defaultGuardName
    const found = this.guards.get(guardName)
    if (found === undefined) {
      throw new Error(`Auth guard "${guardName}" not registered. Call authManager.guard("${guardName}", guard) first.`)
    }
    return found
  }

  defaultGuard(name: string): this {
    this.defaultGuardName = name
    return this
  }

  setLoginPath(path: string | undefined): this {
    this.loginPath = path
    return this
  }

  getLoginPath(): string | undefined {
    return this.loginPath
  }

  hasGuard(name: string): boolean {
    return this.guards.has(name)
  }

  removeGuard(name: string): this {
    this.guards.delete(name)
    return this
  }

  getGuardNames(): string[] {
    return Array.from(this.guards.keys())
  }
}

export function auth(guardName?: string): Middleware {
  return authMiddleware(guardName)
}

export { SessionGuard } from './session-guard.js'
export type { AuthUser, UserProvider, SessionGuardConfig } from './session-guard.js'
export { TokenGuard } from './token-guard.js'
export type { TokenProvider, TokenGuardConfig } from './token-guard.js'
export { authMiddleware, guestMiddleware } from './middleware.js'
