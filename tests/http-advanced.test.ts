import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { Readable } from 'node:stream'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { mkdtempSync, writeFileSync, existsSync, mkdirSync, unlinkSync, rmdirSync, readFileSync } from 'node:fs'

import { HttpStatus, statusText } from '../src/server/http/status.js'
import { HeadersMap } from '../src/server/http/headers.js'
import { SuperRequest } from '../src/server/http/request.js'
import { SuperResponse } from '../src/server/http/response.js'
import { parseCookies, serializeCookie, clearCookie } from '../src/server/http/cookie.js'
import { SuperUploadedFile } from '../src/server/http/upload.js'

function createMockReq(
  opts: Partial<{
    method: string
    url: string
    headers: Record<string, string | string[]>
    socketRemote: string
    body: Buffer
  }> = {},
): IncomingMessage {
  const socket = new Socket()
  if (opts.socketRemote) {
    Object.defineProperty(socket, 'remoteAddress', {
      value: opts.socketRemote,
      writable: false,
    })
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

function createMultipartBody(
  boundary: string,
  parts: Array<{
    name: string
    filename?: string
    contentType?: string
    data: string
  }>,
): Buffer {
  const lines: string[] = []
  for (const part of parts) {
    lines.push(`--${boundary}`)
    if (part.filename) {
      lines.push(`Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"`)
      lines.push(`Content-Type: ${part.contentType ?? 'application/octet-stream'}`)
    } else {
      lines.push(`Content-Disposition: form-data; name="${part.name}"`)
    }
    lines.push('')
    lines.push(part.data)
  }
  lines.push(`--${boundary}--`)
  return Buffer.from(lines.join('\r\n'))
}

// ─── 1. Status ──────────────────────────────────────────────────────────

describe('HttpStatus - advanced', () => {
  it('statusText returns range-based fallbacks', () => {
    expect(statusText(150)).toBe('Informational')
    expect(statusText(250)).toBe('Success')
    expect(statusText(350)).toBe('Redirection')
    expect(statusText(450)).toBe('Client Error')
    expect(statusText(550)).toBe('Server Error')
    expect(statusText(700)).toBe('Unknown')
  })

  it('statusText for all named codes', () => {
    expect(statusText(205)).toBe('Reset Content')
    expect(statusText(206)).toBe('Partial Content')
    expect(statusText(303)).toBe('See Other')
    expect(statusText(304)).toBe('Not Modified')
    expect(statusText(307)).toBe('Temporary Redirect')
    expect(statusText(308)).toBe('Permanent Redirect')
    expect(statusText(402)).toBe('Payment Required')
    expect(statusText(406)).toBe('Not Acceptable')
    expect(statusText(408)).toBe('Request Timeout')
    expect(statusText(410)).toBe('Gone')
    expect(statusText(411)).toBe('Length Required')
    expect(statusText(412)).toBe('Precondition Failed')
    expect(statusText(413)).toBe('Payload Too Large')
    expect(statusText(414)).toBe('URI Too Long')
    expect(statusText(415)).toBe('Unsupported Media Type')
    expect(statusText(422)).toBe('Unprocessable Entity')
    expect(statusText(429)).toBe('Too Many Requests')
    expect(statusText(501)).toBe('Not Implemented')
    expect(statusText(502)).toBe('Bad Gateway')
    expect(statusText(503)).toBe('Service Unavailable')
    expect(statusText(504)).toBe('Gateway Timeout')
    expect(statusText(505)).toBe('HTTP Version Not Supported')
  })
})

// ─── 2. HeadersMap ──────────────────────────────────────────────────────

describe('HeadersMap - advanced', () => {
  it('getAll returns empty array for missing header', () => {
    const hm = new HeadersMap()
    expect(hm.getAll('nonexistent')).toEqual([])
  })

  it('toJSON with single values returns strings, multi returns arrays', () => {
    const hm = new HeadersMap({ 'content-type': 'text/html', 'x-custom': 'val' })
    hm.append('x-multi', 'v1')
    hm.append('x-multi', 'v2')
    const json = hm.toJSON()
    expect(json['content-type']).toBe('text/html')
    expect(json['x-multi']).toEqual(['v1', 'v2'])
  })

  it('skips undefined initial values', () => {
    const hm = new HeadersMap({ 'x-key': undefined as any })
    expect(hm.get('x-key')).toBeUndefined()
  })
})

// ─── 3. Cookie ──────────────────────────────────────────────────────────

describe('Cookie - advanced edge cases', () => {
  it('parses cookie without equals sign', () => {
    expect(parseCookies('cookieWithoutValue')).toEqual({ cookieWithoutValue: '' })
  })

  it('parses mixed cookies with and without equals sign', () => {
    expect(parseCookies('a=1; orphan; b=2')).toEqual({ a: '1', orphan: '', b: '2' })
  })

  it('serializeCookie with all options', () => {
    const expires = new Date('2030-06-01')
    const result = serializeCookie('session', 'token123', {
      maxAge: 7200,
      expires,
      path: '/custom',
      domain: 'example.org',
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    })
    expect(result).toContain('session=token123')
    expect(result).toContain('Max-Age=7200')
    expect(result).toContain('Expires=')
    expect(result).toContain('Path=/custom')
    expect(result).toContain('Domain=example.org')
    expect(result).toContain('Secure')
    expect(result).toContain('HttpOnly')
    expect(result).toContain('SameSite=lax')
  })

  it('serializeCookie with sameSite none', () => {
    const result = serializeCookie('test', 'val', { sameSite: 'none' })
    expect(result).toContain('SameSite=none')
  })

  it('clearCookie preserves custom path and domain', () => {
    const result = clearCookie('session', { path: '/app', domain: 'site.com' })
    expect(result).toContain('Max-Age=0')
    expect(result).toContain('Path=/app')
    expect(result).toContain('Domain=site.com')
  })
})

// ─── 4. SuperRequest ────────────────────────────────────────────────────

describe('SuperRequest - advanced', () => {
  describe('body size limit', () => {
    it('throws when body exceeds 10MB limit', async () => {
      const largeBuf = Buffer.alloc(11 * 1024 * 1024, 'x')
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream' },
          body: largeBuf,
        }),
      )
      await expect(req.text()).rejects.toThrow('Request body too large')
    })
  })

  describe('multipart parsing', () => {
    it('returns empty formData when boundary not found in body', async () => {
      const body = Buffer.from('--nonexistent-boundary\r\n\r\n')
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: {
            'content-type': 'multipart/form-data; boundary=myboundary',
          },
          body,
        }),
      )
      expect(await req.formData()).toEqual({})
    })

    it('handles multipart with closing boundary (--)', async () => {
      const body = createMultipartBody('myboundary', [{ name: 'field1', data: 'value1' }])
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: {
            'content-type': 'multipart/form-data; boundary=myboundary',
          },
          body,
        }),
      )
      expect(await req.formData()).toEqual({ field1: 'value1' })
    })

    it('skips part without header separator', async () => {
      const body = Buffer.from(
        '--myboundary\r\n' +
          'Content-Disposition: form-data; name="field1"\r\n' +
          '\r\n' +
          'value1\r\n' +
          '--myboundary\r\n' +
          'no-header-delimiter-body-without-separator\r\n' +
          '--myboundary--',
      )
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: {
            'content-type': 'multipart/form-data; boundary=myboundary',
          },
          body,
        }),
      )
      const fd = await req.formData()
      expect(fd).toEqual({ field1: 'value1' })
    })

    it('skips part without content-disposition header', async () => {
      const body = Buffer.from(
        '--myboundary\r\n' +
          'Content-Disposition: form-data; name="field1"\r\n' +
          '\r\n' +
          'value1\r\n' +
          '--myboundary\r\n' +
          'Some-Unknown-Header: value\r\n' +
          '\r\n' +
          'body\r\n' +
          '--myboundary--',
      )
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: {
            'content-type': 'multipart/form-data; boundary=myboundary',
          },
          body,
        }),
      )
      expect(await req.formData()).toEqual({ field1: 'value1' })
    })

    it('produces files map from multipart file uploads', async () => {
      const body = createMultipartBody('testboundary', [
        { name: 'title', data: 'My File' },
        {
          name: 'document',
          filename: 'doc.txt',
          contentType: 'text/plain',
          data: 'Hello World',
        },
      ])
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: {
            'content-type': 'multipart/form-data; boundary=testboundary',
          },
          body,
        }),
      )
      const fd = await req.formData()
      expect(fd.title).toBe('My File')
      const f = await req.file('document')
      expect(f).toBeDefined()
      expect(f!.originalName).toBe('doc.txt')
      expect(f!.mimeType).toBe('text/plain')
      expect((await f!.toBuffer()).toString()).toBe('Hello World')
      expect(f!.isImage()).toBe(false)
      await f!.cleanup()
    })
  })

  describe('wantsJson edge cases', () => {
    it('returns true when accept contains application/json with other types', () => {
      const req = new SuperRequest(
        createMockReq({
          headers: { accept: 'text/html, application/json, */*' },
        }),
      )
      expect(req.wantsJson()).toBe(true)
    })

    it('returns false when accept header is missing and not ajax', () => {
      const req = new SuperRequest(createMockReq())
      expect(req.wantsJson()).toBe(false)
    })
  })

  describe('URL-encoded body edge cases', () => {
    it('handles key without equals sign', async () => {
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: Buffer.from('keywithoutvalue'),
        }),
      )
      expect(await req.formData()).toEqual({ keywithoutvalue: '' })
    })

    it('handles encoded URL values', async () => {
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: Buffer.from('a%20b=c%21&d=e'),
        }),
      )
      expect(await req.formData()).toEqual({ 'a b': 'c!', d: 'e' })
    })

    it('returns empty formData for empty body', async () => {
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: Buffer.from(''),
        }),
      )
      expect(await req.formData()).toEqual({})
    })
  })

  describe('body edge cases', () => {
    it('files() returns empty map when no multipart', async () => {
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: Buffer.from('plain text'),
        }),
      )
      expect(await req.files()).toEqual({})
    })

    it('file() returns undefined when name not found', async () => {
      const req = new SuperRequest(
        createMockReq({
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: Buffer.from('plain text'),
        }),
      )
      expect(await req.file('nonexistent')).toBeUndefined()
    })
  })

  describe('IP parsing edge cases', () => {
    beforeEach(() => {
      SuperRequest.setTrustedProxy('127.0.0.1')
    })

    afterEach(() => {
      // Reset static trustedProxies to avoid affecting other tests
      while ((SuperRequest as any).trustedProxies?.length > 0) {
        ;(SuperRequest as any).trustedProxies.pop()
      }
    })

    it('uses x-forwarded-for from array', () => {
      const req = new SuperRequest(
        createMockReq({
          headers: { 'x-forwarded-for': ['10.0.0.1', '10.0.0.2'] },
        }),
      )
      expect(req.ip).toBe('10.0.0.1')
    })

    it('uses x-real-ip when x-forwarded-for missing', () => {
      const req = new SuperRequest(createMockReq({ headers: { 'x-real-ip': '10.0.0.5' } }))
      expect(req.ip).toBe('10.0.0.5')
    })

    it('uses x-real-ip as array when multiple values', () => {
      const req = new SuperRequest(createMockReq({ headers: { 'x-real-ip': ['10.0.0.5'] } }))
      expect(req.ip).toBe('10.0.0.5')
    })

    it('falls back to 127.0.0.1 when no IP headers or socket', () => {
      const req = new SuperRequest(createMockReq({}))
      expect(req.ip).toBe('127.0.0.1')
    })
  })
})

