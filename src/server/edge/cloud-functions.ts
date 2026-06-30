// Serverless adapters for SpeexJS — all types use any casts intentionally
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SuperApp } from '../index.js'
import { NodeEngine } from '../engine/index.js'

export interface LambdaEvent {
  rawPath?: string
  path?: string
  requestContext?: { http?: { method?: string }; domainName?: string }
  httpMethod?: string
  headers?: Record<string, string>
  queryStringParameters?: Record<string, string> | null
  body?: string | null
  isBase64Encoded?: boolean
}

export interface LambdaResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
  isBase64Encoded: boolean
}

// ─── AWS Lambda Adapter ─────────────────────────────────────

export function createLambdaHandler(app: SuperApp) {
  return async (event: LambdaEvent): Promise<LambdaResponse> => {
    const method = event.requestContext?.http?.method ?? event.httpMethod ?? 'GET'
    const path = event.rawPath ?? event.path ?? '/'

    const engine = new NodeEngine()
    const server = await engine.createServer(() => {})
    const rawReq = new (await import('node:http')).IncomingMessage(server.raw as any)
    const rawRes = new (await import('node:http')).ServerResponse(rawReq)

    const req: any = {
      method,
      path,
      params: {},
      query: {},
      raw: rawReq,
      body: async () => (event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body) : {}),
      json: async () => ({}),
      formData: async () => new Map(),
      validate: async (_s: any) => null,
      headers: { get: (n: string) => event.headers?.[n.toLowerCase()] ?? null },
    }
    const res: any = {
      statusCode: 200,
      _body: null,
      raw: rawRes,
      headersSent: false,
      _headers: new Map(),
      _cookies: [],
      status: function (c: number) {
        this.statusCode = c
        return this
      },
      json: function (d: any) {
        this._body = JSON.stringify(d)
        return this
      },
      html: function (h: string) {
        this._body = h
        return this
      },
      send: function (d: string) {
        this._body = d
        return this
      },
      type: function () {
        return this
      },
      header: function (n: string, v: string) {
        this._headers.set(n, v)
        return this
      },
      redirect: function () {
        return this
      },
      stream: async function () {},
      flush: async function () {},
      cookie: function () {
        return this
      },
      clearCookie: function () {
        return this
      },
      getCookie: function () {
        return null
      },
    }

    const route = app.router.resolve(method, path)
    if (!route)
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Not Found' }),
        isBase64Encoded: false,
      }

    try {
      await (route as any).handler({ request: req, response: res, params: route.params, query: req.query, container: app.container })
      return {
        statusCode: res.statusCode,
        headers: { 'content-type': 'application/json', ...Object.fromEntries(res._headers) },
        body: res._body ?? '',
        isBase64Encoded: false,
      }
    } catch (err: any) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: err.message }),
        isBase64Encoded: false,
      }
    }
  }
}

// ─── Vercel Serverless Adapter ──────────────────────────────

export function createVercelHandler(app: SuperApp) {
  return async (req: any, res: any): Promise<void> => {
    const route = app.router.resolve(req.method, req.url?.split('?')[0] ?? '/')
    if (!route) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Not Found' }))
      return
    }
    const ctx: any = {
      request: {
        method: req.method,
        path: req.url?.split('?')[0] ?? '/',
        params: route.params,
        query: {},
        headers: req.headers,
        body: async () =>
          new Promise((resolve) => {
            let d = ''
            req.on('data', (c: any) => (d += c))
            req.on('end', () => resolve(d ? JSON.parse(d) : {}))
          }),
      },
      response: {
        statusCode: 200,
        json: (d: any) => {
          res.statusCode = 200
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(d))
        },
        html: (h: string) => {
          res.setHeader('content-type', 'text/html')
          res.end(h)
        },
        send: (s: string) => res.end(s),
        status: (c: number) => {
          res.statusCode = c
          return ctx.response
        },
        header: (n: string, v: string) => {
          res.setHeader(n, v)
          return ctx.response
        },
      },
      params: route.params,
      query: {},
      container: app.container,
    }
    try {
      await (route as any).handler(ctx)
    } catch (err: any) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
    }
    if (!res.writableEnded) res.end()
  }
}

// ─── Web Standard Fetch Adapter ─────────────────────────────

export function createFetchHandler(app: SuperApp) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const method = request.method
    const path = url.pathname
    const route = app.router.resolve(method, path)
    if (!route)
      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'content-type': 'application/json' } })

    let body: any = {}
    try {
      body = await request.json()
    } catch {}
    let responseBody: any
    let statusCode = 200
    const responseHeaders = new Headers()
    const res: any = {
      status: (c: number) => {
        statusCode = c
        return res
      },
      json: (d: any) => {
        responseBody = d
        return res
      },
      html: (h: string) => {
        responseBody = h
        responseHeaders.set('content-type', 'text/html')
        return res
      },
      send: (s: string) => {
        responseBody = s
        return res
      },
      type: (t: string) => {
        responseHeaders.set('content-type', t)
        return res
      },
      header: (n: string, v: string) => {
        responseHeaders.set(n, v)
        return res
      },
    }
    const ctx: any = {
      request: {
        method,
        path,
        params: route.params,
        query: Object.fromEntries(url.searchParams),
        headers: request.headers,
        body: async () => body,
        json: async () => body,
      },
      response: res,
      params: route.params,
      query: Object.fromEntries(url.searchParams),
      container: app.container,
    }

    try {
      await (route as any).handler(ctx)
      return new Response(typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody), {
        status: statusCode,
        headers: responseHeaders,
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'content-type': 'application/json' } })
    }
  }
}
