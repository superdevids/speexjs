import { createHmac, randomBytes } from 'node:crypto'

interface TokenEntry {
  userId: string
  abilities: string[]
  expiresAt: number
}

interface CsrfEntry {
  createdAt: number
}

export class Sanctum {
  private tokens = new Map<string, TokenEntry>()
  private csrfTokens = new Map<string, CsrfEntry>()
  private hmacKey: string
  private defaultTtl: number

  constructor(hmacKey?: string, defaultTtlMs?: number) {
    const key = hmacKey ?? process.env.APP_KEY
    if (!key) {
      throw new Error('Sanctum requires APP_KEY environment variable or hmacKey parameter')
    }
    this.hmacKey = key
    this.defaultTtl = defaultTtlMs ?? 86400000
  }

  private hash(token: string): string {
    const hmac = createHmac('sha256', this.hmacKey)
    hmac.update(token)
    return hmac.digest('hex')
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [hash, entry] of this.tokens) {
      if (entry.expiresAt < now) this.tokens.delete(hash)
    }
  }

  generateCsrfToken(): string {
    this.cleanup()
    const token = randomBytes(32).toString('hex')
    this.csrfTokens.set(token, { createdAt: Date.now() })
    return token
  }

  createToken(userId: string, abilities: string[] = ['*'], ttlMs?: number): string {
    this.cleanup()
    const token = `spx_${randomBytes(40).toString('hex')}`
    const hash = this.hash(token)
    this.tokens.set(hash, { userId, abilities, expiresAt: Date.now() + (ttlMs ?? this.defaultTtl) })
    return token
  }

  verifyToken(token: string): { userId: string; abilities: string[] } | null {
    this.cleanup()
    const hash = this.hash(token)
    const record = this.tokens.get(hash)
    if (record === undefined) return null
    return record
  }

  revokeToken(token: string): void {
    const hash = this.hash(token)
    this.tokens.delete(hash)
  }

  refreshToken(oldToken: string, ttlMs?: number): string | null {
    this.cleanup()
    const hash = this.hash(oldToken)
    const record = this.tokens.get(hash)
    if (!record) return null
    this.tokens.delete(hash)
    const newToken = `spx_${randomBytes(40).toString('hex')}`
    const newHash = this.hash(newToken)
    this.tokens.set(newHash, { ...record, expiresAt: Date.now() + (ttlMs ?? this.defaultTtl) })
    return newToken
  }

  can(token: string, ability: string): boolean {
    const hash = this.hash(token)
    const record = this.tokens.get(hash)
    if (!record) return false
    if (record.abilities.includes('*')) return true
    return record.abilities.includes(ability)
  }
}
