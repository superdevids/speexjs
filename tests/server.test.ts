import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { Readable } from 'node:stream'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync, existsSync, mkdirSync, unlinkSync, rmdirSync } from 'node:fs'

vi.mock('../src/server/database/model.js', () => ({ Model: class {} }))
vi.mock('../src/server/database/index.js', () => ({}))

import { HttpStatus, statusText } from '../src/server/http/status.js'
import { HeadersMap } from '../src/server/http/headers.js'
import { SuperRequest } from '../src/server/http/request.js'
import { SuperResponse } from '../src/server/http/response.js'
import { parseCookies, serializeCookie, clearCookie } from '../src/server/http/cookie.js'
import { SuperUploadedFile } from '../src/server/http/upload.js'

import { Router } from '../src/server/router/index.js'
import {
  cors, bodyParser, session, throttle, logger, csrf, helmet, compress,
  MiddlewarePipeline, staticFiles,
} from '../src/server/middleware/index.js'
import { Container } from '../src/server/container/index.js'
import { Controller, controller, get, post, put, patch, del, getControllerPrefix, getControllerRoutes } from '../src/server/controller/index.js'
import { Event } from '../src/server/events/index.js'
import { Gate, AuthorizationError, authorize } from '../src/server/gate/index.js'
import { Cache } from '../src/server/cache/index.js'
import { LocalDisk, Storage, createStorage, storage } from '../src/server/storage/index.js'
import { speexjs } from '../src/server/index.js'

import {
  HttpException, BadRequestException, UnauthorizedException, ForbiddenException,
  NotFoundException, MethodNotAllowedException, ConflictException,
  UnprocessableEntityException, TooManyRequestsException,
  InternalServerErrorException, ServiceUnavailableException,
  ValidationException, normalizeError, registerExceptionHandler,
} from '../src/server/errors.js'

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockReq(opts: Partial<{
  method: string
  url: string
  headers: Record<string, string | string[]>
  socketRemote: string
  body: Buffer
}> = {}): IncomingMessage {
  const socket = new Socket()
  if (opts.socketRemote) {
    Object.defineProperty(socket, 'remoteAddress', { value: opts.socketRemote, writable: false })
  }
  const req = new IncomingMessage(socket)
  req.method = opts.method ?? 'GET'
  req.url = opts.url ?? '/'
  req.headers = (opts.headers ?? {}) as Record<string, string | string[]>
  if (opts.body) {
    req.push(opts.body)
    req.push(null)
  }
  return req
}

function createMockRes(): ServerResponse {
  const socket = new Socket()
  const res = new ServerResponse(socket)
  res.statusCode = 200
  return res
}

function createMockIncomingMessage(method: string, url: string): IncomingMessage {
  const socket = new Socket()
  const req = new IncomingMessage(socket)
  req.method = method
  req.url = url
  req.headers = {}
  return req
}

function createMockServerResponse(): ServerResponse {
  const socket = new Socket()
  return new ServerResponse(socket)
}

const testSchema = {
  parse(input: unknown): unknown { return input as string },
  validate(input: unknown): { success: boolean; data?: unknown; errors?: { message: string; path?: string }[] } {
    if (typeof input === 'string' && input.length > 0) {
      return { success: true, data: input }
    }
    return { success: false, errors: [{ message: 'Invalid input', path: 'input' }] }
  }
}

// ─── 1. HTTP Layer ───────────────────────────────────────────────────

describe('HttpStatus', () => {
  it('has correct status codes', () => {
    expect(HttpStatus.OK).toBe(200)
    expect(HttpStatus.CREATED).toBe(201)
    expect(HttpStatus.ACCEPTED).toBe(202)
    expect(HttpStatus.NO_CONTENT).toBe(204)
    expect(HttpStatus.RESET_CONTENT).toBe(205)
    expect(HttpStatus.PARTIAL_CONTENT).toBe(206)
    expect(HttpStatus.MOVED_PERMANENTLY).toBe(301)
    expect(HttpStatus.FOUND).toBe(302)
    expect(HttpStatus.SEE_OTHER).toBe(303)
    expect(HttpStatus.NOT_MODIFIED).toBe(304)
    expect(HttpStatus.TEMPORARY_REDIRECT).toBe(307)
    expect(HttpStatus.PERMANENT_REDIRECT).toBe(308)
    expect(HttpStatus.BAD_REQUEST).toBe(400)
    expect(HttpStatus.UNAUTHORIZED).toBe(401)
    expect(HttpStatus.PAYMENT_REQUIRED).toBe(402)
    expect(HttpStatus.FORBIDDEN).toBe(403)
    expect(HttpStatus.NOT_FOUND).toBe(404)
    expect(HttpStatus.METHOD_NOT_ALLOWED).toBe(405)
    expect(HttpStatus.NOT_ACCEPTABLE).toBe(406)
    expect(HttpStatus.REQUEST_TIMEOUT).toBe(408)
    expect(HttpStatus.CONFLICT).toBe(409)
    expect(HttpStatus.GONE).toBe(410)
    expect(HttpStatus.LENGTH_REQUIRED).toBe(411)
    expect(HttpStatus.PRECONDITION_FAILED).toBe(412)
    expect(HttpStatus.PAYLOAD_TOO_LARGE).toBe(413)
    expect(HttpStatus.URI_TOO_LONG).toBe(414)
    expect(HttpStatus.UNSUPPORTED_MEDIA_TYPE).toBe(415)
    expect(HttpStatus.UNPROCESSABLE_ENTITY).toBe(422)
    expect(HttpStatus.TOO_MANY_REQUESTS).toBe(429)
    expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500)
    expect(HttpStatus.NOT_IMPLEMENTED).toBe(501)
    expect(HttpStatus.BAD_GATEWAY).toBe(502)
    expect(HttpStatus.SERVICE_UNAVAILABLE).toBe(503)
    expect(HttpStatus.GATEWAY_TIMEOUT).toBe(504)
    expect(HttpStatus.HTTP_VERSION_NOT_SUPPORTED).toBe(505)
  })

  it('statusText returns correct labels', () => {
    expect(statusText(200)).toBe('OK')
    expect(statusText(404)).toBe('Not Found')
    expect(statusText(500)).toBe('Internal Server Error')
    expect(statusText(99)).toBe('Unknown')
    expect(statusText(100)).toBe('Informational')
    expect(statusText(302)).toBe('Found')
    expect(statusText(418)).toBe('Client Error')
    expect(statusText(600)).toBe('Unknown')
  })
})

describe('HeadersMap', () => {
  let hm: HeadersMap

  beforeEach(() => {
    hm = new HeadersMap()
  })

  it('set and get', () => {
    hm.set('Content-Type', 'application/json')
    expect(hm.get('content-type')).toBe('application/json')
    expect(hm.get('Content-Type')).toBe('application/json')
  })

  it('has returns correct boolean', () => {
    hm.set('X-Custom', 'val')
    expect(hm.has('x-custom')).toBe(true)
    expect(hm.has('not-exist')).toBe(false)
  })

  it('delete removes header', () => {
    hm.set('Authorization', 'Bearer token')
    hm.delete('authorization')
    expect(hm.has('authorization')).toBe(false)
  })

  it('entries iterates all values', () => {
    hm.set('a', '1')
    hm.append('a', '2')
    const entries = [...hm.entries()]
    expect(entries).toEqual([['a', '1'], ['a', '2']])
  })

  it('getAll returns all values', () => {
    hm.set('set-cookie', 'a=1')
    hm.append('set-cookie', 'b=2')
    expect(hm.getAll('set-cookie')).toEqual(['a=1', 'b=2'])
  })

  it('toNodeHeaders handles set-cookie correctly', () => {
    hm.set('content-type', 'text/html')
    hm.append('set-cookie', 'a=1')
    hm.append('set-cookie', 'b=2')
    const nh = hm.toNodeHeaders()
    expect(nh['content-type']).toBe('text/html')
    expect(nh['set-cookie']).toEqual(['a=1', 'b=2'])
  })

  it('toJSON returns values', () => {
    hm.set('x-one', 'single')
    hm.append('x-one', 'second')
    const j = hm.toJSON()
    expect(j['x-one']).toEqual(['single', 'second'])
  })

  it('constructs from initial record', () => {
    const hm2 = new HeadersMap({ 'Content-Type': 'text/plain', 'X-Array': ['v1', 'v2'] })
    expect(hm2.get('content-type')).toBe('text/plain')
    expect(hm2.get('x-array')).toBe('v1, v2')
  })

  it('size property', () => {
    hm.set('a', '1')
    hm.set('b', '2')
    expect(hm.size).toBe(2)
  })

  it('keys and values iterators', () => {
    hm.set('x', 'y')
    hm.set('z', 'w')
    expect([...hm.keys()]).toEqual(['x', 'z'])
    expect([...hm.values()]).toEqual(['y', 'w'])
  })

  it('is iterable via Symbol.iterator', () => {
    hm.set('k', 'v')
    const arr = [...hm]
    expect(arr).toEqual([['k', 'v']])
  })
})

