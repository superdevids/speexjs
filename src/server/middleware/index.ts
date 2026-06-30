import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { HttpStatus } from '../http/status'
import type { RouteContext } from '../router'
import type { Schema } from '../../schema/types.js'
import { RouteRateLimiter } from './route-limiter.js'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

export type Middleware = (ctx: RouteContext, next: () => Promise<void>) => void | Promise<void>

export interface CorsOptions {
  origin?: string | string[]
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
}

export function cors(options?: CorsOptions): Middleware {
  const opts: Required<CorsOptions> = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [],
    credentials: false,
    maxAge: 86400,
    ...options,
  }

  if (opts.credentials && opts.origin === '*') {
    console.warn(
      '[cors] credentials=true with origin=* is insecure. Refusing to reflect arbitrary origins. Set an explicit origin list or disable credentials.',
    )
    opts.origin = []
  }

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { request, response } = ctx
    const origin = request.headers.get('origin')

    if (origin !== undefined) {
      if (opts.origin === '*') {
        response.header('access-control-allow-origin', '*')
      } else if (typeof opts.origin === 'string') {
        if (!opts.credentials || origin === opts.origin) {
          response.header('access-control-allow-origin', opts.origin)
          response.header('vary', 'Origin')
        }
      } else if (opts.origin.includes(origin)) {
        response.header('access-control-allow-origin', origin)
        response.header('vary', 'Origin')
      }

      if (opts.credentials) {
        response.header('access-control-allow-credentials', 'true')
      }

      if (opts.exposedHeaders.length > 0) {
        response.header('access-control-expose-headers', opts.exposedHeaders.join(', '))
      }
    }

    if (request.method === 'OPTIONS') {
      response.header('access-control-allow-methods', opts.methods.join(', '))
      response.header('access-control-allow-headers', opts.allowedHeaders.join(', '))
      response.header('access-control-max-age', String(opts.maxAge))
      response.status(HttpStatus.NO_CONTENT)
      return
    }

    return next()
  }
}

export function bodyParser(): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const { request } = ctx
    const method = request.method

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      await request.body()
    }

    return next()
  }
}

export interface SessionOptions {
  name?: string
  secret?: string
  maxAge?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  absoluteMaxAge?: number
}

export function session(options?: SessionOptions): Middleware {
  const opts = {
    name: 'speexjs_session',
    secret:
      options?.secret ??
      (process.env.NODE_ENV === 'production'
        ? (() => {
            throw new Error('Session secret must be configured in production via secret option or SESSION_SECRET env var')
          })()
        : 'speexjs-dev-secret'),
    maxAge: 7200,
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    ...options,
  }

  interface SessionEntry {
    data: Record<string, unknown>
    createdAt: number
    lastTouchedAt: number
  }
  const sessions = new Map<string, SessionEntry>()
  const SESSION_TTL = (opts.maxAge || 7200) * 1000
  const ABSOLUTE_MAX_AGE = (opts.absoluteMaxAge ?? 86400) * 1000
  let cleanupCounter = 0

  function generateSessionId(): string {
    return randomUUID()
  }

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { request, response } = ctx
    const sessionId = request.cookie(opts.name) ?? generateSessionId()
    const id = sessionId

    cleanupCounter++
    if (cleanupCounter >= 100) {
      cleanupCounter = 0
      const now = Date.now()
      for (const [key, entry] of sessions) {
        if (now - entry.createdAt > ABSOLUTE_MAX_AGE || now - entry.lastTouchedAt > SESSION_TTL) {
          sessions.delete(key)
        }
      }
    }

    const now = Date.now()

    const existing = sessions.get(id)
    if (existing && (now - existing.createdAt > ABSOLUTE_MAX_AGE || now - existing.lastTouchedAt > SESSION_TTL)) {
      sessions.delete(id)
    }

    if (!sessions.has(id)) {
      sessions.set(id, { data: {}, createdAt: now, lastTouchedAt: now })
    } else {
      const entry = sessions.get(id)!
      entry.lastTouchedAt = now
    }
    const sessionData = sessions.get(id)!.data

    ;(ctx as unknown as Record<string, unknown>).session = sessionData

    if (request.cookie(opts.name) === undefined) {
      response.cookie(opts.name, id, {
        maxAge: opts.maxAge,
        httpOnly: opts.httpOnly,
        secure: opts.secure,
        sameSite: opts.sameSite,
        path: '/',
      })
    }

    return next()
  }
}

