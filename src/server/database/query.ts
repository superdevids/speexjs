import type { Dialect } from './dialect.js'
import type { JoinType, OrderDirection, QueryResult, QueryRunner } from './types.js'

interface WhereClause {
  type: 'basic' | 'in' | 'notIn' | 'null' | 'notNull' | 'between' | 'notBetween' | 'like' | 'nested' | 'raw' | 'exists' | 'column' | 'json'
  column?: string
  operator?: string
  value?: unknown
  values?: unknown[]
  boolean: 'and' | 'or'
  nested?: WhereClause[]
  bindings?: any[]
}

export interface RawValue {
  __raw: true
  value: string
  bindings?: any[]
}

export type InsertValues = Record<string, any>

interface JoinClause {
  table: string
  first: string
  operator: string
  second: string
  type: JoinType
}

interface OrderByClause {
  column: string
  direction: OrderDirection
}

interface HavingClause {
  column: string
  operator: string
  value: any
}

export interface PaginatedResult<T> {
  data: T[]
  currentPage: number
  perPage: number
  total: number
  lastPage: number
  from: number
  to: number
  hasMore: boolean
  hasPrev: boolean
  isEmpty: boolean
}

export class QueryBuilder {
  private connection: QueryRunner
  private tableName: string
  private columns: string[] = ['*']
  private distinctEnabled = false
  private wheres: WhereClause[] = []
  private joins: JoinClause[] = []
  private orderBys: OrderByClause[] = []
  private havings: HavingClause[] = []
  private groupBys: string[] = []
  private limitValue: number | null = null
  private offsetValue: number | null = null
  private fromSubquery: string | null = null
  private ctes: { name: string; query: QueryBuilder; recursive?: boolean }[] = []
  private unions: { query: QueryBuilder; type: 'UNION' | 'UNION ALL' | 'INTERSECT' | 'EXCEPT' }[] = []
  private lockMode: string | null = null
  private _sqlCache: { sql: string; bindings: any[] } | null = null

  constructor(connection: QueryRunner, tableName: string) {
    this.connection = connection
    this.tableName = tableName
  }

  private dirty(): void {
    this._sqlCache = null
  }

  select(...columns: string[]): this {
    this.columns = columns.length > 0 ? columns : ['*']
    this.dirty()
    return this
  }

  addSelect(...columns: string[]): this {
    if (this.columns[0] === '*') this.columns = columns
    else this.columns.push(...columns)
    this.dirty()
    return this
  }

  distinct(): this {
    this.distinctEnabled = true
    this.dirty()
    return this
  }

  from(table: string): this {
    this.fromSubquery = table
    this.dirty()
    return this
  }

  private static readonly VALID_OPERATORS = new Set([
    '=',
    '<',
    '>',
    '<=',
    '>=',
    '<>',
    '!=',
    'like',
    'not like',
    'ilike',
    'in',
    'not in',
    'between',
    'not between',
    'is',
    'is not',
    'similar to',
    'not similar to',
    '~',
    '~*',
    '!~',
    '!~*',
    '@>',
    '<@',
    '?',
    '?|',
    '?&',
  ])

  private static assertValidOperator(op: string): void {
    if (!QueryBuilder.VALID_OPERATORS.has(op.toLowerCase())) {
      throw new Error(`Invalid SQL operator: "${op}". Allowed operators: ${[...QueryBuilder.VALID_OPERATORS].join(', ')}`)
    }
  }

  where(column: string, operator: any, value?: any): this {
    if (value === undefined) {
      value = operator
      operator = '='
    }
    QueryBuilder.assertValidOperator(String(operator))
    this.wheres.push({ type: 'basic', column, operator: String(operator), value, boolean: 'and' })
    this.dirty()
    return this
  }

  orWhere(column: string, operator: any, value?: any): this {
    if (value === undefined) {
      value = operator
      operator = '='
    }
    QueryBuilder.assertValidOperator(String(operator))
    this.wheres.push({ type: 'basic', column, operator: String(operator), value, boolean: 'or' })
    this.dirty()
    return this
  }

