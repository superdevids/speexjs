import { bench, group, run } from 'mitata'
import { speexjs } from '../src/server/index.js'
import { SuperRequest } from '../src/server/http/request.js'
import { SuperResponse } from '../src/server/http/response.js'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { Router } from '../src/server/router/index.js'
import { MiddlewarePipeline } from '../src/server/middleware/index.js'
import { schema, type Schema } from '../src/schema/index.js'

function mockReq(method: string, path: string): SuperRequest {
  const socket = new Socket()
  const msg = new IncomingMessage(socket)
  msg.method = method
  msg.url = path
  return new SuperRequest(msg as any)
}

function mockRes(): SuperResponse {
  return new SuperResponse(new ServerResponse(new IncomingMessage(new Socket())) as any)
}

// ─── Routing Benchmarks ──────────────────────────────────

const app = speexjs()

app.get('/hello', async ({ response }) => response.json({ message: 'Hello, World!' }))
app.get('/users/:id', async ({ response, params }) => response.json({ id: params.id }))
app.get('/users/:id/posts/:postId', async ({ response, params }) => response.json({ userId: params.id, postId: params.postId }))
app.post('/data', async ({ response, request }) => {
  const body = await request.json()
  response.json({ received: body })
})
app.get('/search', async ({ response, query }) => response.json({ q: query.q ?? '' }))
app.post('/api/users', async ({ response }) => response.status(201).json({ id: 1 }))
app.put('/api/users/:id', async ({ response, params }) => response.json({ updated: params.id }))
app.delete('/api/users/:id', async ({ response }) => response.status(204))

group('Routing', () => {
  bench('static route GET /hello', async () => {
    const req = mockReq('GET', '/hello')
    const res = mockRes()
    await (app as any).handleRequest(req, res)
  })

  bench('dynamic param GET /users/42', async () => {
    const req = mockReq('GET', '/users/42')
    const res = mockRes()
    await (app as any).handleRequest(req, res)
  })

  bench('nested params GET /users/42/posts/7', async () => {
    const req = mockReq('GET', '/users/42/posts/7')
    const res = mockRes()
    await (app as any).handleRequest(req, res)
  })

  bench('query string GET /search?q=test', async () => {
    const req = mockReq('GET', '/search?q=test')
    const res = mockRes()
    await (app as any).handleRequest(req, res)
  })

  bench('POST with body parsing', async () => {
    const socket = new Socket()
    const msg = new IncomingMessage(socket)
    msg.method = 'POST'
    msg.url = '/data'
    msg.headers = { 'content-type': 'application/json', 'content-length': '27' }

    const req = new SuperRequest(msg as any)
    const res = new SuperResponse(new ServerResponse(msg) as any)

    const chunk = Buffer.from(JSON.stringify({ key: 'value', num: 42 }))
    msg.emit('data', chunk)
    msg.emit('end')

    await (app as any).handleRequest(req, res)
  })

  bench('404 not found', async () => {
    const req = mockReq('GET', '/nonexistent')
    const res = mockRes()
    await (app as any).handleRequest(req, res)
  })
})

// ─── Middleware Pipeline Benchmarks ──────────────────────

function createMiddlewareApp(middlewareCount: number) {
  const a = speexjs()
  for (let i = 0; i < middlewareCount; i++) {
    a.use(async (ctx, next) => {
      await next()
    })
  }
  a.get('/test', async ({ response }) => response.json({ ok: true }))
  return a
}

const appNoMw = createMiddlewareApp(0)
const appSingleMw = createMiddlewareApp(1)
const appFiveMw = createMiddlewareApp(5)
const appTenMw = createMiddlewareApp(10)

group('Middleware Pipeline', () => {
  bench('0 middleware (direct route)', async () => {
    const req = mockReq('GET', '/test')
    const res = mockRes()
    await (appNoMw as any).handleRequest(req, res)
  })

  bench('1 middleware', async () => {
    const req = mockReq('GET', '/test')
    const res = mockRes()
    await (appSingleMw as any).handleRequest(req, res)
  })

  bench('5 middleware stack', async () => {
    const req = mockReq('GET', '/test')
    const res = mockRes()
    await (appFiveMw as any).handleRequest(req, res)
  })

  bench('10 middleware stack', async () => {
    const req = mockReq('GET', '/test')
    const res = mockRes()
    await (appTenMw as any).handleRequest(req, res)
  })
})

// ─── JSON Serialization Benchmarks ───────────────────────

const smallPayload = { id: 1, name: 'test', email: 'test@example.com' }
const mediumPayload = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  profile: { bio: 'Hello world', avatar: 'https://example.com/avatar.png', age: 30 },
  settings: { theme: 'dark', notifications: true, language: 'en' },
  tags: ['javascript', 'typescript', 'node'],
}
const largePayload = (() => {
  const users = []
  for (let i = 0; i < 100; i++) {
    users.push({ id: i, name: `User ${i}`, email: `user${i}@test.com`, active: true })
  }
  return { users, total: 100, page: 1 }
})()

const smallJson = JSON.stringify(smallPayload)
const mediumJson = JSON.stringify(mediumPayload)
const largeJson = JSON.stringify(largePayload)

group('JSON Serialization', () => {
  bench('stringify small object', () => {
    JSON.stringify(smallPayload)
  })

  bench('stringify medium object', () => {
    JSON.stringify(mediumPayload)
  })

  bench('stringify large array', () => {
    JSON.stringify(largePayload)
  })

  bench('parse small JSON', () => {
    JSON.parse(smallJson)
  })

  bench('parse medium JSON', () => {
    JSON.parse(mediumJson)
  })

  bench('parse large JSON', () => {
    JSON.parse(largeJson)
  })
})

