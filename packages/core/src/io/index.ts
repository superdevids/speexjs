/**
 * Options for CSV parsing.
 */
export interface CsvOptions {
  delimiter?: string
  header?: boolean
  skipEmptyLines?: boolean
}

/**
 * Parses a CSV string into an array of records (objects).
 *
 * @param input - CSV string
 * @param options - Optional parsing options
 */
export function parseCsv(input: string, options?: CsvOptions): Record<string, string>[] {
  const { delimiter = ',', header = true, skipEmptyLines = true } = options ?? {}

  const lines = input.split(/\r?\n/)
  const rows: string[][] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (skipEmptyLines && trimmed.length === 0) continue
    const values = parseCsvLine(trimmed, delimiter)
    rows.push(values)
  }

  if (rows.length === 0) return []

  if (header) {
    const [head, ...body] = rows
    if (head === undefined) return []
    return body.map(row => {
      const record: Record<string, string> = {}
      for (let i = 0; i < head.length; i++) {
        record[head[i]!] = row[i] ?? ''
      }
      return record
    })
  }

  return rows.map(row => {
    const record: Record<string, string> = {}
    for (let i = 0; i < row.length; i++) {
      record[String(i)] = row[i]!
    }
    return record
  })
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

/**
 * Converts an array of records to a CSV string.
 */
export function stringifyCsv(data: Record<string, unknown>[], options?: { delimiter?: string }): string {
  const { delimiter = ',' } = options ?? {}
  if (data.length === 0) return ''

  const headers = Object.keys(data[0]!)
  const lines: string[] = [headers.map(v => escapeCsvField(v, delimiter)).join(delimiter)]

  for (const record of data) {
    const row = headers.map(h => escapeCsvField(String(record[h] ?? ''), delimiter))
    lines.push(row.join(delimiter))
  }

  return lines.join('\n')
}

function escapeCsvField(value: string, delimiter: string): string {
  if (value.includes('"') || value.includes(delimiter) || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

/**
 * Safely parses a JSON string, returning the default value or null on failure.
 */
export function safeJsonParse<T>(input: string, default_?: T): T | null {
  try {
    return JSON.parse(input) as T
  } catch {
    return default_ ?? null
  }
}

/**
 * Reads an environment variable with optional default.
 */
export function env(name: string, default_?: string): string {
  const value = process.env[name]
  return value ?? default_ ?? ''
}

/**
 * Reads an environment variable as an integer.
 */
export function envInt(name: string, default_?: number): number {
  const value = process.env[name]
  if (value === undefined || value === '') return default_ ?? 0
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? (default_ ?? 0) : parsed
}

/**
 * Reads an environment variable as a boolean.
 */
export function envBool(name: string, default_?: boolean): boolean {
  const value = process.env[name]
  if (value === undefined || value === '') return default_ ?? false
  return value === 'true' || value === '1' || value === 'yes'
}
