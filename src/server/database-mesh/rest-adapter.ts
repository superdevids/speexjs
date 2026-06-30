/**
 * RestAdapter — REST API Adapter
 *
 * Converts UnifiedQuery to REST API calls using Node.js built-in fetch() (available in Node 18+).
 * Supports GET and POST methods with JSON payloads.
 *
 * Query parameters are mapped to RESTful patterns:
 *   - `select[]` → ?fields=id,name
 *   - `where`   → ?status=active&age=18
 *   - `limit`   → ?limit=10
 *   - `offset`  → ?offset=0
 *   - `orderBy` → ?sort=name&order=asc
 *
 * @example
 * ```typescript
 * import { RestAdapter } from './rest-adapter.js'
 *
 * const adapter = new RestAdapter('https://api.github.com', {
 *   Authorization: 'Bearer ghp_xxx',
 * })
 *
 * const result = await adapter.query({
 *   from: 'repos',
 *   where: { type: 'public' },
 *   limit: 5,
 * })
 * ```
 */

import type { DataSourceAdapter, QueryResult, TableInfo, UnifiedQuery } from './index.js'

/** Additional options for the REST adapter */
export interface RestAdapterOptions {
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
  /** HTTP method to use: 'GET' (default) or 'POST' */
  method?: 'GET' | 'POST'
  /** Custom query parameter names (e.g., { fields: 'select', filter: 'where' }) */
  paramMapping?: Record<string, string>
}

/**
 * REST adapter that implements DataSourceAdapter using fetch().
 *
 * Key behaviors:
 * - `query()`: Sends HTTP request with query parameters mapped from UnifiedQuery
 * - `getSchema()`: Attempts OPTIONS or GET /schema (best-effort)
 * - `testConnection()`: Sends GET /health or GET / to verify reachability
 */
export class RestAdapter implements DataSourceAdapter {
  private baseUrl: string
  private headers: Record<string, string>
  private options: Required<RestAdapterOptions>

  private static readonly DEFAULT_OPTIONS: Required<RestAdapterOptions> = {
    timeout: 30000,
    method: 'GET',
    paramMapping: {
      select: 'fields',
      where: 'filter',
      limit: 'limit',
      offset: 'offset',
      orderBy: 'sort',
      orderDirection: 'order',
    },
  }

  /**
   * @param baseUrl - Base URL for the REST API (e.g., https://api.example.com/v1)
   * @param headers - Optional HTTP headers to include with every request
   * @param options - Optional adapter configuration
   */
  constructor(baseUrl: string, headers?: Record<string, string>, options?: RestAdapterOptions) {
    // Normalize base URL — ensure no trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    }
    this.options = { ...RestAdapter.DEFAULT_OPTIONS, ...options }
  }

  /**
   * Execute a unified query against the REST API.
   *
   * The query is translated to HTTP request parameters:
   *   - `from` → resource path (e.g., "users" → GET /users)
   *   - `select` → ?fields=col1,col2
   *   - `where` → ?filter[status]=active
   *   - `limit` → ?limit=10
   *   - `offset` → ?offset=0
   *   - `orderBy` → ?sort=field&order=asc
   */
  async query(query: UnifiedQuery): Promise<QueryResult> {
    const resource = query.from ?? ''
    const url = new URL(`${this.baseUrl}/${resource}`)

    // Build query parameters
    this.applyQueryParams(url, query)

    // Execute the request
    const response = await this.sendRequest(url.toString())

    // Parse the response
    const body = await this.parseResponse(response)

    // Extract rows from common response envelope patterns
    const rows = this.extractRows(body)
    const total = this.extractTotal(body, rows.length)

    return {
      rows,
      total,
      source: `rest:${this.baseUrl}/${resource}`,
      duration: 0, // Filled in by DatabaseMesh
    }
  }

