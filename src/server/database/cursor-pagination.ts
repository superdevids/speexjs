import type { QueryBuilder } from './query.js'

export interface CursorPaginatedResult<T> {
  data: T[]
  cursors: { next: string | null; previous: string | null }
  hasMore: boolean
}

export interface CursorPaginationOptions {
  limit?: number
  cursor?: string | null
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

function encodeCursor(values: Record<string, unknown>): string {
  const json = JSON.stringify(values)
  return Buffer.from(json).toString('base64url')
}

function decodeCursor(cursor: string): Record<string, unknown> {
  try {
    const json = Buffer.from(cursor, 'base64url').toString()
    return JSON.parse(json)
  } catch {
    throw new Error('Invalid cursor')
  }
}

export async function cursorPaginate<T extends Record<string, unknown>>(
  query: QueryBuilder,
  options: CursorPaginationOptions = {},
): Promise<CursorPaginatedResult<T>> {
  const limit = options.limit ?? 15
  const sortColumn = options.sortColumn ?? 'id'
  const sortDirection = options.sortDirection ?? 'asc'
  const fetchLimit = limit + 1

  if (options.cursor) {
    const cursor = decodeCursor(options.cursor)
    const cursorValue = cursor[sortColumn]
    const operator = sortDirection === 'asc' ? '>' : '<'
    query.where(sortColumn, operator, cursorValue)
  }

  query.orderBy(sortColumn, sortDirection)
  query.limit(fetchLimit)

  const rows = (await query.get()) as T[]
  const hasMore = rows.length > limit
  const data = rows.slice(0, limit)

  let next: string | null = null
  let previous: string | null = null

  if (data.length > 0) {
    const lastItem = data[data.length - 1]!
    next = encodeCursor({ [sortColumn]: lastItem[sortColumn] })

    const firstItem = data[0]!
    previous = encodeCursor({ [sortColumn]: firstItem[sortColumn] })
  }

  return { data, cursors: { next, previous }, hasMore }
}
