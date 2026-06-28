import { createServer as createHttpServer } from 'node:http'
import type { Server } from 'node:http'

import { SuperRequest } from '../http/request'
import { SuperResponse } from '../http/response'

export interface ServerInstance {
  close: () => Promise<void>
  raw: Server
}

export type RequestHandler = (
  req: SuperRequest,
  res: SuperResponse,
) => void | Promise<void>

export interface ServerEngine {
  createServer(handler: RequestHandler): Promise<ServerInstance>
  getPort(server: ServerInstance): number
  close(server: ServerInstance): Promise<void>
}

export class NodeEngine implements ServerEngine {
  async createServer(handler: RequestHandler): Promise<ServerInstance> {
    const server = createHttpServer(async (nodeReq, nodeRes) => {
      const req = new SuperRequest(nodeReq)
      const res = new SuperResponse(nodeRes)

      try {
        await handler(req, res)
      } catch (_err: unknown) {
        if (!res.headersSent) {
          const message =
            _err instanceof Error ? _err.message : 'Internal Server Error'
          res.status(500).json({ error: message })
          await res.flush()
        }
      }

      if (!res.headersSent) {
        await res.flush()
      }
    })

    return {
      raw: server,
      close: () => {
        return new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err !== undefined && err !== null) {
              reject(err)
            } else {
              resolve()
            }
          })
        })
      },
    }
  }

  getPort(server: ServerInstance): number {
    const addr = server.raw.address()
    if (addr !== null && typeof addr === 'object') {
      return addr.port
    }
    return 0
  }

  async close(server: ServerInstance): Promise<void> {
    await server.close()
  }
}
