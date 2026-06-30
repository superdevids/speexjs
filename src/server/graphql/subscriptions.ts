import type { IncomingMessage } from 'node:http'
import type { Server as HTTPServer } from 'node:http'

type UnsubscribeFn = () => void

interface PubSubHandler {
  topic: string
  onMessage: (payload: unknown) => void
}

interface WsClient {
  id: string
  socket: WebSocket
  subscriptions: Map<string, UnsubscribeFn>
  cleanups: (() => void)[]
}

const WS_OPCODES = {
  CONNECTION_INIT: 'connection_init',
  CONNECTION_ACK: 'connection_ack',
  SUBSCRIBE: 'subscribe',
  NEXT: 'next',
  ERROR: 'error',
  COMPLETE: 'complete',
} as const

interface GraphqlWsMessage {
  type: string
  id?: string
  payload?: unknown
}

export class PubSub {
  private topics = new Map<string, Set<PubSubHandler>>()
  private redisClient: {
    publish: (channel: string, message: string) => Promise<void>
    subscribe: (channel: string, handler: (msg: string) => void) => Promise<void>
    unsubscribe: (channel: string) => Promise<void>
  } | null = null
  private redisSubscribed = new Set<string>()
  private redisBridge: ((channel: string, payload: unknown) => void) | null = null

