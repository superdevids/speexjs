import type { QueryRunner } from '../database/types.js'

export interface SessionStore {
  read(id: string): Promise<Record<string, unknown> | null>
  write(id: string, data: Record<string, unknown>, expiresAt: number): Promise<void>
  destroy(id: string): Promise<void>
  cleanup(): Promise<void>
}

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, { data: Record<string, unknown>; expiresAt: number }>()

  async read(id: string): Promise<Record<string, unknown> | null> {
    const entry = this.sessions.get(id)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      this.sessions.delete(id)
      return null
    }
    return entry.data
  }

  async write(id: string, data: Record<string, unknown>, expiresAt: number): Promise<void> {
    this.sessions.set(id, { data, expiresAt })
  }

  async destroy(id: string): Promise<void> {
    this.sessions.delete(id)
  }

  async cleanup(): Promise<void> {
    const now = Date.now()
    for (const [id, entry] of this.sessions) {
      if (entry.expiresAt < now) this.sessions.delete(id)
    }
  }
}

export class DatabaseSessionStore implements SessionStore {
  constructor(
    private db: QueryRunner,
    private table: string = 'sessions',
  ) {}

  async read(id: string): Promise<Record<string, unknown> | null> {
    const dialect = this.db.getDialect()
    const result = await this.db.raw(
      `SELECT * FROM ${dialect.wrapIdentifier(this.table)} WHERE ${dialect.wrapIdentifier('id')} = ? AND ${dialect.wrapIdentifier('expires_at')} > ?`,
      [id, Date.now()],
    )
    const row = result.rows[0]
    if (!row) return null
    return typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  }

  async write(id: string, data: Record<string, unknown>, expiresAt: number): Promise<void> {
    const dialect = this.db.getDialect()
    const json = JSON.stringify(data)
    await this.db.raw(
      `REPLACE INTO ${dialect.wrapIdentifier(this.table)} (${dialect.wrapIdentifier('id')}, ${dialect.wrapIdentifier('data')}, ${dialect.wrapIdentifier('expires_at')}) VALUES (?, ?, ?)`,
      [id, json, expiresAt],
    )
  }

  async destroy(id: string): Promise<void> {
    const dialect = this.db.getDialect()
    await this.db.raw(`DELETE FROM ${dialect.wrapIdentifier(this.table)} WHERE ${dialect.wrapIdentifier('id')} = ?`, [id])
  }

  async cleanup(): Promise<void> {
    const dialect = this.db.getDialect()
    await this.db.raw(`DELETE FROM ${dialect.wrapIdentifier(this.table)} WHERE ${dialect.wrapIdentifier('expires_at')} < ?`, [Date.now()])
  }
}
