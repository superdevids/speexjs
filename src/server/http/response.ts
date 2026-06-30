import { createReadStream, stat } from 'node:fs'
import type { ServerResponse } from 'node:http'
import { basename, extname, resolve } from 'node:path'
import type { Readable } from 'node:stream'
import { promisify } from 'node:util'

import type { ViewEngine } from '../view/index.js'
import type { CookieOptions } from './cookie'
import { clearCookie, serializeCookie } from './cookie'
import { HeadersMap } from './headers'
import { HttpStatus } from './status'

const statAsync = promisify(stat)

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.zip': 'application/zip',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
}

export interface FileOptions {
  root?: string
  maxAge?: number
  acceptRanges?: boolean
  cacheControl?: boolean
  etag?: boolean
  lastModified?: boolean
  headers?: Record<string, string>
}

export class SuperResponse {
  private raw: ServerResponse
  private _statusCode: number = HttpStatus.OK
  private _headers = new HeadersMap()
  private _cookies: string[] = []
  private _body: string | Buffer | null = null
  private _sent = false
  private _contentTypeSet = false
  private _viewEngine: ViewEngine | null = null
  private _startTime = Date.now()

  constructor(raw: ServerResponse) {
    this.raw = raw
  }

  status(code: number): this {
    this._statusCode = code
    return this
  }

  header(name: string, value: string): this {
    const safeValue = value.replace(/[\r\n\u000a\u000d\u0085\u2028\u2029]/g, '').trim()
    this._headers.set(name, safeValue)
    return this
  }

  setHeader(name: string, value: string): this {
    return this.header(name, value)
  }

  getHeader(name: string): string | undefined {
    return this._headers.get(name)
  }

  removeHeader(name: string): this {
    this._headers.delete(name)
    return this
  }

  hasHeader(name: string): boolean {
    return this._headers.has(name)
  }

  type(contentType: string): this {
    this._headers.set('content-type', contentType)
    this._contentTypeSet = true
    return this
  }

  json<T>(data: T, status?: number): this {
    if (status !== undefined) this._statusCode = status
    let body: string
    if (typeof data === 'string') {
      body = data
    } else if (data === null || data === undefined || typeof data === 'number' || typeof data === 'boolean') {
      body = String(data)
    } else {
      body = JSON.stringify(data)
    }
    return this.send(body, undefined, 'application/json')
  }

  jsonp<T>(data: T, callback = 'callback'): this {
    const body = `${callback}(${JSON.stringify(data)})`
    return this.send(body, undefined, 'text/javascript')
  }

