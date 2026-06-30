import { randomBytes } from 'node:crypto'
import { hashPassword } from '../../native/hashing.js'

interface TokenEntry {
  email: string
  expiresAt: number
}

export interface TokenStore {
  get(key: string): TokenEntry | undefined
  set(key: string, value: TokenEntry): void
  delete(key: string): void
}

class MapStore implements TokenStore {
  private store = new Map<string, TokenEntry>()
  get(key: string): TokenEntry | undefined {
    return this.store.get(key)
  }
  set(key: string, value: TokenEntry): void {
    this.store.set(key, value)
  }
  delete(key: string): void {
    this.store.delete(key)
  }
}

export class PasswordReset {
  private tokens: TokenStore

  constructor(store?: TokenStore) {
    this.tokens = store ?? new MapStore()
  }

  generateToken(email: string): string {
    const token = randomBytes(32).toString('hex')
    this.tokens.set(token, { email, expiresAt: Date.now() + 3600000 })
    return token
  }

  async reset(token: string, newPassword: string): Promise<string | null> {
    const entry = this.tokens.get(token)
    if (!entry || entry.expiresAt < Date.now()) {
      this.tokens.delete(token)
      return null
    }
    this.tokens.delete(token)
    const hashed = await hashPassword(newPassword)
    return hashed
  }
}
