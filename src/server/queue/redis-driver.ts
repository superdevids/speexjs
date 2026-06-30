// TODO: This raw-socket Redis driver is fragile. For production, use ioredis or node-redis.
// The RESP parser handles basic types but not all edge cases.

export class RedisQueueDriver {
  private socket: import('node:net').Socket | null = null
  private handlers = new Map<string, Function>()
  private running = false
  private resp = new RespParser()
  private commandQueue: Array<(val: any) => void> = []

  async connect(url: string): Promise<void> {
    const { createConnection } = await import('node:net')
    const parsed = new URL(url)
    return new Promise((resolve, reject) => {
      this.socket = createConnection(Number(parsed.port) || 6379, parsed.hostname || 'localhost', () => resolve())
      this.socket.on('data', (data: Buffer) => {
        this.resp.feed(data.toString())
        while (this.resp.hasResult()) {
          const cb = this.commandQueue.shift()
          if (cb) cb(this.resp.next())
        }
      })
      this.socket.on('error', reject)
    })
  }

  register(name: string, handler: Function): void {
    this.handlers.set(name, handler)
  }

  async push(name: string, payload: unknown): Promise<void> {
    if (!this.socket) throw new Error('Redis not connected')
    return this.exec('LPUSH', `speexjs:queue:${name}`, JSON.stringify(payload))
  }

  async start(): Promise<void> {
    this.running = true
    this.poll().catch(() => {})
  }

  private async poll(): Promise<void> {
    while (this.running) {
      if (this.handlers.size === 0) {
        await sleep(1000)
        continue
      }
      const keys = [...this.handlers.keys()].map((k) => `speexjs:queue:${k}`)
      try {
        const result = await this.exec('BRPOP', ...keys, '5')
        if (result) {
          const key = result[1] as string
          const name = key.replace('speexjs:queue:', '')
          const handler = this.handlers.get(name)
          if (handler) {
            const payload = JSON.parse(result[2] as string)
            try {
              await handler(payload)
            } catch (err) {
              console.error(`[RedisQueue] handler error for ${name}:`, err)
            }
          }
        }
      } catch (err) {
        if (this.running) console.error('[RedisQueue] poll error:', err)
        await sleep(1000)
      }
    }
  }

  stop(): void {
    this.running = false
  }

  private exec(...args: string[]): Promise<any> {
    if (!this.socket) throw new Error('Redis not connected')
    let cmd = `*${args.length}\r\n`
    for (const arg of args) {
      cmd += `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`
    }
    this.socket.write(cmd)
    return new Promise((resolve) => {
      this.commandQueue.push(resolve)
    })
  }
}

class RespParser {
  private buffer = ''
  private results: any[] = []

  feed(data: string): void {
    this.buffer += data
    this.parse()
  }

  private parse(): void {
    while (this.buffer.length > 0) {
      const item = this.parseOne()
      if (item === undefined) break
      this.results.push(item)
    }
  }

  private parseOne(): any {
    if (this.buffer.length === 0) return undefined
    const type = this.buffer[0]
    const idx = this.buffer.indexOf('\r\n')
    if (idx === -1) return undefined

    switch (type) {
      case '+':
      case '-': {
        const val = this.buffer.slice(1, idx)
        this.buffer = this.buffer.slice(idx + 2)
        return type === '-' ? new Error(val) : val
      }
      case ':': {
        const val = parseInt(this.buffer.slice(1, idx), 10)
        this.buffer = this.buffer.slice(idx + 2)
        return val
      }
      case '$': {
        const len = parseInt(this.buffer.slice(1, idx), 10)
        if (len === -1) {
          this.buffer = this.buffer.slice(idx + 2)
          return null
        }
        if (this.buffer.length < idx + 2 + len + 2) return undefined
        const val = this.buffer.slice(idx + 2, idx + 2 + len)
        this.buffer = this.buffer.slice(idx + 2 + len + 2)
        return val
      }
      case '*': {
        const count = parseInt(this.buffer.slice(1, idx), 10)
        if (count === -1) {
          this.buffer = this.buffer.slice(idx + 2)
          return null
        }
        const items: any[] = []
        let remaining = this.buffer.slice(idx + 2)
        for (let i = 0; i < count; i++) {
          const parsed = this.parseFrom(remaining)
          if (parsed === undefined) return undefined
          items.push(parsed.value)
          remaining = parsed.rest
        }
        this.buffer = remaining
        return items
      }
      default:
        return undefined
    }
  }

  private parseFrom(buf: string): { value: any; rest: string } | undefined {
    if (buf.length === 0) return undefined
    const type = buf[0]
    const idx = buf.indexOf('\r\n')
    if (idx === -1) return undefined

    switch (type) {
      case '$': {
        const len = parseInt(buf.slice(1, idx), 10)
        if (len === -1) return { value: null, rest: buf.slice(idx + 2) }
        if (buf.length < idx + 2 + len + 2) return undefined
        return {
          value: buf.slice(idx + 2, idx + 2 + len),
          rest: buf.slice(idx + 2 + len + 2),
        }
      }
      default:
        return { value: buf.slice(idx + 2), rest: buf.slice(idx + 2) }
    }
  }

  hasResult(): boolean {
    return this.results.length > 0
  }

  next(): any {
    return this.results.shift()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
