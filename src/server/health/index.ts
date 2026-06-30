import type { QueryRunner } from '../database/types.js'

export class HealthCheck {
  private db: QueryRunner | null = null

  setDb(db: QueryRunner): void { this.db = db }

  async check(): Promise<Record<string, any>> {
    const result: Record<string, any> = { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() }
    if (this.db) {
      try {
        await this.db.raw('SELECT 1')
        result.database = 'connected'
      } catch { result.database = 'disconnected'; result.status = 'degraded' }
    }
    return result
  }
}
