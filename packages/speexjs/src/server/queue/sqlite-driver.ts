export class SqliteQueueDriver {
  private db: any = null

  async connect(dbPath: string): Promise<void> {
    const { default: Database } = await import('better-sqlite3')
    this.db = new Database(dbPath)
    this.db.exec('CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, payload TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)')
  }

  push(name: string, payload: unknown): void {
    if (!this.db) throw new Error('SQLite not connected')
    const stmt = this.db.prepare('INSERT INTO jobs (name, payload) VALUES (?, ?)')
    stmt.run(name, JSON.stringify(payload))
  }

  pop(): { name: string; payload: unknown } | null {
    if (!this.db) return null
    const row = this.db.prepare('SELECT * FROM jobs ORDER BY id ASC LIMIT 1').get()
    if (!row) return null
    this.db.prepare('DELETE FROM jobs WHERE id = ?').run(row.id)
    return { name: row.name, payload: JSON.parse(row.payload) }
  }

  count(): number {
    if (!this.db) return 0
    const row = this.db.prepare('SELECT COUNT(*) as count FROM jobs').get()
    return row.count
  }
}