  whereIn(column: string, values: any[]): this {
    this.wheres.push({ type: 'in', column, values, boolean: 'and' })
    this.dirty()
    return this
  }

  whereNotIn(column: string, values: any[]): this {
    this.wheres.push({ type: 'notIn', column, values, boolean: 'and' })
    this.dirty()
    return this
  }

  whereNull(column: string): this {
    this.wheres.push({ type: 'null', column, boolean: 'and' })
    this.dirty()
    return this
  }

  whereNotNull(column: string): this {
    this.wheres.push({ type: 'notNull', column, boolean: 'and' })
    this.dirty()
    return this
  }

  whereBetween(column: string, range: [any, any]): this {
    this.wheres.push({ type: 'between', column, values: range, boolean: 'and' })
    this.dirty()
    return this
  }

  whereNotBetween(column: string, range: [any, any]): this {
    this.wheres.push({ type: 'notBetween', column, values: range, boolean: 'and' })
    this.dirty()
    return this
  }

  whereLike(column: string, pattern: string): this {
    this.wheres.push({ type: 'like', column, value: pattern, boolean: 'and' })
    this.dirty()
    return this
  }

  whereJson(column: string, value: any): this {
    this.wheres.push({ type: 'json', column, value, boolean: 'and' })
    this.dirty()
    return this
  }

  orWhereLike(column: string, pattern: string): this {
    this.wheres.push({ type: 'like', column, value: pattern, boolean: 'or' })
    this.dirty()
    return this
  }

  orWhereIn(column: string, values: any[]): this {
    this.wheres.push({ type: 'in', column, values, boolean: 'or' })
    this.dirty()
    return this
  }

  orWhereNotIn(column: string, values: any[]): this {
    this.wheres.push({ type: 'notIn', column, values, boolean: 'or' })
    this.dirty()
    return this
  }

  orWhereNull(column: string): this {
    this.wheres.push({ type: 'null', column, boolean: 'or' })
    this.dirty()
    return this
  }

  orWhereNotNull(column: string): this {
    this.wheres.push({ type: 'notNull', column, boolean: 'or' })
    this.dirty()
    return this
  }

  orWhereBetween(column: string, range: [any, any]): this {
    this.wheres.push({ type: 'between', column, values: range, boolean: 'or' })
    this.dirty()
    return this
  }

  whereGroup(callback: (query: QueryBuilder) => void): this {
    const sub = new QueryBuilder(this.connection, this.tableName)
    callback(sub)
    this.wheres.push({ type: 'nested', nested: sub.wheres, boolean: 'and' })
    this.dirty()
    return this
  }

  join(table: string, first: string, operator: string, second: string, type: JoinType = 'inner'): this {
    this.joins.push({ table, first, operator, second, type })
    this.dirty()
    return this
  }

  leftJoin(table: string, first: string, operator: string, second: string): this {
    return this.join(table, first, operator, second, 'left')
  }

  rightJoin(table: string, first: string, operator: string, second: string): this {
    return this.join(table, first, operator, second, 'right')
  }

  crossJoin(table: string, first: string, operator: string, second: string): this {
    return this.join(table, first, operator, second, 'cross')
  }

  joinSub(
    callback: (query: QueryBuilder) => void,
    alias: string,
    first: string,
    operator: string,
    second: string,
    type: JoinType = 'inner',
  ): this {
    const sub = new QueryBuilder(this.connection, this.tableName)
    callback(sub)
    const { sql: subSql } = sub.toSQL()
    this.joins.push({ table: `(${subSql}) AS ${alias}`, first, operator, second, type })
    this.dirty()
    return this
  }

  orderBy(column: string, direction: OrderDirection = 'asc'): this {
    this.orderBys.push({ column, direction })
    this.dirty()
    return this
  }