// ─── 5. SuperResponse ──────────────────────────────────────────────────

describe('SuperResponse - advanced', () => {
  let raw: ServerResponse
  let res: SuperResponse
  let tmpDir: string

  beforeEach(() => {
    raw = createMockRes()
    res = new SuperResponse(raw)
    tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-resp-'))
  })

  afterEach(() => {
    try {
      rmdirSync(tmpDir, { recursive: true })
    } catch {
      // ignore
    }
  })

  describe('file()', () => {
    it('returns 404 for non-existent path', async () => {
      await res.file(join(tmpDir, 'nonexistent.txt'))
      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND)
    })

    it('returns 404 for directory path', async () => {
      mkdirSync(join(tmpDir, 'subdir'))
      await res.file(join(tmpDir, 'subdir'))
      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND)
    })

    it('returns 403 for path traversal outside root', async () => {
      await res.file('../outside.txt', { root: tmpDir })
      expect(res.statusCode).toBe(HttpStatus.FORBIDDEN)
    })

    it('serves file with custom options', async () => {
      const filePath = join(tmpDir, 'test.txt')
      writeFileSync(filePath, 'hello')
      await res.file(filePath, {
        maxAge: 3600,
        cacheControl: true,
        lastModified: true,
        headers: { 'x-custom': 'test-val' },
      })
      expect(res.getHeader('content-type')).toBe('text/plain; charset=utf-8')
      expect(res.getHeader('cache-control')).toBe('public, max-age=3600')
      expect(res.getHeader('last-modified')).toBeDefined()
      expect(res.getHeader('x-custom')).toBe('test-val')
    })

    it('omits cache-control when cacheControl is false', async () => {
      const filePath = join(tmpDir, 'nocache.txt')
      writeFileSync(filePath, 'data')
      await res.file(filePath, { cacheControl: false })
      expect(res.getHeader('cache-control')).toBeUndefined()
    })

    it('omits last-modified when lastModified is false', async () => {
      const filePath = join(tmpDir, 'nomod.txt')
      writeFileSync(filePath, 'data')
      await res.file(filePath, { lastModified: false })
      expect(res.getHeader('last-modified')).toBeUndefined()
    })
  })

  describe('download()', () => {
    it('sets content-disposition with custom filename', async () => {
      const filePath = join(tmpDir, 'original.txt')
      writeFileSync(filePath, 'download content')
      await res.download(filePath, 'custom-name.txt')
      expect(res.getHeader('content-disposition')).toContain('custom-name.txt')
    })
  })

  describe('redirect()', () => {
    it('throws on LF injection', () => {
      expect(() => res.redirect('/login\nx-evil: true')).toThrow('Invalid redirect URL')
    })
  })

  describe('stream()', () => {
    it('handles stream error gracefully', () => {
      const errorStream = new Readable({
        read() {
          this.destroy(new Error('stream error'))
        },
      })
      errorStream.on('error', () => {}) // prevent stream-level unhandled error
      const streamResult = res.stream(errorStream)
      // Verify it returns a promise (doesn't throw sync)
      expect(streamResult).toBeInstanceOf(Promise)
      // Catch the expected async rejection to prevent unhandled rejection
      streamResult.catch(() => {})
    })
  })

  describe('flush()', () => {
    it('sends response without body when _body is null', async () => {
      res.status(HttpStatus.NO_CONTENT)
      await res.flush()
      expect(res.statusCode).toBe(HttpStatus.NO_CONTENT)
      expect(res.headersSent).toBe(true)
    })

    it('flushes headers including non-set-cookie headers', async () => {
      res.header('X-Custom', 'val123')
      res.cookie('sid', 'abc', { httpOnly: true })
      await res.flush()
      expect(raw.getHeader('x-custom')).toBe('val123')
      expect(raw.getHeader('Set-Cookie')).toBeDefined()
    })
  })

  describe('header methods', () => {
    it('removeHeader and hasHeader work correctly', () => {
      res.header('X-Test', 'value')
      expect(res.hasHeader('x-test')).toBe(true)
      res.removeHeader('x-test')
      expect(res.hasHeader('x-test')).toBe(false)
      expect(res.hasHeader('never-set')).toBe(false)
    })
  })
})

