export class ModelCache {
  private store = new Map<string, { data: any; expiry: number }>()
  private ttl: number

  constructor(ttlSeconds = 300) { this.ttl = ttlSeconds * 1000 }

  get(key: string): any | null {
    const entry = this.store.get(key)
    if (!entry || entry.expiry < Date.now()) { this.store.delete(key); return null }
    return entry.data
  }

  set(key: string, data: any): void { this.store.set(key, { data, expiry: Date.now() + this.ttl }) }
  flush(): void { this.store.clear() }
  forget(key: string): void { this.store.delete(key) }
}