  /**
   * Get the API schema — attempts to discover available endpoints/resources.
   *
   * Tries multiple strategies:
   * 1. GET /schema or GET /api-schema (OpenAPI-like)
   * 2. OPTIONS on the base URL
   * 3. Falls back to known resources from configuration
   */
  async getSchema(): Promise<TableInfo[]> {
    // Try common schema endpoints
    const schemaUrls = ['/schema', '/api-schema', '/openapi.json', '/swagger.json', '/spec']

    for (const path of schemaUrls) {
      try {
        const response = await this.sendRequest(`${this.baseUrl}${path}`)
        if (response.ok) {
          const body = await response.json()
          const tables = this.parseSchemaBody(body)
          if (tables.length > 0) return tables
        }
      } catch {
        // Try next schema endpoint
        continue
      }
    }

    // If no schema endpoint found, return a basic info table
    return [
      {
        name: new URL(this.baseUrl).hostname,
        columns: [
          { name: 'resource', type: 'string', nullable: false },
          { name: 'data', type: 'json', nullable: true },
        ],
      },
    ]
  }

  /**
   * Test whether the REST API is reachable.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendRequest(`${this.baseUrl}/`, { method: 'HEAD' })
      return response.ok
    } catch {
      try {
        // Fallback to GET
        const response = await this.sendRequest(`${this.baseUrl}/`, { method: 'GET' })
        return response.ok
      } catch {
        return false
      }
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  /**
   * Apply UnifiedQuery parameters to a URL's search params.
   */
  private applyQueryParams(url: URL, query: UnifiedQuery): void {
    const pm = this.options.paramMapping

    // Select fields
    if (query.select && query.select.length > 0) {
      url.searchParams.set(pm.select ?? 'select', query.select.join(','))
    }

    // WHERE conditions
    const whereKey = pm.where ?? 'filter'
    if (query.where && Object.keys(query.where).length > 0) {
      for (const [key, value] of Object.entries(query.where)) {
        if (value === null) {
          url.searchParams.set(`${whereKey}[${key}]`, 'null')
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
            url.searchParams.set(`${whereKey}[${key}][${subKey}]`, String(subValue))
          }
        } else {
          url.searchParams.set(`${whereKey}[${key}]`, String(value))
        }
      }
    }

    // LIMIT
    if (query.limit !== undefined) {
      url.searchParams.set(pm.limit ?? 'limit', String(query.limit))
    }

    // OFFSET
    if (query.offset !== undefined) {
      url.searchParams.set(pm.offset ?? 'offset', String(query.offset))
    }

