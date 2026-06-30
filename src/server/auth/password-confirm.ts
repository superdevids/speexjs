import { verifyPassword } from '../../native/hashing.js'

export interface ConfirmationStore {
  get(key: string | number): number | undefined
  set(key: string | number, value: number): void
  delete(key: string | number): void
}

class MapStore implements ConfirmationStore {
  private store = new Map<string | number, number>()
  get(key: string | number): number | undefined {
    return this.store.get(key)
  }
  set(key: string | number, value: number): void {
    this.store.set(key, value)
  }
  delete(key: string | number): void {
    this.store.delete(key)
  }
}

export class PasswordConfirm {
  private confirmed: ConfirmationStore

  constructor(store?: ConfirmationStore) {
    this.confirmed = store ?? new MapStore()
  }

  async confirm(userId: string | number, password: string, hashedPassword: string): Promise<boolean> {
    const valid = await verifyPassword(password, hashedPassword)
    if (valid) this.confirmed.set(userId, Date.now() + 3600000)
    return valid
  }

  isRecentlyConfirmed(userId: string | number): boolean {
    const expiry = this.confirmed.get(userId)
    if (!expiry) return false
    if (expiry < Date.now()) {
      this.confirmed.delete(userId)
      return false
    }
    return true
  }

  reset(userId: string | number): void {
    this.confirmed.delete(userId)
  }
}
