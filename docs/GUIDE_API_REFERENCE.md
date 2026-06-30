# SpeexJS API Reference

This document covers every core API in the SpeexJS framework. All imports are from the top-level `speexjs` package unless otherwise noted.

```typescript
import { speexjs, ... } from 'speexjs'
```

---

## SuperApp

The application instance. Created via the `speexjs()` factory.

```typescript
const app = speexjs(options?: AppOptions)
```

**AppOptions:**

| Property | Type | Default | Description |
|---|---|---|---|
| `engine` | `ServerEngine` | `NodeEngine` | HTTP server engine (Node, Bun, HTTPS) |
| `container` | `Container` | new instance | DI container for service resolution |

### Route Registration

```typescript
app.get(path: string, handler: RouteHandler): this
app.post(path: string, handler: RouteHandler): this
app.put(path: string, handler: RouteHandler): this
app.patch(path: string, handler: RouteHandler): this
app.delete(path: string, handler: RouteHandler): this
app.options(path: string, handler: RouteHandler): this
app.any(path: string, handler: RouteHandler): this
app.match(methods: string[], path: string, handler: RouteHandler): this
```

**Example:**

```typescript
app.get('/users', listUsers)
app.post('/users', createUser)
app.match(['GET', 'POST'], '/users', handler)
```

### Grouping

```typescript
app.group(prefix: string, callback: (router: Router) => void): this
app.middleware(middleware: Middleware | Middleware[]): this
```

```typescript
app.group('/api', (router) => {
  router.use(auth())
  router.get('/users', listUsers)
  router.post('/users', createUser)
})
```

### Resourceful Routing

```typescript
app.resource(name: string, controller: ControllerClass): this   // 7 RESTful routes
app.apiResource(name: string, controller: ControllerClass): this // 5 API routes
app.controller(ctrl: ControllerClass): this                      // decorator-based
```

### Global Middleware

```typescript
app.use(middleware: Middleware): this
```

```typescript
app.use(cors()).use(helmet()).use(bodyParser())
```

### Named Routes

```typescript
app.get('/users/:id', handler).name('users.show')
// Generate URL later:
app.router.route('users.show', { id: '42' }) // → '/users/42'
```

### Static Files

```typescript
app.static(path: string, options?: StaticOptions): this
```

```typescript
app.static('./public', { maxAge: 86400, index: 'index.html' })
```

### View Engine

```typescript
app.view(engine: ViewEngine): this
```

```typescript
import { PageView } from 'speexjs'

app.view(new PageView('./src/pages'))
// Then use response.page() in handlers
```

### Server Lifecycle

```typescript
app.listen(port?: number, hostOrCallback?, callback?): this
app.start(port?: number, host?: string): Promise<void>
app.close(): Promise<void>
app.ready(): Promise<void>
app.getServer(): ServerInstance | undefined
```

**Listen with callback:**

```typescript
app.listen(3000, '0.0.0.0', () => {
  console.log('✓ Server ready')
})
```

### Error Handling

```typescript
app.onError(handler: (err: Error, ctx: RouteContext) => void | Promise<void>): this
app.notFound(handler: (ctx: RouteContext) => void | Promise<void>): this
app.onShutdown(handler: () => void | Promise<void>): this
```

```typescript
app.onError((err, ctx) => {
  console.error(err)
  ctx.response.status(500).json({
    error: 'Internal Server Error',
    requestId: ctx.request.headers.get('x-request-id'),
  })
})

app.notFound((ctx) => {
  ctx.response.status(404).json({
    error: 'Route not found',
    path: ctx.request.path,
  })
})
```

### Engine Selection

```typescript
app.setEngine(engine: ServerEngine): this
```

```typescript
import { HttpsEngine } from 'speexjs/server/http'

app.setEngine(new HttpsEngine('/path/to/key.pem', '/path/to/cert.pem'))
```

---

## RouteHandler & RouteContext

```typescript
type RouteHandler = (ctx: RouteContext) => void | Promise<void> | SuperResponse | Promise<SuperResponse>
```

**RouteContext interface:**

```typescript
interface RouteContext {
  request: SuperRequest
  response: SuperResponse
  params: Record<string, string>
  query: Record<string, string | string[]>
  container: Container
}
```

---

## SuperRequest

Available on `ctx.request`:

### Properties