  subscribe(topic: string, onMessage: (payload: unknown) => void): () => void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set())
      this.setupRedisSubscription(topic)
    }
    const handlers = this.topics.get(topic)!
    const handler: PubSubHandler = { topic, onMessage }
    handlers.add(handler)
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.topics.delete(topic)
        this.teardownRedisSubscription(topic)
      }
    }
  }

  publish(topic: string, payload: unknown): void {
    const handlers = this.topics.get(topic)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler.onMessage(payload)
        } catch {
          /* ignore handler error */
        }
      }
    }
    if (this.redisClient) {
      this.redisClient.publish(topic, JSON.stringify(payload)).catch(() => {})
    }
  }

  async connectRedis(options: { host: string; port: number; password?: string }): Promise<void> {
    // @ts-expect-error - redis is optional; graceful fallback if not installed
    const { createClient } = (await import('redis').catch(() => {
      throw new Error('Redis client not available. Install "redis" package.')
    })) as any
    const client = createClient(options)
    await client.connect()
    const subscriber = client.duplicate()
    await subscriber.connect()

    this.redisClient = {
      publish: (channel: string, message: string) => client.publish(channel, message),
      subscribe: (channel: string, handler: (msg: string) => void) => subscriber.subscribe(channel, handler),
      unsubscribe: (channel: string) => subscriber.unsubscribe(channel),
    }

    this.redisBridge = (channel: string, payload: unknown) => {
      const handlers = this.topics.get(channel)
      if (handlers) {
        for (const h of handlers) {
          try {
            h.onMessage(payload)
          } catch {}
        }
      }
    }
  }

  private setupRedisSubscription(topic: string): void {
    if (!this.redisClient || this.redisSubscribed.has(topic)) return
    this.redisSubscribed.add(topic)
    const bridge = this.redisBridge
    if (bridge) {
      this.redisClient
        .subscribe(topic, (msg: string) => {
          try {
            bridge(topic, JSON.parse(msg))
          } catch {
            bridge(topic, msg)
          }
        })
        .catch(() => {})
    }
  }

  private teardownRedisSubscription(topic: string): void {
    if (!this.redisClient || !this.redisSubscribed.has(topic)) return
    this.redisSubscribed.delete(topic)
    this.redisClient.unsubscribe(topic).catch(() => {})
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export class SubscriptionServer {
  private clients = new Map<string, WsClient>()
  private pubsub: PubSub
  private getSchema: () => {
    hasSubscription: (name: string) => boolean
    getSubscriptionField: (name: string) =>
      | {
          subscribe: (args: Record<string, unknown>, ctx: unknown) => AsyncIterator<unknown>
          resolve?: (payload: unknown, args: Record<string, unknown>, ctx: unknown) => unknown
        }
      | undefined
    subscriptionNames: () => string[]
  }

  constructor(
    pubsub: PubSub,
    schema: {
      hasSubscription: (name: string) => boolean
      getSubscriptionField: (name: string) =>
        | {
            subscribe: (args: Record<string, unknown>, ctx: unknown) => AsyncIterator<unknown>
            resolve?: (payload: unknown, args: Record<string, unknown>, ctx: unknown) => unknown
          }
        | undefined
      subscriptionNames: () => string[]
    },
  ) {
    this.pubsub = pubsub
    this.getSchema = () => schema
  }

  attach(server: HTTPServer, path = '/graphql/ws'): void {
    server.on('upgrade', (req: IncomingMessage, socket: any, _head: Buffer) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (url.pathname !== path) {
        socket.destroy()
        return
      }

      const ws = new WebSocket(req.url as any)

      const clientId = generateId()
      const client: WsClient = {
        id: clientId,
        socket: ws as any,
        subscriptions: new Map(),
        cleanups: [],
      }
      this.clients.set(clientId, client)

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: GraphqlWsMessage = JSON.parse(event.data as string)
          this.handleMessage(client, msg)
        } catch {
          /* ignore parse errors */
        }
      }

      ws.onclose = () => {
        this.cleanupClient(clientId)
      }

      ws.onerror = () => {
        this.cleanupClient(clientId)
      }
    })
  }

  private handleMessage(client: WsClient, msg: GraphqlWsMessage): void {
    switch (msg.type) {
      case WS_OPCODES.CONNECTION_INIT: {
        this.send(client, { type: WS_OPCODES.CONNECTION_ACK })
        break
      }
      case WS_OPCODES.SUBSCRIBE: {
        this.handleSubscribe(client, msg)
        break
      }
      case WS_OPCODES.COMPLETE: {
        if (msg.id) {
          const unsub = client.subscriptions.get(msg.id)
          if (unsub) {
            unsub()
            client.subscriptions.delete(msg.id)
          }
        }
        break
      }
    }
  }

  private async handleSubscribe(client: WsClient, msg: GraphqlWsMessage): Promise<void> {
    const payload = msg.payload as { query?: string; variables?: Record<string, unknown>; operationName?: string } | undefined
    if (!payload?.query || !msg.id) {
      if (msg.id) {
        this.send(client, { id: msg.id, type: WS_OPCODES.ERROR, payload: { message: 'No query provided' } })
      }
      return
    }

    const match = payload.query.match(/subscription\s*(?:\w+\s*)?\{(\w+)/)
    if (!match) {
      this.send(client, { id: msg.id, type: WS_OPCODES.ERROR, payload: { message: 'Invalid subscription query' } })
      return
    }

    const fieldName = match[1]!
    const schema = this.getSchema()
    if (!schema.hasSubscription(fieldName)) {
      this.send(client, { id: msg.id, type: WS_OPCODES.ERROR, payload: { message: `Subscription "${fieldName}" not found` } })
      return
    }

    const resolver = schema.getSubscriptionField(fieldName)
    if (!resolver) {
      this.send(client, { id: msg.id, type: WS_OPCODES.ERROR, payload: { message: `Subscription resolver "${fieldName}" not found` } })
      return
    }

    try {
      const iter = resolver.subscribe(payload.variables ?? {}, {})
      const isAsyncIter = iter && typeof (iter as any)[Symbol.asyncIterator] === 'function'

      if (isAsyncIter) {
        const runLoop = async () => {
          try {
            for await (const value of iter as unknown as AsyncIterable<unknown>) {
              const result = resolver.resolve ? resolver.resolve(value, payload.variables ?? {}, {}) : value
              this.send(client, {
                id: msg.id,
                type: WS_OPCODES.NEXT,
                payload: { data: { [fieldName]: result } },
              })
            }
          } catch {
            this.send(client, { id: msg.id, type: WS_OPCODES.ERROR, payload: { message: 'Subscription iterator error' } })
          }
          this.send(client, { id: msg.id, type: WS_OPCODES.COMPLETE })
        }
        runLoop()
      } else {
        const pubsubTopic = fieldName
        const unsub = this.pubsub.subscribe(pubsubTopic, (payload: unknown) => {
          const result = resolver.resolve ? resolver.resolve(payload, {}, {}) : payload
          this.send(client, {
            id: msg.id,
            type: WS_OPCODES.NEXT,
            payload: { data: { [fieldName]: result } },
          })
        })
        client.subscriptions.set(msg.id, unsub)
      }
    } catch (err: any) {
      this.send(client, { id: msg.id, type: WS_OPCODES.ERROR, payload: { message: err.message } })
    }
  }

  private send(client: WsClient, msg: GraphqlWsMessage): void {
    try {
      client.socket.send(JSON.stringify(msg))
    } catch {
      /* client disconnected */
    }
  }

  private cleanupClient(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return
    for (const [, unsub] of client.subscriptions) {
      try {
        unsub()
      } catch {}
    }
    for (const cleanup of client.cleanups) {
      try {
        cleanup()
      } catch {}
    }
    this.clients.delete(clientId)
  }

  subscriberCount(): number {
    return this.clients.size
  }
}