export function auth(guard?: string): Middleware {
  const guardName = guard ?? 'default'

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const user = ctx.container.resolve(`auth.${guardName}`)

    if (user === undefined || user === null) {
      if (ctx.request.wantsJson()) {
        ctx.response.status(HttpStatus.UNAUTHORIZED).json({
          error: 'Unauthenticated',
          message: 'Authentication is required to access this resource',
        })
        return
      }

      ctx.response.redirect('/login', HttpStatus.FOUND as 302)
      return
    }

    ;(ctx as unknown as Record<string, unknown>).user = user

    return next()
  }
}

export function throttle(limitOrLimiter?: number | RouteRateLimiter, windowSeconds?: number): Middleware {
  const limiter = limitOrLimiter instanceof RouteRateLimiter ? limitOrLimiter : undefined
  const defaultMax: number = limiter ? 60 : ((limitOrLimiter as number | undefined) ?? 60)
  const defaultWindow = (windowSeconds ?? 60) * 1000
  const hits = new Map<string, { count: number; resetAt: number }>()
  const normalizeIp = (ip: string): string => (ip.startsWith('::ffff:') ? ip.slice(7) : ip)

  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, value] of hits) {
      if (value.resetAt < now) {
        hits.delete(key)
      }
    }
  }, 60000)

  if (cleanup.unref !== undefined) {
    cleanup.unref()
  }

  let trackEvent: ((key: string, blocked: boolean, count: number, max: number) => void) | undefined

  async function trackRateLimitEventAsync(ip: string, blocked: boolean, count: number, max: number): Promise<void> {
    if (trackEvent === undefined) {
      try {
        const mod = await import('../debug/dashboard.js')
        if (typeof mod.trackRateLimitEvent === 'function') {
          trackEvent = mod.trackRateLimitEvent
        }
      } catch {
        trackEvent = null as unknown as typeof trackEvent
      }
    }
    if (trackEvent) trackEvent(ip, blocked, count, max)
  }

  const middleware = (ctx: RouteContext, next: () => Promise<void>) => {
    const forwarded = ctx.request.headers.get('x-forwarded-for')
    const ip = (forwarded !== undefined ? forwarded.split(',')[0]?.trim() : undefined) || ctx.request.ip
    const key = normalizeIp(ip)

    let maxRequests = defaultMax
    let timeWindow = defaultWindow
    if (limiter) {
      const routeConfig = limiter.getLimit(ctx.request.path)
      if (routeConfig) {
        maxRequests = routeConfig.max
        timeWindow = routeConfig.window
      }
    }

    const now = Date.now()
    const hit = hits.get(key)

    if (hit === undefined || hit.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + timeWindow })
      ctx.response.header('x-ratelimit-limit', String(maxRequests))
      ctx.response.header('x-ratelimit-remaining', String(maxRequests - 1))
      ctx.response.header('x-ratelimit-reset', String(now + timeWindow))
      void trackRateLimitEventAsync(key, false, 1, maxRequests)
      return next()
    }

    hit.count++
    const remaining = Math.max(0, maxRequests - hit.count)
    ctx.response.header('x-ratelimit-limit', String(maxRequests))
    ctx.response.header('x-ratelimit-remaining', String(remaining))
    ctx.response.header('x-ratelimit-reset', String(hit.resetAt))

    if (hit.count > maxRequests) {
      const retryAfter = Math.ceil((hit.resetAt - now) / 1000)
      ctx.response.header('retry-after', String(retryAfter))
      ctx.response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      })
      void trackRateLimitEventAsync(key, true, hit.count, maxRequests)
      return
    }

    void trackRateLimitEventAsync(key, false, hit.count, maxRequests)
    return next()
  }

  middleware.cleanup = () => clearInterval(cleanup)
  return middleware as Middleware & { cleanup?: () => void }
}

