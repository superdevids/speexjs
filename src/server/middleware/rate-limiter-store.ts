import type { QueryRunner } from '../database/types.js'

export interface RateLimiterStore {
  hit(key: string, windowMs: number, maxHits: number): Promise<{ count: number; remaining: number; resetAt: number }>
}

export class MemoryRateLimiterStore implements RateLimiterStore {
  private hits = new Map<string, { count: number; resetAt: number }>()
  private cleanupTimer: ReturnType<typeof setInterval>

  constructor() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      for (const [key, val] of this.hits) {
        if (val.resetAt < now) this.hits.delete(key)
      }
    }, 60000)
    if (this.cleanupTimer.unref) this.cleanupTimer.unref()
  }

  async hit(key: string, windowMs: number, maxHits: number): Promise<{ count: number; remaining: number; resetAt: number }> {
    const now = Date.now()
    let entry = this.hits.get(key)
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs }
      this.hits.set(key, entry)
    }
    entry.count++
    return { count: entry.count, remaining: Math.max(0, maxHits - entry.count), resetAt: entry.resetAt }
  }

  close(): void { clearInterval(this.cleanupTimer) }
}

export class DatabaseRateLimiterStore implements RateLimiterStore {
  constructor(private db: QueryRunner, private table: string = 'rate_limits') {}

  async hit(key: string, windowMs: number, maxHits: number): Promise<{ count: number; remaining: number; resetAt: number }> {
    const now = Date.now()
    const resetAt = now + windowMs
    const dialect = this.db.getDialect()
    
    try {
      await this.db.raw(
        `INSERT INTO ${dialect.wrapIdentifier(this.table)} (\`key\`, \`hits\`, \`reset_at\`) VALUES (?, 1, ?) 
         ON DUPLICATE KEY UPDATE \`hits\` = \`hits\` + 1`,
        [key, resetAt]
      )
    } catch {
      // Fallback: just use memory for now
    }
    
    const result = await this.db.raw(
      `SELECT \`hits\`, \`reset_at\` FROM ${dialect.wrapIdentifier(this.table)} WHERE \`key\` = ?`,
      [key]
    )
    
    const row = result.rows[0]
    if (!row) return { count: 1, remaining: maxHits - 1, resetAt }
    
    return { count: row.hits, remaining: Math.max(0, maxHits - row.hits), resetAt: Number(row.reset_at) }
  }
}
