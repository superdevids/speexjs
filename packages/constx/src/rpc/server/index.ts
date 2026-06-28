import type { Schema } from '../../schema/index.js'
import type { RpcDefinitions, RpcContext, InferRpcOutput } from '../types.js'
import { RpcError } from '../types.js'

export interface RpcServerOptions<T extends RpcDefinitions> {
  procedures: T
  context?: () => RpcContext | Promise<RpcContext>
  middleware?: RpcMiddleware[]
}

type RpcMiddleware = (name: string, input: unknown, ctx: RpcContext) => void | Promise<void>

export class RpcServer<T extends RpcDefinitions> {
  private procedures: T
  private contextFactory?: () => RpcContext | Promise<RpcContext>
  private middleware: RpcMiddleware[]

  constructor(options: RpcServerOptions<T>) {
    this.procedures = options.procedures
    this.contextFactory = options.context
    this.middleware = options.middleware || []
  }

  async call<K extends keyof T & string>(
    name: K,
    input?: unknown
  ): Promise<InferRpcOutput<T>[K]> {
    const proc = this.procedures[name]
    if (!proc) throw new RpcError('NOT_FOUND', `Procedure '${name}' not found`, 404)

    const ctx: RpcContext = this.contextFactory ? await this.contextFactory() : { meta: {} }

    for (const mw of this.middleware) {
      await mw(name, input, ctx)
    }

    let validatedInput = input
    if (proc.input) {
      const result = (proc.input as Schema<any>).safeParse(input)
      if (!result.success) {
        throw new RpcError('VALIDATION_ERROR', result.error || 'Invalid input', 422, result.error)
      }
      validatedInput = result.data
    }

    const output = await proc.handler(validatedInput, ctx)

    if (proc.output) {
      const result = (proc.output as Schema<any>).safeParse(output)
      if (!result.success) {
        throw new RpcError('VALIDATION_ERROR', 'Invalid output from server', 500)
      }
      return result.data as InferRpcOutput<T>[K]
    }

    return output as InferRpcOutput<T>[K]
  }

  toHandler(): (req: any, res: any) => Promise<void> {
    return async (req, res) => {
      try {
        const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
        const { procedure, input } = body
        const output = await this.call(procedure, input)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, data: output }))
      } catch (err) {
        if (err instanceof RpcError) {
          res.writeHead(err.status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            success: false,
            error: { code: err.code, message: err.message, details: err.details }
          }))
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: { code: 'INTERNAL', message: 'Internal server error' } }))
        }
      }
    }
  }
}

export function rpc<T extends RpcDefinitions>(options: RpcServerOptions<T>): RpcServer<T> {
  return new RpcServer(options)
}
