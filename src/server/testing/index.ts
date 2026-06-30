import { SuperApp } from '../index.js'
import { SuperRequest } from '../http/request.js'
import { SuperResponse } from '../http/response.js'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'

export class TestRequest {
  constructor(private app: SuperApp) {}

  async get(path: string): Promise<TestResponse> {
    return this.request('GET', path)
  }

  async post(path: string, body?: unknown): Promise<TestResponse> {
    return this.request('POST', path, body)
  }

  async put(path: string, body?: unknown): Promise<TestResponse> {
    return this.request('PUT', path, body)
  }

  async patch(path: string, body?: unknown): Promise<TestResponse> {
    return this.request('PATCH', path, body)
  }

  async delete(path: string): Promise<TestResponse> {
    return this.request('DELETE', path)
  }

  protected async request(method: string, path: string, body?: unknown): Promise<TestResponse> {
    const socket = new Socket()
    const req = new IncomingMessage(socket)
    req.method = method
    req.url = path
    req.headers = { 'content-type': body ? 'application/json' : undefined }

    const res = new ServerResponse(req)

    const sreq = new SuperRequest(req as any)
    const sres = new SuperResponse(res as any)

    if (body && method !== 'GET') {
      ;(sreq as any)._bodyReadPromise = Promise.resolve({
        raw: Buffer.from(JSON.stringify(body)),
        text: JSON.stringify(body),
        json: body,
        parsed: body,
        formData: null,
        files: null,
        multipartParsed: null,
      })
      ;(sreq as any).bodyCache = await (sreq as any)._bodyReadPromise
    }

    await (this.app as any).handleRequest(sreq, sres)

    return new TestResponse(sres)
  }
}

export class TestResponse {
  private sentData: any = null
  private sentStatus: number = 200
  private sentHeaders: Record<string, string> = {}

  constructor(res: SuperResponse) {
    this.sentStatus = res.statusCode
    this.sentHeaders = {}
    ;(res as any).flush = async function (this: any) {
      this.sentStatus = this.statusCode
      this.sentData = this.body
    }.bind(res)
  }

  get status(): number {
    return this.sentStatus
  }
  get body(): any {
    return this.sentData
  }

  json(): any {
    if (typeof this.sentData === 'string') {
      try {
        return JSON.parse(this.sentData)
      } catch {
        return this.sentData
      }
    }
    return this.sentData
  }

  header(name: string): string | undefined {
    return this.sentHeaders[name.toLowerCase()]
  }
}

export { actingAs } from './auth.js'
export { travelTo, travelBack, now } from './clock.js'
export { RefreshDatabase } from './database.js'

export function assertOk(res: TestResponse): void {
  if (res.status < 200 || res.status >= 300) throw new Error(`Expected 2xx, got ${res.status}`)
}
export function assertStatus(res: TestResponse, status: number): void {
  if (res.status !== status) throw new Error(`Expected status ${status}, got ${res.status}`)
}
export function assertJson(res: TestResponse): void {
  const j = res.json()
  if (typeof j !== 'object') throw new Error('Response is not JSON')
}
export function assertSee(res: TestResponse, text: string): void {
  const body = String(res.body)
  if (!body.includes(text)) throw new Error(`Expected response to contain "${text}"`)
}
export function assertRedirect(res: TestResponse): void {
  if (res.status < 300 || res.status >= 400) throw new Error(`Expected redirect (3xx), got ${res.status}`)
}

export function testRequest(app: SuperApp): TestRequest {
  return new TestRequest(app)
}
