/**
 * SqlAdapter — SQL Database Adapter
 *
 * Wraps an existing DatabaseConnection to implement the DataSourceAdapter interface.
 * Converts UnifiedQuery to SQL via the existing QueryBuilder.
 *
 * Supports PostgreSQL, MySQL, and SQLite through the existing
 * DatabaseConnection + QueryBuilder infrastructure.
 *
 * @example
 * ```typescript
 * import { DatabaseConnection } from '../database/connection.js'
 * import { SqlAdapter } from './sql-adapter.js'
 *
 * const conn = new DatabaseConnection({
 *   driver: 'postgresql',
 *   host: 'localhost',
 *   database: 'mydb',
 * })
 * await conn.connect()
 *
 * const adapter = new SqlAdapter(conn)
 * const result = await adapter.query({
 *   select: ['id', 'name'],
 *   from: 'users',
 *   where: { status: 'active' },
 *   limit: 10,
 * })
 * ```
 */

import type { DatabaseConnection } from '../database/connection.js'
import type { DataSourceAdapter, QueryResult, TableInfo, UnifiedQuery } from './index.js'

/** Additional options for the SQL adapter */
export interface SqlAdapterOptions {
  /** Database table prefix (applied to table names in queries) */
  prefix?: string
}

/**
 * SQL adapter that wraps DatabaseConnection to implement DataSourceAdapter.
 *
 * Key behaviors:
 * - `query()`: Converts UnifiedQuery → QueryBuilder chain → SQL → execute
 * - `getSchema()`: Introspects the database for table/column info
 * - `testConnection()`: Runs SELECT 1 to verify connectivity
 */
export class SqlAdapter implements DataSourceAdapter {
  private connection: DatabaseConnection
  private prefix: string

  /**
   * @param connection - An existing, connected DatabaseConnection
   * @param options - Optional adapter configuration
   */
  constructor(connection: DatabaseConnection, options: SqlAdapterOptions = {}) {
    this.connection = connection
    this.prefix = options.prefix ?? connection.getPrefix() ?? ''
  }

  /**
   * Execute a unified query against the SQL database.
   *
   * Converts the UnifiedQuery into a QueryBuilder chain:
   *   query.select([...]).from(table).where({...}).orderBy(...).limit(...).offset(...)
   *
   * Then executes via the connection and returns structured results.
   */
  async query(query: UnifiedQuery): Promise<QueryResult> {
    const tableName = query.from ?? ''
    if (!tableName) {
      throw new Error('SQL query requires a "from" field specifying the table name.')
    }

    // Build the query using the existing QueryBuilder
    const qb = this.connection.table(`${this.prefix}${tableName}`)

    // Apply column selection
    if (query.select && query.select.length > 0) {
      qb.select(...query.select)
    }

    // Apply WHERE conditions (simple equality — AND logic)
    if (query.where && Object.keys(query.where).length > 0) {
      for (const [column, value] of Object.entries(query.where)) {
        if (value === null) {
          qb.whereNull(column)
        } else if (Array.isArray(value)) {
          qb.whereIn(column, value)
        } else {
          qb.where(column, value)
        }
      }
    }

    // Apply ORDER BY
    if (query.orderBy) {
      qb.orderBy(query.orderBy.field, query.orderBy.direction)
    }

    // Apply LIMIT
    if (query.limit !== undefined && query.limit !== null) {
      qb.limit(query.limit)
    }

    // Apply OFFSET
    if (query.offset !== undefined && query.offset !== null) {
      qb.offset(query.offset)
    }

    // Execute the query
    const rows = await qb.get<Record<string, unknown>>()

    // Get total count (without pagination) for the `total` field
    let total: number
    const countQb = this.connection.table(`${this.prefix}${tableName}`)
    if (query.where && Object.keys(query.where).length > 0) {
      for (const [column, value] of Object.entries(query.where)) {
        if (value === null) {
          countQb.whereNull(column)
        } else if (Array.isArray(value)) {
          countQb.whereIn(column, value)
        } else {
          countQb.where(column, value)
        }
      }
    }
    total = await countQb.count()

    return {
      rows,
      total,
      source: `sql:${tableName}`,
      duration: 0, // Filled in by DatabaseMesh
    }
  }