| Property | Type | Description |
|---|---|---|
| `method` | `string` | Uppercase HTTP method |
| `path` | `string` | URL pathname |
| `url` | `string` | Full raw URL |
| `headers` | `HeadersMap` | Request headers |
| `query` | `Record<string, string \| string[]>` | Parsed query string |
| `params` | `Record<string, string>` | Route parameters |
| `ip` | `string` | Client IP address |
| `rawRequest` | `IncomingMessage` | Raw Node.js request |

### Body Parsing

```typescript
async body(): Promise<unknown>           // Auto-parsed body (JSON or text)
async json<T>(): Promise<T>              // Parse as JSON
async text(): Promise<string>            // Raw text body
async formData(): Promise<Record<string, string>>  // URL-encoded or multipart form fields
async file(name: string): Promise<SuperUploadedFile | undefined>  // Uploaded file
async files(): Promise<Record<string, SuperUploadedFile>>         // All uploaded files
```

### Validation

```typescript
async validate<T>(schema: Schema<T>): Promise<T>
```

```typescript
const data = await ctx.request.validate(UserSchema)
// Throws ValidationError on failure
```

### Helpers

```typescript
cookie(name: string): string | undefined
bearerToken(): string | undefined
isAjax(): boolean
wantsJson(): boolean
accepts(...types: string[]): string | false
acceptsJson(): boolean
acceptsHtml(): boolean
```

---

## SuperResponse

Available on `ctx.response`:

### Sending Responses

```typescript
json<T>(data: T, status?: number): this
html(html: string, status?: number): this
send(body: string | Buffer, status?: number, contentType?: string): this
```

```typescript
ctx.response.json({ user: { id: 1, name: 'Alice' } }, 201)
ctx.response.html('<h1>Hello</h1>')
ctx.response.send('OK', 200, 'text/plain')
```

### Status & Headers

```typescript
status(code: number): this
header(name: string, value: string): this
setHeader(name: string, value: string): this
getHeader(name: string): string | undefined
removeHeader(name: string): this
hasHeader(name: string): boolean
type(contentType: string): this
vary(...headers: string[]): this
```

```typescript
ctx.response
  .status(201)
  .header('x-request-id', 'abc123')
  .type('application/json')
  .json({ created: true })
```

### Cookies

```typescript
cookie(name: string, value: string, options?: CookieOptions): this
clearCookie(name: string, options?: CookieOptions): this
```

```typescript
ctx.response.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 7200,
  path: '/',
})
ctx.response.clearCookie('old_session')
```

### Redirect & Stream

```typescript
redirect(url: string, status?: 301 | 302 | 307 | 308): this
async stream(stream: Readable, status?: number): Promise<this>
async file(filePath: string, options?: FileOptions): Promise<this>
async download(filePath: string, filename?: string): Promise<this>
```

```typescript
ctx.response.redirect('/login', 302)
ctx.response.redirect('https://example.com', 301)
await ctx.response.stream(fs.createReadStream('./video.mp4'))
```

### SSE (Server-Sent Events)

```typescript
async sse(event: string, data: unknown): Promise<this>
```

```typescript
async function streamHandler(ctx: RouteContext) {
  ctx.response.type('text/event-stream')
  const interval = setInterval(() => {
    ctx.response.sse('update', { time: Date.now() })
  }, 1000)
  ctx.request.rawRequest.on('close', () => clearInterval(interval))
}
```

### View Rendering

```typescript
async page(page: string, props?: Record<string, unknown>): Promise<this>
```

```typescript
await ctx.response.page('home', { title: 'Welcome', user: currentUser })
```

### Properties

| Property | Type | Description |
|---|---|---|
| `body` | `string \| Buffer \| null` | Response body |
| `statusCode` | `number` | HTTP status code |
| `headersSent` | `boolean` | Whether headers were sent |
| `rawResponse` | `ServerResponse` | Raw Node.js response |
| `elapsed()` | `number` | Response time in ms |

---

## Router

Accessible via `app.router`:

```typescript
router.get(path, handler)
router.post(path, handler)
router.put(path, handler)
router.patch(path, handler)
router.delete(path, handler)
router.options(path, handler)
router.any(path, handler)
router.match(methods, path, handler)

router.group(prefix, callback)
router.middleware(middleware)
router.resource(name, controller)
router.apiResource(name, controller)
router.name(name)
router.route(name, params?)
router.resolve(method, path): ResolvedRoute | null
router.getRoutes(): RouteEntry[]
router.getNamedRoutes(): Map<string, RouteEntry>
```

**Route naming and URL generation:**

```typescript
app.get('/posts/:id/comments', listComments).name('posts.comments')
// Generate:
const url = app.router.route('posts.comments', { id: '5' })
// → '/posts/5/comments'
```

