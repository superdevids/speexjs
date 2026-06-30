import type { QueryRunner } from './types.js'

export type FactoryCallback<T = Record<string, unknown>> = (
  faker: Faker,
  index: number,
) => T

export class Factory<T = Record<string, unknown>> {
  private callback: FactoryCallback<T>
  private countValue = 1
  private connection: QueryRunner | null = null

  constructor(callback: FactoryCallback<T>) {
    this.callback = callback
  }

  count(n: number): this {
    this.countValue = n
    return this
  }

  setConnection(conn: QueryRunner): this {
    this.connection = conn
    return this
  }

  make(index?: number): T {
    const faker = new Faker()
    return this.callback(faker, index ?? 0)
  }

  async create(table: string): Promise<T[]> {
    if (!this.connection) throw new Error('Connection not set. Call setConnection() first.')
    const dialect = this.connection.getDialect()
    const results: T[] = []
    for (let i = 0; i < this.countValue; i++) {
      const data = this.make(i)
      const columns = Object.keys(data as Record<string, unknown>)
      const values = Object.values(data as Record<string, unknown>)
      const bindings: any[] = []
      const placeholders = values.map(v => { bindings.push(v); return '?' }).join(', ')
      const sql = `INSERT INTO ${dialect.wrapIdentifier(table)} (${columns.map(c => dialect.wrapIdentifier(c)).join(', ')}) VALUES (${placeholders})`
      await this.connection.raw(sql, bindings)
      results.push(data)
    }
    return results
  }
}

const FIRST_NAMES = ['John', 'Jane', 'Alex', 'Sarah', 'Mike', 'Emma', 'David', 'Lisa']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
const DOMAINS = ['example.com', 'test.com', 'mail.com', 'inbox.com']

export class Faker {
  private used = new Set<string>()

  name(): string {
    return `${this.pick(FIRST_NAMES)} ${this.pick(LAST_NAMES)}`
  }

  firstName(): string { return this.pick(FIRST_NAMES) }
  lastName(): string { return this.pick(LAST_NAMES) }

  email(): string {
    const name = `${this.firstName().toLowerCase()}.${this.lastName().toLowerCase()}`
    return `${name}@${this.pick(DOMAINS)}`
  }

  uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }

  number(min = 0, max = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  boolean(): boolean { return Math.random() > 0.5 }

  pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]! }

  unique(prefix = 'val'): string {
    let val: string
    do { val = `${prefix}_${this.number(1, 99999)}` } while (this.used.has(val))
    this.used.add(val)
    return val
  }
}
