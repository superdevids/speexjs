export class HttpClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string> = {}
  private timeoutMs = 30000

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  setHeader(name: string, value: string): this {
    this.defaultHeaders[name] = value
    return this
  }
  setTimeout(ms: number): this {
    this.timeoutMs = ms
    return this
  }

  async get<T = unknown>(path: string): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path)
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, body)
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, body)
  }

  async delete<T = unknown>(path: string): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<HttpResponse<T>> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json', ...this.defaultHeaders },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      const data = res.status === 204 ? null : await res.json()
      return { status: res.status, ok: res.ok, data, headers: Object.fromEntries(res.headers) }
    } finally {
      clearTimeout(timer)
    }
  }
}

export interface HttpResponse<T> {
  status: number
  ok: boolean
  data: T
  headers: Record<string, string>
}