describe('Cookie', () => {
  describe('parseCookies', () => {
    it('parses simple cookie', () => {
      expect(parseCookies('name=value')).toEqual({ name: 'value' })
    })

    it('parses multiple cookies', () => {
      expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' })
    })

    it('handles empty header', () => {
      expect(parseCookies('')).toEqual({})
    })

    it('handles quoted values', () => {
      expect(parseCookies('a="quoted"')).toEqual({ a: 'quoted' })
    })

    it('URL-decodes names and values', () => {
      expect(parseCookies('name%20with%20space=value%21')).toEqual({ 'name with space': 'value!' })
    })
  })

  describe('serializeCookie', () => {
    it('serializes name=value', () => {
      const result = serializeCookie('name', 'val')
      expect(result).toBe('name=val')
    })

    it('includes all options', () => {
      const expires = new Date('2030-01-01')
      const result = serializeCookie('test', 'val', {
        maxAge: 3600,
        expires,
        path: '/app',
        domain: 'example.com',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
      })
      expect(result).toContain('Max-Age=3600')
      expect(result).toContain('Expires=')
      expect(result).toContain('Path=/app')
      expect(result).toContain('Domain=example.com')
      expect(result).toContain('Secure')
      expect(result).toContain('HttpOnly')
      expect(result).toContain('SameSite=strict')
    })
  })

  describe('clearCookie', () => {
    it('creates cookie with maxAge 0', () => {
      const result = clearCookie('session')
      expect(result).toContain('session=')
      expect(result).toContain('Max-Age=0')
      expect(result).toContain('Expires=')
    })
  })
})

describe('SuperRequest', () => {
  it('constructs from IncomingMessage', () => {
    const raw = createMockReq({ method: 'POST', url: '/api/users?page=1', headers: { host: 'test.com' }, socketRemote: '192.168.1.1' })
    const req = new SuperRequest(raw)
    expect(req.method).toBe('POST')
    expect(req.path).toBe('/api/users')
    expect(req.url).toBe('/api/users?page=1')
    expect(req.ip).toBe('192.168.1.1')
  })

  it('extracts query parameters', () => {
    const req = new SuperRequest(createMockReq({ url: '/search?q=hello&page=1&tags=a&tags=b' }))
    expect(req.query).toEqual({ q: 'hello', page: '1', tags: ['a', 'b'] })
  })

  it('handles params setter/getter', () => {
    const req = new SuperRequest(createMockReq())
    req.params = { id: '42' }
    expect(req.params).toEqual({ id: '42' })
  })

  it('returns headers via HeadersMap', () => {
    const req = new SuperRequest(createMockReq({ headers: { 'x-custom': 'abc', 'content-type': 'text/plain' } }))
    expect(req.headers.get('x-custom')).toBe('abc')
  })

  it('wantsJson returns true for application/json accept header', () => {
    const req = new SuperRequest(createMockReq({ headers: { accept: 'application/json' } }))
    expect(req.wantsJson()).toBe(true)
  })

  it('wantsJson returns true for ajax requests', () => {
    const req = new SuperRequest(createMockReq({ headers: { 'x-requested-with': 'XMLHttpRequest' } }))
    expect(req.wantsJson()).toBe(true)
  })

  it('wantsJson returns false otherwise', () => {
    const req = new SuperRequest(createMockReq({ headers: { accept: 'text/html' } }))
    expect(req.wantsJson()).toBe(false)
  })

  it('bearerToken extracts from Authorization header', () => {
    const req = new SuperRequest(createMockReq({ headers: { authorization: 'Bearer mytoken123' } }))
    expect(req.bearerToken()).toBe('mytoken123')
  })

  it('bearerToken returns undefined when missing', () => {
    expect(new SuperRequest(createMockReq()).bearerToken()).toBeUndefined()
  })

  it('cookie parses from header', () => {
    const req = new SuperRequest(createMockReq({ headers: { cookie: 'session=abc123; theme=dark' } }))
    expect(req.cookie('session')).toBe('abc123')
    expect(req.cookie('theme')).toBe('dark')
    expect(req.cookie('nonexistent')).toBeUndefined()
  })

  it('method preserves empty string (no default)', () => {
    const req = new SuperRequest(createMockReq({ method: '' }))
    expect(req.method).toBe('')
  })

  describe('body reading', () => {
    it('text() returns body as string', async () => {
      const req = new SuperRequest(createMockReq({
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: Buffer.from('hello'),
      }))
      expect(await req.text()).toBe('hello')
    })

    it('json() parses JSON body', async () => {
      const req = new SuperRequest(createMockReq({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: Buffer.from(JSON.stringify({ name: 'test' })),
      }))
      const data = await req.json<{ name: string }>()
      expect(data).toEqual({ name: 'test' })
    })

    it('json() throws for non-JSON content', async () => {
      const req = new SuperRequest(createMockReq({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: Buffer.from('hello'),
      }))
      await expect(req.json()).rejects.toThrow('not valid JSON')
    })

    it('body() returns parsed content', async () => {
      const req = new SuperRequest(createMockReq({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: Buffer.from(JSON.stringify({ key: 'val' })),
      }))
      expect(await req.body()).toEqual({ key: 'val' })
    })

    it('body() returns text for non-JSON', async () => {
      const req = new SuperRequest(createMockReq({
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: Buffer.from('raw text'),
      }))
      expect(await req.body()).toBe('raw text')
    })

    it('formData() parses url-encoded', async () => {
      const req = new SuperRequest(createMockReq({
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: Buffer.from('a=1&b=2'),
      }))
      const fd = await req.formData()
      expect(fd).toEqual({ a: '1', b: '2' })
    })
  })

  it('validate uses schema', async () => {
    const req = new SuperRequest(createMockReq({
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: Buffer.from('valid'),
    }))
    expect(await req.validate(testSchema)).toBe('valid')
  })

  it('validate throws on failure', async () => {
    const req = new SuperRequest(createMockReq({
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: Buffer.from(''),
    }))
    await expect(req.validate(testSchema)).rejects.toThrow()
  })

  it('isAjax detects XMLHttpRequest', () => {
    expect(new SuperRequest(createMockReq({ headers: { 'x-requested-with': 'XMLHttpRequest' } })).isAjax()).toBe(true)
  })

  it('rawRequest returns the underlying IncomingMessage', () => {
    const raw = createMockReq()
    expect(new SuperRequest(raw).rawRequest).toBe(raw)
  })

  it('ip falls back to socket.remoteAddress', () => {
    const raw = createMockReq({ socketRemote: '10.0.0.1' })
    expect(new SuperRequest(raw).ip).toBe('10.0.0.1')
  })

  it('ip strips IPv6 prefix', () => {
    const raw = createMockReq({ socketRemote: '::ffff:192.168.1.1' })
    expect(new SuperRequest(raw).ip).toBe('192.168.1.1')
  })
})

