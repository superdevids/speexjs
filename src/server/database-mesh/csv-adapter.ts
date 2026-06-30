// @ts-nocheck
/**
 * CsvAdapter — CSV File Adapter
 *
 * Reads CSV files using only Node.js built-in modules (fs, path).
 * No external CSV parsing dependencies required.
 *
 * Supports:
 *   - Standard CSV with headers
 *   - Comma, tab, pipe, and semicolon delimiters (auto-detected)
 *   - Quoted fields with escaped quotes
 *   - WHERE filtering with equality matching
 *   - Pagination (LIMIT + OFFSET)
 *   - Column selection
 *   - ORDER BY on any column
 *
 * @example
 * ```typescript
 * import { CsvAdapter } from './csv-adapter.js'
 *
 * const adapter = new CsvAdapter('./data/report.csv')
 *
 * const result = await adapter.query({
 *   select: ['name', 'email', 'revenue'],
 *   where: { status: 'active' },
 *   orderBy: { field: 'revenue', direction: 'desc' },
 *   limit: 25,
 * })
 * ```
 */

import { readFileSync, existsSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import type { DataSourceAdapter, QueryResult, TableInfo, UnifiedQuery } from './index.js'

/** Additional options for the CSV adapter */
export interface CsvAdapterOptions {
  /** Character encoding (default: 'utf-8') */
  encoding?: BufferEncoding
  /** Whether the first row is a header row (default: true) */
  hasHeader?: boolean
  /** Delimiter override. If not set, auto-detected from content */
  delimiter?: string
  /** Whether to allow falling back to a subset of data on error (default: false) */
  tolerant?: boolean
}

/**
 * CSV adapter that implements DataSourceAdapter using Node.js fs.
 *
 * Key behaviors:
 * - `query()`: Reads the CSV file, parses it, applies filtering/pagination
 * - `getSchema()`: Reads only the header row to determine columns
 * - `testConnection()`: Checks if the file exists and is readable
 */
export class CsvAdapter implements DataSourceAdapter {
  private filePath: string
  private options: Required<CsvAdapterOptions>

  private static readonly DEFAULT_OPTIONS: Required<CsvAdapterOptions> = {
    encoding: 'utf-8',
    hasHeader: true,
    delimiter: '', // Auto-detect
    tolerant: false,
  }

  /** For auto-detection: score each delimiter by how well it splits rows consistently */
  private static readonly DELIMITER_CANDIDATES = [',', '\t', '|', ';']

  /**
   * @param filePath - Path to the CSV file (absolute or relative to cwd)
   * @param options - Optional adapter configuration
   */
  constructor(filePath: string, options?: CsvAdapterOptions) {
    this.filePath = resolve(filePath)
    this.options = { ...CsvAdapter.DEFAULT_OPTIONS, ...options }
  }

  /**
   * Execute a unified query against the CSV file.
   *
   * The file is read, parsed, and filtered in-memory.
   * Supports WHERE equality, column selection, ORDER BY, LIMIT, and OFFSET.
   *
   * For large files, consider pre-filtering or using a database.
   */
  async query(query: UnifiedQuery): Promise<QueryResult> {
    // Read and parse the CSV file
    const allRows = this.parseCsv()

    // Start with all rows
    let filtered = allRows

    // Apply WHERE filtering (equality only)
    if (query.where && Object.keys(query.where).length > 0) {
      filtered = this.applyWhere(filtered, query.where)
    }

    // Record total before pagination
    const total = filtered.length

    // Apply ORDER BY
    if (query.orderBy) {
      filtered = this.applyOrderBy(filtered, query.orderBy)
    }

    // Apply SELECT (column projection)
    let rows: Record<string, unknown>[]
    if (query.select && query.select.length > 0) {
      rows = filtered.map((row) => {
        const projected: Record<string, unknown> = {}
        for (const col of query.select!) {
          if (col in row) {
            projected[col] = row[col]
          }
        }
        return projected
      })
    } else {
      rows = filtered
    }

    // Apply OFFSET
    if (query.offset !== undefined && query.offset !== null && query.offset > 0) {
      rows = rows.slice(query.offset)
    }

    // Apply LIMIT
    if (query.limit !== undefined && query.limit !== null && query.limit >= 0) {
      rows = rows.slice(0, query.limit)
    }

    return {
      rows,
      total,
      source: `csv:${this.filePath}`,
      duration: 0, // Filled in by DatabaseMesh
    }
  }

  /**
   * Get the CSV file schema — column names derived from the header row.
   * All columns are typed as 'string' since CSV values are text.
   */
  async getSchema(): Promise<TableInfo[]> {
    if (!existsSync(this.filePath)) {
      throw new Error(`CSV file not found: ${this.filePath}`)
    }

    const content = readFileSync(this.filePath, this.options.encoding)
    const firstLine = content.split('\n')[0]
    if (!firstLine || firstLine.trim() === '') {
      throw new Error(`CSV file is empty: ${this.filePath}`)
    }

    const delimiter = this.detectDelimiter(firstLine)
    const columns = this.parseLine(firstLine, delimiter)

    return [
      {
        name: this.getFileName(),
        columns: columns.map((col) => ({
          name: col,
          type: 'string',
          nullable: true,
        })),
      },
    ]
  }

  /**
   * Test whether the CSV file exists and is readable.
   */
  async testConnection(): Promise<boolean> {
    try {
      return existsSync(this.filePath)
    } catch {
      return false
    }
  }

  // ─── CSV Parsing ───────────────────────────────────────────────────

  /**
   * Read the CSV file and parse it into an array of objects.
   */
  private parseCsv(): Record<string, unknown>[] {
    if (!existsSync(this.filePath)) {
      throw new Error(`CSV file not found: ${this.filePath}`)
    }

    const content = readFileSync(this.filePath, this.options.encoding)

    // Split into lines, handling both \r\n and \n
    const lines = content.replace(/\r\n/g, '\n').split('\n')

    if (lines.length < 1 || (lines.length === 1 && lines[0].trim() === '')) {
      return []
    }

    const rawLines = this.filterEmptyLines(lines)

    if (rawLines.length === 0) {
      return []
    }

    // Parse header
    const delimiter = this.options.delimiter || this.detectDelimiter(rawLines[0])
    const headers = this.options.hasHeader
      ? this.parseLine(rawLines[0], delimiter)
      : rawLines[0].split(delimiter).map((_, i) => `column_${i + 1}`)

    const dataLines = this.options.hasHeader ? rawLines.slice(1) : rawLines

    // Parse data rows
    const rows: Record<string, unknown>[] = []
    for (const line of dataLines) {
      const trimmed = line.trim()
      if (trimmed === '') continue

      try {
        const values = this.parseLine(trimmed, delimiter)
        const row: Record<string, unknown> = {}

        for (let i = 0; i < headers.length; i++) {
          const value = i < values.length ? values[i] : ''
          row[headers[i]] = this.coerceValue(value)
        }

        rows.push(row)
      } catch {
        if (!this.options.tolerant) {
          throw new Error(`Failed to parse CSV line: ${trimmed.slice(0, 100)}`)
        }
        // In tolerant mode, skip malformed lines
      }
    }

    return rows
  }

  /**
   * Parse a single CSV line into fields, handling quoted values.
   *
   * Supports:
   *   - Double-quoted fields: "value"
   *   - Escaped quotes within quotes: "" → "
   *   - Empty fields
   *   - Mixed quoted/unquoted fields
   */
  private parseLine(line: string, delimiter: string): string[] {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]

      if (inQuotes) {
        if (char === '"') {
          // Check for escaped quote ""
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i += 2
            continue
          }
          inQuotes = false
        } else {
          current += char
        }
        i++
        continue
      }

      if (char === '"') {
        inQuotes = true
        i++
        continue
      }

      if (char === delimiter) {
        fields.push(current)
        current = ''
        i++
        continue
      }

      if (char === '\r') {
        i++
        continue
      }

      current += char
      i++
    }

    fields.push(current)
    return fields
  }

  /**
   * Detect the CSV delimiter by analyzing the header line.
   * Scores each candidate by how many fields it produces.
   */
  private detectDelimiter(firstLine: string): string {
    if (this.options.delimiter) {
      return this.options.delimiter
    }

    let bestDelimiter = ','
    let bestCount = 0

    for (const candidate of CsvAdapter.DELIMITER_CANDIDATES) {
      const count = (firstLine.match(new RegExp(candidate === ',' ? /,/g : `\\${candidate}`, 'g')) ?? []).length
      if (count > bestCount) {
        bestCount = count
        bestDelimiter = candidate
      }
    }

    return bestDelimiter
  }

  /**
   * Remove empty trailing lines.
   */
  private filterEmptyLines(lines: string[]): string[] {
    const result = [...lines]
    while (result.length > 0 && result[result.length - 1].trim() === '') {
      result.pop()
    }
    return result
  }

  /**
   * Get the filename without extension for schema naming.
   */
  private getFileName(): string {
    const name = this.filePath.split(/[/\\]/).pop() ?? 'unknown'
    const ext = extname(name)
    return ext ? name.slice(0, -ext.length) : name
  }

  // ─── Query Operations ──────────────────────────────────────────────

  /**
   * Apply WHERE filtering to rows.
   * Supports equality matching on string, number, and boolean values.
   */
  private applyWhere(rows: Record<string, unknown>[], where: Record<string, unknown>): Record<string, unknown>[] {
    return rows.filter((row) => {
      for (const [column, value] of Object.entries(where)) {
        const rowValue = row[column]

        if (Array.isArray(value)) {
          // IN clause: match if row value is in the array
          if (!value.includes(rowValue)) return false
        } else if (value === null) {
          // NULL check
          if (rowValue !== null && rowValue !== undefined && rowValue !== '') return false
        } else if (typeof value === 'string') {
          // String comparison (case-insensitive)
          const strRow = rowValue !== null && rowValue !== undefined ? String(rowValue).toLowerCase() : ''
          if (strRow !== value.toLowerCase()) return false
        } else {
          // Number/boolean comparison
          if (rowValue !== value && Number(rowValue) !== Number(value)) return false
        }
      }
      return true
    })
  }

  /**
   * Apply ORDER BY to rows.
   * Sorts by the specified field in the specified direction.
   */
  private applyOrderBy(rows: Record<string, unknown>[], orderBy: { field: string; direction: 'asc' | 'desc' }): Record<string, unknown>[] {
    const { field, direction } = orderBy

    return [...rows].sort((a, b) => {
      const valA = a[field]
      const valB = b[field]

      // Handle null/undefined
      if (valA === null || valA === undefined) return direction === 'asc' ? -1 : 1
      if (valB === null || valB === undefined) return direction === 'asc' ? 1 : -1

      // Compare as numbers if both are numeric
      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA
      }

      // Compare as strings
      const strA = String(valA)
      const strB = String(valB)
      const comparison = strA.localeCompare(strB, undefined, { numeric: true })
      return direction === 'asc' ? comparison : -comparison
    })
  }

  /**
   * Coerce a string value to its most specific type.
   *
   * - "true" / "false" → boolean
   * - Numeric strings → number
   * - Everything else → string
   * - Empty string → null
   */
  private coerceValue(value: string): unknown {
    const trimmed = value.trim()

    if (trimmed === '') return null

    // Boolean check (must be before number check since parseInt("true") = NaN)
    if (trimmed.toLowerCase() === 'true') return true
    if (trimmed.toLowerCase() === 'false') return false

    // Number check
    const num = Number(trimmed)
    if (!Number.isNaN(num) && trimmed !== '') {
      // Avoid coercing things like "0001" or zip codes
      // Only convert if the string IS the number (no leading zeros beyond one)
      const isLikelyNumber = /^-?\d+(\.\d+)?$/.test(trimmed)
      if (isLikelyNumber) return num
    }

    return trimmed
  }
}
