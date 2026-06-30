import { SuperApp, type AppOptions } from '../index.js'
import { TestRequest } from './index.js'
import type { QueryRunner } from '../database/types.js'

import { actingAs as actingAsOriginal } from './auth.js'

export interface TestAppOptions extends AppOptions {
  database?: QueryRunner
}

export function createTestApp(options: TestAppOptions = {}): SuperApp {
  const app = new SuperApp(options)

  const prevEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'testing'

  const cleanup = () => {
    process.env.NODE_ENV = prevEnv
  }

  ;(app as any).__testCleanup = cleanup

  return app
}

export class TestRequestExtended extends TestRequest {
  private headers: Record<string, string> = {}
  private queryParams: Record<string, string> = {}

  withHeader(name: string, value: string): this {
    this.headers[name.toLowerCase()] = value
    return this
  }

  withHeaders(headers: Record<string, string>): this {
    for (const [k, v] of Object.entries(headers)) {
      this.headers[k.toLowerCase()] = v
    }
    return this
  }

  withQuery(params: Record<string, string>): this {
    this.queryParams = { ...this.queryParams, ...params }
    return this
  }

  withBearerToken(token: string): this {
    this.headers['authorization'] = `Bearer ${token}`
    return this
  }

  withCookie(name: string, value: string): this {
    const existing = this.headers['cookie'] ?? ''
    this.headers['cookie'] = existing ? `${existing}; ${name}=${value}` : `${name}=${value}`
    return this
  }

  async get(path: string): Promise<import('./index.js').TestResponse> {
    return this.request('GET', path)
  }

  async post(path: string, body?: unknown): Promise<import('./index.js').TestResponse> {
    return this.request('POST', path, body)
  }

  async put(path: string, body?: unknown): Promise<import('./index.js').TestResponse> {
    return this.request('PUT', path, body)
  }

  async patch(path: string, body?: unknown): Promise<import('./index.js').TestResponse> {
    return this.request('PATCH', path, body)
  }

  async delete(path: string): Promise<import('./index.js').TestResponse> {
    return this.request('DELETE', path)
  }

  private queryString(params: Record<string, string>): string {
    const entries = Object.entries(params)
    if (entries.length === 0) return ''
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  }

  protected async request(method: string, path: string, body?: unknown): Promise<import('./index.js').TestResponse> {
    const qs = this.queryString(this.queryParams)
    this.queryParams = {}

    const app = (this as any).app as SuperApp
    const { IncomingMessage, ServerResponse } = await import('node:http')
    const { Socket } = await import('node:net')
    const { SuperRequest } = await import('../http/request.js')
    const { SuperResponse } = await import('../http/response.js')

    const socket = new Socket()
    const req = new IncomingMessage(socket)
    req.method = method
    req.url = path + qs
    req.headers = {
      'content-type': body ? 'application/json' : undefined,
      ...this.headers,
    }

    this.headers = {}

    const res = new ServerResponse(req)

    const sreq = new SuperRequest(req as any)
    const sres = new SuperResponse(res as any)

    if (body && method !== 'GET') {
      ;(sreq as any)._bodyReadPromise = Promise.resolve({
        raw: Buffer.from(JSON.stringify(body)),
        text: JSON.stringify(body),
        json: body,
        parsed: body,
        formData: null,
        files: null,
        multipartParsed: null,
      })
      ;(sreq as any).bodyCache = await (sreq as any)._bodyReadPromise
    }

    await (app as any).handleRequest(sreq, sres)

    const { TestResponse } = await import('./index.js')
    return new TestResponse(sres)
  }
}

export function testRequest(app: SuperApp): TestRequestExtended {
  return new TestRequestExtended(app)
}

export async function refreshDatabase(runner?: QueryRunner): Promise<void> {
  const db = runner ?? getDefaultRunner()
  if (!db) return

  const tables = await getTableNames(db)
  const dialect = db.getDialect()

  for (const table of tables) {
    const sql = dialect.compileTruncate(table)
    await db.raw(sql)
  }
}

export function actingAs(app: SuperApp, user: Record<string, unknown>): TestRequestExtended {
  actingAsOriginal(app, user as any)
  return testRequest(app)
}

let defaultRunner: QueryRunner | null = null

export function setDefaultRunner(runner: QueryRunner): void {
  defaultRunner = runner
}

function getDefaultRunner(): QueryRunner | null {
  return defaultRunner
}

async function getTableNames(runner: QueryRunner): Promise<string[]> {
  try {
    const driver = runner.getDriver()
    if (driver === 'sqlite') {
      const result = await runner.raw(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%'",
      )
      return (result.rows ?? []).map((r: any) => r.name).filter(Boolean)
    }
    if (driver === 'mysql') {
      const result = await runner.raw('SHOW TABLES')
      const key = Object.keys(result.rows[0] ?? {})[0]
      if (key) return result.rows.map((r: any) => r[key]).filter(Boolean)
    }
    if (driver === 'postgresql') {
      const result = await runner.raw("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'")
      return (result.rows ?? []).map((r: any) => r.tablename).filter(Boolean)
    }
  } catch {
    /* ignore */
  }
  return []
}
