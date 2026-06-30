import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Middleware } from '../middleware/index.js'

export interface AuditEvent {
  userId?: string
  action: 'create' | 'update' | 'delete' | 'read' | 'login' | 'logout'
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
  timestamp: Date
}

export type AuditStore = 'database' | 'file' | 'console'

interface AuditStoreBackend {
  log(event: AuditEvent): Promise<void>
  query(filters?: Partial<AuditEvent>): Promise<AuditEvent[]>
  prune(olderThan: Date): Promise<number>
}

class ConsoleStore implements AuditStoreBackend {
  async log(event: AuditEvent): Promise<void> {
    console.log(JSON.stringify({ type: 'audit', ...event, timestamp: event.timestamp.toISOString() }))
  }

  async query(_filters?: Partial<AuditEvent>): Promise<AuditEvent[]> {
    return []
  }

  async prune(_olderThan: Date): Promise<number> {
    return 0
  }
}

class FileStore implements AuditStoreBackend {
  private path: string
  private buffer: AuditEvent[] = []

  constructor(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.path = join(dir, 'audit.jsonl')
    if (!existsSync(this.path)) writeFileSync(this.path, '', 'utf-8')
  }

  async log(event: AuditEvent): Promise<void> {
    this.buffer.push(event)
    appendFileSync(this.path, JSON.stringify(event) + '\n', 'utf-8')
  }

  async query(filters?: Partial<AuditEvent>): Promise<AuditEvent[]> {
    const content = readFileSync(this.path, 'utf-8').trim()
    if (!content) return []
    const all: AuditEvent[] = content.split('\n').map((line) => JSON.parse(line))
    return this.applyFilters(all, filters)
  }

  async prune(olderThan: Date): Promise<number> {
    const content = readFileSync(this.path, 'utf-8').trim()
    if (!content) return 0
    const lines = content.split('\n')
    const kept: string[] = []
    let removed = 0
    for (const line of lines) {
      const event: AuditEvent = JSON.parse(line)
      if (new Date(event.timestamp) < olderThan) {
        removed++
      } else {
        kept.push(line)
      }
    }
    writeFileSync(this.path, kept.join('\n') + '\n', 'utf-8')
    return removed
  }

  private applyFilters(events: AuditEvent[], filters?: Partial<AuditEvent>): AuditEvent[] {
    if (!filters) return events
    return events.filter((e) => {
      if (filters.action && e.action !== filters.action) return false
      if (filters.resource && e.resource !== filters.resource) return false
      if (filters.userId && e.userId !== filters.userId) return false
      return true
    })
  }
}

class DatabaseStore implements AuditStoreBackend {
  private db: { raw: (sql: string, bindings?: any[]) => Promise<{ rows: any[] }> }
  private table: string

  constructor(db: { raw: (sql: string, bindings?: any[]) => Promise<{ rows: any[] }> }, table: string = 'audit_logs') {
    this.db = db
    this.table = table
  }

  async log(event: AuditEvent): Promise<void> {
    await this.db.raw(
      `INSERT INTO \`${this.table}\` (\`user_id\`, \`action\`, \`resource\`, \`resource_id\`, \`details\`, \`ip\`, \`user_agent\`, \`created_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.userId ?? null,
        event.action,
        event.resource,
        event.resourceId ?? null,
        event.details ? JSON.stringify(event.details) : null,
        event.ip ?? null,
        event.userAgent ?? null,
        event.timestamp.toISOString(),
      ],
    )
  }

  async query(filters?: Partial<AuditEvent>): Promise<AuditEvent[]> {
    let sql = `SELECT * FROM \`${this.table}\``
    const clauses: string[] = []
    const bindings: any[] = []

    if (filters?.userId) {
      clauses.push('`user_id` = ?')
      bindings.push(filters.userId)
    }
    if (filters?.action) {
      clauses.push('`action` = ?')
      bindings.push(filters.action)
    }
    if (filters?.resource) {
      clauses.push('`resource` = ?')
      bindings.push(filters.resource)
    }

    if (clauses.length > 0) {
      sql += ' WHERE ' + clauses.join(' AND ')
    }
    sql += ' ORDER BY `created_at` DESC LIMIT 1000'

    const result = await this.db.raw(sql, bindings)
    return result.rows.map((row: any) => ({
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      details: row.details ? JSON.parse(row.details) : undefined,
      ip: row.ip,
      userAgent: row.user_agent,
      timestamp: new Date(row.created_at),
    }))
  }

  async prune(olderThan: Date): Promise<number> {
    const result = await this.db.raw(`DELETE FROM \`${this.table}\` WHERE \`created_at\` < ?`, [olderThan.toISOString()])
    return result.rows.length ?? 0
  }
}

export class Audit {
  private store: AuditStoreBackend

  constructor(
    store: AuditStore = 'console',
    options?: { db?: { raw: (sql: string, bindings?: any[]) => Promise<{ rows: any[] }> }; fileDir?: string; table?: string },
  ) {
    switch (store) {
      case 'database': {
        if (!options?.db) throw new Error('Database store requires a db option')
        this.store = new DatabaseStore(options.db, options.table)
        break
      }
      case 'file': {
        this.store = new FileStore(options?.fileDir ?? join(process.cwd(), 'storage', 'audit'))
        break
      }
      default: {
        this.store = new ConsoleStore()
      }
    }
  }

  async log(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
    await this.store.log({ ...event, timestamp: new Date() })
  }

  async query(filters?: Partial<AuditEvent>): Promise<AuditEvent[]> {
    return this.store.query(filters)
  }

  async prune(olderThan: Date): Promise<number> {
    return this.store.prune(olderThan)
  }
}

export function auditMiddleware(audit: Audit): Middleware {
  return (ctx, next) => {
    const { request, response } = ctx

    const originalSend = response.send.bind(response)
    response.send = (body: any, status?: number, contentType?: string) => {
      const result = originalSend(body, status, contentType)

      if (request.method !== 'GET') {
        audit
          .log({
            action:
              request.method === 'POST'
                ? 'create'
                : request.method === 'PUT' || request.method === 'PATCH'
                  ? 'update'
                  : request.method === 'DELETE'
                    ? 'delete'
                    : 'read',
            resource: request.path,
            userId: ((ctx as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined)?.id as string | undefined,
            ip: request.ip,
            userAgent: request.headers.get('user-agent'),
            details: { statusCode: response.statusCode },
          })
          .catch(() => {
            /* silent */
          })
      }

      return result
    }

    return next()
  }
}
