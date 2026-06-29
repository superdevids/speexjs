import type { IncomingMessage } from 'node:http'
import { HeadersMap } from './headers'
import { parseCookies } from './cookie'
import { SuperUploadedFile } from './upload'

export interface Schema<T = unknown> {
  parse(input: unknown): T
  validate(
    input: unknown,
  ): { success: boolean; data?: T; errors?: { message: string; path?: string }[] }
}

interface ParsedMultipartField {
  type: 'field'
  name: string
  value: string
}

interface ParsedMultipartFile {
  type: 'file'
  name: string
  filename: string
  mimeType: string
  data: Buffer
}

type MultipartPart = ParsedMultipartField | ParsedMultipartFile

interface BodyCache {
  raw: Buffer
  parsed: unknown
  text: string
  json: unknown
  formData: Record<string, string> | null
  files: Record<string, SuperUploadedFile> | null
  multipartParsed: MultipartPart[] | null
}

export class SuperRequest {
  private raw: IncomingMessage
  private _headers: HeadersMap
  private _query: Record<string, string | string[]>
  private _cookies: Record<string, string> | null = null
  private _ip: string
  private _params: Record<string, string> = {}
  private bodyCache: BodyCache | null = null
  private _bodyReadPromise: Promise<BodyCache> | null = null
  private maxBodySize: number
  private static trustedProxies: string[] = []

  static setTrustedProxy(ip: string): void { SuperRequest.trustedProxies.push(ip) }

  constructor(raw: IncomingMessage, options?: { maxBodySize?: number }) {
    this.maxBodySize = options?.maxBodySize ?? 10 * 1024 * 1024
    this.raw = raw

    this._headers = new HeadersMap(
      raw.headers as Record<string, string | string[]>,
    )

    let parsedUrl: URL
    try { parsedUrl = new URL(raw.url ?? '/', 'http://localhost') }
    catch { parsedUrl = new URL('/', 'http://localhost') }
    this._query = parseQueryParams(parsedUrl.searchParams)

    this._ip = parseIp(raw, SuperRequest.trustedProxies)

    this.path = parsedUrl.pathname
    this.url = raw.url ?? '/'
    this.method = (raw.method ?? 'GET').toUpperCase()
  }

  readonly method: string
  readonly url: string
  readonly path: string

  get headers(): HeadersMap {
    return this._headers
  }

  get query(): Record<string, string | string[]> {
    return this._query
  }

  get params(): Record<string, string> {
    return this._params
  }

  set params(value: Record<string, string>) {
    this._params = value
  }

  get ip(): string {
    return this._ip
  }

  private async ensureBody(): Promise<BodyCache> {
    if (this.bodyCache !== null) return this.bodyCache

    if (this._bodyReadPromise === null) {
      this._bodyReadPromise = this.readBodyFromStream()
    }

    this.bodyCache = await this._bodyReadPromise
    return this.bodyCache
  }

  private async readBodyFromStream(): Promise<BodyCache> {
    const chunks: Buffer[] = []
    let totalSize = 0;
    for await (const chunk of this.raw) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalSize += buf.length;
      if (totalSize > this.maxBodySize) {
        throw new Error('Request body too large. Maximum size is ' + this.maxBodySize + ' bytes.');
      }
      chunks.push(buf);
    }
    const raw = Buffer.concat(chunks)
    const text = raw.toString('utf-8')

    let json: unknown = undefined
    if (this.isContentType('application/json')) {
      try {
        json = JSON.parse(text)
      } catch {
        json = undefined
      }
    }

    let formData: Record<string, string> | null = null
    let multipartParsed: MultipartPart[] | null = null
    let files: Record<string, SuperUploadedFile> | null = null

    if (this.isContentType('application/x-www-form-urlencoded')) {
      formData = parseUrlEncoded(text)
    } else if (this.isContentType('multipart/form-data')) {
      const boundary = this.getMultipartBoundary()
      if (boundary !== undefined) {
        multipartParsed = parseMultipartBody(raw, boundary)
        formData = {}
        files = {}
        for (const part of multipartParsed) {
          if (part.type === 'field') {
            formData[part.name] = part.value
          } else if (part.type === 'file') {
            const uploadedFile = await SuperUploadedFile.createFromBuffer(
              part.name,
              part.filename,
              part.mimeType,
              part.data,
            )
            files[part.name] = uploadedFile
          }
        }
      }
    }