---

## Middleware

All built-in middleware is exported from `speexjs`:

```typescript
import { cors, bodyParser, session, csrf, throttle, helmet, compress, validate, validateQuery, staticFiles, auth, logger, pipe, when, unless } from 'speexjs'
```

### cors

```typescript
cors(options?: CorsOptions): Middleware
```

| Option | Type | Default |
|---|---|---|
| `origin` | `string \| string[]` | `'*'` |
| `methods` | `string[]` | All methods |
| `allowedHeaders` | `string[]` | `['Content-Type', 'Authorization']` |
| `exposedHeaders` | `string[]` | `[]` |
| `credentials` | `boolean` | `false` |
| `maxAge` | `number` | `86400` |

```typescript
app.use(cors({
  origin: ['https://myapp.com', 'https://admin.myapp.com'],
  credentials: true,
}))
```

### bodyParser

```typescript
bodyParser(): Middleware
```

Pre-reads the request body for POST/PUT/PATCH/DELETE. Usually paired with `validate()`.

### session

```typescript
session(options?: SessionOptions): Middleware
```

In-memory session store. Encrypted cookie-based sessions with AES-256-GCM.

| Option | Type | Default |
|---|---|---|
| `name` | `string` | `'speexjs_session'` |
| `secret` | `string` | Requires `SESSION_SECRET` env in production |
| `maxAge` | `number` | `7200` (seconds) |
| `httpOnly` | `boolean` | `true` |
| `secure` | `boolean` | `true` in production |
| `sameSite` | `'strict' \| 'lax' \| 'none'` | `'lax'` |

```typescript
app.use(session({ secret: process.env.SESSION_SECRET }))

app.get('/counter', (ctx) => {
  const session = (ctx as any).session
  session.count = (session.count ?? 0) + 1
  ctx.response.json({ count: session.count })
})
```

### csrf

```typescript
csrf(): Middleware
```

CSRF protection. Sets a cookie (`speexjs_csrf_token`) and validates it against the `X-CSRF-Token` header on state-changing requests.

### throttle

```typescript
throttle(maxRequests?: number, windowSeconds?: number): Middleware
throttleDynamic(getLimit: (ctx) => { max: number; window: number }): Middleware
```

```typescript
// 100 requests per 60 seconds globally
app.use(throttle(100, 60))

// Dynamic per-route limits
app.use(throttleDynamic((ctx) => {
  if (ctx.request.path.startsWith('/api/admin')) return { max: 20, window: 60 }
  return { max: 100, window: 60 }
}))
```

### helmet

```typescript
helmet(): Middleware
```

Sets security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy`.

### compress

```typescript
compress(): Middleware
```

Gzip-compresses response bodies for clients that send `Accept-Encoding: gzip`.

### validate

```typescript
validate(schema: Schema<unknown>): Middleware
validateQuery(schema: Schema<unknown>): Middleware
```

```typescript
import { schema } from 'speexjs/schema'

const CreateUserSchema = schema.object({
  name: schema.string().min(2),
  email: schema.string().email(),
  age: schema.number().min(18),
})

app.post('/users', validate(CreateUserSchema), (ctx) => {
  const data = (ctx as any).validated // typed, validated data
  ctx.response.json({ data })
})
```

### auth

```typescript
auth(guardName?: string): Middleware
```

```typescript
app.group('/admin', (router) => {
  router.use(auth('web'))
  router.get('/dashboard', adminDashboard)
})
```

### staticFiles

```typescript
staticFiles(root: string, options?: StaticOptions): Middleware
```

Serves static files with ETag, range requests, pre-compressed `.gz` variants, and path traversal protection.

### Utility Middleware

```typescript
pipe(...middleware: Middleware[]): Middleware          // Compose middleware
when(condition: (ctx) => boolean, mw: Middleware): Middleware  // Conditional
unless(condition: (ctx) => boolean, mw: Middleware): Middleware // Inverse conditional
```

```typescript
app.use(when(
  (ctx) => ctx.request.path.startsWith('/api/v2'),
  validate(V2Schema),
))
```

---

## Controller

```typescript
import { Controller, controller, get, post, put, del, patch } from 'speexjs'
```

The `Controller` abstract class provides convenient methods:

```typescript
abstract class Controller {
  protected request: SuperRequest
  protected response: SuperResponse
  protected container: Container

