import { Container } from './container'
import { getControllerPrefix, getControllerRoutes } from './controller'
import { NodeEngine, type ServerEngine, type ServerInstance } from './engine'
import type { SuperRequest } from './http/request'
import type { SuperResponse } from './http/response'
import { HttpStatus } from './http/status'
import { type Middleware, MiddlewarePipeline, type StaticOptions, staticFiles as staticFilesMiddleware } from './middleware'
export {
  cors,
  bodyParser,
  session,
  csrf,
  throttle,
  helmet,
  compress,
  staticFiles,
  validate,
  validateQuery,
} from './middleware'
import type { ControllerClass } from './router'
import { type RouteContext, type RouteHandler, Router } from './router'
import type { ViewEngine } from './view/index.js'
import { generateDashboardHtml, trackQuery, getRecentQueries } from './debug/dashboard.js'
import { DatabaseConnection } from './database/connection.js'

export { Cache, type CacheConfig, cacheResponse } from './cache'
export { PageView } from './view/index.js'
export type { ViewEngine } from './view/index.js'
export * from './database/index.js'
export { loadConfig, defineConfig } from './config/manager'
export type { SpeexConfig } from './config/manager'
export { env, requireEnv, validateEnv, generateEnvExample } from './env'
export { createEvent, Event, type EventConfig, event } from './events'
export { registerMacro, responseMacros, URLBuilder, url } from './helpers'
export {
  createStorage,
  LocalDisk,
  Storage,
  type StorageConfig,
  storage,
} from './storage'
export {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  MethodNotAllowedException,
  ConflictException,
  UnprocessableEntityException,
  TooManyRequestsException,
  InternalServerErrorException,
  ServiceUnavailableException,
  ValidationException,
  registerExceptionHandler,
  normalizeError,
} from './errors'
export { Controller, controller, get, post, put, del } from './controller'
// `patch` decorator not re-exported here to avoid conflict with client VDOM `patch`
export { patch as patchDecorator } from './controller'
export { SmartErrorHandler } from './errors/handler.js'
export type { ErrorHint } from './errors/handler.js'
export { generateDashboardHtml, trackQuery, getRecentQueries, clearQueries, wrapConnection } from './debug/dashboard.js'

export interface AppOptions {
  engine?: ServerEngine
  container?: Container
}

export class SuperApp {
  readonly router: Router
  readonly container: Container
  private engine: ServerEngine
  private serverInstance: ServerInstance | undefined
  private globalPipeline: MiddlewarePipeline
  private started = false
  private serverPromise: Promise<void> | undefined
  private onErrorHandler: ((err: Error, ctx: RouteContext) => void | Promise<void>) | null = null
  private onNotFoundHandler: ((ctx: RouteContext) => void | Promise<void>) | null = null
  private shutdownHandlers: (() => void | Promise<void>)[] = []
  private shuttingDown = false

  constructor(options: AppOptions = {}) {
    this.container = options.container ?? new Container()
    this.router = new Router()
    this.engine = options.engine ?? new NodeEngine()
    this.globalPipeline = new MiddlewarePipeline()

    this.container.instance('app', this)
    this.container.instance('router', this.router)
    this.container.instance('container', this.container)
  }

  use(middleware: Middleware): this {
    this.globalPipeline.use(middleware)
    return this
  }

  get(path: string, handler: RouteHandler): this {
    this.router.get(path, handler)
    return this
  }

  post(path: string, handler: RouteHandler): this {
    this.router.post(path, handler)
    return this
  }

  put(path: string, handler: RouteHandler): this {
    this.router.put(path, handler)
    return this
  }

  patch(path: string, handler: RouteHandler): this {
    this.router.patch(path, handler)
    return this
  }

  delete(path: string, handler: RouteHandler): this {
    this.router.delete(path, handler)
    return this
  }

  options(path: string, handler: RouteHandler): this {
    this.router.options(path, handler)
    return this
  }

