import type { AuthUser } from '../auth/session-guard.js'
import type { Middleware } from '../middleware/index.js'
import { HttpStatus } from '../http/status.js'

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly ability: string,
  ) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export type GateCallback = (
  user: AuthUser,
  ...args: unknown[]
) => boolean | Promise<boolean>

export interface GatePolicy {
  [ability: string]: GateCallback
}

type BeforeCallback = (
  user: AuthUser,
  ability: string,
) => boolean | null | Promise<boolean | null>

type AfterCallback = (
  user: AuthUser,
  ability: string,
  result: boolean,
) => void | Promise<void>

export class Gate {
  private abilities = new Map<string, GateCallback>()
  private policies = new Map<string, GatePolicy>()
  private beforeCallbacks: BeforeCallback[] = []
  private afterCallbacks: AfterCallback[] = []

  define(ability: string, callback: GateCallback): this {
    this.abilities.set(ability, callback)
    return this
  }

  policy(resource: string, policy: GatePolicy): this {
    this.policies.set(resource, policy)
    return this
  }

  async allows(
    ability: string,
    user: AuthUser,
    ...args: unknown[]
  ): Promise<boolean> {
    for (const before of this.beforeCallbacks) {
      const result = await before(user, ability)
      if (result !== null) return result
    }

    let callback: GateCallback | undefined

    if (this.abilities.has(ability)) {
      callback = this.abilities.get(ability)
    } else {
      const dotIndex = ability.indexOf('.')
      if (dotIndex !== -1) {
        const resource = ability.slice(0, dotIndex)
        const action = ability.slice(dotIndex + 1)
        const policyObj = this.policies.get(resource)
        if (policyObj !== undefined && action in policyObj) {
          callback = policyObj[action]
        }
      }
    }

    if (callback === undefined) return false

    const result = await callback(user, ...args)

    for (const after of this.afterCallbacks) {
      await after(user, ability, result)
    }

    return result
  }

  async denies(
    ability: string,
    user: AuthUser,
    ...args: unknown[]
  ): Promise<boolean> {
    return !(await this.allows(ability, user, ...args))
  }

  async authorize(
    ability: string,
    user: AuthUser,
    ...args: unknown[]
  ): Promise<void> {
    const allowed = await this.allows(ability, user, ...args)
    if (!allowed) {
      throw new AuthorizationError(
        `User is not authorized to perform "${ability}"`,
        ability,
      )
    }
  }

  async any(
    abilities: string[],
    user: AuthUser,
    ...args: unknown[]
  ): Promise<boolean> {
    for (const ability of abilities) {
      if (await this.allows(ability, user, ...args)) return true
    }
    return false
  }

  async all(
    abilities: string[],
    user: AuthUser,
    ...args: unknown[]
  ): Promise<boolean> {
    for (const ability of abilities) {
      if (!(await this.allows(ability, user, ...args))) return false
    }
    return true
  }

  async abilitiesFor(user: AuthUser): Promise<string[]> {
    const result: string[] = []

    for (const ability of this.abilities.keys()) {
      if (await this.allows(ability, user)) {
        result.push(ability)
      }
    }

    for (const [, policy] of this.policies) {
      for (const action of Object.keys(policy)) {
        const ability = `${action}`
        if (!result.includes(ability) && (await this.allows(ability, user))) {
          result.push(ability)
        }
      }
    }

    return result
  }

  before(callback: BeforeCallback): this {
    this.beforeCallbacks.push(callback)
    return this
  }

  after(callback: AfterCallback): this {
    this.afterCallbacks.push(callback)
    return this
  }
}

export function authorize(
  ability: string,
  ...args: unknown[]
): Middleware {
  return (ctx, next) => {
    const user = (ctx as unknown as Record<string, unknown>)
      .user as AuthUser | undefined

    if (user === undefined) {
      ctx.response.status(HttpStatus.UNAUTHORIZED).json({
        error: 'Unauthenticated',
        message: 'Authentication is required to access this resource',
      })
      return
    }

    const gate = ctx.container.resolve('gate') as Gate

    return gate.authorize(ability, user, ...args).then(
      () => next(),
      (error: unknown) => {
        if (error instanceof AuthorizationError) {
          ctx.response.status(HttpStatus.FORBIDDEN).json({
            error: 'Forbidden',
            message: error.message,
          })
          return
        }
        throw error
      },
    )
  }
}