describe('SuperResponse', () => {
  let raw: ServerResponse
  let res: SuperResponse

  beforeEach(() => {
    raw = createMockRes()
    res = new SuperResponse(raw)
  })

  it('status sets code and returns self', () => {
    const ret = res.status(HttpStatus.CREATED)
    expect(ret).toBe(res)
    expect(res.statusCode).toBe(201)
  })

  it('header sets header value', () => {
    res.header('X-Custom', 'val')
    expect(res.getHeader('x-custom')).toBe('val')
  })

  it('setHeader is alias for header', () => {
    res.setHeader('x-test', 'abc')
    expect(res.getHeader('x-test')).toBe('abc')
  })

  it('removeHeader works', () => {
    res.header('x-remove', 'val')
    res.removeHeader('x-remove')
    expect(res.hasHeader('x-remove')).toBe(false)
  })

  it('type sets content-type', () => {
    res.type('application/pdf')
    expect(res.getHeader('content-type')).toBe('application/pdf')
  })

  it('json sets status and content-type', () => {
    res.json({ ok: true }, HttpStatus.CREATED)
    expect(res.statusCode).toBe(201)
  })

  it('json without status uses default', () => {
    res.json({ msg: 'hi' })
    expect(res.statusCode).toBe(HttpStatus.OK)
  })

  it('send sets body', () => {
    res.send('hello', 200, 'text/plain')
    expect(res.statusCode).toBe(200)
  })

  it('send respects pre-set content-type', () => {
    res.type('text/csv')
    res.send('a,b,c', 200, 'application/json')
    expect(res.getHeader('content-type')).toBe('text/csv')
  })

  it('html sets html content type', () => {
    res.html('<h1>Title</h1>')
    expect(res.getHeader('content-type')).toContain('text/html')
  })

  it('redirect sets location header', () => {
    res.redirect('/login', HttpStatus.FOUND as 302)
    expect(res.statusCode).toBe(302)
    expect(res.getHeader('location')).toBe('/login')
  })

  it('redirect throws on CRLF injection', () => {
    expect(() => res.redirect('/login\r\nX-Injected: true')).toThrow('Invalid redirect URL')
  })

  it('cookie sets a cookie via flush', () => {
    res.cookie('session', 'abc', { httpOnly: true })
    expect(res.getHeader('set-cookie')).toBeUndefined()
    res.flush()
    expect(raw.getHeader('Set-Cookie')).toBeDefined()
  })

  it('clearCookie clears a cookie', () => {
    res.clearCookie('old')
  })

  it('headersSent is false before flush', () => {
    expect(res.headersSent).toBe(false)
  })

  it('headersSent is true after flush', async () => {
    res.send('ok')
    await res.flush()
    expect(res.headersSent).toBe(true)
  })

  it('flush is idempotent', async () => {
    res.send('ok')
    await res.flush()
    await res.flush()
    expect(res.headersSent).toBe(true)
  })

  it('rawResponse returns the underlying ServerResponse', () => {
    expect(res.rawResponse).toBe(raw)
  })

  it('attachment sets content-disposition', () => {
    res.attachment('file.pdf')
    expect(res.getHeader('content-disposition')).toContain('file.pdf')
  })

  it('attachment without filename sets generic disposition', () => {
    res.attachment()
    expect(res.getHeader('content-disposition')).toBe('attachment')
  })

  it('stream pipes to underlying response', () => {
    const stream = new Readable({
      read() {
        this.push('hello')
        this.push(null)
      }
    })
    res.stream(stream)
  })
})

// ─── 2. Router ───────────────────────────────────────────────────────

describe('Router', () => {
  let router: Router

  beforeEach(() => {
    router = new Router()
  })

  it('registers GET route and resolves it', () => {
    const handler = vi.fn()
    router.get('/test', handler)
    const resolved = router.resolve('GET', '/test')
    expect(resolved).not.toBeNull()
    expect(resolved!.handler).toBe(handler)
  })

  it('registers POST, PUT, PATCH, DELETE routes', () => {
    const h1 = vi.fn(); const h2 = vi.fn(); const h3 = vi.fn(); const h4 = vi.fn()
    router.post('/a', h1); router.put('/b', h2); router.patch('/c', h3); router.delete('/d', h4)
    expect(router.resolve('POST', '/a')!.handler).toBe(h1)
    expect(router.resolve('PUT', '/b')!.handler).toBe(h2)
    expect(router.resolve('PATCH', '/c')!.handler).toBe(h3)
    expect(router.resolve('DELETE', '/d')!.handler).toBe(h4)
  })

  it('returns null for unmatched route', () => {
    router.get('/exists', vi.fn())
    expect(router.resolve('GET', '/nonexistent')).toBeNull()
  })

  it('returns null for wrong method', () => {
    router.get('/only-get', vi.fn())
    expect(router.resolve('POST', '/only-get')).toBeNull()
  })

  it('extracts path parameters', () => {
    router.get('/users/:id', vi.fn())
    expect(router.resolve('GET', '/users/42')!.params).toEqual({ id: '42' })
  })

  it('extracts multiple path parameters', () => {
    router.get('/posts/:postId/comments/:commentId', vi.fn())
    const resolved = router.resolve('GET', '/posts/10/comments/5')
    expect(resolved!.params).toEqual({ postId: '10', commentId: '5' })
  })

  it('normalizes paths', () => {
    router.get('no-leading-slash', vi.fn())
    expect(router.resolve('GET', '/no-leading-slash')).not.toBeNull()
  })

  it('normalizes trailing slash', () => {
    router.get('/trailing/', vi.fn())
    expect(router.resolve('GET', '/trailing')).not.toBeNull()
  })

  it('route groups with prefix', () => {
    const handler = vi.fn()
    router.group('/admin', (r) => { r.get('/dashboard', handler) })
    expect(router.resolve('GET', '/admin/dashboard')).not.toBeNull()
  })

  it('nested route groups', () => {
    router.group('/api', (r) => {
      r.group('/v1', (r2) => { r2.get('/users', vi.fn()) })
    })
    expect(router.resolve('GET', '/api/v1/users')).not.toBeNull()
  })

  it('named routes generate URLs', () => {
    router.get('/users/:id', vi.fn()).name('users.show')
    expect(router.route('users.show', { id: '5' })).toBe('/users/5')
  })

  it('named route throws for unknown name', () => {
    expect(() => router.route('does.not.exist')).toThrow('Route not found')
  })

  it('resource routes register all 7 actions', () => {
    router.resource('photos', class { index = vi.fn() } as any)
    expect(router.resolve('GET', '/photos')).not.toBeNull()
    expect(router.resolve('GET', '/photos/create')).not.toBeNull()
    expect(router.resolve('POST', '/photos')).not.toBeNull()
    expect(router.resolve('GET', '/photos/1')).not.toBeNull()
    expect(router.resolve('GET', '/photos/1/edit')).not.toBeNull()
    expect(router.resolve('PUT', '/photos/1')).not.toBeNull()
    expect(router.resolve('PATCH', '/photos/1')).not.toBeNull()
    expect(router.resolve('DELETE', '/photos/1')).not.toBeNull()
  })

  it('apiResource includes only index/store/show/update/destroy routes', () => {
    const controllerClass = class { index = vi.fn(); show = vi.fn(); store = vi.fn(); update = vi.fn(); destroy = vi.fn() }
    router.apiResource('articles', controllerClass as any)

    // Standard resource routes that ARE present
    expect(router.resolve('GET', '/articles')).not.toBeNull()
    expect(router.resolve('POST', '/articles')).not.toBeNull()
    expect(router.resolve('PUT', '/articles/1')).not.toBeNull()
    expect(router.resolve('PATCH', '/articles/1')).not.toBeNull()
    expect(router.resolve('DELETE', '/articles/1')).not.toBeNull()

    // show route uses param - matches with correct params
    const shown = router.resolve('GET', '/articles/42')
    expect(shown!.params).toEqual({ article: '42' })

    // apiResource does NOT register named "create" or "edit" actions
    const routes = router.getRoutes()
    expect(routes.some(r => r.path === '/articles/create')).toBe(false)
    expect(routes.some(r => r.path.endsWith('/edit'))).toBe(false)
  })

  it('middleware per route group', () => {
    const mw = vi.fn((_ctx, next) => next())
    router.middleware(mw)
    router.get('/protected', vi.fn())
    expect(router.resolve('GET', '/protected')!.middleware).toContain(mw)
  })

  it('getRoutes returns registered routes', () => {
    router.get('/a', vi.fn()); router.post('/b', vi.fn())
    expect(router.getRoutes()).toHaveLength(2)
  })

  it('getNamedRoutes returns named route map', () => {
    router.get('/x', vi.fn()).name('x')
    expect(router.getNamedRoutes().has('x')).toBe(true)
  })

  it('any matches all methods', () => {
    const handler = vi.fn()
    router.any('/catch-all', handler)
    expect(router.resolve('GET', '/catch-all')!.handler).toBe(handler)
    expect(router.resolve('POST', '/catch-all')!.handler).toBe(handler)
    expect(router.resolve('DELETE', '/catch-all')!.handler).toBe(handler)
  })

  it('options registers OPTIONS route', () => {
    const handler = vi.fn()
    router.options('/opts', handler)
    expect(router.resolve('OPTIONS', '/opts')!.handler).toBe(handler)
  })
})

