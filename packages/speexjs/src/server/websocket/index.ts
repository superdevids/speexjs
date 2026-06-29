import type { Server, IncomingMessage } from 'node:http'
// @ts-expect-error - optional dependency
import { WebSocketServer, WebSocket } from 'ws'

export type WsEventHandler = (data: unknown, socket: WebSocket) => void | Promise<void>

interface Channel {
  name: string
  subscribers: Set<WebSocket>
}

export class WsBroadcaster {
  private wss: WebSocketServer | null = null
  private channels: Map<string, Channel> = new Map()
  private handlers: Map<string, WsEventHandler[]> = new Map()

  /**
   * Attach WebSocket server to an existing HTTP server.
   */
  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' })

    this.wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const channels = url.searchParams.get('channels')?.split(',') ?? []

      for (const ch of channels) {
        if (ch) this.subscribe(socket, ch)
      }

      socket.on('message', (raw: Buffer) => {
        let parsed: { event?: string; data?: unknown; channel?: string }
        try { parsed = JSON.parse(raw.toString()) }
        catch { return }

        const { event, data, channel } = parsed
        if (!event) return

        if (channel) {
          // Emit to channel subscribers
          const ch = this.channels.get(channel)
          if (ch) {
            const msg = JSON.stringify({ event, data, channel })
            for (const sub of ch.subscribers) {
              if (sub.readyState === WebSocket.OPEN) {
                sub.send(msg)
              }
            }
          }
        }

        // Run handlers
        const handlers = this.handlers.get(event) ?? []
        for (const handler of handlers) {
          handler(data, socket)
        }
      })

      socket.on('close', () => {
        // Remove from all channels
        for (const [, ch] of this.channels) {
          ch.subscribers.delete(socket)
        }
      })
    })
  }

  /**
   * Subscribe a socket to a channel.
   */
  subscribe(socket: WebSocket, channel: string): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, { name: channel, subscribers: new Set() })
    }
    this.channels.get(channel)!.subscribers.add(socket)
  }

  /**
   * Broadcast an event to all subscribers of a channel.
   */
  broadcast(channel: string, event: string, data: unknown): void {
    const ch = this.channels.get(channel)
    if (!ch) return
    const msg = JSON.stringify({ event, data, channel })
    for (const sub of ch.subscribers) {
      if (sub.readyState === WebSocket.OPEN) {
        sub.send(msg)
      }
    }
  }

  /**
   * Emit an event to a specific socket.
   */
  emit(socket: WebSocket, event: string, data: unknown): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event, data }))
    }
  }

  /**
   * Listen for events from clients.
   */
  on(event: string, handler: WsEventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
  }

  /**
   * Get channel subscriber count.
   */
  subscriberCount(channel: string): number {
    return this.channels.get(channel)?.subscribers.size ?? 0
  }

  /**
   * Close all connections.
   */
  close(): void {
    this.wss?.close()
  }
}