    return {
      raw,
      text,
      json,
	parsed: json ?? (this.isContentType('application/json') ? undefined : text),
      formData,
      files,
      multipartParsed,
    }
  }

  private isContentType(expected: string): boolean {
    const ct = this._headers.get('content-type')
    if (ct === undefined) return false
    return ct.toLowerCase().startsWith(expected)
  }

  private getMultipartBoundary(): string | undefined {
    const ct = this._headers.get('content-type')
    if (ct === undefined) return undefined
    const match = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
    if (match !== null) {
      return match[1] ?? match[2]
    }
    return undefined
  }

  async body(): Promise<unknown> {
    const cache = await this.ensureBody()
    return cache.parsed
  }

  async json<T = unknown>(): Promise<T> {
    const cache = await this.ensureBody()
    if (cache.json !== undefined) return cache.json as T
    throw new Error('Request body is not valid JSON')
  }

  async text(): Promise<string> {
    const cache = await this.ensureBody()
    return cache.text
  }

  async formData(): Promise<Record<string, string>> {
    const cache = await this.ensureBody()
    if (cache.formData !== null) return cache.formData

    if (cache.multipartParsed !== null) {
      const result: Record<string, string> = {}
      for (const part of cache.multipartParsed) {
        if (part.type === 'field') {
          result[part.name] = part.value
        }
      }
      return result
    }

    return {}
  }

  async file(name: string): Promise<SuperUploadedFile | undefined> {
    const cache = await this.ensureBody()
    if (cache.files !== null) {
      return cache.files[name]
    }
    return undefined
  }

  async files(): Promise<Record<string, SuperUploadedFile>> {
    const cache = await this.ensureBody()
    return cache.files ?? {}
  }

  cookie(name: string): string | undefined {
    if (this._cookies === null) {
      const cookieHeader = this._headers.get('cookie')
      this._cookies = cookieHeader !== undefined
        ? parseCookies(cookieHeader)
        : {}
    }
    return this._cookies[name]
  }

  async validate<T>(schema: Schema<T>): Promise<T> {
    const data = await this.body()
    const result = schema.validate(data)
    if (!result.success) {
      const messages = (result.errors ?? [])
        .map((e) => {
          const path = e.path ?? ''
          return path ? `${path}: ${e.message}` : e.message
        })
        .join('; ')
      throw new ValidationError(messages, result.errors ?? [])
    }
    return result.data as T
  }

  isAjax(): boolean {
    const requestedWith = this._headers.get('x-requested-with')
    return requestedWith?.toLowerCase() === 'xmlhttprequest'
  }

  wantsJson(): boolean {
    const accept = this._headers.get('accept')
    if (accept !== undefined && accept.includes('application/json')) {
      return true
    }
    return this.isAjax()
  }

  accepts(...types: string[]): string | false {
    const accept = this._headers.get('accept') ?? '*/*'
    for (const type of types) { if (accept.includes(type)) return type }
    return false
  }

  acceptsJson(): boolean { return this.accepts('application/json') !== false }

  acceptsHtml(): boolean { return this.accepts('text/html') !== false }

  bearerToken(): string | undefined {
    const auth = this._headers.get('authorization')
    if (auth === undefined) return undefined
    const match = auth.match(/^Bearer\s+(.+)$/i)
    return match?.[1]
  }

  get rawRequest(): IncomingMessage {
    return this.raw
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly errors: { message: string; path?: string }[],
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

function parseQueryParams(
  searchParams: URLSearchParams,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key)
    result[key] = values.length === 1 ? (values[0] as string) : values
  }
  return result
}

