import { IncomingMessage } from 'node:http'
import { Socket } from 'node:net'

export interface EdgeRequest {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

export interface EdgeResponse {
  status: number
  headers: Record<string, string>
  body: string
}

export class EdgeEngine {
  async handle(request: EdgeRequest, handler: (req: any, res: any) => Promise<void>): Promise<EdgeResponse> {
    const { SuperRequest } = await import('../http/request.js')
    const { SuperResponse } = await import('../http/response.js')

    const socket = new Socket()
    const msg = new IncomingMessage(socket)
    msg.method = request.method
    msg.url = request.url
    msg.headers = request.headers

    const req = new SuperRequest(msg as any)
    const res = new SuperResponse({
      statusCode: 200,
      setHeader: () => {},
      end: () => {},
    } as any)

    await handler(req, res)

    return {
      status: res.statusCode,
      headers: {},
      body: String((res as any)._body ?? ''),
    }
  }
}

// ─── Web API Edge Adapter (Cloudflare Workers, Deno, Bun) ──

class EdgeIncomingMessage {
  readonly method: string
  readonly url: string
  readonly headers: Record<string, string | string[]>
  readonly socket: { remoteAddress: string }
  private bodyBuffer: Buffer | null = null

  constructor(request: EdgeRequest) {
    this.method = request.method
    this.url = request.url
    this.socket = { remoteAddress: '127.0.0.1' }
    this.headers = {}

    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        this.headers[key.toLowerCase()] = value
      }
    }

    if (request.body !== undefined && request.body.length > 0) {
      this.bodyBuffer = Buffer.from(request.body, 'utf-8')
    }
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

class EdgeServerResponse {
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

    const contentType = this.headersMap.get('content-type')
    if (this.bodyValue !== null && contentType === undefined) {
      headers.set('content-type', 'application/octet-stream')
    }

    return new Response(this.bodyValue, {
      status: this.statusCode,
      statusText: getStatusText(this.statusCode),
      headers,
    })
  }
}

function getStatusText(code: number): string {
  const texts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  }
  return texts[code] ?? 'Unknown'
}

export class WebApiEdgeEngine {
  async handleRequest(request: EdgeRequest | Request, handler: (req: any, res: any) => Promise<void>): Promise<Response> {
    const { SuperRequest } = await import('../http/request.js')
    const { SuperResponse } = await import('../http/response.js')

    let edgeReq: EdgeRequest

    if (request instanceof Request) {
      edgeReq = await edgeRequestFromWebRequest(request)
    } else {
      edgeReq = request
    }

    const nodeReq = new EdgeIncomingMessage(edgeReq)
    const nodeRes = new EdgeServerResponse()
    const req = new SuperRequest(nodeReq as any)
    const res = new SuperResponse(nodeRes as any)

    try {
      await handler(req, res)
    } catch (_err: unknown) {
      if (!res.headersSent) {
        const { normalizeError } = await import('../errors.js')
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
  }
}

async function edgeRequestFromWebRequest(request: Request): Promise<EdgeRequest> {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  let body: string | undefined
  if (request.body !== null) {
    try {
      body = await request.text()
    } catch {
      body = undefined
    }
  }

  return {
    method: request.method,
    url: request.url,
    headers,
    body,
  }
}

export function createEdgeApp(app: {
  handleRequest: (req: any, res: any) => Promise<void>
}): (request: Request, env?: Record<string, unknown>, ctx?: unknown) => Promise<Response> {
  const engine = new WebApiEdgeEngine()

  return async function fetchHandler(request: Request): Promise<Response> {
    if (request.method === 'HEAD') {
      return new Response(null, { status: 204 })
    }

    return engine.handleRequest(request, (req, res) => app.handleRequest(req, res))
  }
}

export type FetchHandler = ReturnType<typeof createEdgeApp>