// ─── Schema Validation Benchmarks ────────────────────────

const StringSchema = schema.string()
const EmailSchema = schema.string().email()
const NumberSchema = schema.number()
const UserSchema = schema.object({
  name: schema.string().min(2).max(100),
  email: schema.string().email(),
  age: schema.number().int().min(18).max(120),
  role: schema.string().optional(),
  tags: schema.array(schema.string()).optional(),
})

const validUser = { name: 'John Doe', email: 'john@test.com', age: 30 }
const invalidUser = { name: 'J', email: 'not-an-email', age: 15 }
const deepSchema = schema.object({
  level1: schema.object({
    level2: schema.object({
      level3: schema.object({
        value: schema.string(),
      }),
    }),
  }),
})

group('Schema Validation', () => {
  bench('string parse valid', () => {
    StringSchema.parse('hello world')
  })

  bench('string email parse valid', () => {
    EmailSchema.parse('user@example.com')
  })

  bench('string email parse invalid', () => {
    try {
      EmailSchema.parse('not-an-email')
    } catch {}
  })

  bench('number parse', () => {
    NumberSchema.parse(42)
  })

  bench('object parse valid', () => {
    UserSchema.parse(validUser)
  })

  bench('object parse invalid', () => {
    try {
      UserSchema.parse(invalidUser)
    } catch {}
  })

  bench('deeply nested object', () => {
    deepSchema.parse({
      level1: { level2: { level3: { value: 'deep' } } },
    })
  })
})

// ─── Query Builder Benchmarks ────────────────────────────

function buildSimpleSelect(table: string, fields: string[], where?: Record<string, unknown>): string {
  const f = fields.length > 0 ? fields.join(', ') : '*'
  let sql = `SELECT ${f} FROM ${table}`
  if (where !== undefined) {
    const clauses = Object.entries(where).map(([k, v]) => {
      if (v === null) return `${k} IS NULL`
      if (Array.isArray(v)) return `${k} IN (${v.map((x: unknown) => `'${String(x)}'`).join(', ')})`
      if (typeof v === 'string') return `${k} = '${(v as string).replace(/'/g, "''")}'`
      return `${k} = ${v}`
    })
    sql += ` WHERE ${clauses.join(' AND ')}`
  }
  return sql
}

function buildJoinSelect(
  tables: { name: string; alias?: string }[],
  joins: { type: string; table: string; on: string }[],
  fields: string[],
  where?: Record<string, unknown>,
): string {
  const main = tables[0]
  const f = fields.length > 0 ? fields.join(', ') : '*'
  let sql = `SELECT ${f} FROM ${main!.name}${main!.alias ? ` AS ${main!.alias}` : ''}`
  for (const j of joins) {
    sql += ` ${j.type.toUpperCase()} JOIN ${j.table} ON ${j.on}`
  }
  if (where !== undefined) {
    const clauses = Object.entries(where).map(([k, v]) => `${k} = '${String(v)}'`)
    sql += ` WHERE ${clauses.join(' AND ')}`
  }
  return sql
}

function buildInsertQuery(table: string, data: Record<string, unknown>): string {
  const keys = Object.keys(data)
  const values = keys.map((k) => {
    const v = data[k]
    if (v === null) return 'NULL'
    if (typeof v === 'number') return String(v)
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
    return `'${String(v).replace(/'/g, "''")}'`
  })
  return `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')})`
}

function buildUpdateQuery(table: string, data: Record<string, unknown>, where: Record<string, unknown>): string {
  const sets = Object.entries(data).map(([k, v]) => {
    if (typeof v === 'number') return `${k} = ${v}`
    return `${k} = '${String(v).replace(/'/g, "''")}'`
  })
  const clauses = Object.entries(where).map(([k, v]) => `${k} = '${String(v)}'`)
  return `UPDATE ${table} SET ${sets.join(', ')} WHERE ${clauses.join(' AND ')}`
}

group('Query Builder', () => {
  bench('simple SELECT', () => {
    buildSimpleSelect('users', ['id', 'name', 'email'], { active: true })
  })

  bench('SELECT with multiple WHERE', () => {
    buildSimpleSelect('posts', ['id', 'title', 'body'], {
      published: true,
      category: 'tech',
      author_id: 42,
    })
  })

  bench('SELECT with JOIN', () => {
    buildJoinSelect(
      [{ name: 'users', alias: 'u' }],
      [{ type: 'inner', table: 'posts', on: 'u.id = posts.user_id' }],
      ['u.id', 'u.name', 'posts.title', 'posts.created_at'],
      { 'u.active': true },
    )
  })

  bench('INSERT single row', () => {
    buildInsertQuery('users', {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      active: true,
    })
  })

  bench('UPDATE with WHERE', () => {
    buildUpdateQuery('users', { name: 'Jane Doe', email: 'jane@example.com' }, { id: 42 })
  })
})

// ─── Router Internal Benchmarks ──────────────────────────

const router = new Router()
router.get('/bench/static', async () => {})
router.get('/bench/users/:id', async () => {})
router.get('/bench/posts/:postId/comments/:commentId', async () => {})
router.post('/bench/data', async () => {})

group('Router Resolution', () => {
  bench('resolve static route', () => {
    router.resolve('GET', '/bench/static')
  })

  bench('resolve dynamic param route', () => {
    router.resolve('GET', '/bench/users/99')
  })

  bench('resolve nested param route', () => {
    router.resolve('GET', '/bench/posts/42/comments/7')
  })

  bench('resolve POST route', () => {
    router.resolve('POST', '/bench/data')
  })

  bench('resolve 404', () => {
    router.resolve('GET', '/bench/nowhere')
  })
})

await run()
