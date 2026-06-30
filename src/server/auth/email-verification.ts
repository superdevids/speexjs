import { randomBytes } from 'node:crypto'

interface TokenEntry {
  email: string
  expiresAt: number
}

export interface TokenStore {
  get(key: string): TokenEntry | undefined
  set(key: string, value: TokenEntry): void
  delete(key: string): void
  [Symbol.iterator](): IterableIterator<[string, TokenEntry]>
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
  [Symbol.iterator](): IterableIterator<[string, TokenEntry]> {
    return this.store[Symbol.iterator]()
  }
}

export class EmailVerification {
  private tokens: TokenStore

  constructor(store?: TokenStore) {
    this.tokens = store ?? new MapStore()
  }

  generateToken(email: string): string {
    const token = randomBytes(32).toString('hex')
    this.tokens.set(token, { email, expiresAt: Date.now() + 3600000 })
    return token
  }

  verify(token: string): string | null {
    const entry = this.tokens.get(token)
    if (!entry || entry.expiresAt < Date.now()) {
      this.tokens.delete(token)
      return null
    }
    this.tokens.delete(token)
    return entry.email
  }

  isValid(email: string): boolean {
    for (const [, entry] of this.tokens) {
      if (entry.email === email && entry.expiresAt > Date.now()) return true
    }
    return false
  }
}