    // ORDER BY
    if (query.orderBy) {
      url.searchParams.set(pm.orderBy ?? 'sort', query.orderBy.field)
      url.searchParams.set(pm.orderDirection ?? 'order', query.orderBy.direction)
    }
  }

  /**
   * Send an HTTP request with timeout support.
   */
  private async sendRequest(url: string, overrides?: { method?: string; headers?: Record<string, string> }): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout)

    try {
      const response = await fetch(url, {
        method: overrides?.method ?? this.options.method,
        headers: { ...this.headers, ...overrides?.headers },
        signal: controller.signal,
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Parse the HTTP response body as JSON.
   */
  private async parseResponse(response: Response): Promise<unknown> {
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`REST API returned ${response.status} ${response.statusText}${text ? `: ${text.slice(0, 200)}` : ''}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return response.json()
    }

    // Try to parse as JSON anyway, fallback to text
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      // Return as a single row with the raw text
      return [{ _raw: text, _length: text.length }]
    }
  }

  /**
   * Extract rows from a REST API response body.
   *
   * Handles common response envelope patterns:
   *   - { data: [...] }  — JSON:API / standard envelope
   *   - { results: [...] }  — Common search pattern
   *   - { items: [...] }  — Another common pattern
   *   - { records: [...] }  — Another common pattern
   *   - [...]  — Direct array response
   *   - { ... }  — Single object → wrapped in array
   */
  private extractRows(body: unknown): Record<string, unknown>[] {
    if (body === null || body === undefined) {
      return []
    }

    if (Array.isArray(body)) {
      return body as Record<string, unknown>[]
    }

    if (typeof body === 'object') {
      const obj = body as Record<string, unknown>

      // Check common envelope keys
      const envelopeKeys = ['data', 'results', 'items', 'records', 'rows', 'values', 'hits', 'documents']
      for (const key of envelopeKeys) {
        if (key in obj && Array.isArray(obj[key])) {
          return obj[key] as Record<string, unknown>[]
        }
      }

      // Single object response
      return [obj]
    }

    return []
  }

  /**
   * Extract total count from a REST API response body.
   *
   * Handles common patterns:
   *   - { total: N }
   *   - { total_count: N }
   *   - { meta: { total: N } }
   *   - { pagination: { total: N } }
   *   - { count: N }
   */
  private extractTotal(body: unknown, rowCount: number): number {
    if (body === null || body === undefined || typeof body !== 'object') {
      return rowCount
    }

    const obj = body as Record<string, unknown>

    // Check top-level total fields
    const totalKeys = ['total', 'total_count', 'totalCount', 'count', 'size', 'recordsTotal']
    for (const key of totalKeys) {
      if (key in obj && typeof obj[key] === 'number') {
        return obj[key] as number
      }
    }

    // Check nested meta/pagination objects
    const nestedPaths = [
      ['meta', 'total'],
      ['meta', 'total_count'],
      ['pagination', 'total'],
      ['pagination', 'total_count'],
      ['page', 'total'],
      ['page', 'totalElements'],
      ['_meta', 'total'],
    ]
    for (const path of nestedPaths) {
      try {
        let current: unknown = obj
        for (const key of path) {
          if (current && typeof current === 'object') {
            current = (current as Record<string, unknown>)[key]
          }
        }
        if (typeof current === 'number') {
          return current
        }
      } catch {
        continue
      }
    }

    // If no total found, fall back to the row count
    return rowCount
  }

  /**
   * Parse an OpenAPI-like schema body into TableInfo array.
   *
   * Handles:
   *   - OpenAPI/Swagger spec (paths → resources)
   *   - Simple schema format { tables: [...] }
   *   - JSON:Schema format { definitions: {...} }
   */
  private parseSchemaBody(body: unknown): TableInfo[] {
    if (!body || typeof body !== 'object') return []

    const obj = body as Record<string, unknown>
    const tables: TableInfo[] = []

    // OpenAPI / Swagger: paths are resources
    if (obj.openapi || obj.swagger) {
      const paths = obj.paths as Record<string, unknown> | undefined
      if (paths) {
        for (const path of Object.keys(paths).slice(0, 50)) {
          // Extract resource name from path: /api/users/{id} → users
          const parts = path.split('/').filter(Boolean)
          const resource = parts.find((p) => !p.startsWith('{') && !p.startsWith(':'))
          if (resource && !tables.find((t) => t.name === resource)) {
            tables.push({
              name: resource,
              columns: [
                { name: 'id', type: 'string', nullable: false },
                { name: 'data', type: 'json', nullable: true },
              ],
            })
          }
        }
      }
      return tables
    }

    // Simple schema: { tables: [...] } or { collections: [...] }
    for (const key of ['tables', 'collections', 'resources', 'entities']) {
      const list = obj[key]
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && typeof item === 'object') {
            const itemObj = item as Record<string, unknown>
            tables.push({
              name: (itemObj.name ?? itemObj.table ?? itemObj.collection ?? 'unknown') as string,
              columns: this.extractColumnsFromSchema(itemObj),
            })
          }
        }
        return tables
      }
    }

    // JSON Schema: { definitions: { User: {...}, Post: {...} } }
    const components = obj.components as { schemas?: Record<string, unknown> } | undefined
    const defs = obj.definitions ?? components?.schemas
    if (defs && typeof defs === 'object') {
      for (const [name, schema] of Object.entries(defs as Record<string, unknown>)) {
        if (schema && typeof schema === 'object') {
          tables.push({
            name,
            columns: this.extractColumnsFromSchema(schema as Record<string, unknown>),
          })
        }
      }
      return tables
    }

    return tables
  }

  /**
   * Extract column definitions from a schema object that may contain
   * a `properties` field (JSON Schema style).
   */
  private extractColumnsFromSchema(schema: Record<string, unknown>): { name: string; type: string; nullable: boolean }[] {
    const properties = (schema.properties ?? schema.fields ?? schema.columns) as Record<string, unknown> | undefined
    if (!properties || typeof properties !== 'object') {
      return [{ name: 'id', type: 'string', nullable: true }]
    }

    return Object.entries(properties).map(([name, prop]) => {
      const propObj = (typeof prop === 'object' && prop !== null ? prop : { type: String(prop) }) as Record<string, unknown>
      return {
        name,
        type: (propObj.type as string) ?? 'string',
        nullable: (propObj.nullable as boolean) ?? !propObj.required,
      }
    })
  }
}
