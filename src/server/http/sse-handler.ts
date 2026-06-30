import type { ServerResponse } from 'node:http'

export class SSEHandler {
  private clients = new Set<ServerResponse>()
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null

  addClient(res: ServerResponse): void {
    this.clients.add(res)

    res.on('close', () => {
      this.clients.delete(res)
    })

    if (this.keepAliveInterval === null) {
      this.keepAliveInterval = setInterval(() => {
        for (const client of this.clients) {
          try {
            client.write(':ping\n\n')
          } catch {
            this.clients.delete(client)
          }
        }
      }, 30000)
      if (this.keepAliveInterval.unref) {
        this.keepAliveInterval.unref()
      }
    }
  }

  broadcast(event: string, data: unknown): void {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const client of this.clients) {
      try {
        client.write(msg)
      } catch {
        this.clients.delete(client)
      }
    }
  }

  getClientCount(): number {
    return this.clients.size
  }

  close(): void {
    if (this.keepAliveInterval !== null) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }
    for (const client of this.clients) {
      try {
        client.end()
      } catch {
        // ignore
      }
    }
    this.clients.clear()
  }
}
