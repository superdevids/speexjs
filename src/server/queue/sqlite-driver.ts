export class SqliteQueueDriver {
  private db: any = null

  async connect(dbPath: string): Promise<void> {
    // @ts-expect-error - better-sqlite3 is optional
    const { default: Database } = await import('better-sqlite3')
    this.db = new Database(dbPath)
    this.db.exec(`CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      payload TEXT,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)')
  }

  push(name: string, payload: unknown, maxRetries = 3): void {
    if (!this.db) throw new Error('SQLite not connected')
    const stmt = this.db.prepare("INSERT INTO jobs (name, payload, status, max_retries) VALUES (?, ?, 'pending', ?)")
    stmt.run(name, JSON.stringify(payload), maxRetries)
  }

  pop(): { id: number; name: string; payload: unknown; attempts: number; maxRetries: number } | null {
    if (!this.db) return null
    const txn = this.db.transaction(() => {
      const row = this.db
        .prepare("SELECT id, name, payload, attempts, max_retries FROM jobs WHERE status = 'pending' ORDER BY id ASC LIMIT 1")
        .get()
      if (!row) return null
      this.db.prepare("UPDATE jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id)
      return row
    })
    const row = txn()
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      payload: JSON.parse(row.payload),
      attempts: row.attempts,
      maxRetries: row.max_retries,
    }
  }

  finish(id: number): void {
    if (!this.db) return
    this.db.prepare("UPDATE jobs SET status = 'finished', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id)
  }

  fail(id: number): void {
    if (!this.db) return
    this.db.prepare("UPDATE jobs SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id)
  }

  retry(id: number): void {
    if (!this.db) return
    this.db.prepare("UPDATE jobs SET status = 'pending', attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id)
  }

  count(): { pending: number; processing: number; finished: number; failed: number } {
    if (!this.db) return { pending: 0, processing: 0, finished: 0, failed: 0 }
    const rows = this.db.prepare('SELECT status, COUNT(*) as count FROM jobs GROUP BY status').all() as Array<{
      status: string
      count: number
    }>
    const result = { pending: 0, processing: 0, finished: 0, failed: 0 }
    for (const row of rows) {
      if (row.status === 'pending') result.pending = row.count
      else if (row.status === 'processing') result.processing = row.count
      else if (row.status === 'finished') result.finished = row.count
      else if (row.status === 'failed') result.failed = row.count
    }
    return result
  }
}
