import type { QueryRunner } from '../database/types.js'

export class RefreshDatabase {
  private tableNames: string[] = []
  private connection: QueryRunner | null = null

  setConnection(conn: QueryRunner): this {
    this.connection = conn
    return this
  }

  /**
   * Register tables to be cleared between tests.
   */
  tables(...names: string[]): this {
    this.tableNames = names
    return this
  }

  /**
   * Truncate all registered tables.
   */
  async refresh(): Promise<void> {
    if (!this.connection) return
    const dialect = this.connection.getDialect()
    for (const table of this.tableNames) {
      const sql = dialect.compileTruncate(table)
      await this.connection.raw(sql)
    }
  }

  /**
   * Create in-memory SQLite database for testing.
   */
  static async createSqliteMemory(): Promise<QueryRunner> {
    // @ts-expect-error - better-sqlite3 is an optional runtime dependency
    const { default: Database } = await import('better-sqlite3')
    const db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    
    const { SqliteDialect } = await import('../database/dialect.js')

    return {
      raw: async (sql: string, bindings?: any[]) => {
        const stmt = db.prepare(sql)
        if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('WITH') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
          const rows = bindings?.length ? stmt.all(...bindings) : stmt.all()
          return { rows }
        }
        bindings?.length ? stmt.run(...bindings) : stmt.run()
        return { rows: [] }
      },
      getDriver: () => 'sqlite' as const,
      getDialect: () => new SqliteDialect(),
      getPrefix: () => '',
    } as QueryRunner
  }
}
