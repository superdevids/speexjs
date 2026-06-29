import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import type { Server } from 'node:http'
import { readFileSync } from 'node:fs'
import { SuperRequest } from '../http/request.js'
import { SuperResponse } from '../http/response.js'
import { normalizeError } from '../errors.js'

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

process.on('unhandledRejection', (reason) => {
  console.error('[SpeexJS] Unhandled Rejection:', reason instanceof Error ? reason.message : reason)
})

export class NodeEngine implements ServerEngine {
  async createServer(handler: RequestHandler): Promise<ServerInstance> {
    const server = createHttpServer(async (nodeReq, nodeRes) => {
      const req = new SuperRequest(nodeReq)
      const res = new SuperResponse(nodeRes)

      try {
        await handler(req, res)
      } catch (_err: unknown) {
        if (!res.headersSent) {
          const error = _err instanceof Error ? _err : new Error(String(_err))
          const httpError = normalizeError(error)
          res.status(httpError.status).json(httpError.toJSON())
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

export class HttpsEngine extends NodeEngine {
  private options: { key: string; cert: string }

  constructor(keyPath: string, certPath: string) {
    super()
    this.options = {
      key: readFileSync(keyPath, 'utf-8'),
      cert: readFileSync(certPath, 'utf-8'),
    }
  }

  async createServer(handler: RequestHandler): Promise<ServerInstance> {
    const server = createHttpsServer(this.options, async (nodeReq, nodeRes) => {
      const req = new SuperRequest(nodeReq as any)
      const res = new SuperResponse(nodeRes as any)
      try { await handler(req, res) }
      catch (_err: unknown) {
        if (!res.headersSent) {
          const error = _err instanceof Error ? _err : new Error(String(_err))
          const httpError = normalizeError(error)
          res.status(httpError.status).json(httpError.toJSON())
          await res.flush()
        }
      }
      if (!res.headersSent) await res.flush()
    })
    return {
      raw: server,
      close: () => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve())),
    }
  }
}