function parseIp(req: IncomingMessage, trustedProxies: string[] = []): string {
  const remote = req.socket.remoteAddress
  const remoteIp = remote !== undefined ? (remote.startsWith('::ffff:') ? remote.slice(7) : remote) : '127.0.0.1'

  const forwarded = req.headers['x-forwarded-for']
  if (forwarded !== undefined && trustedProxies.includes(remoteIp)) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]
    if (first !== undefined) return first.trim()
  }

  const realIp = req.headers['x-real-ip']
  if (realIp !== undefined && trustedProxies.includes(remoteIp)) {
    return Array.isArray(realIp) ? realIp[0] as string : realIp
  }

  return remoteIp
}

function parseUrlEncoded(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const pairs = text.split('&')
  for (const pair of pairs) {
    if (!pair) continue
    const eqIndex = pair.indexOf('=')
    if (eqIndex === -1) {
      result[decodeURIComponent(pair.replace(/\+/g, ' '))] = ''
    } else {
      const key = decodeURIComponent(pair.slice(0, eqIndex).replace(/\+/g, ' '))
      const value = decodeURIComponent(pair.slice(eqIndex + 1).replace(/\+/g, ' '))
      result[key] = value
    }
  }
  return result
}

function parseMultipartBody(
  body: Buffer,
  boundary: string,
): MultipartPart[] {
  const result: MultipartPart[] = []
  const boundaryBuffer = Buffer.from(`--${boundary}`)

  let start = 0
  let searchFrom = 0

  while (true) {
    const boundaryIndex = body.indexOf(boundaryBuffer, searchFrom)
    if (boundaryIndex === -1) break

    searchFrom = boundaryIndex + boundaryBuffer.length

    if (
      searchFrom < body.length &&
      body[searchFrom] === 45 &&
      body[searchFrom + 1] === 45
    ) {
      break
    }

    if (searchFrom >= body.length) break

    if (body[searchFrom] === 13) searchFrom++
    if (body[searchFrom] === 10) searchFrom++

    start = searchFrom

    const nextBoundaryIndex = body.indexOf(boundaryBuffer, searchFrom)
    if (nextBoundaryIndex === -1) break

    let partEnd = nextBoundaryIndex
    if (partEnd >= 2 && body[partEnd - 2] === 13 && body[partEnd - 1] === 10) {
      partEnd -= 2
    }

    const partData = body.slice(start, partEnd)

    const headerEndIndex = partData.indexOf(Buffer.from('\r\n\r\n'))
    if (headerEndIndex === -1) {
      searchFrom = nextBoundaryIndex
      continue
    }

    const headerSection = partData.slice(0, headerEndIndex).toString('utf-8')
    const contentData = partData.slice(headerEndIndex + 4)

    const disposition = parseDisposition(headerSection)
    if (disposition === undefined) {
      searchFrom = nextBoundaryIndex
      continue
    }

    if (disposition.filename !== undefined) {
      const contentType = parseContentType(headerSection)
      result.push({
        type: 'file',
        name: disposition.name,
        filename: disposition.filename,
        mimeType: contentType,
        data: Buffer.from(contentData),
      })
    } else {
      result.push({
        type: 'field',
        name: disposition.name,
        value: contentData.toString('utf-8').trim(),
      })
    }

    searchFrom = nextBoundaryIndex
  }

  return result
}

interface DispositionInfo {
  name: string
  filename?: string
}

function parseDisposition(headerSection: string): DispositionInfo | undefined {
  const match = headerSection.match(
    /content-disposition:\s*form-data;\s*(.+)/i,
  )
  if (match === null) return undefined

  const params = match[1] as string
  const nameMatch = params.match(/name="([^"]*)"/i) || params.match(/name=([^;\s]+)/i)
  const filenameMatch = params.match(/filename="([^"]*)"/i) || params.match(/filename=([^;\s]+)/i)

  if (nameMatch === null) return undefined

  return {
    name: nameMatch[1] as string,
    filename: filenameMatch?.[1],
  }
}

function parseContentType(headerSection: string): string {
  const match = headerSection.match(/content-type:\s*([^\s;]+)/i)
  return match?.[1] ?? 'application/octet-stream'
}
