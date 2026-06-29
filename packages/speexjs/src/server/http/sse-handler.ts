export class SSEHandler {
  private clients = new Set<any>()

  addClient(res: any): void {
    this.clients.add(res)
    res.on('close', () => this.clients.delete(res))
  }

  broadcast(event: string, data: unknown): void {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const client of this.clients) {
      client.write(msg)
    }
  }

  getClientCount(): number { return this.clients.size }
}