  any(path: string, handler: RouteHandler): this {
    this.router.any(path, handler)
    return this
  }

  match(methods: string[], path: string, handler: RouteHandler): this {
    this.router.match(methods, path, handler)
    return this
  }

  group(prefix: string, callback: (router: Router) => void): this {
    this.router.group(prefix, callback)
    return this
  }

  resource(name: string, controller: ControllerClass): this {
    this.router.resource(name, controller)
    return this
  }

  apiResource(name: string, controller: ControllerClass): this {
    this.router.apiResource(name, controller)
    return this
  }

  controller(ctrl: ControllerClass): this {
    const prefix = getControllerPrefix(ctrl as object)
    const routes = getControllerRoutes(ctrl.prototype)

    for (const route of routes) {
      const handlerPath = `${prefix}${route.path}`
      const handlerName = String(route.handler)

      this.router.match([route.method], handlerPath, async (ctx: RouteContext) => {
        const instance = createControllerInstance(ctrl, ctx)
        const handlerFn = (instance as Record<string, unknown>)[handlerName]

        if (typeof handlerFn === 'function') {
          await handlerFn.call(instance, ctx)
        } else {
          throw new Error(`Handler ${handlerName} not found on controller ${ctrl.name}`)
        }
      })
    }

    return this
  }

  middleware(middleware: Middleware | Middleware[]): this {
    this.router.middleware(middleware)
    return this
  }

  setEngine(engine: ServerEngine): this {
    if (this.started) {
      throw new Error('Cannot change engine after server has started')
    }
    this.engine = engine
    return this
  }

  static(path: string, options?: StaticOptions): this {
    this.use(staticFilesMiddleware(path, options))
    return this
  }

  view(engine: ViewEngine): this {
    this.container.instance('view', engine)
    return this
  }

  onError(handler: (err: Error, ctx: RouteContext) => void | Promise<void>): this {
    this.onErrorHandler = handler
    return this
  }

  notFound(handler: (ctx: RouteContext) => void | Promise<void>): this {
    this.onNotFoundHandler = handler
    return this
  }

  onShutdown(handler: () => void | Promise<void>): this {
    this.shutdownHandlers.push(handler)
    return this
  }

  getServer(): ServerInstance | undefined {
    return this.serverInstance
  }

  async start(port?: number, host?: string): Promise<void> {
    if (this.started) {
      throw new Error('Server has already been started')
    }
    this.started = true

    this.serverInstance = await this.engine.createServer(async (req: SuperRequest, res: SuperResponse) => {
      await this.handleRequest(req, res)
    })

    this.setupDebugMode()

    const listenPort = port ?? 3000
    const listenHost = host ?? '0.0.0.0'

    return new Promise<void>((resolve) => {
      const raw = this.serverInstance!.raw
      raw.listen(listenPort, listenHost, () => {
        resolve()
      })
    })
  }