  orderByDesc(column: string): this {
    return this.orderBy(column, 'desc')
  }

  latest(column = 'created_at'): this {
    return this.orderBy(column, 'desc')
  }

  oldest(column = 'created_at'): this {
    return this.orderBy(column, 'asc')
  }

  inRandomOrder(): this {
    const driver = this.connection.getDriver()
    const fn = driver === 'mysql' ? 'RAND()' : 'RANDOM()'
    this.orderBys.push({ column: fn, direction: 'asc' })
    this.dirty()
    return this
  }

  limit(limit: number): this {
    this.limitValue = limit
    this.dirty()
    return this
  }

  offset(offset: number): this {
    this.offsetValue = offset
    this.dirty()
    return this
  }

  skip(skip: number): this {
    return this.offset(skip)
  }

  take(take: number): this {
    return this.limit(take)
  }

  groupBy(...columns: string[]): this {
    this.groupBys.push(...columns)
    this.dirty()
    return this
  }

  having(column: string, operator: string, value: any): this {
    this.havings.push({ column, operator, value })
    this.dirty()
    return this
  }

  async get<T = any>(): Promise<T[]> {
    const { sql, bindings } = this.toSQL()
    const result = await this.connection.raw(sql, bindings)
    return result.rows as T[]
  }

  async first<T = any>(): Promise<T | null> {
    const qb = this.clone()
    qb.limitValue = 1
    const { sql, bindings } = qb.toSQL()
    const result = await this.connection.raw(sql, bindings)
    return (result.rows.length > 0 ? result.rows[0] : null) as T | null
  }

  async find<T = any>(id: number | string): Promise<T | null> {
    return this.where('id', id).first<T>()
  }

  async pluck(column: string): Promise<any[]> {
    const qb = this.clone()
    qb.columns = [column]
    const { sql, bindings } = qb.toSQL()
    const result = await this.connection.raw(sql, bindings)
    return result.rows.map((row: any) => row[column])
  }

  async count(column = '*'): Promise<number> {
    const qb = this.clone()
    qb.columns = [`COUNT(${column === '*' ? '*' : this.wrap(column)}) as aggregate`]
    qb.orderBys = []
    qb.limitValue = null
    qb.offsetValue = null
    qb.distinctEnabled = false
    const { sql, bindings } = qb.toSQL()
    const result = await this.connection.raw(sql, bindings)
    const row = result.rows[0]
    if (!row) return 0
    return Number(row.aggregate ?? row.count ?? row['COUNT(*)'] ?? 0)
  }

  async exists(): Promise<boolean> {
    return (await this.count()) > 0
  }

  async doesntExist(): Promise<boolean> {
    return !(await this.exists())
  }

  async max(column: string): Promise<number | null> {
    return this.aggregate('MAX', column)
  }

  async min(column: string): Promise<number | null> {
    return this.aggregate('MIN', column)
  }

  async sum(column: string): Promise<number> {
    return (await this.aggregate('SUM', column)) ?? 0
  }

  async avg(column: string): Promise<number> {
    return (await this.aggregate('AVG', column)) ?? 0
  }

  async paginate(perPage = 15, page = 1): Promise<PaginatedResult<any>> {
    if (page < 1) throw new Error('Page number must be >= 1')
    perPage = Math.max(1, Math.min(perPage, 1000))
    const total = await this.count()
    const lastPage = Math.max(1, Math.ceil(total / perPage))
    const currentPage = Math.max(1, Math.min(page, lastPage))
    const qb = this.clone()
    qb.limitValue = perPage
    qb.offsetValue = (currentPage - 1) * perPage
    const { sql, bindings } = qb.toSQL()
    const result = await this.connection.raw(sql, bindings)
    const f = total > 0 ? (currentPage - 1) * perPage + 1 : 0
    const t = total > 0 ? Math.min(currentPage * perPage, total) : 0
    return {
      data: result.rows,
      currentPage,
      perPage,
      total,
      lastPage,
      from: f,
      to: t,
      hasMore: currentPage < lastPage,
      hasPrev: currentPage > 1,
      isEmpty: total === 0,
    }
  }

