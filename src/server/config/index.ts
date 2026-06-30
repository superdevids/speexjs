export class Config {
  private store: Map<string, unknown> = new Map()

  constructor(initial?: Record<string, unknown>) {
    if (initial) {
      for (const [key, value] of Object.entries(initial)) {
        this.store.set(key, value)
      }
    }
  }

  set(key: string, value: unknown): this {
    this.store.set(key, value)
    return this
  }

  get<T = unknown>(key: string, defaultValue?: T): T {
    return (this.store.has(key) ? this.store.get(key) : defaultValue) as T
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  static fromEnv(prefix = 'APP_'): Config {
    const config = new Config()
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix) && value !== undefined) {
        config.set(key.slice(prefix.length).toLowerCase(), parseValue(value))
      }
    }
    return config
  }
}

function parseValue(value: string): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (value === 'undefined') return undefined
  const num = Number(value)
  if (!Number.isNaN(num) && value.trim() !== '') return num
  return value
}