  listen(port?: number, hostOrCallback?: string | (() => void), callback?: () => void): this {
    const actualPort = port
    const actualHost = typeof hostOrCallback === 'string' ? hostOrCallback : undefined
    const actualCallback = typeof hostOrCallback === 'function' ? hostOrCallback : callback
    this.serverPromise = this.start(actualPort, actualHost).then(() => {
      const shutdown = async (signal: string) => {
        if (this.shuttingDown) return
        this.shuttingDown = true

        console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`)

        for (const handler of this.shutdownHandlers) {
          try {
            await handler()
          } catch {
            /* ignore shutdown errors */
          }
        }

        const forceExit = setTimeout(() => process.exit(1), 10000)
        await this.close()
        clearTimeout(forceExit)
        console.log('✓ Server shut down gracefully')
      }

      process.on('SIGINT', () => shutdown('SIGINT'))
      process.on('SIGTERM', () => shutdown('SIGTERM'))

      if (process.stdin && process.stdin.isTTY) {
        process.stdin.on('end', () => shutdown('stdin end'))
      }

      actualCallback?.()
    })
    return this
  }

  async close(): Promise<void> {
    if (this.serverInstance !== undefined) {
      await this.engine.close(this.serverInstance)
      this.serverInstance = undefined
      this.started = false
    }
  }

  async ready(): Promise<void> {
    if (this.serverPromise !== undefined) {
      await this.serverPromise
    }
  }

  private setupDebugMode(): void {
    if (process.env.SPEEXJS_DEBUG !== 'true') return

    this.router.get('/_speexjs/dashboard', async (ctx) => {
      const routes = this.router.getRoutes().map((r) => ({
        method: (r.methods[0] || 'GET') as string,
        path: r.path,
        middlewareCount: r.middleware.length,
      }))

      const queries = getRecentQueries()

      let cacheStats: { hits: number; misses: number; keys: number; size: string } | null = null
      try {
        const cache = this.container.resolve<any>('cache')
        if (cache && typeof cache.stats === 'function') {
          cacheStats = cache.stats()
        }
      } catch {
        /* no cache registered */
      }

      const configStore: Record<string, unknown> = {}
      try {
        const cfg = this.container.resolve<any>('config')
        if (cfg) {
          const store = (cfg as any).store
          if (store instanceof Map) {
            for (const [k, v] of store) {
              configStore[k] = v
            }
          }
        }
      } catch {
        /* no config registered */
      }

      const html = generateDashboardHtml(routes, queries, cacheStats, configStore)
      ctx.response.type('text/html; charset=utf-8').send(html)
    })

    const originalRaw = DatabaseConnection.prototype.raw
    DatabaseConnection.prototype.raw = async function (this: DatabaseConnection, sql: string, bindings?: any[]) {
      const start = Date.now()
      try {
        return await originalRaw.call(this, sql, bindings)
      } finally {
        trackQuery(sql, Date.now() - start, bindings)
      }
    }
  }

  private async handleRequest(req: SuperRequest, res: SuperResponse): Promise<void> {
    const resolvedRoute = this.router.resolve(req.method, req.path)

    if (resolvedRoute === null) {
      if (this.onNotFoundHandler !== null) {
        const ctx: RouteContext = {
          request: req,
          response: res,
          params: {},
          query: req.query,
          container: this.container,
        }
        await this.onNotFoundHandler(ctx)
        if (!res.headersSent) await res.flush()
        return
      }
      res.status(HttpStatus.NOT_FOUND).json({
        error: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      })
      await res.flush()
      return
    }

    req.params = resolvedRoute.params

    const ctx: RouteContext = {
      request: req,
      response: res,
      params: resolvedRoute.params,
      query: req.query,
      container: this.container,
    }

    try {
      await this.globalPipeline.run(ctx, async () => {
        const routePipeline = new MiddlewarePipeline()
        for (const mw of resolvedRoute.middleware) {
          routePipeline.use(mw)
        }
        await routePipeline.run(ctx, async () => {
          await resolvedRoute.handler(ctx)
        })
      })
    } catch (err: unknown) {
      if (this.onErrorHandler !== null) {
        try {
          await this.onErrorHandler(err instanceof Error ? err : new Error(String(err)), ctx)
        } catch {
          /* ignore handler errors */
        }
      } else {
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal Server Error',
            message: err instanceof Error ? err.message : String(err),
          })
          await res.flush()
        }
      }
    }

    if (!res.headersSent) {
      await res.flush()
    }
  }
}

export function speexjs(options?: AppOptions): SuperApp {
  return new SuperApp(options)
}

export function createControllerInstance(controller: ControllerClass, ctx: RouteContext): object {
  const instance = new controller()
  ;(instance as Record<string, unknown>).__ctx = ctx
  ;(instance as Record<string, unknown>).__container = ctx.container
  return instance
}
