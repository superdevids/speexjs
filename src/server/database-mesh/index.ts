/**
 * DatabaseMesh — Universal Database Mesh
 *
 * A unified query API that connects to ANY data source:
 * - PostgreSQL, MySQL, SQLite via existing DatabaseConnection
 * - REST APIs via fetch()
 * - CSV files via Node.js fs
 *
 * Zero external dependencies — uses only Node.js built-ins.
 *
 * Usage:
 * ```typescript
 * import { DatabaseMesh } from 'speexjs/data'
 *
 * const mesh = new DatabaseMesh()
 *
 * // Add a SQL source
 * mesh.addSource('primary', {
 *   type: 'postgresql',
 *   name: 'primary',
 *   connection: 'postgresql://user:pass@localhost:5432/db',
 * })
 *
 * // Add a REST API source
 * mesh.addSource('github', {
 *   type: 'rest',
 *   name: 'github',
 *   url: 'https://api.github.com',
 *   headers: { Authorization: 'Bearer token' },
 * })
 *
 * // Add a CSV file source
 * mesh.addSource('reports', {
 *   type: 'csv',
 *   name: 'reports',
 *   filePath: './data/report.csv',
 * })
 *
 * // Query any source with the same API
 * const users = await mesh.query('primary', {
 *   select: ['id', 'name', 'email'],
 *   from: 'users',
 *   where: { status: 'active' },
 *   limit: 10,
 * })
 *
 * // Get schema from any source
 * const schema = await mesh.getSchema('primary')
 * ```
 */

import type { DatabaseConnection } from '../database/connection.js'
import { SqlAdapter } from './sql-adapter.js'
import { RestAdapter } from './rest-adapter.js'
import { CsvAdapter } from './csv-adapter.js'

// ─── Types ───────────────────────────────────────────────────────────────

/** Supported data source types */
export type DataSourceType = 'postgresql' | 'mysql' | 'sqlite' | 'rest' | 'csv'

/** Configuration for a single data source */
export interface DataSourceConfig {
  /** The data source type */
  type: DataSourceType
  /** A human-readable name for the source */
  name: string
  /**
   * Connection string for SQL sources.
   * Format: `protocol://user:pass@host:port/database`
   * Examples:
   *   - postgresql://user:pass@localhost:5432/mydb
   *   - mysql://user:pass@localhost:3306/mydb
   *   - sqlite:///path/to/database.sqlite
   */
  connection?: string
  /**
   * Base URL for REST API sources.
   * Example: https://api.github.com
   */
  url?: string
  /** HTTP headers for REST API sources */
  headers?: Record<string, string>
  /**
   * File path for CSV sources.
   * Example: ./data/report.csv
   */
  filePath?: string
  /**
   * Cache TTL in milliseconds.
   * Results are cached for this duration.
   * Set to 0 to disable caching (default: 0).
   */
  cacheTtl?: number
}

/** A unified query that all adapters understand */
export interface UnifiedQuery {
  /** Columns to select. Empty/undefined = all columns */
  select?: string[]
  /** The table, endpoint, or resource name to query */
  from?: string
  /** Filter conditions as key-value pairs (AND logic) */
  where?: Record<string, unknown>
  /** Maximum number of rows to return */
  limit?: number
  /** Number of rows to skip */
  offset?: number
  /** Sort order */
  orderBy?: { field: string; direction: 'asc' | 'desc' }
}

/** Result of a unified query */
export interface QueryResult {
  /** The returned rows */
  rows: Record<string, unknown>[]
  /** Total matching rows (before pagination) */
  total: number
  /** The source name that served the query */
  source: string
  /** Query execution time in milliseconds */
  duration: number
}

/** Information about a table or resource schema */
export interface TableInfo {
  /** Table/resource name */
  name: string
  /** Column definitions */
  columns: { name: string; type: string; nullable: boolean }[]
}

/** Internal adapter interface — each data source type implements this */
export interface DataSourceAdapter {
  /** Execute a unified query */
  query(query: UnifiedQuery): Promise<QueryResult>
  /** Get the schema (tables/collections and their columns) */
  getSchema(): Promise<TableInfo[]>
  /** Test whether the source is reachable and operational */
  testConnection(): Promise<boolean>
}

// ─── Cache Entry ─────────────────────────────────────────────────────────

interface CacheEntry {
  result: QueryResult
  timestamp: number
  ttl: number
}

// ─── DatabaseMesh ────────────────────────────────────────────────────────

/**
 * DatabaseMesh — Universal Database Mesh
 *
 * Manages multiple data sources and provides a unified query API.
 * Each source is accessed through its own adapter, but all share
 * the same query interface.
 */
export class DatabaseMesh {
  /** Registered data sources (name → adapter + config) */
  private sources = new Map<string, { config: DataSourceConfig; adapter: DataSourceAdapter }>()

  /** Query result cache */
  private cache = new Map<string, CacheEntry>()

  /** Registered DatabaseConnection instances (for SQL adapters) */
  private connections = new Map<string, DatabaseConnection>()

  // ─── Source Management ──────────────────────────────────────────────

  /**
   * Register a DatabaseConnection for use with SQL-based sources.
   * Call this before addSource for 'postgresql', 'mysql', or 'sqlite' types.
   */
  registerConnection(name: string, connection: DatabaseConnection): void {
    this.connections.set(name, connection)
  }

