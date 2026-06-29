import { createConnection } from 'node:net'

export class RedisCacheStore {
  private client: any = null

  async connect(url: string): Promise<void> {
    const parsed = new URL(url)
    this.client = createConnection(Number(parsed.port) || 6379, parsed.hostname || 'localhost')
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null
    return new Promise((resolve) => {
      const onData = (data: Buffer) => {
        const reply = data.toString().trim()
        this.client.removeListener('data', onData)
        resolve(reply.startsWith('$-1') ? null : reply.slice(1))
      }
      this.client.on('data', onData)
      this.client.write(`GET ${key}\r\n`)
      setTimeout(() => { this.client.removeListener('data', onData); resolve(null) }, 1000)
    })
  }

  async set(key: string, value: string, ttl = 3600): Promise<void> {
    if (!this.client) return
    this.client.write(`SETEX ${key} ${ttl} ${value}\r\n`)
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return
    this.client.write(`DEL ${key}\r\n`)
  }

  async flush(): Promise<void> {
    if (!this.client) return
    this.client.write('FLUSHDB\r\n')
  }

  close(): void { this.client?.end() }
}
