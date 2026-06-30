import { AsyncLocalStorage } from 'node:async_hooks'
import { Model } from './model.js'
import type { QueryRunner } from './types.js'

const asyncLocalStorage = new AsyncLocalStorage<string>()

export class TenantContext {
  static getCurrent(): string | null {
    return asyncLocalStorage.getStore() ?? null
  }

  static setCurrent(id: string): void {
    asyncLocalStorage.enterWith(id)
  }

  static scope<T>(id: string, fn: () => Promise<T>): Promise<T> {
    return asyncLocalStorage.run(id, fn)
  }

  static hasContext(): boolean {
    return asyncLocalStorage.getStore() !== undefined
  }
}

export class Tenant extends Model {
  static table = 'tenants'

  declare id?: string
  name?: string
  slug?: string
  domain?: string
  settings?: Record<string, unknown>
  created_at?: string
  updated_at?: string

  static async findByDomain(domain: string): Promise<Tenant | null> {
    const record = await this.query().where('domain', domain).first()
    return record as Tenant | null
  }

  static async findBySlug(slug: string): Promise<Tenant | null> {
    const record = await this.query().where('slug', slug).first()
    return record as Tenant | null
  }

  static async switchTo(id: string): Promise<void> {
    TenantContext.setCurrent(id)
  }

  static async register(data: { name: string; slug: string; domain?: string; settings?: Record<string, unknown> }): Promise<Tenant> {
    const now = new Date().toISOString()
    const id = await this.query().insert({
      id: crypto.randomUUID(),
      name: data.name,
      slug: data.slug,
      domain: data.domain ?? null,
      settings: data.settings ? JSON.stringify(data.settings) : null,
      created_at: now,
      updated_at: now,
    })
    const tenant = await this.find(id)
    return tenant as Tenant
  }
}

export function addTenantScope(queryRunner: QueryRunner, table: string): QueryRunner {
  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error(`Invalid table name: ${table}`)
  }
  const originalRaw = queryRunner.raw.bind(queryRunner)
  queryRunner.raw = async (sql: string, bindings?: any[]) => {
    const tenantId = TenantContext.getCurrent()
    if (tenantId && table && !sql.includes('tenant_id')) {
      const hasWhere = /WHERE/i.test(sql)
      const whereClause = hasWhere ? ` AND ${table}.tenant_id = ?` : ` WHERE ${table}.tenant_id = ?`
      sql = sql + whereClause
      bindings = [...(bindings ?? []), tenantId]
    }
    return originalRaw(sql, bindings)
  }
  return queryRunner
}

export function ensureTenantId<TableDef extends Record<string, unknown>>(data: TableDef): TableDef & { tenant_id: string } {
  const tenantId = TenantContext.getCurrent()
  if (!tenantId) throw new Error('TenantContext is not set. Ensure tenant middleware is active.')
  return { ...data, tenant_id: tenantId }
}
