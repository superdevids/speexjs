import type { Server, IncomingMessage } from 'node:http'
// @ts-expect-error - optional dependency
import { WebSocketServer, WebSocket } from 'ws'

export type WsEventHandler = (data: unknown, socket: WebSocket) => void | Promise<void>

interface Channel {
  name: string
  subscribers: Set<WebSocket>
}

export interface WsBroadcasterOptions {
  authenticate?: (req: IncomingMessage) => boolean | Promise<boolean>
  authorizeChannel?: (socket: WebSocket, channel: string) => boolean | Promise<boolean>
  maxPayload?: number
  maxConnections?: number
}

export class WsBroadcaster {
  private wss: WebSocketServer | null = null
  private channels: Map<string, Channel> = new Map()
  private handlers: Map<string, WsEventHandler[]> = new Map()
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private connectionCount = 0
  private options: Required<WsBroadcasterOptions>

  constructor(options?: WsBroadcasterOptions) {
    this.options = {
      authenticate: () => true,
      authorizeChannel: () => true,
      maxPayload: 1024 * 1024,
      maxConnections: 1000,
      ...options,
    }
  }

  attach(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      maxPayload: this.options.maxPayload,
    })

    this.wss.on('connection', async (socket: WebSocket, req: IncomingMessage) => {
      if (this.connectionCount >= this.options.maxConnections) {
        socket.close(1013, 'Too many connections')
        return
      }

      const authenticated = await this.options.authenticate(req)
      if (!authenticated) {
        socket.close(4001, 'Authentication failed')
        return
      }

      this.connectionCount++

      const url = new URL(req.url ?? '/', 'http://localhost')
      const channels = url.searchParams.get('channels')?.split(',') ?? []

      for (const ch of channels) {
        if (ch) {
          const authorized = await this.options.authorizeChannel(socket, ch)
          if (authorized) {
            this.subscribe(socket, ch)
          }
        }
      }

      socket.on('message', (raw: Buffer) => {
        let parsed: { event?: string; data?: unknown; channel?: string }
        try {
          parsed = JSON.parse(raw.toString())
        } catch {
          return
        }

        const { event, data, channel } = parsed
        if (!event) return

        if (channel) {
          const ch = this.channels.get(channel)
          if (ch) {
            const msg = JSON.stringify({ event, data, channel })
            for (const sub of ch.subscribers) {
              if (sub.readyState === WebSocket.OPEN) {
                try {
                  sub.send(msg)
                } catch {
                  ch.subscribers.delete(sub)
                }
              }
            }
          }
        }

        const handlers = this.handlers.get(event) ?? []
        for (const handler of handlers) {
          handler(data, socket)
        }
      })

      socket.on('close', () => {
        this.connectionCount--
        for (const [, ch] of this.channels) {
          ch.subscribers.delete(socket)
        }
      })
    })

    this.pingInterval = setInterval(() => {
      for (const client of this.wss?.clients ?? []) {
        if (client.readyState === WebSocket.OPEN) {
          client.ping()
        }
      }
    }, 30000)
    if (this.pingInterval.unref) {
      this.pingInterval.unref()
    }
  }

  subscribe(socket: WebSocket, channel: string): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, { name: channel, subscribers: new Set() })
    }
    this.channels.get(channel)!.subscribers.add(socket)
  }

  broadcast(channel: string, event: string, data: unknown): void {
    const ch = this.channels.get(channel)
    if (!ch) return
    const msg = JSON.stringify({ event, data, channel })
    for (const sub of ch.subscribers) {
      if (sub.readyState === WebSocket.OPEN) {
        try {
          sub.send(msg)
        } catch {
          ch.subscribers.delete(sub)
        }
      }
    }
  }

  emit(socket: WebSocket, event: string, data: unknown): void {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ event, data }))
      } catch {
        // ignore
      }
    }
  }

  on(event: string, handler: WsEventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
  }

  subscriberCount(channel: string): number {
    return this.channels.get(channel)?.subscribers.size ?? 0
  }

  close(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    this.wss?.close()
  }
}
