import { QueryBuilder } from '../database/query.js'

interface ParsedQuery {
  operation: 'select' | 'count' | 'aggregate'
  table: string
  filters: ParsedFilter[]
  sorts: ParsedSort[]
  limit: number | null
  offset: number | null
  groupBy: string | null
  aggregateFn: string | null
  aggregateColumn: string | null
}

interface ParsedFilter {
  column: string
  operator: string
  value: any
  boolean: 'and' | 'or'
}

interface ParsedSort {
  column: string
  direction: 'asc' | 'desc'
}

interface QueryResult {
  query: string
  operation: string
  table: string
  filters: ParsedFilter[]
  sorts: ParsedSort[]
  limit: number | null
  offset: number | null
  sql: string
  data: any
  executionTimeMs: number
}

const TABLE_PATTERNS: Record<string, string[]> = {
  users: ['user', 'users', 'people', 'person', 'members', 'member', 'admin', 'admins'],
  posts: ['post', 'posts', 'articles', 'article', 'blog'],
  comments: ['comment', 'comments', 'replies', 'reply'],
  products: ['product', 'products', 'items', 'item', 'goods'],
  categories: ['category', 'categories', 'tags', 'tag'],
  orders: ['order', 'orders', 'purchases', 'purchase'],
  reviews: ['review', 'reviews', 'ratings', 'rating'],
}

const AGGREGATE_KEYWORDS: Record<string, string> = {
  count: 'count',
  total: 'count',
  how_many: 'count',
  sum: 'sum',
  total_of: 'sum',
  average: 'avg',
  avg: 'avg',
  mean: 'avg',
  minimum: 'min',
  min: 'min',
  smallest: 'min',
  maximum: 'max',
  max: 'max',
  largest: 'max',
}

const COMPARISON_WORDS: Record<string, string> = {
  greater_than: '>',
  '>': '>',
  more_than: '>',
  above: '>',
  after: '>',
  greater_than_or_equal: '>=',
  '>=': '>=',
  at_least: '>=',
  less_than: '<',
  '<': '<',
  less: '<',
  below: '<',
  before: '<',
  less_than_or_equal: '<=',
  '<=': '<=',
  at_most: '<=',
  equals: '=',
  equal: '=',
  is: '=',
  are: '=',
  '=': '=',
  not_equal: '!=',
  '!=': '!=',
  not: '!=',
  like: 'like',
  contains: 'like',
  has: 'like',
  include: 'like',
  in: 'in',
}

export class NaturalLanguageQuery {
  private db: any

  constructor(db?: any) {
    this.db = db
  }

  setDatabase(db: any): void {
    this.db = db
  }

  async parse(query: string): Promise<{ operation: string; table: string; filters: any[]; sorts: any[] }> {
    const parsed = this.parseInternal(query)
    return {
      operation: parsed.operation,
      table: parsed.table,
      filters: parsed.filters,
      sorts: parsed.sorts,
    }
  }

  async execute(query: string): Promise<QueryResult> {
    const start = Date.now()
    const parsed = this.parseInternal(query)

    const qb = await this.getQueryBuilder(parsed.table)
    if (!qb) {
      throw new Error(`Table "${parsed.table}" not found or database not configured`)
    }

    for (const filter of parsed.filters) {
      if (filter.operator === 'like') {
        qb.where(filter.column, 'like', `%${filter.value}%`)
      } else if (filter.operator === 'in') {
        qb.whereIn(filter.column, Array.isArray(filter.value) ? filter.value : [filter.value])
      } else {
        qb.where(filter.column, filter.operator, filter.value)
      }
    }

    for (const sort of parsed.sorts) {
      if (sort.direction === 'desc') {
        qb.orderByDesc(sort.column)
      } else {
        qb.orderBy(sort.column, 'asc')
      }
    }

    if (parsed.limit !== null) {
      qb.limit(parsed.limit)
    }
    if (parsed.offset !== null) {
      qb.offset(parsed.offset)
    }

    let data: any

    if (parsed.operation === 'count') {
      data = await qb.count()
    } else if (parsed.operation === 'aggregate' && parsed.aggregateFn && parsed.aggregateColumn) {
      const fn = parsed.aggregateFn.toUpperCase() as 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'
      switch (fn) {
        case 'SUM':
          data = await qb.sum(parsed.aggregateColumn)
          break
        case 'AVG':
          data = await qb.avg(parsed.aggregateColumn)
          break
        case 'MIN':
          data = await qb.min(parsed.aggregateColumn)
          break
        case 'MAX':
          data = await qb.max(parsed.aggregateColumn)
          break
        default:
          data = await qb.count()
      }
    } else {
      const rows = await qb.get()
      data = parsed.groupBy ? this.groupResults(rows, parsed.groupBy) : rows
    }

    const { sql } = qb.toSQL()

    return {
      query,
      operation: parsed.operation,
      table: parsed.table,
      filters: parsed.filters,
      sorts: parsed.sorts,
      limit: parsed.limit,
      offset: parsed.offset,
      sql,
      data,
      executionTimeMs: Date.now() - start,
    }
  }

