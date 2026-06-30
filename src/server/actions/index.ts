export type ActionHandler = (form: Record<string, unknown>, ctx: any) => Record<string, unknown> | Promise<Record<string, unknown>>

const actions = new Map<string, ActionHandler>()

export function defineAction(name: string, handler: ActionHandler): void {
  actions.set(name, handler)
}

export function getAction(name: string): ActionHandler | undefined {
  return actions.get(name)
}

export function actionsMiddleware() {
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.request.method === 'POST' && ctx.request.path.startsWith('/actions/')) {
      const actionName = ctx.request.path.slice(9)
      const handler = actions.get(actionName)
      if (!handler) { ctx.response.status(404).json({ error: 'Action not found' }); return }
      const form = await ctx.request.formData()
      const result = await handler(form, ctx)
      ctx.response.json(result)
      return
    }
    return next()
  }
}
