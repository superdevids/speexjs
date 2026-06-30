import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import type { Server } from 'node:http'
import { readFileSync } from 'node:fs'
import { SuperRequest } from '../http/request.js'
import { SuperResponse } from '../http/response.js'
import { normalizeError } from '../errors.js'

export interface ServerInstance {
  close: () => Promise<void>
  raw: Server
}

export type RequestHandler = (req: SuperRequest, res: SuperResponse) => void | Promise<void>

export interface ServerEngine {
  createServer(handler: RequestHandler): Promise<ServerInstance>
  getPort(server: ServerInstance): number
  close(server: ServerInstance): Promise<void>
}

process.on('unhandledRejection', (reason) => {
  console.error('[SpeexJS] Unhandled Rejection:', reason instanceof Error ? reason.message : reason)
})

export class NodeEngine implements ServerEngine {
  async createServer(handler: RequestHandler): Promise<ServerInstance> {
    const server = createHttpServer(async (nodeReq, nodeRes) => {
      const req = new SuperRequest(nodeReq)
      const res = new SuperResponse(nodeRes)

      try {
        await handler(req, res)
      } catch (_err: unknown) {
        if (!res.headersSent) {
          const error = _err instanceof Error ? _err : new Error(String(_err))
          const httpError = normalizeError(error)
          res.status(httpError.status).json(httpError.toJSON())
          await res.flush()
        }
      }

      if (!res.headersSent) {
        await res.flush()
      }
    })

    return {
      raw: server,
      close: () => {
        return new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err !== undefined && err !== null) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      },
    }
  }

  getPort(server: ServerInstance): number {
    const addr = server.raw.address()
    if (addr !== null && typeof addr === 'object') {
      return addr.port
    }
    return 0
  }

  async close(server: ServerInstance): Promise<void> {
    await server.close()
  }
}

export class HttpsEngine extends NodeEngine {
  private options: { key: string; cert: string }

  constructor(keyPath: string, certPath: string) {
    super()
    this.options = {
      key: readFileSync(keyPath, 'utf-8'),
      cert: readFileSync(certPath, 'utf-8'),
    }
  }

  async createServer(handler: RequestHandler): Promise<ServerInstance> {
    const server = createHttpsServer(this.options, async (nodeReq, nodeRes) => {
      const req = new SuperRequest(nodeReq as any)
      const res = new SuperResponse(nodeRes as any)
      try {
        await handler(req, res)
      } catch (_err: unknown) {
        if (!res.headersSent) {
          const error = _err instanceof Error ? _err : new Error(String(_err))
          const httpError = normalizeError(error)
          res.status(httpError.status).json(httpError.toJSON())
          await res.flush()
        }
      }
      if (!res.headersSent) await res.flush()
    })
    return {
      raw: server,
      close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
    }
  }
}

// ─── Bun Runtime Support ─────────────────────────────────

declare const Bun: {
  serve: (options: {
    port?: number
    hostname?: string
    fetch: (request: Request) => Response | Promise<Response>
    error?: (error: Error) => Response | Promise<Response>
  }) => { stop: () => void; port: number }
}

class BunMockIncomingMessage {
  readonly method: string
  readonly url: string
  readonly headers: Record<string, string | string[]>
  readonly socket: { remoteAddress: string }
  private bodyBuffer: Buffer | null = null

  constructor(request: Request) {
    this.method = request.method
    this.url = request.url
    this.socket = { remoteAddress: '127.0.0.1' }

    this.headers = {}
    request.headers.forEach((value, key) => {
      const existing = this.headers[key]
      if (existing !== undefined) {
        this.headers[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
      } else {
        this.headers[key] = value
      }
    })

    request.text().then((text) => {
      this.bodyBuffer = text.length > 0 ? Buffer.from(text, 'utf-8') : null
    })
  }

  [Symbol.asyncIterator](): AsyncIterator<Buffer> {
    let yielded = false
    const body = this.bodyBuffer
    return {
      next(): Promise<IteratorResult<Buffer>> {
        if (!yielded && body !== null && body.length > 0) {
          yielded = true
          return Promise.resolve({ value: body, done: false })
        }
        return Promise.resolve({ value: undefined as unknown as Buffer, done: true })
      },
    }
  }
}

class BunMockServerResponse {
  statusCode: number = 200
  private headersMap = new Map<string, string>()
  private cookieHeaders: string[] = []
  private bodyValue: string | null = null

  setHeader(name: string, value: string | string[] | number): void {
    const normalized = String(value)
    if (name.toLowerCase() === 'set-cookie') {
      this.cookieHeaders.push(normalized)
    } else {
      this.headersMap.set(name, normalized)
    }
  }

  getHeader(name: string): string | string[] | undefined {
    if (name.toLowerCase() === 'set-cookie') {
      return this.cookieHeaders.length > 0 ? this.cookieHeaders : undefined
    }
    return this.headersMap.get(name)
  }

  end(data?: string | Buffer): void {
    if (data !== undefined && data !== null) {
      this.bodyValue = data.toString()
    }
  }

  write(data: string | Buffer): void {
    const str = data.toString()
    this.bodyValue = this.bodyValue !== null ? this.bodyValue + str : str
  }

  toWebResponse(): Response {
    const headers = new Headers()
    for (const cookie of this.cookieHeaders) {
      headers.append('Set-Cookie', cookie)
    }
    for (const [key, value] of this.headersMap) {
      headers.set(key, value)
    }
    return new Response(this.bodyValue, {
      status: this.statusCode,
      headers,
    })
  }
}

export function isBun(): boolean {
  return typeof Bun !== 'undefined' && typeof Bun.serve === 'function'
}

export class BunEngine implements ServerEngine {
  async createServer(handler: RequestHandler): Promise<ServerInstance> {
    const bunServer = Bun.serve({
      port: 0,
      async fetch(request: Request): Promise<Response> {
        const nodeReq = new BunMockIncomingMessage(request)
        const nodeRes = new BunMockServerResponse()
        const req = new SuperRequest(nodeReq as any)
        const res = new SuperResponse(nodeRes as any)

        try {
          await handler(req, res)
        } catch (_err: unknown) {
          if (!res.headersSent) {
            const error = _err instanceof Error ? _err : new Error(String(_err))
            const httpError = normalizeError(error)
            res.status(httpError.status).json(httpError.toJSON())
            await res.flush()
          }
        }

        if (!res.headersSent) {
          await res.flush()
        }

        return nodeRes.toWebResponse()
      },
    })

    return {
      raw: bunServer as unknown as Server,
      close: async () => {
        bunServer.stop()
      },
    }
  }

  getPort(server: ServerInstance): number {
    return (server.raw as any).port ?? 0
  }

  async close(server: ServerInstance): Promise<void> {
    ;(server.raw as any).stop()
  }
}

export function autoDetectEngine(): ServerEngine {
  if (isBun()) {
    return new BunEngine()
  }
  return new NodeEngine()
}