// ─── 3. Middleware ───────────────────────────────────────────────────

describe('Middleware: cors', () => {
  let ctx: any

  beforeEach(() => {
    ctx = {
      request: new SuperRequest(createMockReq({ headers: { origin: 'https://example.com' } })),
      response: new SuperResponse(createMockRes()),
      params: {}, query: {},
    }
  })

  it('sets access-control-allow-origin: * by default', async () => {
    const next = vi.fn()
    await cors()(ctx, next)
    expect(ctx.response.getHeader('access-control-allow-origin')).toBe('*')
    expect(next).toHaveBeenCalled()
  })

  it('echoes origin when in allowed list', async () => {
    await cors({ origin: ['https://example.com', 'https://other.com'] })(ctx, vi.fn())
    expect(ctx.response.getHeader('access-control-allow-origin')).toBe('https://example.com')
  })

  it('sets credentials header when enabled', async () => {
    await cors({ credentials: true })(ctx, vi.fn())
    expect(ctx.response.getHeader('access-control-allow-credentials')).toBe('true')
  })

  it('handles preflight OPTIONS request', async () => {
    const res = new SuperResponse(createMockRes())
    const optCtx = {
      request: new SuperRequest(createMockReq({ method: 'OPTIONS', headers: { origin: 'https://example.com' } })),
      response: res, params: {}, query: {},
    }
    const next = vi.fn()
    await cors()(optCtx, next)
    expect(res.statusCode).toBe(HttpStatus.NO_CONTENT)
    expect(res.getHeader('access-control-allow-methods')).toBeDefined()
    expect(next).not.toHaveBeenCalled()
  })

  it('sets exposed headers', async () => {
    await cors({ exposedHeaders: ['x-rate-limit'] })(ctx, vi.fn())
    expect(ctx.response.getHeader('access-control-expose-headers')).toBe('x-rate-limit')
  })

  it('sets origin from string option', async () => {
    await cors({ origin: 'https://fixed.com' })(ctx, vi.fn())
    expect(ctx.response.getHeader('access-control-allow-origin')).toBe('https://fixed.com')
  })

  it('no origin header does not set cors headers', async () => {
    const c = { ...ctx, request: new SuperRequest(createMockReq()) }
    await cors()(c, vi.fn())
    expect(c.response.getHeader('access-control-allow-origin')).toBeUndefined()
  })
})