  async insert(data: Record<string, any>): Promise<number | string> {
    if (Object.keys(data).length === 0) throw new Error('Cannot insert empty object')
    const { sql, bindings } = this.compileInsert(data)
    const driverType = this.connection.getDriver()
    const dialect = this.connection.getDialect()
    if (driverType === 'postgresql') {
      const result = await this.connection.raw(dialect.compileInsertReturning(sql, bindings), bindings)
      return result.rows.length > 0 ? Number(result.rows[0]?.id ?? 0) : 0
    }
    const result = await this.connection.raw(sql, bindings)
    if (driverType === 'mysql') {
      const h = result.rows
      const isOkPacket = (obj: any): obj is { insertId: number } => obj != null && typeof obj === 'object' && 'insertId' in obj
      if (isOkPacket(h)) return Number(h.insertId) ?? 0
      if (Array.isArray(h) && h.length > 0) return Number(h[0]?.insertId ?? h[0]?.id ?? 0)
      return 0
    }
    if (driverType === 'sqlite') {
      const r = await this.connection.raw('SELECT last_insert_rowid() as id')
      return r.rows.length > 0 ? Number(r.rows[0]?.id ?? 0) : 0
    }
    return 0
  }

  async insertGetId(data: Record<string, any>): Promise<number | string> {
    return this.insert(data)
  }

  async upsert(data: Record<string, any>, conflictColumns: string[]): Promise<number | string> {
    const dialect = this.connection.getDialect()
    const { sql, bindings } = this.compileInsert(data)
    const conflictCols = conflictColumns.map((c) => dialect.wrapIdentifier(c)).join(', ')
    const updateCols = Object.keys(data).filter((k) => !conflictColumns.includes(k))
    if (updateCols.length === 0) return this.insert(data)

    let upsertSql: string
    if (this.connection.getDriver() === 'postgresql') {
      const pgUpdates = updateCols.map((c) => `${dialect.wrapIdentifier(c)} = EXCLUDED.${dialect.wrapIdentifier(c)}`).join(', ')
      upsertSql = `${sql} ON CONFLICT (${conflictCols}) DO UPDATE SET ${pgUpdates}`
    } else {
      const mysqlUpdates = updateCols.map((c) => `${dialect.wrapIdentifier(c)} = VALUES(${dialect.wrapIdentifier(c)})`).join(', ')
      upsertSql = `${sql} ON DUPLICATE KEY UPDATE ${mysqlUpdates}`
    }

    const result = await this.connection.raw(upsertSql, bindings)
    return Number((result.rows as any)?.insertId ?? 0)
  }

  async insertReturning(data: Record<string, any>): Promise<any> {
    const { sql, bindings } = this.compileInsert(data)
    const result = await this.connection.raw(this.connection.getDialect().compileInsertReturning(sql, bindings), bindings)
    return result.rows.length > 0 ? result.rows[0] : null
  }

  async insertOrIgnore(data: InsertValues | InsertValues[]): Promise<QueryResult> {
    const dialect = this.connection.getDialect()
    const isArray = Array.isArray(data)
    const rows = isArray ? data : [data]
    const { sql, bindings } = rows.length === 1 ? this.compileInsert(rows[0]) : this.compileInsertMulti(rows)
    return this.connection.raw(dialect.compileInsertOrIgnore(sql), bindings)
  }

  raw(value: string, bindings?: any[]): RawValue {
    return { __raw: true, value, bindings }
  }

  async increment(column: string, amount = 1): Promise<number> {
    return this.update({ [column]: this.raw(`${this.wrap(column)} + ?`, [amount]) })
  }

  async decrement(column: string, amount = 1): Promise<number> {
    return this.update({ [column]: this.raw(`${this.wrap(column)} - ?`, [amount]) })
  }