  private parseInternal(query: string): ParsedQuery {
    const cleaned = query
      .toLowerCase()
      .replace(/[?.,!;:]/g, '')
      .trim()

    const result: ParsedQuery = {
      operation: 'select',
      table: 'users',
      filters: [],
      sorts: [],
      limit: null,
      offset: null,
      groupBy: null,
      aggregateFn: null,
      aggregateColumn: null,
    }

    result.table = this.extractTable(cleaned)
    result.operation = this.extractOperation(cleaned, result)
    result.filters = this.extractFilters(cleaned, result.table)
    result.sorts = this.extractSorts(cleaned)
    result.limit = this.extractLimit(cleaned)

    return result
  }

  private extractTable(query: string): string {
    for (const [table, aliases] of Object.entries(TABLE_PATTERNS)) {
      for (const alias of aliases) {
        if (query.includes(alias)) return table
      }
    }
    return 'users'
  }

  private extractOperation(query: string, result: ParsedQuery): 'select' | 'count' | 'aggregate' {
    for (const [keyword, fn] of Object.entries(AGGREGATE_KEYWORDS)) {
      if (query.includes(keyword)) {
        result.aggregateFn = fn
        result.aggregateColumn = this.extractAggregateColumn(query)
        return fn === 'count' ? 'count' : 'aggregate'
      }
    }
    return 'select'
  }

  private extractAggregateColumn(query: string): string | null {
    const cols = ['price', 'total', 'amount', 'rating', 'score', 'age', 'count', 'quantity', 'size']
    for (const col of cols) {
      if (query.includes(col)) {
        const tableFields = this.getTableFields(query)
        for (const field of tableFields) {
          if (field.includes(col) || col.includes(field)) return field
        }
        return col
      }
    }
    return 'id'
  }

  private getTableFields(query: string): string[] {
    const allFields: Record<string, string[]> = {
      users: ['id', 'name', 'email', 'age', 'role', 'status', 'created_at'],
      posts: ['id', 'title', 'content', 'status', 'user_id', 'views', 'created_at'],
      comments: ['id', 'content', 'post_id', 'user_id', 'created_at'],
      products: ['id', 'name', 'price', 'description', 'stock', 'category_id', 'created_at'],
      categories: ['id', 'name', 'slug', 'description'],
      orders: ['id', 'total', 'status', 'user_id', 'created_at'],
      reviews: ['id', 'rating', 'content', 'product_id', 'user_id', 'created_at'],
    }
    const table = this.extractTable(query)
    return allFields[table] || ['id', 'name', 'created_at']
  }

  private extractFilters(query: string, table: string): ParsedFilter[] {
    const filters: ParsedFilter[] = []
    const words = query.split(/\s+/)

    const fieldMap = this.buildFieldMap(table)

    for (let i = 0; i < words.length; i++) {
      const word = words[i]

      if (word === 'with' || word === 'where' || word === 'having') {
        const field = words[i + 1]
        if (field && fieldMap[field]) {
          const compWord = words[i + 2]
          const op = COMPARISON_WORDS[compWord!] || '='
          const valStart = i + 3
          let val =
            words
              .slice(valStart)
              .find((w) => !['and', 'or'].includes(w) && !Object.keys(COMPARISON_WORDS).includes(w) && isNaN(Number(w)) === false) ||
            words.slice(valStart).find((w) => !['and', 'or'].includes(w) && !Object.keys(COMPARISON_WORDS).includes(w))
          if (val !== undefined) {
            if (['and', 'or', 'by', 'order', 'asc', 'desc', 'limit', 'offset'].includes(val)) break
            const num = Number(val)
            filters.push({
              column: fieldMap[field],
              operator: op === 'like' ? 'like' : op,
              value: isNaN(num) ? val : num,
              boolean: i > 0 && words[i - 1] === 'or' ? 'or' : 'and',
            })
          }
        }
      }
    }

    if (filters.length === 0) {
      const nounPhrases = ['active', 'published', 'draft', 'archived', 'pending', 'completed', 'cancelled', 'admin', 'user', 'premium']
      for (const phrase of nounPhrases) {
        if (query.includes(phrase)) {
          const statusFields = ['status', 'role', 'type', 'plan']
          for (const sf of statusFields) {
            const fb = this.buildFieldMap(table)
            if (fb[sf]) {
              filters.push({ column: fb[sf], operator: '=', value: phrase, boolean: 'and' })
              break
            }
          }
          break
        }
      }
    }

    return filters
  }

