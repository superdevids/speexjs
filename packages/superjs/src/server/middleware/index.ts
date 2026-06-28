import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { createGzip } from 'node:zlib'
import { randomUUID } from 'node:crypto'

import type { RouteContext } from '../router'
import { HttpStatus } from '../http/status'

export type Middleware = (
  ctx: RouteContext,
  next: () => Promise<void>,
) => void | Promise<void>

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

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { request, response } = ctx
    const origin = request.headers.get('origin')

    if (origin !== undefined) {
      if (opts.origin === '*') {
        response.header('access-control-allow-origin', '*')
      } else if (typeof opts.origin === 'string') {
        response.header('access-control-allow-origin', opts.origin)
      } else if (opts.origin.includes(origin)) {
        response.header('access-control-allow-origin', origin)
      }

      if (opts.credentials) {
        response.header('access-control-allow-credentials', 'true')
      }

      if (opts.exposedHeaders.length > 0) {
        response.header(
          'access-control-expose-headers',
          opts.exposedHeaders.join(', '),
        )
      }
    }

    if (request.method === 'OPTIONS') {
      response.header(
        'access-control-allow-methods',
        opts.methods.join(', '),
      )
      response.header(
        'access-control-allow-headers',
        opts.allowedHeaders.join(', '),
      )
      response.header(
        'access-control-max-age',
        String(opts.maxAge),
      )
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
}

export function session(options?: SessionOptions): Middleware {
  const opts = {
    name: 'superjs_session',
    secret: 'superjs-secret-change-in-production',
    maxAge: 7200,
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    ...options,
  }

  const sessions = new Map<string, Record<string, unknown>>()

  function generateSessionId(): string {
    return randomUUID()
  }

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { request, response } = ctx
    const sessionId = request.cookie(opts.name) ?? generateSessionId()
    const id = sessionId

    if (!sessions.has(id)) {
      sessions.set(id, {})
    }
    const sessionData = sessions.get(id) as Record<string, unknown>

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

export function throttle(
  limit?: number,
  window?: number,
): Middleware {
  const maxRequests = limit ?? 60
  const timeWindow = (window ?? 60) * 1000
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

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const key = ctx.request.ip

    const now = Date.now()
    const hit = hits.get(key)

    if (hit === undefined || hit.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + timeWindow })
      ctx.response.header('x-ratelimit-limit', String(maxRequests))
      ctx.response.header('x-ratelimit-remaining', String(maxRequests - 1))
      return next()
    }

    hit.count++
    const remaining = Math.max(0, maxRequests - hit.count)
    ctx.response.header('x-ratelimit-limit', String(maxRequests))
    ctx.response.header('x-ratelimit-remaining', String(remaining))

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
}

export function logger(): Middleware {
  return (ctx: RouteContext, next: () => Promise<void>) => {
    const start = Date.now()
    const { method, path, ip } = ctx.request

    const result = next()

    if (result instanceof Promise) {
      return result.then(() => {
        const duration = Date.now() - start
        const status = ctx.response.statusCode
        console.log(
          `[${new Date().toISOString()}] ${method} ${path} ${status} ${duration}ms - ${ip}`,
        )
      })
    }

    const duration = Date.now() - start
    const status = ctx.response.statusCode
    console.log(
      `[${new Date().toISOString()}] ${method} ${path} ${status} ${duration}ms - ${ip}`,
    )
  }
}

export interface StaticOptions {
  maxAge?: number
  index?: string
  dotfiles?: 'allow' | 'deny'
  extensions?: string[]
}