  async update(data: Record<string, any>): Promise<number> {
    if (Object.keys(data).length === 0) throw new Error('Cannot update with empty data')
    const { sql, bindings } = this.compileUpdate(data)
    const result = await this.connection.raw(sql, bindings)
    if (result.rows && typeof result.rows === 'object' && 'affectedRows' in result.rows) {
      return (result.rows as any).affectedRows ?? 0
    }
    const rows = result.rows as any[]
    if (rows.length > 0) {
      const info = rows[0]
      return info.affectedRows ?? info.changes ?? rows.length
    }
    return 0
  }

  async delete(): Promise<number> {
    const { sql, bindings } = this.compileDelete()
    const result = await this.connection.raw(sql, bindings)
    if (result.rows && typeof result.rows === 'object' && 'affectedRows' in result.rows) {
      return (result.rows as any).affectedRows ?? 0
    }
    const rows = result.rows as any[]
    if (rows.length > 0) {
      const info = rows[0]
      return info.affectedRows ?? info.changes ?? rows.length
    }
    return 0
  }

  async truncate(): Promise<void> {
    await this.connection.raw(this.connection.getDialect().compileTruncate(this.tableName))
  }

  // NOTE: Offset-based pagination degrades on large datasets.
  // For high-volume tables, consider keyset pagination (WHERE id > ? ORDER BY id LIMIT ?) instead.
  async chunk(size: number, callback: (rows: any[]) => Promise<void>): Promise<void> {
    let page = 1
    let hasMore = true
    while (hasMore) {
      const qb = this.clone()
      qb.limitValue = size
      qb.offsetValue = (page - 1) * size
      const rows = await qb.get()
      if (rows.length === 0) {
        hasMore = false
        break
      }
      await callback(rows)
      if (rows.length < size) hasMore = false
      page++
    }
  }

  clone(): QueryBuilder {
    const qb = new QueryBuilder(this.connection, this.tableName)
    qb.columns = [...this.columns]
    qb.distinctEnabled = this.distinctEnabled
    qb.wheres = this.cloneWheres(this.wheres)
    qb.joins = [...this.joins]
    qb.orderBys = [...this.orderBys]
    qb.havings = [...this.havings]
    qb.groupBys = [...this.groupBys]
    qb.limitValue = this.limitValue
    qb.offsetValue = this.offsetValue
    qb.fromSubquery = this.fromSubquery
    qb.ctes = [...this.ctes]
    qb.unions = [...this.unions]
    qb.lockMode = this.lockMode
    qb._sqlCache = null
    return qb
  }

  /**
   * ⚠️ UNSAFE: Raw SQL where clause. Do NOT pass user input directly.
   * Use parameterized bindings for user-provided values.
   */
  whereRaw(sql: string, bindings?: any[]): this {
    this.wheres.push({ type: 'raw', value: sql, boolean: 'and', bindings: bindings ?? [] })
    this.dirty()
    return this
  }

  /**
   * ⚠️ UNSAFE: Raw SQL or where clause. Do NOT pass user input directly.
   * Use parameterized bindings for user-provided values.
   */
  orWhereRaw(sql: string, bindings?: any[]): this {
    this.wheres.push({ type: 'raw', value: sql, boolean: 'or', bindings: bindings ?? [] })
    this.dirty()
    return this
  }

  /**
   * ⚠️ UNSAFE: Raw SQL order by clause. Do NOT pass user input directly.
   */
  orderByRaw(sql: string): this {
    this.orderBys.push({ column: sql, direction: 'asc' })
    return this
  }

  whereExists(callback: (query: QueryBuilder) => void): this {
    const sub = new QueryBuilder(this.connection, this.tableName)
    callback(sub)
    this.wheres.push({ type: 'exists', nested: (sub as unknown as { wheres: WhereClause[] }).wheres, boolean: 'and' })
    return this
  }