// ─── 6. SuperUploadedFile ──────────────────────────────────────────────

describe('SuperUploadedFile - advanced', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-upload-'))
  })

  afterEach(() => {
    try {
      rmdirSync(tmpDir, { recursive: true })
    } catch {
      // ignore
    }
  })

  describe('move()', () => {
    it('writes file to destination', async () => {
      const buf = Buffer.from('move test')
      const file = await SuperUploadedFile.createFromBuffer('doc', 'original.txt', 'text/plain', buf, tmpDir)
      const result = await file.move(tmpDir)
      expect(result).toBe(join(tmpDir, 'original.txt'))
      expect(existsSync(result)).toBe(true)
      expect(readFileSync(result).toString()).toBe('move test')
      await file.cleanup()
    })

    it('with custom filename', async () => {
      const buf = Buffer.from('renamed')
      const file = await SuperUploadedFile.createFromBuffer('doc', 'original.txt', 'text/plain', buf, tmpDir)
      const result = await file.move(tmpDir, 'renamed.txt')
      expect(result).toBe(join(tmpDir, 'renamed.txt'))
      expect(existsSync(result)).toBe(true)
      await file.cleanup()
    })
  })

  describe('toBuffer()', () => {
    it('reads from disk path when buffer is null', async () => {
      const filePath = join(tmpDir, 'on-disk.txt')
      writeFileSync(filePath, 'disk content')
      const file = new SuperUploadedFile({
        fieldName: 'doc',
        originalName: 'on-disk.txt',
        mimeType: 'text/plain',
        size: 12,
        path: filePath,
      })
      expect((await file.toBuffer()).toString()).toBe('disk content')
    })
  })

  describe('cleanup()', () => {
    it('succeeds on existing file', async () => {
      const filePath = join(tmpDir, 'cleanup-me.txt')
      writeFileSync(filePath, 'temp')
      const file = new SuperUploadedFile({
        fieldName: 'f',
        originalName: 'cleanup-me.txt',
        mimeType: 'text/plain',
        size: 4,
        path: filePath,
      })
      await expect(file.cleanup()).resolves.toBeUndefined()
      expect(existsSync(filePath)).toBe(false)
    })

    it('handles already deleted file gracefully', async () => {
      const filePath = join(tmpDir, 'already-gone.txt')
      writeFileSync(filePath, 'temp')
      const file = new SuperUploadedFile({
        fieldName: 'f',
        originalName: 'already-gone.txt',
        mimeType: 'text/plain',
        size: 4,
        path: filePath,
      })
      await file.cleanup()
      await file.cleanup()
    })
  })

  describe('createFromBuffer()', () => {
    it('uses custom tempDir', async () => {
      const buf = Buffer.from('custom dir')
      const file = await SuperUploadedFile.createFromBuffer('f', 'custom.jpg', 'image/jpeg', buf, tmpDir)
      expect(file.path).toContain(tmpDir)
      expect(file.mimeType).toBe('image/jpeg')
      expect(file.extension).toBe('.jpg')
      expect(file.size).toBe(10)
      await file.cleanup()
    })

    it('defaults mimeType to application/octet-stream when empty', async () => {
      const buf = Buffer.from('data')
      const file = await SuperUploadedFile.createFromBuffer('f', 'file.bin', '', buf, tmpDir)
      expect(file.mimeType).toBe('application/octet-stream')
      await file.cleanup()
    })
  })

  describe('MIME type detection', () => {
    it('isImage returns true for all image types', () => {
      const types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff', 'image/avif']
      for (const t of types) {
        const file = new SuperUploadedFile({
          fieldName: 'img',
          originalName: 'f',
          mimeType: t,
          size: 0,
          path: '/tmp/f',
          buffer: Buffer.alloc(0),
        })
        expect(file.isImage()).toBe(true)
      }
    })

    it('isVideo returns true for all video types', () => {
      const types = ['video/mp4', 'video/mpeg', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
      for (const t of types) {
        const file = new SuperUploadedFile({
          fieldName: 'vid',
          originalName: 'f',
          mimeType: t,
          size: 0,
          path: '/tmp/f',
          buffer: Buffer.alloc(0),
        })
        expect(file.isVideo()).toBe(true)
      }
    })

    it('isImage returns false for non-image types', () => {
      const file = new SuperUploadedFile({
        fieldName: 'f',
        originalName: 'f.txt',
        mimeType: 'text/plain',
        size: 0,
        path: '/tmp/f',
        buffer: Buffer.alloc(0),
      })
      expect(file.isImage()).toBe(false)
      expect(file.isVideo()).toBe(false)
    })
  })
})