  // Shorthand response helpers
  protected ok<T>(data: T): void           // 200
  protected created<T>(data: T): void       // 201
  protected noContent(): void               // 204
  protected badRequest(msg?: string): void  // 400
  protected notFound(msg?: string): void    // 404
  protected unauthorized(msg?: string): void // 401
  protected forbidden(msg?: string): void   // 403
  protected error(status: number, msg?: string): void

  protected async validate<T>(schema: Schema<T>): Promise<T>
}
```

**Decorator-based routing:**

```typescript
@controller('/api/users')
export class UserController extends Controller {
  @get('/')
  async index({ response }) {
    const users = await User.all()
    response.json({ data: users })
  }

  @post('/')
  async store({ request, response }) {
    const data = await request.json()
    const user = await User.create(data)
    response.status(201).json({ data: user })
  }

  @get('/:id')
  async show({ params, response, request }) {
    const user = await User.find(params.id)
    if (!user) return response.status(404).json({ error: 'Not found' })
    response.json({ data: user })
  }

  @put('/:id')
  async update({ params, request, response }) {
    const user = await User.find(params.id)
    if (!user) return response.status(404).json({ error: 'Not found' })
    const data = await request.json()
    Object.assign(user, data)
    await user.save()
    response.json({ data: user })
  }

  @del('/:id')
  async destroy({ params, response }) {
    const user = await User.find(params.id)
    if (!user) return response.status(404).json({ error: 'Not found' })
    await user.delete()
    response.noContent()
  }
}
```

Register:

```typescript
app.controller(UserController)
```

---

## Config

```typescript
import { defineConfig, loadConfig } from 'speexjs'
```

### SpeexConfig Interface

```typescript
interface SpeexConfig {
  app: {
    name: string
    port: number
    host: string
    env: 'development' | 'production' | 'testing'
    key?: string
    debug: boolean
  }
  database: {
    default: string
    connections: Record<string, ConnectionConfig>
  }
  auth: {
    defaults: { guard: string }
    guards: Record<string, any>
  }
  server: {
    cors: { origin: string | string[]; credentials: boolean }
    session: { driver: 'cookie' | 'redis'; ttl: number }
    rateLimit: { max: number; window: number }
  }
  paths: {
    root: string
    src: string
    routes: string
    views: string
    migrations: string
    public: string
  }
}
```

```typescript
// speexjs.config.ts
import { defineConfig } from 'speexjs'

export default defineConfig({
  app: {
    name: 'My App',
    port: 3000,
    host: '0.0.0.0',
    env: process.env.NODE_ENV as any || 'development',
    debug: process.env.NODE_ENV !== 'production',
  },
  database: {
    default: 'primary',
    connections: {
      primary: {
        driver: 'postgresql',
        host: process.env.DB_HOST || 'localhost',
        port: 5432,
        database: process.env.DB_NAME || 'myapp',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
      },
    },
  },
})
```

### Loading Config

```typescript
const config = await loadConfig()
// Searches for, in order: speexjs.config.ts, speexjs.config.js, speexjs.config.mjs, speexjs.json
console.log(config.app.port) // → 3000
```

---

## env() Helpers

```typescript
import { env, requireEnv, validateEnv } from 'speexjs'
```

Auto-loads `.env` file from the project root (if it exists).

### env

```typescript
env(key: string, defaultValue?: string): string
env.int(key: string, defaultValue?: number): number
env.bool(key: string, defaultValue?: boolean): boolean
env.array(key: string, defaultValue?: string[]): string[]
```

```typescript
const port = env.int('PORT', 3000)
const debug = env.bool('DEBUG', false)
const origins = env.array('ALLOWED_ORIGINS', ['http://localhost:3000'])

// Throws if key is missing and no default provided
const appKey = env('APP_KEY') // throws if not set
```

### requireEnv

```typescript
requireEnv('APP_KEY', 'DATABASE_URL', 'REDIS_URL')
// Exits process with error if any are missing
```

### validateEnv

Validates environment variables with regex patterns:

```typescript
validateEnv({
  PORT: { required: true, pattern: /^\d+$/, message: 'PORT must be a number' },
  NODE_ENV: { pattern: /^(development|production|testing)$/ },
})
```

---

## Console / Debug

```typescript
// Debug toolbar (SPEEXJS_DEBUG=true)
app.use(logger())

// Outputs:
// [2025-01-15T10:30:00.000Z] GET /api/users 200 12ms - 127.0.0.1
```

Enable the debug dashboard by setting the environment variable:

```bash
SPEEXJS_DEBUG=true npm run dev
```

Then visit `http://localhost:3000/_speexjs/dashboard` for routes, queries, cache stats, and config values.