export function logger(): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const start = Date.now()
    const { method, path, ip } = ctx.request
    await next()
    const duration = Date.now() - start
    const status = ctx.response.statusCode
    console.log(`[${new Date().toISOString()}] ${method} ${path} ${status} ${duration}ms - ${ip}`)
  }
}

export interface StaticOptions {
  maxAge?: number
  index?: string
  dotfiles?: 'allow' | 'deny'
  extensions?: string[]
}

export function staticFiles(root: string, options?: StaticOptions): Middleware {
  const opts = {
    maxAge: 0,
    index: 'index.html',
    dotfiles: 'deny' as const,
    extensions: [] as string[],
    ...options,
  }

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { request, response } = ctx
    const filePath = request.path

    if (opts.dotfiles === 'deny') {
      const segments = filePath.split('/')
      for (const segment of segments) {
        if (segment.startsWith('.')) {
          return next()
        }
      }
    }

    let fullPath = join(root, filePath)

    const resolvedRoot = resolve(root)
    const resolvedPath = resolve(fullPath)
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return next()
    }

    if (!existsSync(fullPath)) {
      let found = false
      for (const ext of opts.extensions) {
        const tryPath = fullPath + ext
        if (existsSync(tryPath)) {
          fullPath = tryPath
          found = true
          break
        }
      }
      if (!found) return next()
    }

    if (ctx.request.headers.get('accept-encoding')?.includes('gzip')) {
      const gzPath = fullPath + '.gz'
      if (existsSync(gzPath)) {
        fullPath = gzPath
        ctx.response.header('content-encoding', 'gzip')
      }
    }

    const stats = statSync(fullPath)
    if (!stats.isFile()) {
      if (stats.isDirectory()) {
        const indexPath = join(fullPath, opts.index)
        if (existsSync(indexPath) && statSync(indexPath).isFile()) {
          fullPath = indexPath
        } else {
          return next()
        }
      } else {
        return next()
      }
    }

    const ext = extname(fullPath)
    const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream'

    const etag = `"${createHash('md5')
      .update(fullPath + stats.mtimeMs)
      .digest('hex')}"`

    response
      .header('content-type', mimeType)
      .header('content-length', String(stats.size))
      .header('cache-control', `public, max-age=${opts.maxAge}`)
      .header('last-modified', stats.mtime.toUTCString())
      .header('accept-ranges', 'bytes')
      .header('etag', etag)

    const ifNoneMatch = ctx.request.headers.get('if-none-match')
    if (ifNoneMatch === etag) {
      response.rawResponse.statusCode = HttpStatus.NOT_MODIFIED
      response.rawResponse.end()
      return Promise.resolve()
    }

    const rangeHeader = ctx.request.headers.get('range')
    if (rangeHeader !== undefined && rangeHeader.startsWith('bytes=')) {
      const range = parseRange(rangeHeader, stats.size)
      if (range !== null) {
        const { start, end } = range
        response.header('content-range', `bytes ${start}-${end}/${stats.size}`).header('content-length', String(end - start + 1))
        response.rawResponse.statusCode = HttpStatus.PARTIAL_CONTENT
        const readStream = createReadStream(fullPath, { start, end })
        readStream.pipe(response.rawResponse)
        return new Promise<void>((resolve, reject) => {
          readStream.on('end', () => resolve())
          readStream.on('error', (err: Error) => reject(err))
        })
      }
    }

    response.rawResponse.statusCode = HttpStatus.OK
    const readStream = createReadStream(fullPath)
    readStream.pipe(response.rawResponse)

    return new Promise<void>((resolve, reject) => {
      readStream.on('end', () => resolve())
      readStream.on('error', (err: Error) => reject(err))
    })
  }
}