  /**
   * Get the database schema — table names and their columns.
   *
   * Uses database-specific information_schema queries:
   * - PostgreSQL: information_schema.columns
   * - MySQL: information_schema.columns
   * - SQLite: PRAGMA table_info + sqlite_master
   */
  async getSchema(): Promise<TableInfo[]> {
    const driver = this.connection.getDriver()

    switch (driver) {
      case 'postgresql':
        return this.getPostgresqlSchema()
      case 'mysql':
        return this.getMysqlSchema()
      case 'sqlite':
        return this.getSqliteSchema()
      default:
        throw new Error(`Unsupported SQL driver for schema introspection: "${driver}"`)
    }
  }

  /**
   * Test whether the SQL connection is alive.
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.connection.isConnected()) {
        await this.connection.connect()
      }
      await this.connection.raw('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  // ─── Schema Introspection ──────────────────────────────────────────

  /**
   * Introspect schema for PostgreSQL.
   */
  private async getPostgresqlSchema(): Promise<TableInfo[]> {
    const result = await this.connection.raw(`
      SELECT
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON t.table_name = c.table_name
        AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `)

    return this.groupColumns(result.rows, {
      tableKey: 'table_name',
      columnKey: 'column_name',
      typeKey: 'data_type',
      nullableKey: 'is_nullable',
      nullableValue: (v: string) => v === 'YES',
    })
  }

  /**
   * Introspect schema for MySQL.
   */
  private async getMysqlSchema(): Promise<TableInfo[]> {
    const result = await this.connection.raw(`
      SELECT
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON t.table_name = c.table_name
        AND t.table_schema = c.table_schema
      WHERE t.table_schema = DATABASE()
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `)

    return this.groupColumns(result.rows, {
      tableKey: 'table_name',
      columnKey: 'column_name',
      typeKey: 'data_type',
      nullableKey: 'is_nullable',
      nullableValue: (v: string) => v === 'YES',
    })
  }

  /**
   * Introspect schema for SQLite.
   */
  private async getSqliteSchema(): Promise<TableInfo[]> {
    // Get all user tables
    const tablesResult = await this.connection.raw(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    )

    const tables: TableInfo[] = []

    for (const row of tablesResult.rows) {
      const tableName = (row as Record<string, unknown>).name as string

      // Get column info using PRAGMA
      const columnsResult = await this.connection.raw(`PRAGMA table_info("${tableName}")`)

      const columns = columnsResult.rows.map((col: Record<string, unknown>) => ({
        name: col.name as string,
        type: (col.type as string) || 'TEXT',
        nullable: (col.notnull as number) === 0,
      }))

      tables.push({ name: tableName, columns })
    }

    return tables
  }

  /**
   * Group raw schema rows into TableInfo objects.
   */
  private groupColumns(
    rows: Record<string, unknown>[],
    keys: {
      tableKey: string
      columnKey: string
      typeKey: string
      nullableKey: string
      nullableValue: (v: string) => boolean
    },
  ): TableInfo[] {
    const tableMap = new Map<string, { name: string; type: string; nullable: boolean }[]>()

    for (const row of rows) {
      const tableName = row[keys.tableKey] as string
      const columnName = row[keys.columnKey] as string
      const dataType = row[keys.typeKey] as string
      const isNullable = row[keys.nullableKey] as string

      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, [])
      }

      tableMap.get(tableName)!.push({
        name: columnName,
        type: this.normalizeType(dataType),
        nullable: keys.nullableValue(isNullable),
      })
    }

    return Array.from(tableMap.entries()).map(([name, columns]) => ({
      name,
      columns,
    }))
  }

  /**
   * Normalize type names from different databases to a common set.
   */
  private normalizeType(type: string): string {
    const lower = type.toLowerCase()
    if (lower.includes('int') || lower === 'serial' || lower === 'bigserial' || lower === 'smallserial') {
      return 'integer'
    }
    if (lower.includes('char') || lower.includes('text') || lower === 'uuid' || lower === 'varchar') {
      return 'string'
    }
    if (lower.includes('bool')) {
      return 'boolean'
    }
    if (lower.includes('float') || lower.includes('double') || lower.includes('real') || lower.includes('decimal') || lower.includes('numeric')) {
      return 'float'
    }
    if (lower.includes('json')) {
      return 'json'
    }
    if (lower.includes('blob') || lower.includes('bytea') || lower.includes('binary')) {
      return 'binary'
    }
    if (lower.includes('date') || lower.includes('time') || lower.includes('timestamp')) {
      return 'datetime'
    }
    return lower
  }
}
