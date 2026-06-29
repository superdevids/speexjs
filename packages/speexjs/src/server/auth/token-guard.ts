import { createHmac } from 'node:crypto'
import type { AuthUser } from './session-guard.js'
import { randomHex } from '../../native/crypto.js'

export interface TokenProvider {
  create(
    userId: string | number,
    tokenHash: string,
    name?: string,
    abilities?: string[],
  ): Promise<void>
  find(
    tokenHash: string,
  ): Promise<{
    userId: string | number
    abilities: string[]
  } | null>
  delete(tokenHash: string): Promise<void>
  deleteAllForUser(userId: string | number): Promise<void>
}

export interface UserLookup {
  findById(id: string | number): Promise<AuthUser | null>
}

export interface TokenGuardConfig {
  table?: string
  tokenLength?: number
  hashTokens?: boolean
  tokenName?: string
  provider?: TokenProvider
  userLookup?: UserLookup
  secret?: string
}

interface TokenRecord {
  userId: string | number
  abilities: string[]
}

export class TokenGuard {
  private config: Required<
    Omit<TokenGuardConfig, 'provider' | 'userLookup' | 'secret'>
  > & { provider: TokenProvider | undefined; userLookup: UserLookup | undefined; secret?: string }

  constructor(config?: TokenGuardConfig) {
    this.config = {
      table: 'personal_access_tokens',
      tokenLength: 64,
      hashTokens: true,
      tokenName: 'api-token',
      provider: undefined,
      userLookup: undefined,
      secret: undefined,
      ...config,
    }
  }

  async createToken(
    userId: string | number,
    name?: string,
    abilities?: string[],
  ): Promise<string> {
    if (this.config.provider === undefined) {
      throw new Error(
        'TokenProvider is required to create tokens. Configure a provider in TokenGuardConfig.',
      )
    }

    const plaintext = randomHex(this.config.tokenLength)
    const tokenHash = this.config.hashTokens
      ? this.hashToken(plaintext)
      : plaintext
    await this.config.provider.create(
      userId,
      tokenHash,
      name ?? this.config.tokenName,
      abilities,
    )
    return plaintext
  }

  private hashToken(plaintext: string): string {
    const secret = this.config.secret ?? process.env.APP_KEY
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('TokenGuard requires a secret in production')
    }
    const key = secret ?? 'speexjs-dev-token'
    const hmac = createHmac('sha256', key)
    hmac.update(plaintext)
    return hmac.digest('hex')
  }

  async user(token: string): Promise<AuthUser | null> {
    const record = await this.findTokenRecord(token)
    if (record === null) return null

    if (this.config.userLookup !== undefined) {
      return this.config.userLookup.findById(record.userId)
    }

    return { id: record.userId }
  }

  async validate(token: string): Promise<boolean> {
    const record = await this.findTokenRecord(token)
    return record !== null
  }

  async abilities(token: string): Promise<string[]> {
    const record = await this.findTokenRecord(token)
    if (record === null) return []
    return record.abilities
  }

  async can(token: string, ability: string): Promise<boolean> {
    const record = await this.findTokenRecord(token)
    if (record === null) return false
    if (record.abilities.length === 0) return true
    return record.abilities.includes(ability)
  }

  async revokeToken(token: string): Promise<void> {
    if (this.config.provider === undefined) return
    const tokenHash = this.config.hashTokens ? this.hashToken(token) : token
    await this.config.provider.delete(tokenHash)
  }

  async revokeAllTokens(userId: string | number): Promise<void> {
    if (this.config.provider === undefined) return
    await this.config.provider.deleteAllForUser(userId)
  }

  private async findTokenRecord(
    token: string,
  ): Promise<TokenRecord | null> {
    if (this.config.provider === undefined) return null
    const tokenHash = this.config.hashTokens ? this.hashToken(token) : token
    return this.config.provider.find(tokenHash)
  }
}
