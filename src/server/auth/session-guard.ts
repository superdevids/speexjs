import type { SuperRequest } from '../http/request.js'
import type { SuperResponse } from '../http/response.js'
import { verifyPassword } from '../../native/hashing.js'
import { encrypt, decrypt } from '../../native/crypto.js'

export interface AuthUser {
  id: string | number
  [key: string]: unknown
}

export interface UserProvider {
  findById(id: string | number): Promise<AuthUser | null>
  findByCredential(field: string, value: string): Promise<AuthUser | null>
}

export interface SessionGuardConfig {
  cookieName?: string
  lifetime?: number
  table?: string
  identifier?: string
  password?: string
  provider?: UserProvider
  encryptionKey?: string
}

interface SessionPayload {
  userId: string | number
  user?: AuthUser
  data: Record<string, unknown>
  expiresAt: number
}

export class SessionGuard {
  private config: Required<Omit<SessionGuardConfig, 'provider' | 'encryptionKey'>> & {
    provider: UserProvider | undefined
    encryptionKey: string
  }
  private req: SuperRequest | null = null
  private res: SuperResponse | null = null
  private cachedPayload: SessionPayload | null = null

  constructor(config?: SessionGuardConfig) {
    this.config = {
      cookieName: 'speexjs_session',
      lifetime: 120,
      table: 'users',
      identifier: 'email',
      password: 'password',
      provider: undefined,
      encryptionKey:
        config?.encryptionKey ??
        process.env.APP_KEY ??
        (() => {
          throw new Error('APP_KEY must be set in production. Add APP_KEY to your .env file.')
        })(),
      ...config,
    }
  }

  setContext(req: SuperRequest, res: SuperResponse): this {
    this.req = req
    this.res = res
    this.cachedPayload = null
    return this
  }

  async attempt(credentials: { email: string; password: string }, remember?: boolean): Promise<boolean> {
    if (this.config.provider === undefined) return false

    const identifierValue = credentials[this.config.identifier as keyof typeof credentials]
    if (identifierValue === undefined || typeof identifierValue !== 'string') {
      return false
    }

    const user = await this.config.provider.findByCredential(this.config.identifier, identifierValue)
    if (user === null) return false

    const hash = user[this.config.password]
    if (typeof hash !== 'string') return false

    if (!verifyPassword(credentials.password, hash)) return false

    this.createSession(user, remember)
    return true
  }

  async login(userId: string | number, remember?: boolean): Promise<void> {
    if (this.config.provider !== undefined) {
      const user = await this.config.provider.findById(userId)
      if (user !== null) {
        this.createSession(user, remember)
        return
      }
    }

    if (this.config.provider === undefined) {
      console.warn('[SessionGuard] login() called without a provider configured. Session will not be persisted against a user database.')
    }

    const payload: SessionPayload = {
      userId,
      data: {},
      expiresAt: this.calculateExpiry(remember),
    }
    this.writeSessionCookie(payload)
  }

  async loginUser(user: AuthUser): Promise<void> {
    const payload: SessionPayload = {
      userId: user.id,
      user,
      data: {},
      expiresAt: this.calculateExpiry(false),
    }
    this.writeSessionCookie(payload)
  }

  async logout(): Promise<void> {
    if (this.res !== null) {
      this.res.clearCookie(this.config.cookieName, { path: '/' })
    }
    this.cachedPayload = null
  }

  async user(): Promise<AuthUser | null> {
    const payload = this.readSession()
    if (payload === null) return null

    if (payload.user !== undefined) return payload.user

    if (this.config.provider !== undefined) {
      const user = await this.config.provider.findById(payload.userId)
      if (user !== null) return user
    }

    return { id: payload.userId }
  }

  async check(): Promise<boolean> {
    return this.readSession() !== null
  }

  async guest(): Promise<boolean> {
    return !(await this.check())
  }

  async id(): Promise<string | number | null> {
    const payload = this.readSession()
    return payload?.userId ?? null
  }

  async set(key: string, value: unknown): Promise<void> {
    const payload = this.readSession()
    if (payload === null) return
    payload.data[key] = value
    this.writeSessionCookie(payload)
  }

  async get(key: string): Promise<unknown> {
    const payload = this.readSession()
    if (payload === null) return undefined
    return payload.data[key]
  }

  private createSession(user: AuthUser, remember?: boolean): void {
    const payload: SessionPayload = {
      userId: user.id,
      user,
      data: {},
      expiresAt: this.calculateExpiry(remember),
    }
    this.writeSessionCookie(payload)
  }

  private readSession(): SessionPayload | null {
    if (this.cachedPayload !== null) {
      if (this.cachedPayload.expiresAt > Date.now()) {
        return this.cachedPayload
      }
      this.cachedPayload = null
      return null
    }

    if (this.req === null) return null

    const cookieValue = this.req.cookie(this.config.cookieName)
    if (cookieValue === undefined) return null

    try {
      const decrypted = this.decryptSession(cookieValue)
      const payload = JSON.parse(decrypted) as SessionPayload
      if (payload.expiresAt <= Date.now()) return null
      this.cachedPayload = payload
      return payload
    } catch {
      return null
    }
  }

  private writeSessionCookie(payload: SessionPayload): void {
    if (this.res === null) return
    this.cachedPayload = payload
    const serialized = JSON.stringify(payload)
    const encrypted = this.encryptSession(serialized)
    const maxAge = Math.max(1, Math.floor((payload.expiresAt - Date.now()) / 1000))
    this.res.cookie(this.config.cookieName, encrypted, {
      maxAge,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  private calculateExpiry(remember?: boolean): number {
    const lifetimeMs = this.config.lifetime * 60 * 1000
    if (remember) {
      const maxRemember = 5 * 365 * 24 * 60 * 60 * 1000
      return Date.now() + Math.max(lifetimeMs, maxRemember)
    }
    return Date.now() + lifetimeMs
  }

  private encryptSession(data: string): string {
    const result = encrypt(data, this.config.encryptionKey)
    return JSON.stringify(result)
  }

  private decryptSession(cookie: string): string {
    const parsed = JSON.parse(cookie)
    return decrypt(parsed, this.config.encryptionKey)
  }
}