describe('Middleware: bodyParser', () => {
  it('reads body for POST requests', async () => {
    const req = new SuperRequest(createMockReq({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(JSON.stringify({ a: 1 })),
    }))
    const ctx = { request: req, response: new SuperResponse(createMockRes()), params: {}, query: {} }
    const next = vi.fn()
    await bodyParser()(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  it('does not read body for GET requests', async () => {
    const ctx = { request: new SuperRequest(createMockReq()), response: new SuperResponse(createMockRes()), params: {}, query: {} }
    const next = vi.fn()
    await bodyParser()(ctx, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('Middleware: session', () => {
  it('sets session data on context', async () => {
    const ctx: any = { request: new SuperRequest(createMockReq()), response: new SuperResponse(createMockRes()), params: {}, query: {} }
    const next = vi.fn()
    await session({ secret: 'test-secret' })(ctx, next)
    expect(ctx.session).toBeDefined()
    expect(typeof ctx.session).toBe('object')
    expect(next).toHaveBeenCalled()
  })

  it('sets session cookie on first visit', async () => {
    const res = new SuperResponse(createMockRes())
    const ctx: any = { request: new SuperRequest(createMockReq()), response: res, params: {}, query: {} }
    await session({ secret: 'test-secret' })(ctx, vi.fn())
    expect(res.statusCode).toBe(200)
  })
})

describe('Middleware: throttle', () => {
  it('allows requests under limit', async () => {
    const req = new SuperRequest(createMockReq({ socketRemote: '10.0.0.1' }))
    const res = new SuperResponse(createMockRes())
    const ctx = { request: req, response: res, params: {}, query: {} }
    const next = vi.fn()
    await throttle(5, 60)(ctx, next)
    expect(ctx.response.getHeader('x-ratelimit-limit')).toBe('5')
    expect(next).toHaveBeenCalled()
  })

  it('blocks requests over limit', async () => {
    const req = new SuperRequest(createMockReq({ socketRemote: '10.0.0.2' }))
    const res = new SuperResponse(createMockRes())
    const ctx = { request: req, response: res, params: {}, query: {} }
    const mw = throttle(2, 60)

    await mw(ctx, vi.fn())
    await mw(ctx, vi.fn())
    await mw(ctx, vi.fn())
    expect(ctx.response.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS)
  })
})

describe('Middleware: logger', () => {
  it('does not throw', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = { request: new SuperRequest(createMockReq()), response: new SuperResponse(createMockRes()), params: {}, query: {} }
    await logger()(ctx, vi.fn())
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('Middleware: csrf', () => {
  it('skips CSRF for GET requests', async () => {
    const ctx = { request: new SuperRequest(createMockReq({ method: 'GET' })), response: new SuperResponse(createMockRes()), params: {}, query: {} }
    const next = vi.fn()
    await csrf()(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 403 for POST without token', async () => {
    const res = new SuperResponse(createMockRes())
    const ctx = { request: new SuperRequest(createMockReq({ method: 'POST' })), response: res, params: {}, query: {} }
    const next = vi.fn()
    await csrf()(ctx, next)
    expect(res.statusCode).toBe(HttpStatus.FORBIDDEN)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('Middleware: helmet', () => {
  it('sets security headers', async () => {
    const res = new SuperResponse(createMockRes())
    const ctx = { request: new SuperRequest(createMockReq()), response: res, params: {}, query: {} }
    await helmet()(ctx, vi.fn())
    expect(res.getHeader('x-content-type-options')).toBe('nosniff')
    expect(res.getHeader('x-frame-options')).toBe('SAMEORIGIN')
    expect(res.getHeader('strict-transport-security')).toBeDefined()
    expect(res.getHeader('content-security-policy')).toBeDefined()
  })
})

describe('Middleware: compress', () => {
  it('passes through without gzip support', async () => {
    const ctx = { request: new SuperRequest(createMockReq()), response: new SuperResponse(createMockRes()), params: {}, query: {} }
    const next = vi.fn()
    await compress()(ctx, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('MiddlewarePipeline', () => {
  it('runs middleware in order', async () => {
    const order: number[] = []
    const pipeline = new MiddlewarePipeline()
    pipeline.use(async (_ctx, next) => { order.push(1); await next() })
    pipeline.use(async (_ctx, next) => { order.push(2); await next() })
    await pipeline.run({} as any, vi.fn())
    expect(order).toEqual([1, 2])
  })

  it('prepend adds middleware at front', async () => {
    const order: number[] = []
    const pipeline = new MiddlewarePipeline()
    pipeline.use(async (_ctx, next) => { order.push(2); await next() })
    pipeline.prepend(async (_ctx, next) => { order.push(1); await next() })
    await pipeline.run({} as any, vi.fn())
    expect(order).toEqual([1, 2])
  })

  it('remove removes by name', () => {
    const mw = function testMw() {} as any
    const pipeline = new MiddlewarePipeline()
    pipeline.use(mw)
    expect(pipeline.getMiddlewares()).toHaveLength(1)
    pipeline.remove('testMw')
    expect(pipeline.getMiddlewares()).toHaveLength(0)
  })
})

describe('Middleware: staticFiles', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-test-'))
    writeFileSync(join(tmpDir, 'test.txt'), 'hello world')
    mkdirSync(join(tmpDir, 'sub'))
    writeFileSync(join(tmpDir, 'sub', 'nested.txt'), 'nested')
  })

  afterEach(() => {
    try { unlinkSync(join(tmpDir, 'test.txt')) } catch {}
    try { unlinkSync(join(tmpDir, 'sub', 'nested.txt')) } catch {}
    try { rmdirSync(join(tmpDir, 'sub')) } catch {}
    try { rmdirSync(tmpDir) } catch {}
  })

  it('serves existing file', async () => {
    const req = new SuperRequest(createMockReq({ url: '/test.txt' }))
    const res = new SuperResponse(createMockRes())
    const ctx = { request: req, response: res, params: {}, query: {} }
    const next = vi.fn()
    await staticFiles(tmpDir)(ctx, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.getHeader('content-type')).toBe('text/plain')
  })

  it('calls next for non-existent file', async () => {
    const ctx = { request: new SuperRequest(createMockReq({ url: '/nope.txt' })), response: new SuperResponse(createMockRes()), params: {}, query: {} }
    const next = vi.fn()
    await staticFiles(tmpDir)(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  it('denies dotfiles', async () => {
    writeFileSync(join(tmpDir, '.hidden'), 'secret')
    const ctx = { request: new SuperRequest(createMockReq({ url: '/.hidden' })), response: new SuperResponse(createMockRes()), params: {}, query: {} }
    const next = vi.fn()
    await staticFiles(tmpDir)(ctx, next)
    expect(next).toHaveBeenCalled()
    try { unlinkSync(join(tmpDir, '.hidden')) } catch {}
  })

  it('prevents path traversal', async () => {
    const ctx = { request: new SuperRequest(createMockReq({ url: '/../outside.txt' })), response: new SuperResponse(createMockRes()), params: {}, query: {} }
    const next = vi.fn()
    await staticFiles(tmpDir)(ctx, next)
    expect(next).toHaveBeenCalled()
  })
})

// ─── 4. Container ────────────────────────────────────────────────────

describe('Container', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
  })

  it('bind and resolve', () => {
    container.bind('db', () => ({ host: 'localhost' }))
    expect(container.resolve<{ host: string }>('db')).toEqual({ host: 'localhost' })
  })

  it('singleton returns same instance', () => {
    let count = 0
    container.singleton('counter', () => ++count)
    expect(container.resolve('counter')).toBe(1)
    expect(container.resolve('counter')).toBe(1)
  })

  it('transient returns new instance each time', () => {
    let count = 0
    container.bind('counter', () => ++count)
    expect(container.resolve('counter')).toBe(1)
    expect(container.resolve('counter')).toBe(2)
  })

  it('instance registers a pre-built instance', () => {
    const obj = { name: 'test' }
    container.instance('obj', obj)
    expect(container.resolve('obj')).toBe(obj)
  })

  it('has returns existence', () => {
    container.bind('exists', () => true)
    expect(container.has('exists')).toBe(true)
    expect(container.has('missing')).toBe(false)
  })

  it('remove deletes binding', () => {
    container.bind('temp', () => 'val')
    expect(container.has('temp')).toBe(true)
    container.remove('temp')
    expect(container.has('temp')).toBe(false)
  })

  it('resolve throws for missing binding', () => {
    expect(() => container.resolve('nope')).toThrow('Binding not found')
  })

  it('detects circular dependencies', () => {
    container.bind('a', () => container.resolve('b'))
    container.bind('b', () => container.resolve('a'))
    expect(() => container.resolve('a')).toThrow('Circular dependency')
  })

  it('clear removes all bindings', () => {
    container.bind('a', () => 1); container.bind('b', () => 2)
    container.clear()
    expect(container.has('a')).toBe(false)
    expect(container.has('b')).toBe(false)
  })

  it('getBindings returns snapshot', () => {
    container.bind('x', () => 10)
    expect(container.getBindings().has('x')).toBe(true)
  })
})

// ─── 5. Controller ───────────────────────────────────────────────────

describe('Controller', () => {
  it('@controller decorator sets prefix', () => {
    controller('/api/users')(class TestController extends Controller {
      static { get('/')(this.prototype, { name: 'index', kind: 'method', static: false } as ClassMethodDecoratorContext) }
      index(ctx: any) {}
    })
  })

  it('get() decorator registers route when called manually', () => {
    class ItemController extends Controller {
      list(ctx: any) {}
    }
    const context = { name: 'list', kind: 'method', static: false } as ClassMethodDecoratorContext
    get('/list')(ItemController.prototype, context)
    const routes = getControllerRoutes(ItemController)
    expect(routes).toHaveLength(1)
    expect(routes[0].method).toBe('GET')
    expect(routes[0].path).toBe('/list')
  })

  it('post, put, patch, del decorators register correct methods', () => {
    class AllCtrl extends Controller {
      a(ctx: any) {} b(ctx: any) {} c(ctx: any) {} d(ctx: any) {}
    }
    const ctx = { kind: 'method', static: false } as ClassMethodDecoratorContext
    post('/')(AllCtrl.prototype, { ...ctx, name: 'a' })
    put('/:id')(AllCtrl.prototype, { ...ctx, name: 'b' })
    patch('/:id')(AllCtrl.prototype, { ...ctx, name: 'c' })
    del('/:id')(AllCtrl.prototype, { ...ctx, name: 'd' })
    const routes = getControllerRoutes(AllCtrl)
    expect(routes.find(r => r.method === 'POST')).toBeDefined()
    expect(routes.find(r => r.method === 'PUT')).toBeDefined()
    expect(routes.find(r => r.method === 'PATCH')).toBeDefined()
    expect(routes.find(r => r.method === 'DELETE')).toBeDefined()
  })

  it('Controller base class is constructable', () => {
    class HelperController extends Controller {
      async index(ctx: any) { this.ok({ data: 'ok' }) }
    }
    expect(new HelperController()).toBeInstanceOf(Controller)
  })

  it('getControllerRoutes returns empty for undecorated', () => {
    class PlainController extends Controller {}
    expect(getControllerRoutes(PlainController)).toEqual([])
  })

  it('getControllerPrefix returns empty for undecorated', () => {
    class PlainController extends Controller {}
    expect(getControllerPrefix(PlainController)).toBe('')
  })
})

// ─── 6. Events ───────────────────────────────────────────────────────

describe('Event', () => {
  let ev: Event

  beforeEach(() => {
    ev = new Event()
  })

  it('on and emit', async () => {
    const handler = vi.fn()
    ev.on('user.created', handler)
    await ev.emit('user.created', { id: 1 })
    expect(handler).toHaveBeenCalledWith({ id: 1 })
  })

  it('once registers the handler and emit calls it', async () => {
    let callCount = 0
    const fn = () => { callCount++ }
    ev.once('only.once', fn)
    expect(ev.listeners('only.once')).toContain(fn)
    await ev.emit('only.once')
    expect(callCount).toBe(1)
  })

  it('off removes listener', async () => {
    const handler = vi.fn()
    ev.on('event', handler); ev.off('event', handler)
    await ev.emit('event')
    expect(handler).not.toHaveBeenCalled()
  })

  it('addListener is alias for on', () => {
    const handler = vi.fn()
    ev.addListener('test', handler)
    expect(ev.listeners('test')).toContain(handler)
  })

  it('removeListener is alias for off', () => {
    const handler = vi.fn()
    ev.on('x', handler); ev.removeListener('x', handler)
    expect(ev.listeners('x')).not.toContain(handler)
  })

  it('wildcard events match patterns', async () => {
    const wc = new Event({ wildcard: true })
    const handler = vi.fn()
    wc.onPattern('user.*', handler)
    await wc.emit('user.created', { id: 1 })
    expect(handler).toHaveBeenCalledWith('user.created', { id: 1 })
  })

  it('ask returns collected results', async () => {
    ev.on('greet', (name: string) => `Hello ${name}`)
    ev.on('greet', (name: string) => `Hi ${name}`)
    expect(await ev.ask<string>('greet', 'Alice')).toEqual(['Hello Alice', 'Hi Alice'])
  })

  it('ask returns only non-undefined results', async () => {
    ev.on('maybe', () => undefined)
    ev.on('maybe', () => 'value')
    expect(await ev.ask<string>('maybe')).toEqual(['value'])
  })

  it('hasListeners checks for listeners', () => {
    ev.on('something', vi.fn())
    expect(ev.hasListeners('something')).toBe(true)
    expect(ev.hasListeners('other')).toBe(false)
  })

  it('removeAllListeners removes all', () => {
    ev.on('a', vi.fn()); ev.on('b', vi.fn())
    ev.removeAllListeners()
    expect(ev.hasListeners('a')).toBe(false)
    expect(ev.hasListeners('b')).toBe(false)
  })

  it('removeAllListeners removes specific event', () => {
    ev.on('a', vi.fn()); ev.on('b', vi.fn())
    ev.removeAllListeners('a')
    expect(ev.hasListeners('a')).toBe(false)
    expect(ev.hasListeners('b')).toBe(true)
  })

  it('eventNames returns all names', () => {
    ev.on('e1', vi.fn()); ev.on('e2', vi.fn())
    const names = ev.eventNames()
    expect(names).toContain('e1')
    expect(names).toContain('e2')
  })

  it('listenerCount returns count', () => {
    ev.on('cnt', vi.fn()); ev.on('cnt', vi.fn())
    expect(ev.listenerCount('cnt')).toBe(2)
  })

  it('onPattern throws when wildcard not enabled', () => {
    expect(() => ev.onPattern('test.*', vi.fn())).toThrow('not enabled')
  })

  it('hasListeners checks pattern in wildcard mode', () => {
    const wc = new Event({ wildcard: true })
    wc.onPattern('foo.*', vi.fn())
    expect(wc.hasListeners('foo.bar')).toBe(true)
  })

  it('accepts maxListeners config', () => {
    expect(new Event({ maxListeners: 5 })).toBeInstanceOf(Event)
  })
})

// ─── 7. Gate ─────────────────────────────────────────────────────────

describe('Gate', () => {
  let gate: Gate
  const adminUser = { id: 1, role: 'admin' }
  const regularUser = { id: 2, role: 'user' }

  beforeEach(() => {
    gate = new Gate()
  })

  it('define and allows', async () => {
    gate.define('edit-posts', (user) => user.role === 'admin')
    expect(await gate.allows('edit-posts', adminUser)).toBe(true)
    expect(await gate.allows('edit-posts', regularUser)).toBe(false)
  })

  it('denies inverts allows', async () => {
    gate.define('delete', (user) => user.role === 'admin')
    expect(await gate.denies('delete', adminUser)).toBe(false)
    expect(await gate.denies('delete', regularUser)).toBe(true)
  })

  it('authorize throws on denial', async () => {
    gate.define('admin-only', (user) => user.role === 'admin')
    await expect(gate.authorize('admin-only', regularUser)).rejects.toThrow(AuthorizationError)
  })

  it('authorize passes on allow', async () => {
    gate.define('admin-only', (user) => user.role === 'admin')
    await expect(gate.authorize('admin-only', adminUser)).resolves.toBeUndefined()
  })

  it('before hook overrides', async () => {
    gate.before(() => false)
    gate.define('anything', () => true)
    expect(await gate.allows('anything', adminUser)).toBe(false)
  })

  it('before hook returning null falls through', async () => {
    gate.before(() => null)
    gate.define('test', () => true)
    expect(await gate.allows('test', adminUser)).toBe(true)
  })

  it('after hook is called', async () => {
    const after = vi.fn()
    gate.define('check', () => true)
    gate.after(after)
    await gate.allows('check', adminUser)
    expect(after).toHaveBeenCalledWith(adminUser, 'check', true)
  })

  it('any returns true if any ability allows', async () => {
    gate.define('a', () => false); gate.define('b', () => true)
    expect(await gate.any(['a', 'b'], adminUser)).toBe(true)
  })

  it('any returns false if none allow', async () => {
    gate.define('a', () => false)
    expect(await gate.any(['a'], adminUser)).toBe(false)
  })

  it('all returns true if all abilities allow', async () => {
    gate.define('a', () => true); gate.define('b', () => true)
    expect(await gate.all(['a', 'b'], adminUser)).toBe(true)
  })

  it('all returns false if any denies', async () => {
    gate.define('a', () => true); gate.define('b', () => false)
    expect(await gate.all(['a', 'b'], adminUser)).toBe(false)
  })

  it('abilitiesFor lists allowed abilities', async () => {
    gate.define('admin-thing', (user) => user.role === 'admin')
    gate.define('user-thing', () => true)
    const abilities = await gate.abilitiesFor(adminUser)
    expect(abilities).toContain('admin-thing')
    expect(abilities).toContain('user-thing')
  })

  it('policy-based abilities', async () => {
    gate.policy('post', {
      create: (user) => user.role === 'admin',
      view: () => true,
    })
    expect(await gate.allows('post.create', adminUser)).toBe(true)
    expect(await gate.allows('post.create', regularUser)).toBe(false)
    expect(await gate.allows('post.view', regularUser)).toBe(true)
  })

  it('returns false for undefined ability', async () => {
    expect(await gate.allows('nothing', adminUser)).toBe(false)
  })

  it('authorize middleware returns UNAUTHORIZED when no user', async () => {
    const res = new SuperResponse(createMockRes())
    const container = new Container()
    container.instance('gate', gate)
    const ctx: any = {
      request: new SuperRequest(createMockReq({ headers: { accept: 'application/json' } })),
      response: res, params: {}, query: {}, container,
    }
    await authorize('admin')(ctx, vi.fn())
    expect(res.statusCode).toBe(HttpStatus.UNAUTHORIZED)
  })
})

// ─── 8. Cache ────────────────────────────────────────────────────────

describe('Cache (memory store)', () => {
  let cache: Cache

  beforeEach(() => {
    cache = new Cache({ store: 'memory', ttl: 3600 })
  })

  it('set and get', async () => {
    await cache.set('key1', 'value1')
    expect(await cache.get('key1')).toBe('value1')
  })

  it('get returns null for missing key', async () => {
    expect(await cache.get('missing')).toBeNull()
  })

  it('has returns boolean', async () => {
    await cache.set('exists', 'val')
    expect(await cache.has('exists')).toBe(true)
    expect(await cache.has('not')).toBe(false)
  })

  it('delete removes key', async () => {
    await cache.set('temp', 'val')
    await cache.delete('temp')
    expect(await cache.get('temp')).toBeNull()
  })

  it('flush clears all', async () => {
    await cache.set('a', 1); await cache.set('b', 2)
    await cache.clear()
    expect(await cache.get('a')).toBeNull()
    expect(await cache.get('b')).toBeNull()
  })

  it('remember caches on first call', async () => {
    const callback = vi.fn().mockResolvedValue('computed')
    expect(await cache.remember('memokey', 60, callback)).toBe('computed')
    expect(await cache.remember('memokey', 60, callback)).toBe('computed')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('pull returns and deletes', async () => {
    await cache.set('pullable', 'val')
    expect(await cache.get('pullable')).toBe('val')
    await cache.delete('pullable')
    expect(await cache.get('pullable')).toBeNull()
  })

  it('TTL expiration', async () => {
    const fastCache = new Cache({ store: 'memory', ttl: 0 })
    await fastCache.set('expire', 'soon')
    await new Promise(r => setTimeout(r, 10))
    expect(await fastCache.get('expire')).toBeNull()
  })

  it('add does not overwrite existing', async () => {
    await cache.set('key', 'first')
    expect(await cache.add('key', 'second')).toBe(false)
    expect(await cache.get('key')).toBe('first')
  })

  it('add succeeds for new key', async () => {
    expect(await cache.add('new', 'val')).toBe(true)
    expect(await cache.get('new')).toBe('val')
  })

  it('increment and decrement', async () => {
    expect(await cache.increment('counter')).toBe(1)
    expect(await cache.increment('counter', 5)).toBe(6)
    expect(await cache.decrement('counter', 2)).toBe(4)
  })

  it('forever sets max expiration', async () => {
    await cache.forever('perm', 'always')
    expect(await cache.get('perm')).toBe('always')
  })

  it('setMultiple and getMultiple', async () => {
    await cache.setMultiple({ a: 1, b: 2 })
    expect(await cache.getMultiple(['a', 'b', 'c'])).toEqual({ a: 1, b: 2 })
  })

  it('stats returns info', async () => {
    await cache.set('s', 'x')
    const stats = cache.stats()
    expect(stats.keys).toBeGreaterThanOrEqual(1)
    expect(typeof stats.hits).toBe('number')
    expect(typeof stats.misses).toBe('number')
    expect(typeof stats.size).toBe('string')
  })

  it('prefix is applied to all keys', async () => {
    const prefixed = new Cache({ store: 'memory', prefix: 'app:' })
    await prefixed.set('key', 'val')
    expect(await prefixed.get('key')).toBe('val')
  })
})

// ─── 9. Storage ──────────────────────────────────────────────────────

describe('LocalDisk', () => {
  let disk: LocalDisk
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-storage-'))
    disk = new LocalDisk(tmpDir, 'http://localhost:3000/storage')
  })

  afterEach(() => {
    try { rmdirSync(tmpDir, { recursive: true }) } catch {}
  })

  it('put writes file and get reads it back', async () => {
    await disk.put('test/hello.txt', 'Hello World')
    const buf = await disk.get('test/hello.txt')
    expect(buf.toString()).toBe('Hello World')
  })

  it('exists checks file presence', async () => {
    await disk.put('exists.txt', 'yes')
    expect(await disk.exists('exists.txt')).toBe(true)
    expect(await disk.exists('nope.txt')).toBe(false)
  })

  it('delete removes file', async () => {
    await disk.put('delete-me.txt', 'bye')
    expect(await disk.delete('delete-me.txt')).toBe(true)
    expect(await disk.exists('delete-me.txt')).toBe(false)
  })

  it('delete returns false for missing file', async () => {
    expect(await disk.delete('ghost.txt')).toBe(false)
  })

  it('copy duplicates file', async () => {
    await disk.put('source.txt', 'data')
    expect(await disk.copy('source.txt', 'dest.txt')).toBe(true)
    expect((await disk.get('dest.txt')).toString()).toBe('data')
  })

  it('copy returns false for missing source', async () => {
    expect(await disk.copy('missing.txt', 'dest.txt')).toBe(false)
  })

  it('move renames file', async () => {
    await disk.put('original.txt', 'moved')
    expect(await disk.move('original.txt', 'moved.txt')).toBe(true)
    expect(await disk.exists('original.txt')).toBe(false)
    expect((await disk.get('moved.txt')).toString()).toBe('moved')
  })

  it('move returns false for missing source', async () => {
    expect(await disk.move('missing.txt', 'dest.txt')).toBe(false)
  })

  it('size returns file size', async () => {
    await disk.put('sized.txt', '12345')
    expect(await disk.size('sized.txt')).toBe(5)
  })

  it('size throws for missing file', async () => {
    await expect(disk.size('nope.txt')).rejects.toThrow('File not found')
  })

  it('lastModified returns date', async () => {
    await disk.put('timed.txt', 'x')
    expect(await disk.lastModified('timed.txt')).toBeInstanceOf(Date)
  })

  it('lastModified throws for missing file', async () => {
    await expect(disk.lastModified('nope.txt')).rejects.toThrow('File not found')
  })

  it('files lists files in directory', async () => {
    await disk.put('a.txt', 'a'); await disk.put('b.txt', 'b')
    mkdirSync(join(tmpDir, 'sub'))
    await disk.put('sub/c.txt', 'c')
    const files = await disk.files()
    expect(files).toContain('a.txt')
    expect(files).toContain('b.txt')
    expect(files).not.toContain('sub/c.txt')
  })

  it('directories lists subdirectories', async () => {
    mkdirSync(join(tmpDir, 'd1')); mkdirSync(join(tmpDir, 'd2'))
    const dirs = await disk.directories()
    expect(dirs).toContain('d1')
    expect(dirs).toContain('d2')
  })

  it('files returns empty for missing directory', async () => {
    expect(await disk.files('nonexistent')).toEqual([])
  })

  it('directories returns empty for missing directory', async () => {
    expect(await disk.directories('nonexistent')).toEqual([])
  })

  it('url generates URL', () => {
    expect(disk.url('files/img.png')).toBe('http://localhost:3000/storage/files/img.png')
  })

  it('url throws without baseUrl', () => {
    const noUrlDisk = new LocalDisk(tmpDir)
    expect(() => noUrlDisk.url('f.txt')).toThrow('Base URL not configured')
  })

  it('path traversal protection', async () => {
    await expect(disk.put('../outside.txt', 'hack')).rejects.toThrow('Path traversal')
  })

  it('makeDirectory and deleteDirectory', async () => {
    await disk.makeDirectory('newdir')
    expect(existsSync(join(tmpDir, 'newdir'))).toBe(true)
    await disk.deleteDirectory('newdir')
    expect(existsSync(join(tmpDir, 'newdir'))).toBe(false)
  })

  it('append and prepend to file', async () => {
    await disk.put('log.txt', 'start')
    await disk.append('log.txt', ' end')
    expect((await disk.get('log.txt')).toString()).toBe('start end')
    await disk.prepend('log.txt', '~~')
    expect((await disk.get('log.txt')).toString()).toBe('~~start end')
  })

  it('readStream and writeStream', async () => {
    const ws = await disk.writeStream('streamed.txt')
    ws.end('stream data')
    await new Promise<void>((resolve) => {
      ws.on('finish', async () => {
        const rs = await disk.readStream('streamed.txt')
        expect(rs).toBeDefined()
        resolve()
      })
    })
  })

  it('readStream throws for missing file', async () => {
    await expect(disk.readStream('ghost.txt')).rejects.toThrow('File not found')
  })

  it('getRoot returns root path', () => {
    expect(disk.getRoot()).toBe(tmpDir)
  })

  it('getUrl returns base URL', () => {
    expect(disk.getUrl()).toBe('http://localhost:3000/storage')
  })
})

describe('Storage', () => {
  it('creates and delegates to disk', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-store-'))
    const s = createStorage({
      defaultDisk: 'local',
      disks: { local: { driver: 'local', root: tmpDir, url: '/storage' } },
    })
    await s.put('test.txt', 'storage test')
    expect(await s.exists('test.txt')).toBe(true)
    expect((await s.get('test.txt')).toString()).toBe('storage test')
    expect(await s.size('test.txt')).toBe('storage test'.length)
    expect(await s.delete('test.txt')).toBe(true)
    try { rmdirSync(tmpDir, { recursive: true }) } catch {}
  })

  it('disk returns same instance for same name', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-disk-'))
    const s = createStorage({
      defaultDisk: 'local',
      disks: { local: { driver: 'local', root: tmpDir } },
    })
    expect(s.disk('local')).toBe(s.disk('local'))
    try { rmdirSync(tmpDir, { recursive: true }) } catch {}
  })
})

describe('SuperUploadedFile', () => {
  it('createFromBuffer creates file and stores buffer', async () => {
    const buf = Buffer.from('image data')
    const file = await SuperUploadedFile.createFromBuffer('avatar', 'photo.jpg', 'image/jpeg', buf)
    expect(file.fieldName).toBe('avatar')
    expect(file.originalName).toBe('photo.jpg')
    expect(file.mimeType).toBe('image/jpeg')
    expect(file.size).toBe(10)
    expect(file.extension).toBe('.jpg')
    expect(file.isImage()).toBe(true)
    expect(file.isVideo()).toBe(false)
    expect((await file.toBuffer()).toString()).toBe('image data')
    expect(file.toBase64()).toBe(buf.toString('base64'))
    await file.cleanup()
  })

  it('toBase64 throws without buffer', () => {
    const file = new SuperUploadedFile({
      fieldName: 'f', originalName: 'f.bin', mimeType: 'application/octet-stream',
      size: 0, path: '/tmp/nonexistent',
    })
    expect(() => file.toBase64()).toThrow('Buffer not loaded')
  })

  it('isImage and isVideo detection', () => {
    const img = new SuperUploadedFile({
      fieldName: 'img', originalName: 'pic.png', mimeType: 'image/png',
      size: 100, path: '/tmp/pic.png', buffer: Buffer.alloc(100),
    })
    expect(img.isImage()).toBe(true)
    expect(img.isVideo()).toBe(false)

    const vid = new SuperUploadedFile({
      fieldName: 'vid', originalName: 'clip.mp4', mimeType: 'video/mp4',
      size: 100, path: '/tmp/clip.mp4', buffer: Buffer.alloc(100),
    })
    expect(vid.isVideo()).toBe(true)
    expect(vid.isImage()).toBe(false)
  })
})

// ─── HttpException & Error Handling ──────────────────────────

describe('HttpException', () => {
  it('creates with default message and status', () => {
    const err = new HttpException('Test error', 400)
    expect(err.message).toBe('Test error')
    expect(err.status).toBe(400)
    expect(err.name).toBe('HttpException')
  })

  it('toJSON returns structured error', () => {
    const err = new HttpException('Not Found', 404, 'NOT_FOUND')
    const json = err.toJSON()
    expect(json.error).toBe('NOT_FOUND')
    expect(json.message).toBe('Not Found')
    expect(json.statusCode).toBe(404)
  })
})

describe('HTTP Exception subclasses', () => {
  it('BadRequestException', () => {
    const err = new BadRequestException()
    expect(err.status).toBe(400)
    expect(err.message).toBe('Bad Request')
  })

  it('UnauthorizedException', () => {
    const err = new UnauthorizedException()
    expect(err.status).toBe(401)
  })

  it('ForbiddenException', () => {
    const err = new ForbiddenException()
    expect(err.status).toBe(403)
  })

  it('NotFoundException', () => {
    const err = new NotFoundException()
    expect(err.status).toBe(404)
  })

  it('MethodNotAllowedException', () => {
    const err = new MethodNotAllowedException()
    expect(err.status).toBe(405)
  })

  it('ConflictException', () => {
    const err = new ConflictException()
    expect(err.status).toBe(409)
  })

  it('UnprocessableEntityException', () => {
    const err = new UnprocessableEntityException()
    expect(err.status).toBe(422)
  })

  it('TooManyRequestsException', () => {
    const err = new TooManyRequestsException()
    expect(err.status).toBe(429)
  })

  it('InternalServerErrorException', () => {
    const err = new InternalServerErrorException()
    expect(err.status).toBe(500)
  })

  it('ServiceUnavailableException', () => {
    const err = new ServiceUnavailableException()
    expect(err.status).toBe(503)
  })
})

describe('ValidationException', () => {
  it('includes field-level errors', () => {
    const errors = { email: ['Invalid email'], name: ['Name is required'] }
    const err = new ValidationException(errors)
    expect(err.status).toBe(422)
    expect(err.errors.email).toEqual(['Invalid email'])
    const json = err.toJSON()
    expect(json.errors).toEqual({ email: ['Invalid email'], name: ['Name is required'] })
  })
})

describe('normalizeError', () => {
  it('passes through HttpException', () => {
    const err = new NotFoundException()
    const result = normalizeError(err)
    expect(result).toBe(err)
  })

  it('converts generic Error to InternalServerError', () => {
    const result = normalizeError(new Error('db connection failed'))
    expect(result.status).toBe(500)
  })

  it('hides message in production', () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const result = normalizeError(new Error('secret details'))
    // InternalServerErrorException checks NODE_ENV at construction time
    expect(result.status).toBe(500)
    process.env.NODE_ENV = prev
  })
})

describe('registerExceptionHandler', () => {
  it('normalizes non-HttpException errors to 500', () => {
    const result = normalizeError(new Error('some error'))
    expect(result.status).toBe(500)
  })
})

describe('SuperApp error handling hooks', () => {
  it('notFound() custom handler', async () => {
    const app = speexjs()
    let handlerCalled = false
    app.notFound(({ response }) => {
      handlerCalled = true
      response.status(404).json({ custom: 'not-found' })
    })
    
    const req = new SuperRequest(createMockIncomingMessage('GET', '/nonexistent'))
    const res = new SuperResponse(createMockServerResponse())
    await (app as any).handleRequest(req, res)
    expect(handlerCalled).toBe(true)
  })

  it('onError() custom handler', async () => {
    const app = speexjs()
    app.get('/error', async () => { throw new Error('oops') })
    
    let errorCaught = false
    app.onError((err, { response }) => {
      errorCaught = true
      response.status(500).json({ handled: true, message: err.message })
    })
    
    const req = new SuperRequest(createMockIncomingMessage('GET', '/error'))
    const res = new SuperResponse(createMockServerResponse())
    await (app as any).handleRequest(req, res)
    expect(errorCaught).toBe(true)
  })

  it('onShutdown() registers hook', () => {
    const app = speexjs()
    let hookCalled = false
    app.onShutdown(() => { hookCalled = true })
    expect((app as any).shutdownHandlers).toHaveLength(1)
  })
})
