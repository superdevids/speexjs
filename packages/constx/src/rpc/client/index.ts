export interface RpcClientOptions {
  baseUrl: string
  headers?: Record<string, string>
  fetch?: typeof globalThis.fetch
}

export class RpcClient {
  private baseUrl: string
  private headers: Record<string, string>
  private fetchFn: typeof globalThis.fetch

  constructor(options: RpcClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.headers = options.headers || {}
    this.fetchFn = options.fetch || globalThis.fetch
  }

  setHeader(name: string, value: string): void {
    this.headers[name] = value
  }

  async call<T>(procedure: string, input?: unknown): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify({ procedure, input }),
    })

    const json = await response.json()
    if (!json.success) {
      throw new RpcClientError(json.error?.code || 'UNKNOWN', json.error?.message || 'Unknown error', response.status, json.error?.details)
    }
    return json.data as T
  }

  async batch<T extends unknown[]>(calls: { procedure: string; input?: unknown }[]): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}/rpc/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify({ calls }),
    })
    const json = await response.json()
    if (!json.success) throw new RpcClientError('BATCH_ERROR', json.error?.message || 'Batch failed', response.status)
    return json.data as T
  }
}

export class RpcClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'RpcClientError'
  }
}

export function createClient(options: RpcClientOptions): RpcClient {
  return new RpcClient(options)
}