export function staticFiles(
  root: string,
  options?: StaticOptions,
): Middleware {
  const opts = {
    maxAge: 0,
    index: 'index.html',
    dotfiles: 'deny' as const,
    extensions: [] as string[],
    ...options,
  }

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

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { request, response } = ctx
    let filePath = request.path

    if (opts.dotfiles === 'deny') {
      const segments = filePath.split('/')
      for (const segment of segments) {
        if (segment.startsWith('.')) {
          return next()
        }
      }
    }

    let fullPath = join(root, filePath)

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

    response
      .header('content-type', mimeType)
      .header('content-length', String(stats.size))
      .header('cache-control', `public, max-age=${opts.maxAge}`)
      .header('last-modified', stats.mtime.toUTCString())

    const readStream = createReadStream(fullPath)
    readStream.pipe(response.rawResponse)
    response.rawResponse.statusCode = HttpStatus.OK

    return new Promise<void>((resolve, reject) => {
      readStream.on('end', () => resolve())
      readStream.on('error', (err: Error) => reject(err))
    })
  }
}

export function csrf(): Middleware {
  const tokens = new Set<string>()

  function generateToken(): string {
    return randomUUID()
  }

  function skipCsrf(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
  }

  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { request, response } = ctx

    if (request.path === '/csrf-token') {
      const token = generateToken()
      tokens.add(token)
      response.json({ token })
      return
    }

    if (skipCsrf(request.method)) {
      return next()
    }

    const token =
      request.headers.get('x-csrf-token') ??
      request.headers.get('x-xsrf-token')

    if (token === undefined || !tokens.has(token)) {
      response.status(HttpStatus.FORBIDDEN).json({
        error: 'CSRF token mismatch',
        message: 'Invalid or missing CSRF token',
      })
      return
    }

    tokens.delete(token)

    return next()
  }
}

export function compress(): Middleware {
  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { request } = ctx
    const acceptEncoding = request.headers.get('accept-encoding') ?? ''

    if (acceptEncoding.includes('gzip')) {
      return compressWith(ctx, next, 'gzip')
    }

    return next()
  }
}

function compressWith(
  ctx: RouteContext,
  next: () => Promise<void>,
  _encoding: string,
): Promise<void> {
  const originalEnd = ctx.response.rawResponse.end.bind(ctx.response.rawResponse)

  const chunks: Buffer[] = []

  ctx.response.rawResponse.write = function (chunk: unknown) {
    if (Buffer.isBuffer(chunk) || typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk))
    }
    return true
  } as typeof ctx.response.rawResponse.write

  ctx.response.rawResponse.end = function (chunk?: unknown, ...args: any[]) {
    if (chunk !== undefined && chunk !== null) {
      if (Buffer.isBuffer(chunk) || typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk))
      }
    }

    ctx.response.header('content-encoding', 'gzip')

    const gzip = createGzip()
    const combined = Buffer.concat(chunks)
    const compressed = gzip.end(combined) as unknown as Buffer

    ctx.response.header('content-length', String(compressed.length))
    originalEnd(compressed, ...args)
    return ctx.response.rawResponse
  } as typeof ctx.response.rawResponse.end

  return next()
}

export function helmet(): Middleware {
  return (ctx: RouteContext, next: () => Promise<void>) => {
    const { response } = ctx

    response
      .header('x-content-type-options', 'nosniff')
      .header('x-frame-options', 'SAMEORIGIN')
      .header('x-xss-protection', '1; mode=block')
      .header(
        'strict-transport-security',
        'max-age=15552000; includeSubDomains',
      )
      .header('referrer-policy', 'no-referrer-when-downgrade')
      .header(
        'content-security-policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      )
      .header('permissions-policy', 'camera=(), microphone=(), geolocation=()')

    return next()
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
    this.middlewares = this.middlewares.filter(
      (mw) => mw.name !== name,
    )
  }

  async run(
    ctx: RouteContext,
    final: () => Promise<void>,
  ): Promise<void> {
    let index = 0

    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        await final()
        return
      }

      const middleware = this.middlewares[index] as Middleware
      index++
      await middleware(ctx, next)
    }

    await next()
  }

  getMiddlewares(): Middleware[] {
    return [...this.middlewares]
  }
}
