import { createConnection } from 'node:net'

// WARNING: This is a raw TCP implementation of the Redis protocol.
// It is NOT production-ready. It lacks:
//   - TLS/SSL support
//   - Connection pooling
//   - Reconnection with backoff
//   - Pub/Sub support
//   - Cluster/Sentinel support
//   - Proper error handling for malformed replies
//
// For production use, replace with the `ioredis` package:
//   import IORedis from 'ioredis'
//   const client = new IORedis(process.env.REDIS_URL)
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
      setTimeout(() => {
        this.client.removeListener('data', onData)
        resolve(null)
      }, 1000)
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

  close(): void {
    this.client?.end()
  }
}