  whereColumn(first: string, operator: string, second: string): this {
    this.wheres.push({ type: 'column', column: first, operator, value: second, boolean: 'and' })
    this.dirty()
    return this
  }

  when(condition: boolean, callback: (query: this) => void): this {
    if (condition) callback(this)
    return this
  }

  with(name: string, callback: (query: QueryBuilder) => void, recursive = false): this {
    const sub = new QueryBuilder(this.connection, this.tableName)
    callback(sub)
    this.ctes.push({ name, query: sub, recursive })
    this.dirty()
    return this
  }

  withRecursive(name: string, callback: (query: QueryBuilder) => void): this {
    return this.with(name, callback, true)
  }

  union(callback: (query: QueryBuilder) => void): this {
    const sub = new QueryBuilder(this.connection, this.tableName)
    callback(sub)
    this.unions.push({ query: sub, type: 'UNION' })
    this.dirty()
    return this
  }

  unionAll(callback: (query: QueryBuilder) => void): this {
    const sub = new QueryBuilder(this.connection, this.tableName)
    callback(sub)
    this.unions.push({ query: sub, type: 'UNION ALL' })
    this.dirty()
    return this
  }

  lockForUpdate(): this {
    this.lockMode = 'FOR UPDATE'
    this.dirty()
    return this
  }

  sharedLock(): this {
    this.lockMode = 'FOR SHARE'
    this.dirty()
    return this
  }

  toSQL(): { sql: string; bindings: any[] } {
    if (this._sqlCache !== null) return this._sqlCache
    const bindings: any[] = []
    const dialect = this.connection.getDialect()
    const wrapId = (c: string) => (c.includes('(') || c === '*' || c.includes(' as ') || c.includes(' AS ') ? c : dialect.wrapIdentifier(c))
    const wrappedFrom = this.fromSubquery ?? dialect.wrapIdentifier(this.fromSubquery ?? this.tableName)
    let sql = `${this.distinctEnabled ? 'SELECT DISTINCT ' : 'SELECT '}${this.columns.map(wrapId).join(', ')} FROM ${wrappedFrom}`
    if (this.ctes.length > 0) {
      const cteParts = this.ctes.map((cte) => {
        const { sql: subSql } = cte.query.toSQL()
        return `${cte.recursive ? 'RECURSIVE ' : ''}${cte.name} AS (${subSql})`
      })
      sql = `WITH ${cteParts.join(', ')} ${sql}`
    }
    const joinSQL = this.compileJoins(dialect)
    if (joinSQL) sql += joinSQL
    const whereSQL = this.compileWheres(dialect, bindings)
    if (whereSQL) sql += whereSQL
    if (this.groupBys.length > 0) sql += ` GROUP BY ${this.groupBys.map((c) => dialect.wrapIdentifier(c)).join(', ')}`
    const havingSQL = this.compileHavings(dialect, bindings)
    if (havingSQL) sql += havingSQL
    sql += this.compileOrderByLimit(dialect, bindings)
    for (const u of this.unions) {
      const { sql: unionSql } = u.query.toSQL()
      sql += ` ${u.type} ${unionSql}`
    }
    if (this.lockMode) sql += ` ${this.lockMode}`
    this._sqlCache = { sql, bindings }
    return this._sqlCache
  }

  dd(): string {
    const { sql, bindings } = this.toSQL()
    const r = `SQL: ${sql}\nBindings: ${JSON.stringify(bindings)}`
    console.error(r)
    return r
  }

  private compileJoins(dialect: Dialect): string {
    if (this.joins.length === 0) return ''
    return (
      ' ' +
      this.joins
        .map(
          (j) =>
            `${j.type.toUpperCase()} JOIN ${j.table.includes('(') ? j.table : dialect.wrapIdentifier(j.table)} ON ${dialect.wrapIdentifier(j.first)} ${j.operator} ${this.wrap(j.second)}`,
        )
        .join(' ')
    )
  }

