import { createHmac, randomBytes } from 'node:crypto'

export class Sanctum {
  private tokens = new Map<string, { userId: string; abilities: string[] }>()
  private csrfTokens = new Map<string, string>()
  private hmacKey: string

  constructor(hmacKey?: string) {
    const key = hmacKey ?? process.env.APP_KEY
    if (!key && process.env.NODE_ENV === 'production') {
      throw new Error('Sanctum requires APP_KEY environment variable in production')
    }
    this.hmacKey = key ?? 'sanctum-dev'
  }

  private hash(token: string): string {
    const hmac = createHmac('sha256', this.hmacKey)
    hmac.update(token)
    return hmac.digest('hex')
  }

  generateCsrfToken(): string {
    const token = randomBytes(32).toString('hex')
    this.csrfTokens.set(token, Date.now().toString())
    return token
  }

  createToken(userId: string, abilities: string[] = ['*']): string {
    const token = `spx_${randomBytes(40).toString('hex')}`
    const hash = this.hash(token)
    this.tokens.set(hash, { userId, abilities })
    return token
  }

  verifyToken(token: string): { userId: string; abilities: string[] } | null {
    const hash = this.hash(token)
    const record = this.tokens.get(hash)
    if (record === undefined) return null
    return record
  }

  revokeToken(token: string): void {
    const hash = this.hash(token)
    this.tokens.delete(hash)
  }

  refreshToken(oldToken: string): string | null {
    const hash = this.hash(oldToken)
    const record = this.tokens.get(hash)
    if (!record) return null
    this.tokens.delete(hash)
    const newToken = `spx_${randomBytes(40).toString('hex')}`
    const newHash = this.hash(newToken)
    this.tokens.set(newHash, record)
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