  vary(...headers: string[]): this {
    const existing = (this._headers.get('vary') ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
    this._headers.set('vary', [...existing, ...headers].join(', '))
    return this
  }

  elapsed(): number {
    return Date.now() - this._startTime
  }

  async sse(event: string, data: unknown): Promise<this> {
    if (!this._headers.has('content-type')) {
      this._headers.set('content-type', 'text/event-stream')
      this._headers.set('cache-control', 'no-cache')
      this._headers.set('connection', 'keep-alive')
      this.raw.statusCode = this._statusCode
      this.flushHeaders()
    }
    this.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    return this
  }

  send(body: string | Buffer, status?: number, contentType?: string): this {
    if (status !== undefined) this._statusCode = status
    this._body = body
    if (contentType !== undefined && !this._contentTypeSet) {
      if (contentType.startsWith('text/') && !contentType.includes('charset')) {
        contentType += '; charset=utf-8'
      }
      this._headers.set('content-type', contentType)
    }
    return this
  }

  html(html: string, status?: number): this {
    return this.send(html, status, 'text/html; charset=utf-8')
  }

  setViewEngine(engine: ViewEngine): this {
    this._viewEngine = engine
    return this
  }

  async page(page: string, props?: Record<string, unknown>): Promise<this> {
    if (this._viewEngine === null) {
      throw new Error('View engine not set. Call setViewEngine() first.')
    }
    const html = await this._viewEngine.render(page, props ?? {})
    return this.html(html)
  }

  redirect(url: string, status: 301 | 302 | 307 | 308 = HttpStatus.FOUND as 302): this {
    // Prevent open redirect / CRLF injection
    if (url.includes('\r') || url.includes('\n')) {
      throw new Error('Invalid redirect URL')
    }
    this._statusCode = status
    this._headers.set('location', url)
    this._body = null
    return this
  }

  async stream(stream: Readable, status?: number): Promise<this> {
    if (status !== undefined) this._statusCode = status
    this.raw.statusCode = this._statusCode
    this.flushHeaders()
    await this.pipeStream(stream)
    return this
  }

  async file(filePath: string, options?: FileOptions): Promise<this> {
    const fullPath = options?.root ? joinPath(options.root, filePath) : filePath

    // Path traversal protection
    const resolved = resolve(fullPath)
    const root = options?.root ? resolve(options.root) : null
    if (root !== null && !resolved.startsWith(root)) {
      this._statusCode = HttpStatus.FORBIDDEN
      this._body = null
      return this
    }

    try {
      const stats = await statAsync(fullPath)

      if (!stats.isFile()) {
        this._statusCode = HttpStatus.NOT_FOUND
        this._body = null
        return this
      }

      const ext = extname(fullPath)
      let mimeType = MIME_TYPES[ext] ?? 'application/octet-stream'
      if (mimeType.startsWith('text/') && !mimeType.includes('charset')) {
        mimeType += '; charset=utf-8'
      }

      this._headers.set('content-type', mimeType)
      this._headers.set('content-length', String(stats.size))

      if (options?.cacheControl !== false) {
        const maxAge = options?.maxAge ?? 0
        this._headers.set('cache-control', `public, max-age=${maxAge}`)
      }

      if (options?.lastModified !== false) {
        this._headers.set('last-modified', stats.mtime.toUTCString())
      }

      if (options?.headers !== undefined) {
        for (const [key, value] of Object.entries(options.headers)) {
          this._headers.set(key, value)
        }
      }

      this.raw.statusCode = this._statusCode
      this.flushHeaders()
      await this.pipeStream(createReadStream(fullPath))
    } catch {
      this._statusCode = HttpStatus.NOT_FOUND
      this._body = null
    }

    return this
  }

  async download(filePath: string, filename?: string): Promise<this> {
    const downloadName = (filename ?? basename(filePath)).replace(/["\\\r\n]/g, '_')

    this._headers.set('content-disposition', `attachment; filename="${downloadName}"`)

    await this.file(filePath)
    return this
  }

  attachment(filename?: string): this {
    if (filename !== undefined) {
      this._headers.set('content-disposition', `attachment; filename="${filename}"`)
    } else {
      this._headers.set('content-disposition', 'attachment')
    }
    return this
  }

  cookie(name: string, value: string, options?: CookieOptions): this {
    const serialized = serializeCookie(name, value, options)
    const existingIdx = this._cookies.findIndex((c) => c.startsWith(`${name}=`))
    if (existingIdx !== -1) {
      this._cookies[existingIdx] = serialized
    } else {
      this._cookies.push(serialized)
    }
    return this
  }

  clearCookie(name: string, options?: CookieOptions): this {
    this._cookies.push(clearCookie(name, options))
    return this
  }

  get body(): string | Buffer | null {
    return this._body
  }

  get statusCode(): number {
    return this._statusCode
  }

  get headersSent(): boolean {
    return this._sent
  }

  get rawResponse(): ServerResponse {
    return this.raw
  }

  async flush(): Promise<void> {
    if (this._sent) return
    this._sent = true

    this.raw.statusCode = this._statusCode

    this.flushHeaders()

    if (this._body !== null) {
      this.raw.end(this._body)
    } else {
      this.raw.end()
    }
  }

  private pipeStream(stream: Readable): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      stream.pipe(this.raw)
      stream.on('end', () => {
        this._sent = true
        resolve()
      })
      stream.on('error', (err) => {
        stream.destroy()
        if (!this._sent) {
          this._sent = true
          this.raw.statusCode = HttpStatus.INTERNAL_SERVER_ERROR
          this.raw.end()
        }
        reject(err)
      })
    })
  }

  private flushHeaders(): void {
    if (this._cookies.length > 0) {
      this.raw.setHeader('Set-Cookie', this._cookies)
    }

    for (const [name, value] of this._headers.entries()) {
      if (name.toLowerCase() !== 'set-cookie') {
        this.raw.setHeader(name, value)
      }
    }
  }
}

function joinPath(root: string, filePath: string): string {
  const normalizedRoot = root.replace(/\\/g, '/').replace(/\/$/, '')
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\//, '')
  return `${normalizedRoot}/${normalizedPath}`
}