  /**
   * Add a data source to the mesh.
   *
   * For SQL sources ('postgresql', 'mysql', 'sqlite'), the connection
   * must already be registered via registerConnection().
   */
  addSource(name: string, config: DataSourceConfig): void {
    if (this.sources.has(name)) {
      throw new Error(`Data source "${name}" is already registered. Remove it first or use a different name.`)
    }

    const adapter = this.createAdapter(config)
    this.sources.set(name, { config, adapter })
  }

  /**
   * Remove a data source from the mesh.
   */
  removeSource(name: string): void {
    if (!this.sources.has(name)) {
      throw new Error(`Data source "${name}" is not registered.`)
    }
    this.sources.delete(name)
    // Also clean up any cached results for this source
    for (const [key] of this.cache) {
      if (key.startsWith(`${name}:`)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Execute a unified query against a registered data source.
   *
   * @param sourceName - The name of the registered data source
   * @param query - The unified query to execute
   * @returns QueryResult with rows, total count, source name, and duration
   */
  async query(sourceName: string, query: UnifiedQuery): Promise<QueryResult> {
    const entry = this.sources.get(sourceName)
    if (!entry) {
      throw new Error(`Data source "${sourceName}" is not registered. Available sources: ${this.getSourceNames().join(', ') || '(none)'}`)
    }

    // Check cache if TTL is set
    if (entry.config.cacheTtl && entry.config.cacheTtl > 0) {
      const cacheKey = this.buildCacheKey(sourceName, query)
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.result
      }
    }

    const start = Date.now()

    try {
      const result = await entry.adapter.query(query)

      const queryResult: QueryResult = {
        rows: result.rows,
        total: result.total,
        source: sourceName,
        duration: Date.now() - start,
      }

      // Cache the result if TTL is configured
      if (entry.config.cacheTtl && entry.config.cacheTtl > 0) {
        const cacheKey = this.buildCacheKey(sourceName, query)
        this.cache.set(cacheKey, {
          result: queryResult,
          timestamp: Date.now(),
          ttl: entry.config.cacheTtl,
        })
      }

      return queryResult
    } catch (err) {
      const duration = Date.now() - start
      throw new Error(
        `Query against "${sourceName}" failed after ${duration}ms: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  /**
   * Get the schema (table/collection definitions) from a registered source.
   *
   * @param sourceName - The name of the registered data source
   * @returns Array of TableInfo with column definitions
   */
  async getSchema(sourceName: string): Promise<TableInfo[]> {
    const entry = this.sources.get(sourceName)
    if (!entry) {
      throw new Error(`Data source "${sourceName}" is not registered.`)
    }

    return entry.adapter.getSchema()
  }

  /**
   * List all registered data sources.
   *
   * @returns Array of { name, type } objects
   */
  getSources(): { name: string; type: string }[] {
    return Array.from(this.sources.entries()).map(([name, entry]) => ({
      name,
      type: entry.config.type,
    }))
  }

  /**
   * Test whether a data source is reachable and operational.
   *
   * @param name - The name of the registered data source
   * @returns true if the source responded successfully
   */
  async testConnection(name: string): Promise<boolean> {
    const entry = this.sources.get(name)
    if (!entry) {
      throw new Error(`Data source "${name}" is not registered.`)
    }

    try {
      return await entry.adapter.testConnection()
    } catch {
      return false
    }
  }

  /**
   * Clear the query result cache for all sources or a specific source.
   *
   * @param sourceName - Optional source name to clear cache for
   */
  clearCache(sourceName?: string): void {
    if (sourceName) {
      for (const [key] of this.cache) {
        if (key.startsWith(`${sourceName}:`)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Create the appropriate adapter for a given config.
   */
  private createAdapter(config: DataSourceConfig): DataSourceAdapter {
    switch (config.type) {
      case 'postgresql':
      case 'mysql':
      case 'sqlite': {
        const conn = this.connections.get(config.name)
        if (!conn) {
          throw new Error(
            `No DatabaseConnection registered for "${config.name}". ` +
            `Call registerConnection() first before adding a SQL data source.`,
          )
        }
        return new SqlAdapter(conn)
      }

      case 'rest':
        return new RestAdapter(config.url!, config.headers)

      case 'csv':
        return new CsvAdapter(config.filePath!)

      default:
        throw new Error(`Unsupported data source type: "${config.type}". Supported types: postgresql, mysql, sqlite, rest, csv`)
    }
  }

  /**
   * Build a deterministic cache key from a source name and query.
   */
  private buildCacheKey(sourceName: string, query: UnifiedQuery): string {
    return `${sourceName}:${JSON.stringify(query)}`
  }

  /**
   * Get list of registered source names.
   */
  private getSourceNames(): string[] {
    return Array.from(this.sources.keys())
  }

}

// Re-export adapter types for external use
export { SqlAdapter } from './sql-adapter.js'
export type { SqlAdapterOptions } from './sql-adapter.js'
export { RestAdapter } from './rest-adapter.js'
export type { RestAdapterOptions } from './rest-adapter.js'
export { CsvAdapter } from './csv-adapter.js'
export type { CsvAdapterOptions } from './csv-adapter.js'