  private compileWheres(dialect: Dialect, bindings: any[]): string {
    if (this.wheres.length === 0) return ''
    const sql = this.compileWhereArray(this.wheres, dialect, bindings)
    return sql ? ` WHERE ${sql}` : ''
  }

  private compileWhereArray(wheres: WhereClause[], dialect: Dialect, bindings: any[]): string {
    if (wheres.length === 0) return ''
    const parts = wheres.map((w) => this.compileSingleWhere(w, dialect, bindings)).filter((s): s is string => s !== null)
    if (parts.length === 0) return ''
    return parts.reduce((acc, part, i) => {
      if (i === 0) return part
      return `${acc} ${(wheres[i]?.boolean ?? 'and').toUpperCase()} ${part}`
    }, '')
  }

  private compileSingleWhere(w: WhereClause, dialect: Dialect, bindings: any[]): string | null {
    const col = w.column ? dialect.wrapIdentifier(w.column) : ''

    switch (w.type) {
      case 'basic': {
        bindings.push(w.value)
        return `${col} ${w.operator} ${dialect.makeParameter(bindings.length - 1)}`
      }
      case 'in':
      case 'notIn': {
        const ph = w
          .values!.map((v) => {
            bindings.push(v)
            return dialect.makeParameter(bindings.length - 1)
          })
          .join(', ')
        return `${col} ${w.type === 'in' ? 'IN' : 'NOT IN'} (${ph})`
      }
      case 'null':
        return `${col} IS NULL`
      case 'notNull':
        return `${col} IS NOT NULL`
      case 'between':
      case 'notBetween': {
        bindings.push(w.values![0], w.values![1])
        const kw = w.type === 'between' ? 'BETWEEN' : 'NOT BETWEEN'
        return `${col} ${kw} ${dialect.makeParameter(bindings.length - 2)} AND ${dialect.makeParameter(bindings.length - 1)}`
      }
      case 'like': {
        bindings.push(w.value)
        return `${col} LIKE ${dialect.makeParameter(bindings.length - 1)}`
      }
      case 'nested': {
        const nestedSQL = this.compileNestedWhere(w.nested!, dialect, bindings)
        return nestedSQL ? `(${nestedSQL})` : null
      }
      case 'raw':
        if (w.bindings) bindings.push(...w.bindings)
        return String(w.value)
      case 'exists':
        return `EXISTS (SELECT 1 FROM ${dialect.wrapIdentifier(this.tableName)} WHERE ${this.compileWhereArray(w.nested!, dialect, bindings)})`
      case 'column':
        return `${dialect.wrapIdentifier(w.column!)} ${w.operator} ${dialect.wrapIdentifier(w.value as string)}`
      case 'json': {
        bindings.push(w.value !== undefined ? JSON.stringify(w.value) : null)
        return `${col} = ${dialect.makeParameter(bindings.length - 1)}`
      }
      default:
        return null
    }
  }

  private compileNestedWhere(wheres: WhereClause[], dialect: Dialect, bindings: any[]): string {
    return this.compileWhereArray(wheres, dialect, bindings)
  }

  private compileHavings(dialect: Dialect, bindings: any[]): string {
    if (this.havings.length === 0) return ''
    return ` HAVING ${this.havings
      .map((h) => {
        bindings.push(h.value)
        return `${dialect.wrapIdentifier(h.column)} ${h.operator} ${dialect.makeParameter(bindings.length - 1)}`
      })
      .join(' AND ')}`
  }

  private compileInsert(data: Record<string, any>): { sql: string; bindings: any[] } {
    const dialect = this.connection.getDialect()
    const bindings: any[] = []
    const cols = Object.keys(data)
    const placeholders = Object.values(data)
      .map((v) => {
        bindings.push(v)
        return dialect.makeParameter(bindings.length - 1)
      })
      .join(', ')
    const sql = `INSERT INTO ${dialect.wrapIdentifier(this.tableName)} (${cols.map((c) => dialect.wrapIdentifier(c)).join(', ')}) VALUES (${placeholders})`
    return { sql, bindings }
  }

