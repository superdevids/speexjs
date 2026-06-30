import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RpcServer, rpc } from '../src/rpc/server/index.js'
import { RpcClient, createClient, RpcClientError } from '../src/rpc/client/index.js'
import { RpcError } from '../src/rpc/types.js'
import type { RpcProcedure, RpcDefinitions, RpcContext } from '../src/rpc/types.js'
import { schema } from '../src/schema/index.js'

// ─── RpcServer ───────────────────────────────────────────────

describe('RpcServer', () => {
  describe('constructor', () => {
    it('creates an instance with procedures', () => {
      const server = new RpcServer({
        procedures: {
          greet: {
            handler: (input: { name: string }) => `Hello, ${input.name}!`,
          },
        },
      })
      expect(server).toBeInstanceOf(RpcServer)
    })
  })

  describe('call()', () => {
    it('executes a procedure and returns the result', async () => {
      const server = new RpcServer({
        procedures: {
          greet: {
            handler: (input: { name: string }) => `Hello, ${input.name}!`,
          },
        },
      })
      const result = await server.call('greet', { name: 'World' })
      expect(result).toBe('Hello, World!')
    })

    it('validates input via schema', async () => {
      const server = new RpcServer({
        procedures: {
          greet: {
            input: schema.object({ name: schema.string() }),
            handler: (input: { name: string }) => `Hello, ${input.name}!`,
          },
        },
      })
      await expect(server.call('greet', { name: 123 })).rejects.toThrow(RpcError)
      await expect(server.call('greet', { name: 123 })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 422,
      })
    })

    it('validates output via schema', async () => {
      const server = new RpcServer({
        procedures: {
          test: {
            output: schema.string(),
            handler: () => 123,
          },
        },
      })
      await expect(server.call('test')).rejects.toThrow(RpcError)
      await expect(server.call('test')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 500,
      })
    })

    it('returns typed output through output schema validation', async () => {
      const server = new RpcServer({
        procedures: {
          add: {
            input: schema.object({ a: schema.number(), b: schema.number() }),
            output: schema.number(),
            handler: (input: { a: number; b: number }) => input.a + input.b,
          },
        },
      })
      const result = await server.call('add', { a: 3, b: 4 })
      expect(result).toBe(7)
    })

    it('throws RpcError for unknown procedure', async () => {
      const server = new RpcServer({ procedures: {} })
      await expect(server.call('unknown')).rejects.toThrow(RpcError)
      await expect(server.call('unknown')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      })
    })

    it('passes input directly when no input schema defined', async () => {
      const server = new RpcServer({
        procedures: {
          echo: {
            handler: (input: unknown) => input,
          },
        },
      })
      const input = { foo: 'bar', num: 42 }
      const result = await server.call('echo', input)
      expect(result).toEqual(input)
    })

    it('handles async handlers', async () => {
      const server = new RpcServer({
        procedures: {
          delay: {
            handler: async (input: { ms: number }) => {
              await new Promise(r => setTimeout(r, 1))
              return `waited ${input.ms}ms`
            },
          },
        },
      })
      const result = await server.call('delay', { ms: 1 })
      expect(result).toBe('waited 1ms')
    })
  })

  describe('context passing', () => {
    it('passes context from factory to handler', async () => {
      const server = new RpcServer({
        procedures: {
          whoami: {
            handler: (_input: unknown, ctx: RpcContext) => ({
              userId: ctx.userId,
              metaKeys: Object.keys(ctx.meta),
            }),
          },
        },
        context: () => Promise.resolve({ userId: 42, meta: { role: 'admin' } }),
      })
      const result = await server.call('whoami')
      expect(result).toEqual({ userId: 42, metaKeys: ['role'] })
    })

    it('uses empty meta when no context factory provided', async () => {
      const server = new RpcServer({
        procedures: {
          ping: {
            handler: (_input: unknown, ctx: RpcContext) => ctx.meta,
          },
        },
      })
      const result = await server.call('ping')
      expect(result).toEqual({})
    })

    it('works with sync context factory', async () => {
      const server = new RpcServer({
        procedures: {
          test: {
            handler: (_input: unknown, ctx: RpcContext) => ctx.user,
          },
        },
        context: () => ({ userId: 1, user: { name: 'Alice' }, meta: {} }),
      })
      const result = await server.call('test')
      expect(result).toEqual({ name: 'Alice' })
    })
  })

  describe('middleware', () => {
    it('executes middleware with procedure name, input, and context', async () => {
      const middleware = vi.fn()
      const server = new RpcServer({
        procedures: {
          test: { handler: () => 'ok' },
        },
        middleware: [middleware],
      })
      await server.call('test', { foo: 'bar' })
      expect(middleware).toHaveBeenCalledWith(
        'test',
        { foo: 'bar' },
        expect.objectContaining({ meta: {} }),
      )
    })

    it('runs multiple middleware in order', async () => {
      const order: number[] = []
      const server = new RpcServer({
        procedures: {
          test: { handler: () => 'ok' },
        },
        middleware: [
          async () => { order.push(1) },
          async () => { order.push(2) },
          async () => { order.push(3) },
        ],
      })
      await server.call('test')
      expect(order).toEqual([1, 2, 3])
    })

    it('middleware can modify context before handler', async () => {
      const ctxContainer: { ctx?: RpcContext } = {}
      const server = new RpcServer({
        procedures: {
          test: {
            handler: (_input: unknown, ctx: RpcContext) => ctx.meta.timestamp,
          },
        },
        context: () => Promise.resolve({ meta: { timestamp: Date.now() } }),
        middleware: [
          async (_name, _input, ctx) => {
            ctxContainer.ctx = ctx
          },
        ],
      })
      await server.call('test')
      expect(ctxContainer.ctx).toBeDefined()
      expect(ctxContainer.ctx!.meta.timestamp).toBeGreaterThan(0)
    })

    it('middleware error propagates to caller', async () => {
      const server = new RpcServer({
        procedures: {
          test: { handler: () => 'ok' },
        },
        middleware: [
          async () => { throw new RpcError('FORBIDDEN', 'Blocked by middleware', 403) },
        ],
      })
      await expect(server.call('test')).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      })
    })
  })

  describe('toHandler()', () => {
    it('returns an HTTP handler function', () => {
      const server = new RpcServer({ procedures: {} })
      const handler = server.toHandler()
      expect(handler).toBeInstanceOf(Function)
    })

    it('responds with success JSON on valid call', async () => {
      const server = new RpcServer({
        procedures: {
          greet: {
            handler: (input: { name: string }) => `Hello, ${input.name}!`,
          },
        },
      })
      const handler = server.toHandler()
      const res = { writeHead: vi.fn(), end: vi.fn() }
      const req = { body: { procedure: 'greet', input: { name: 'World' } } }

      await handler(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({ success: true, data: 'Hello, World!' }),
      )
    })

    it('responds with error JSON on RpcError', async () => {
      const server = new RpcServer({
        procedures: {
          fail: {
            handler: () => { throw new RpcError('FORBIDDEN', 'Access denied', 403, { reason: 'insufficient_permissions' }) },
          },
        },
      })
      const handler = server.toHandler()
      const res = { writeHead: vi.fn(), end: vi.fn() }
      const req = { body: { procedure: 'fail' } }

      await handler(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(403, { 'Content-Type': 'application/json' })
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied', details: { reason: 'insufficient_permissions' } },
        }),
      )
    })

    it('responds with 500 on unknown error', async () => {
      const server = new RpcServer({
        procedures: {
          crash: {
            handler: () => { throw new Error('Unexpected failure') },
          },
        },
      })
      const handler = server.toHandler()
      const res = { writeHead: vi.fn(), end: vi.fn() }
      const req = { body: { procedure: 'crash' } }

      await handler(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' })
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({ success: false, error: { code: 'INTERNAL', message: 'Internal server error' } }),
      )
    })

    it('responds with 404 on unknown procedure', async () => {
      const server = new RpcServer({ procedures: {} })
      const handler = server.toHandler()
      const res = { writeHead: vi.fn(), end: vi.fn() }
      const req = { body: { procedure: 'nope' } }

      await handler(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' })
    })

    it('parses JSON body when req.body is a string', async () => {
      const server = new RpcServer({
        procedures: {
          ping: { handler: () => 'pong' },
        },
      })
      const handler = server.toHandler()
      const res = { writeHead: vi.fn(), end: vi.fn() }
      const req = { body: '{"procedure":"ping","input":{}}' }

      await handler(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({ success: true, data: 'pong' }),
      )
    })

    it('handles empty body gracefully', async () => {
      const server = new RpcServer({ procedures: {} })
      const handler = server.toHandler()
      const res = { writeHead: vi.fn(), end: vi.fn() }
      const req = { body: '' }

      await handler(req, res)

      expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' })
    })

    it('calls context factory per request', async () => {
      const contextFactory = vi.fn().mockResolvedValue({ userId: 99, meta: {} })
      const server = new RpcServer({
        procedures: {
          me: {
            handler: (_input: unknown, ctx: RpcContext) => ctx.userId,
          },
        },
        context: contextFactory,
      })
      const handler = server.toHandler()
      const res = { writeHead: vi.fn(), end: vi.fn() }
      const req = { body: { procedure: 'me' } }

      await handler(req, res)

      expect(contextFactory).toHaveBeenCalledTimes(1)
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({ success: true, data: 99 }),
      )
    })
  })

  describe('rpc() factory', () => {
    it('creates an RpcServer instance', () => {
      const server = rpc({ procedures: { ping: { handler: () => 'pong' } } })
      expect(server).toBeInstanceOf(RpcServer)
    })

    it('created server can execute procedures', async () => {
      const server = rpc({
        procedures: {
          ping: { handler: () => 'pong' },
        },
      })
      const result = await server.call('ping')
      expect(result).toBe('pong')
    })
  })

  describe('TypeScript type inference', () => {
    it('uses typed definitions with InferRpcInput/Output', async () => {
      const myProcedures = {
        double: {
          input: schema.object({ value: schema.number() }),
          output: schema.number(),
          handler: (input: { value: number }) => input.value * 2,
        },
      } satisfies RpcDefinitions

      const server = new RpcServer({ procedures: myProcedures })
      const result = await server.call('double', { value: 5 })
      expect(result).toBe(10)
    })
  })
})

