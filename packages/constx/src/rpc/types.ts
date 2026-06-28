import type { Schema } from '../schema/index.js'

export interface RpcProcedure<TInput = unknown, TOutput = unknown> {
  input?: Schema<TInput>
  output?: Schema<TOutput>
  handler: (input: TInput, ctx: RpcContext) => TOutput | Promise<TOutput>
}

export interface RpcContext {
  userId?: string | number
  user?: unknown
  meta: Record<string, unknown>
}

export type RpcQuery<TInput, TOutput> = RpcProcedure<TInput, TOutput>
export type RpcMutation<TInput, TOutput> = RpcProcedure<TInput, TOutput>

export interface RpcDefinitions {
  [key: string]: RpcProcedure
}

export class RpcError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message)
    this.name = 'RpcError'
  }
}

export type InferRpcInput<T extends RpcDefinitions> = {
  [K in keyof T]: T[K] extends RpcProcedure<infer I, any> ? I : never
}

export type InferRpcOutput<T extends RpcDefinitions> = {
  [K in keyof T]: T[K] extends RpcProcedure<any, infer O> ? O : never
}