export function csrf(): Middleware {
  const COOKIE_NAME = 'speexjs_csrf_token'
  const HEADER_NAME = 'x-csrf-token'

  function generateToken(): string {
    return randomUUID() + '-' + randomUUID()
  }

  function skipCsrf(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
  }

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { request, response } = ctx

    const existingCookie = request.cookie(COOKIE_NAME)
    if (existingCookie === undefined) {
      const token = generateToken()
      response.cookie(COOKIE_NAME, token, {
        httpOnly: false,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
    }

    if (skipCsrf(request.method)) {
      return next()
    }

    const cookieToken = request.cookie(COOKIE_NAME)
    const headerToken = request.headers.get(HEADER_NAME)

    if (cookieToken === undefined || headerToken === undefined || cookieToken !== headerToken) {
      response.status(HttpStatus.FORBIDDEN).json({
        error: 'CSRF token mismatch',
        message: 'Invalid or missing CSRF token. Ensure X-CSRF-Token header matches cookie.',
      })
      return
    }

    return next()
  }
}

export function compress(): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const { request } = ctx
    const acceptEncoding = request.headers.get('accept-encoding') ?? ''

    if (acceptEncoding.includes('gzip')) {
      await compressWith(ctx, next, 'gzip')
    } else {
      await next()
    }
  }
}

function compressWith(ctx: RouteContext, next: () => Promise<void>, _encoding: string): Promise<void> {
  const originalSend = ctx.response.send.bind(ctx.response)
  ;(ctx.response as any).send = function (body: string | Buffer, status?: number, contentType?: string) {
    if (status !== undefined) this._statusCode = status
    this._body = body
    if (contentType !== undefined && !this._contentTypeSet) {
      this._headers.set('content-type', contentType)
    }
    const input = Buffer.isBuffer(body) ? body : Buffer.from(String(body))
    const compressed = gzipSync(input)

    this._headers.set('content-encoding', 'gzip')
    this._headers.set('content-length', String(compressed.length))
    this._body = compressed
    return this
  }

  return next().finally(() => {
    ;(ctx.response as any).send = originalSend
  })
}

export interface HelmetOptions {
  contentSecurityPolicy?: string
}

export function helmet(options?: HelmetOptions): Middleware {
  const csp =
    options?.contentSecurityPolicy ??
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self'"

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { response } = ctx

    response
      .header('x-content-type-options', 'nosniff')
      .header('x-frame-options', 'SAMEORIGIN')
      .header('strict-transport-security', 'max-age=15552000; includeSubDomains')
      .header('referrer-policy', 'no-referrer-when-downgrade')
      .header('content-security-policy', csp)
      .header('permissions-policy', 'camera=(), microphone=(), geolocation=()')

    return next()
  }
}

// ─── Request Validation Middleware ───────────────────────────

export function validate(schema: Schema<unknown>): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const data = await ctx.request.body()
    const result = schema.safeParse(data)
    if (!result.success) {
      ctx.response.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: result.error,
      })
      return
    }
    ;(ctx as any).validated = result.data
    return await next()
  }
}

export function validateQuery(schema: Schema<unknown>): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const result = schema.safeParse(ctx.request.query)
    if (!result.success) {
      ctx.response.status(422).json({
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: result.error,
      })
      return
    }
    ;(ctx as any).validatedQuery = result.data
    return await next()
  }
}

export class MiddlewarePipeline {
  private middlewares: Middleware[] = []

  use(middleware: Middleware): this {
    this.middlewares.push(middleware)
    return this
  }

  prepend(middleware: Middleware): this {
    this.middlewares.unshift(middleware)
    return this
  }

  remove(name: string): void {
    this.middlewares = this.middlewares.filter((mw) => mw.name !== name)
  }

  async run(ctx: RouteContext, final: () => Promise<void>): Promise<void> {
    const mws = this.middlewares
    const len = mws.length
    if (len === 0) {
      await final()
      return
    }
    const next = (idx: number): Promise<void> => {
      if (idx >= len) return final()
      const mw = mws[idx]
      if (mw === undefined) return next(idx + 1)
      return Promise.resolve(mw(ctx, () => next(idx + 1)))
    }
    await next(0)
  }

  getMiddlewares(): Middleware[] {
    return [...this.middlewares]
  }
}

export class Pipeline {
  private middlewares: Middleware[] = []
  private handler: (() => Promise<void>) | null = null
  private errorHandler: ((err: Error) => void | Promise<void>) | null = null