// ─── RpcClient ───────────────────────────────────────────────

describe('RpcClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
  })

  describe('createClient', () => {
    it('creates a client instance with base URL', () => {
      const client = createClient({ baseUrl: 'http://localhost:3000' })
      expect(client).toBeInstanceOf(RpcClient)
    })

    it('creates a client with custom fetch', () => {
      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      expect(client).toBeInstanceOf(RpcClient)
    })

    it('creates a client with initial headers', () => {
      const client = createClient({
        baseUrl: 'http://localhost:3000',
        headers: { Authorization: 'Bearer token' },
      })
      expect(client).toBeInstanceOf(RpcClient)
    })
  })

  describe('setHeader', () => {
    it('adds custom headers to subsequent requests', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: 'ok' }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      client.setHeader('X-Custom', 'value1')
      client.setHeader('Authorization', 'Bearer abc')

      await client.call('test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value1',
            'Authorization': 'Bearer abc',
          }),
        }),
      )
    })

    it('overwrites existing header', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: 'ok' }),
      })

      const client = createClient({
        baseUrl: 'http://localhost:3000',
        headers: { Authorization: 'Bearer old' },
        fetch: mockFetch,
      })
      client.setHeader('Authorization', 'Bearer new')

      await client.call('test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer new' }),
        }),
      )
    })
  })

  describe('call()', () => {
    it('sends POST request to /rpc endpoint with procedure and input', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: 'Hello, World!' }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      await client.call('greet', { name: 'World' })

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedure: 'greet', input: { name: 'World' } }),
      })
    })

    it('returns typed data on success', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: 42 }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      const result = await client.call<number>('getAnswer')
      expect(result).toBe(42)
    })

    it('returns complex object data', async () => {
      const userData = { id: 1, name: 'Alice', email: 'alice@test.com' }
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: userData }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      const result = await client.call<typeof userData>('getUser', { id: 1 })
      expect(result).toEqual(userData)
    })

    it('throws RpcClientError on server error response', async () => {
      mockFetch.mockResolvedValue({
        status: 422,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: { field: 'name' } },
        }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      await expect(client.call('fail')).rejects.toThrow(RpcClientError)
      await expect(client.call('fail')).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        status: 422,
        details: { field: 'name' },
      })
    })

    it('throws RpcClientError with UNKNOWN code on malformed error response', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: false }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      await expect(client.call('test')).rejects.toMatchObject({
        code: 'UNKNOWN',
        message: 'Unknown error',
      })
    })

    it('re-throws network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      await expect(client.call('test')).rejects.toThrow('Network failure')
    })

    it('includes custom headers in request', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: 'ok' }),
      })

      const client = createClient({
        baseUrl: 'http://localhost:3000',
        headers: { Authorization: 'Bearer token' },
        fetch: mockFetch,
      })
      await client.call('test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        }),
      )
    })

    it('removes trailing slash from baseUrl', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: 'ok' }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000/', fetch: mockFetch })
      await client.call('test')

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/rpc', expect.any(Object))
    })

    it('sends request without input when omitted', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: 'ok' }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      await client.call('ping')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ procedure: 'ping', input: undefined }),
        }),
      )
    })
  })

  describe('batch()', () => {
    it('sends batch request to /rpc/batch endpoint', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: ['result1', 'result2'] }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      const results = await client.batch([
        { procedure: 'proc1', input: { id: 1 } },
        { procedure: 'proc2', input: { id: 2 } },
      ])

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/rpc/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calls: [
            { procedure: 'proc1', input: { id: 1 } },
            { procedure: 'proc2', input: { id: 2 } },
          ],
        }),
      })
      expect(results).toEqual(['result1', 'result2'])
    })

    it('returns typed batch results', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: [10, 20] }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      const results = await client.batch<[number, number]>([
        { procedure: 'double', input: { n: 5 } },
        { procedure: 'double', input: { n: 10 } },
      ])
      expect(results).toEqual([10, 20])
    })

    it('throws RpcClientError on batch failure', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({
          success: false,
          error: { code: 'BATCH_ERROR', message: 'One or more procedures failed' },
        }),
      })

      const client = createClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      await expect(client.batch([])).rejects.toThrow(RpcClientError)
      await expect(client.batch([])).rejects.toMatchObject({
        code: 'BATCH_ERROR',
        message: 'One or more procedures failed',
      })
    })
  })

  describe('custom fetch', () => {
    it('uses global fetch when no custom fetch provided', () => {
      const client = createClient({ baseUrl: 'http://localhost:3000' })
      expect(client).toBeInstanceOf(RpcClient)
    })
  })

  describe('RpcClientError', () => {
    it('is an instance of Error', () => {
      const err = new RpcClientError('TEST', 'test error', 400)
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(RpcClientError)
    })

    it('has code, message, status, and details properties', () => {
      const err = new RpcClientError('NOT_FOUND', 'Not found', 404, { id: 1 })
      expect(err.code).toBe('NOT_FOUND')
      expect(err.message).toBe('Not found')
      expect(err.status).toBe(404)
      expect(err.details).toEqual({ id: 1 })
      expect(err.name).toBe('RpcClientError')
    })

    it('creates without details', () => {
      const err = new RpcClientError('TIMEOUT', 'Request timed out', 408)
      expect(err.details).toBeUndefined()
    })
  })
})

// ─── RpcError ────────────────────────────────────────────────

describe('RpcError', () => {
  it('is an instance of Error', () => {
    const err = new RpcError('TEST', 'test', 400)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('RpcError')
  })

  it('stores code, message, status, and details', () => {
    const err = new RpcError('NOT_FOUND', 'Procedure not found', 404, { proc: 'x' })
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Procedure not found')
    expect(err.status).toBe(404)
    expect(err.details).toEqual({ proc: 'x' })
  })

  it('defaults status to 400', () => {
    const err = new RpcError('BAD_REQUEST', 'bad')
    expect(err.status).toBe(400)
  })

  it('defaults details to undefined', () => {
    const err = new RpcError('ERR', 'msg')
    expect(err.details).toBeUndefined()
  })
})