  private buildFieldMap(table: string): Record<string, string> {
    const names: Record<string, string> = {}
    const fields = this.getTableFields(table)
    for (const f of fields) {
      names[f] = f
      names[f.replace(/_/g, '')] = f
      const base = f.replace(/_id$/, '').replace(/_at$/, '')
      names[base] = f
    }
    names.name = 'name'
    names.email = 'email'
    names.title = 'title'
    names.status = 'status'
    names.role = 'role'
    names.age = 'age'
    names.price = 'price'
    names.total = 'total'
    names.rating = 'rating'
    names.views = 'views'
    names.stock = 'stock'
    return names
  }

  private extractSorts(query: string): ParsedSort[] {
    const sorts: ParsedSort[] = []
    const match = query.match(/(?:ordered|sorted|order|sort)\s+by\s+(\w+)(?:\s+(asc|desc|ascending|descending))?/i)
    if (match) {
      const dir = match[2]
        ? match[2].startsWith('d') || match[2].startsWith('D')
          ? ('desc' as const)
          : ('asc' as const)
        : ('asc' as const)
      sorts.push({ column: match[1] ?? '', direction: dir })
    }

    if (sorts.length === 0) {
      const lastWords = ['recent', 'latest', 'newest', 'last', 'new']
      for (const w of lastWords) {
        if (query.includes(w)) {
          sorts.push({ column: 'created_at', direction: 'desc' })
          break
        }
      }
    }

    return sorts
  }

  private extractLimit(query: string): number | null {
    const match = query.match(/(?:top|first|limit|latest|recent)\s+(\d+)/i)
    if (match && match[1]) return parseInt(match[1])
    if (query.includes('latest') || query.includes('recent') || query.includes('newest')) return 10
    return null
  }

  private groupResults(rows: any[], groupBy: string): any {
    const groups: Record<string, any[]> = {}
    for (const row of rows) {
      const key = String(row[groupBy] ?? 'null')
      if (!groups[key]) groups[key] = []
      groups[key].push(row)
    }
    return groups
  }

  private async getQueryBuilder(table: string): Promise<QueryBuilder | null> {
    if (this.db && typeof this.db.table === 'function') {
      return this.db.table(table)
    }
    try {
      const { DatabaseConnection } = await import('../database/connection.js')
      const conn = new DatabaseConnection({
        driver: (process.env.DB_DRIVER as any) || 'sqlite',
        database: process.env.DB_DATABASE || 'speexjs',
      })
      await conn.connect()
      return conn.table(table)
    } catch {
      return null
    }
  }
}

export function registerNlQueryRoutes(app: any, nlq?: NaturalLanguageQuery): void {
  const query = nlq ?? new NaturalLanguageQuery()

  app.post('/api/ai/query', async (ctx: any) => {
    const request = ctx.request
    const body = typeof request.body === 'function' ? await request.body() : request.body || {}
    const queryText = String(body.query || body.text || '').trim()

    if (!queryText) {
      ctx.response.status(400).json({ error: 'Query text is required' })
      return
    }

    try {
      const result = await query.execute(queryText)
      ctx.response.json(result)
    } catch (e: any) {
      ctx.response.status(500).json({
        error: 'Query execution failed',
        message: e.message,
        query: queryText,
      })
    }
  })

  app.post('/api/ai/query/parse', async (ctx: any) => {
    const request = ctx.request
    const body = typeof request.body === 'function' ? await request.body() : request.body || {}
    const queryText = String(body.query || body.text || '').trim()

    if (!queryText) {
      ctx.response.status(400).json({ error: 'Query text is required' })
      return
    }

    try {
      const parsed = await query.parse(queryText)
      ctx.response.json(parsed)
    } catch (e: any) {
      ctx.response.status(500).json({
        error: 'Parse failed',
        message: e.message,
      })
    }
  })
}