  through(middleware: Middleware | Middleware[]): this {
    const mw = Array.isArray(middleware) ? middleware : [middleware]
    this.middlewares.push(...mw)
    return this
  }

  then(handler: () => Promise<void>): this {
    this.handler = handler
    return this
  }

  catch(errorHandler: (err: Error) => void | Promise<void>): this {
    this.errorHandler = errorHandler
    return this
  }

  async run(ctx: RouteContext): Promise<void> {
    let index = 0

    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        if (this.handler) {
          await this.handler()
        }
        return
      }

      const middleware = this.middlewares[index] as Middleware
      index++
      await middleware(ctx, next)
    }

    try {
      await next()
    } catch (err: unknown) {
      if (this.errorHandler) {
        await this.errorHandler(err instanceof Error ? err : new Error(String(err)))
      } else {
        throw err
      }
    }
  }

  clone(): Pipeline {
    const p = new Pipeline()
    p.middlewares = [...this.middlewares]
    p.handler = this.handler
    p.errorHandler = this.errorHandler
    return p
  }
}

export function pipe(...middleware: Middleware[]): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    let index = 0

    const runNext = async (): Promise<void> => {
      if (index >= middleware.length) {
        await next()
        return
      }

      const mw = middleware[index] as Middleware
      index++
      await mw(ctx, runNext)
    }

    await runNext()
  }
}

export function when(condition: (ctx: RouteContext) => boolean, middleware: Middleware): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    if (condition(ctx)) {
      await middleware(ctx, next)
    } else {
      await next()
    }
  }
}

export function unless(condition: (ctx: RouteContext) => boolean, middleware: Middleware): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    if (!condition(ctx)) {
      await middleware(ctx, next)
    } else {
      await next()
    }
  }
}

export function throttleDynamic(getLimit: (ctx: RouteContext) => { max: number; window: number }): Middleware & { cleanup?: () => void } {
  const hits = new Map<string, { count: number; resetAt: number }>()

  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, value] of hits) {
      if (value.resetAt < now) {
        hits.delete(key)
      }
    }
  }, 60000)

  if (cleanup.unref !== undefined) {
    cleanup.unref()
  }

  const middleware = (ctx: RouteContext, next: () => Promise<void>) => {
    const { max: maxRequests, window: windowSeconds } = getLimit(ctx)
    const timeWindow = windowSeconds * 1000

    const forwarded = ctx.request.headers.get('x-forwarded-for')
    const ip = (forwarded !== undefined ? forwarded.split(',')[0]?.trim() : undefined) || ctx.request.ip
    const key = ip.startsWith('::ffff:') ? ip.slice(7) : ip

    const now = Date.now()
    const hit = hits.get(key)

    if (hit === undefined || hit.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + timeWindow })
      ctx.response.header('x-ratelimit-limit', String(maxRequests))
      ctx.response.header('x-ratelimit-remaining', String(maxRequests - 1))
      ctx.response.header('x-ratelimit-reset', String(now + timeWindow))
      return next()
    }

    hit.count++
    const remaining = Math.max(0, maxRequests - hit.count)
    ctx.response.header('x-ratelimit-limit', String(maxRequests))
    ctx.response.header('x-ratelimit-remaining', String(remaining))
    ctx.response.header('x-ratelimit-reset', String(hit.resetAt))

    if (hit.count > maxRequests) {
      const retryAfter = Math.ceil((hit.resetAt - now) / 1000)
      ctx.response.header('retry-after', String(retryAfter))
      ctx.response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      })
      return
    }

    return next()
  }

  middleware.cleanup = () => clearInterval(cleanup)
  return middleware as Middleware & { cleanup?: () => void }
}

function parseRange(header: string, fileSize: number): { start: number; end: number } | null {
  const match = header.slice(6).match(/^(\d*)-(\d*)$/)
  if (!match) return null
  const start = match[1] !== '' ? Number(match[1]) : 0
  const end = match[2] !== '' ? Number(match[2]) : fileSize - 1
  if (start >= fileSize || end >= fileSize || start > end) return null
  return { start, end }
}

export { tenant } from './tenant.js'
