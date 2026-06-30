import { randomUUID } from 'node:crypto'

export function requestId(ctx: any, next: () => Promise<void>): Promise<void> {
  const id = ctx.request.headers.get('x-request-id') ?? randomUUID()
  ctx.requestId = id
  ctx.response.header('x-request-id', id)
  return next()
}

export function autoResolve(container: any, target: any): any {
  if (typeof target !== 'function') return target
  const paramNames = target.toString()
    .replace(/[/][*].*?[*][/]/gs, '')
    .replace(/\s+/g, '')
    .match(/constructor\s*[^)]*\(\s*([^)]*)\)/)?.[1]
    ?.split(',').map((p: string) => p.trim()).filter(Boolean) ?? []

  const args = paramNames.map((name: string) => {
    try { return container.resolve(name) } catch { return undefined }
  })
  return new target(...args)
}