  private compileInsertMulti(rows: Record<string, any>[]): { sql: string; bindings: any[] } {
    if (rows.length === 0) throw new Error('Cannot insert empty array')
    const dialect = this.connection.getDialect()
    const bindings: any[] = []
    const cols = Object.keys(rows[0]!)
    const placeholders = rows.map((row) => {
      const vals = cols.map((col) => {
        bindings.push(row[col])
        return dialect.makeParameter(bindings.length - 1)
      })
      return `(${vals.join(', ')})`
    })
    const sql = `INSERT INTO ${dialect.wrapIdentifier(this.tableName)} (${cols.map((c) => dialect.wrapIdentifier(c)).join(', ')}) VALUES ${placeholders.join(', ')}`
    return { sql, bindings }
  }

  private compileOrderByLimit(dialect: Dialect, bindings: any[]): string {
    let sql = ''
    if (this.orderBys.length > 0) {
      sql += ` ORDER BY ${this.orderBys
        .map((o) => {
          const col = o.column === 'RANDOM()' ? o.column : dialect.wrapIdentifier(o.column)
          return `${col} ${o.direction.toUpperCase()}`
        })
        .join(', ')}`
    }
    const limitOffsetSQL = dialect.compileLimitOffset(bindings, this.limitValue, this.offsetValue)
    if (limitOffsetSQL) sql += limitOffsetSQL
    return sql
  }

  private compileUpdate(data: Record<string, any>): {
    sql: string
    bindings: any[]
  } {
    const dialect = this.connection.getDialect()
    const bindings: any[] = []

    const sets = Object.entries(data).map(([key, value]) => {
      if (typeof value === 'object' && value !== null && (value as RawValue).__raw) {
        const rawVal = value as RawValue
        if (rawVal.bindings) bindings.push(...rawVal.bindings)
        return `${dialect.wrapIdentifier(key)} = ${rawVal.value}`
      }
      bindings.push(value)
      return `${dialect.wrapIdentifier(key)} = ${dialect.makeParameter(bindings.length - 1)}`
    })

    let sql = `UPDATE ${dialect.wrapIdentifier(this.tableName)} SET ${sets.join(', ')}`

    const whereSQL = this.compileWheres(dialect, bindings)
    if (whereSQL) sql += whereSQL

    sql += this.compileOrderByLimit(dialect, bindings)
    return { sql, bindings }
  }

  private compileDelete(): { sql: string; bindings: any[] } {
    const dialect = this.connection.getDialect()
    const bindings: any[] = []
    let sql = `DELETE FROM ${dialect.wrapIdentifier(this.tableName)}`
    const whereSQL = this.compileWheres(dialect, bindings)
    if (whereSQL) sql += whereSQL
    sql += this.compileOrderByLimit(dialect, bindings)
    return { sql, bindings }
  }

  private async aggregate(fn: string, column: string): Promise<number | null> {
    const qb = this.clone()
    qb.columns = [`${fn}(${this.wrap(column)}) as aggregate`]
    qb.orderBys = []
    qb.limitValue = null
    qb.offsetValue = null
    const { sql, bindings } = qb.toSQL()
    const result = await this.connection.raw(sql, bindings)
    const row = result.rows[0]
    if (!row) return null
    const val = row.aggregate ?? row[`${fn}(${column})`]
    return val != null ? Number(val) : null
  }

  private cloneWheres(wheres: WhereClause[]): WhereClause[] {
    return wheres.map((w) => ({
      ...w,
      values: w.values ? [...w.values] : undefined,
      nested: w.nested ? this.cloneWheres(w.nested) : undefined,
    }))
  }

  private wrap(identifier: string): string {
    if (identifier === '*' || identifier.includes('(')) return identifier
    return this.connection.getDialect().wrapIdentifier(identifier)
  }
}
