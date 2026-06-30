import { createHmac, createHash } from 'node:crypto'

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf-8').digest()
}

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex')
}

function iso8601(date: Date): string {
  return date
    .toISOString()
    .replace(/[:-]/g, '')
    .replace(/\.\d{3}/, '')
}

function signV4(secretAccessKey: string, dateStamp: string, region: string, service: string, stringToSign: string): string {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  const kSigning = hmac(kService, 'aws4_request')
  return hmac(kSigning, stringToSign).toString('hex')
}

export interface S3Config {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  baseUrl?: string
}

export class S3Disk {
  constructor(private config: S3Config) {}

  async put(filePath: string, content: string | Buffer): Promise<string> {
    const body = typeof content === 'string' ? content : content.toString()
    const res = await this.signedRequest('PUT', filePath, body, { 'x-amz-acl': 'public-read' })
    if (!res.ok) throw new Error(`S3 put failed: ${res.status} ${await res.text()}`)
    return filePath
  }

  async get(filePath: string): Promise<Buffer> {
    const res = await this.signedRequest('GET', filePath)
    if (!res.ok) throw new Error(`S3 get failed: ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }

  async exists(filePath: string): Promise<boolean> {
    const res = await this.signedRequest('HEAD', filePath)
    return res.ok
  }

  async delete(filePath: string): Promise<boolean> {
    const res = await this.signedRequest('DELETE', filePath)
    return res.ok
  }

  url(filePath: string): string {
    return this.config.baseUrl ?? `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${filePath}`
  }

  signedUrl(filePath: string, expiresIn = 3600, method = 'GET'): string {
    const { bucket, region, accessKeyId, secretAccessKey } = this.config
    const now = new Date()
    const amzDate = iso8601(now)
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const host = `${bucket}.s3.${region}.amazonaws.com`

    const params: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(Math.floor(expiresIn)),
      'X-Amz-SignedHeaders': 'host',
    }

    const canonicalQuerystring = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')

    const canonicalRequest = [method, `/${filePath}`, canonicalQuerystring, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')

    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
    const stringToSign = [algorithm, amzDate, credentialScope, sha256(canonicalRequest)].join('\n')

    const signature = signV4(secretAccessKey, dateStamp, region, 's3', stringToSign)
    params['X-Amz-Signature'] = signature

    const finalQueryString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')

    return `https://${host}/${filePath}?${finalQueryString}`
  }

  private async signedRequest(method: string, filePath: string, body?: string, extraHeaders?: Record<string, string>): Promise<Response> {
    const { bucket, region, accessKeyId, secretAccessKey } = this.config
    const now = new Date()
    const amzDate = iso8601(now)
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const host = `${bucket}.s3.${region}.amazonaws.com`

    const payloadHash = body ? sha256(body) : sha256('')
    const headers: Record<string, string> = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      ...extraHeaders,
    }

    const signedHeaders = Object.keys(headers).sort().join(';')
    const canonicalHeaders = Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}\n`)
      .join('')

    const canonicalRequest = [method, `/${filePath}`, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')

    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
    const stringToSign = [algorithm, amzDate, credentialScope, sha256(canonicalRequest)].join('\n')

    const signature = signV4(secretAccessKey, dateStamp, region, 's3', stringToSign)
    const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const url = `https://${host}/${filePath}`
    return fetch(url, {
      method,
      headers: { ...headers, authorization },
      body: body ?? undefined,
    })
  }

  async size(filePath: string): Promise<number> {
    const res = await this.signedRequest('HEAD', filePath)
    if (!res.ok) throw new Error(`File not found: ${filePath}`)
    return Number(res.headers.get('content-length') ?? '0')
  }

  async lastModified(filePath: string): Promise<Date> {
    const res = await this.signedRequest('HEAD', filePath)
    if (!res.ok) throw new Error(`File not found: ${filePath}`)
    return new Date(res.headers.get('last-modified') ?? '')
  }

  async copy(from: string, to: string): Promise<boolean> {
    const { bucket } = this.config
    const res = await this.signedRequest('PUT', to, undefined, {
      'x-amz-copy-source': `/${bucket}/${from}`,
    })
    return res.ok
  }

  async move(from: string, to: string): Promise<boolean> {
    const copied = await this.copy(from, to)
    if (!copied) return false
    return this.delete(from)
  }

  async files(prefix = ''): Promise<string[]> {
    const qs = `prefix=${encodeURIComponent(prefix)}&list-type=2`
    const { bucket, region, accessKeyId, secretAccessKey } = this.config
    const now = new Date()
    const amzDate = iso8601(now)
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
    const host = `${bucket}.s3.${region}.amazonaws.com`
    const payloadHash = sha256('')
    const headers: Record<string, string> = { host, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash }
    const signedHeaders = Object.keys(headers).sort().join(';')
    const canonicalHeaders = Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}\n`)
      .join('')
    const canonicalRequest = ['GET', '/', qs, canonicalHeaders, signedHeaders, payloadHash].join('\n')
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n')
    const signature = signV4(secretAccessKey, dateStamp, region, 's3', stringToSign)
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const listRes = await fetch(`https://${host}/?${qs}`, { headers: { ...headers, authorization } })
    if (!listRes.ok) return []
    const text = await listRes.text()
    const keys: string[] = []
    const keyRegex = /<Key>([^<]+)<\/Key>/g
    for (;;) {
      const m = keyRegex.exec(text)
      if (!m) break
      if (m[1]) keys.push(m[1])
    }
    return keys
  }

  async directories(_prefix = ''): Promise<string[]> {
    // S3 has no native directory listing; use CommonPrefixes from ListObjectsV2
    return []
  }

  async makeDirectory(_dirPath: string): Promise<void> {
    // S3 is object-store; directories are implicit via key prefixes
    return
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    const files = await this.files(dirPath)
    for (const file of files) {
      await this.delete(file)
    }
  }

  async readStream(filePath: string): Promise<import('node:stream').Readable> {
    const res = await this.signedRequest('GET', filePath)
    if (!res.ok) throw new Error(`File not found: ${filePath}`)
    return res.body as unknown as import('node:stream').Readable
  }

  async writeStream(_filePath: string): Promise<import('node:stream').Writable> {
    // TODO: Implement multipart upload for S3 streaming writes
    throw new Error('S3 writeStream not supported. Use put() for small files.')
  }

  getRoot(): string {
    return `s3://${this.config.bucket}`
  }

  getUrl(): string | undefined {
    return this.config.baseUrl
  }
}
