export type Resolver = (parent: unknown, args: Record<string, unknown>, ctx: unknown) => unknown

export type SubscriptionResolver = {
  subscribe: (args: Record<string, unknown>, ctx: unknown) => AsyncIterator<unknown>
  resolve?: (payload: unknown, args: Record<string, unknown>, ctx: unknown) => unknown
}

export class GraphQLSchema {
  private queryFields = new Map<string, { resolve: Resolver }>()
  private mutationFields = new Map<string, { resolve: Resolver }>()
  private subscriptionFields = new Map<string, SubscriptionResolver>()

  query(name: string, resolve: Resolver): this {
    this.queryFields.set(name, { resolve })
    return this
  }

  mutation(name: string, resolve: Resolver): this {
    this.mutationFields.set(name, { resolve })
    return this
  }

  subscription(name: string, resolver: SubscriptionResolver): this {
    this.subscriptionFields.set(name, resolver)
    return this
  }

  getSubscriptionField(name: string): SubscriptionResolver | undefined {
    return this.subscriptionFields.get(name)
  }

  hasSubscription(name: string): boolean {
    return this.subscriptionFields.has(name)
  }

  subscriptionNames(): string[] {
    return [...this.subscriptionFields.keys()]
  }

  async execute(query: string, ctx: unknown): Promise<Record<string, unknown>> {
    const opMatch = query.match(/(query|mutation)\s*\{(\w+)/)
    if (!opMatch) {
      const subMatch = query.match(/\{(\w+)/)
      if (!subMatch) return { errors: 'Invalid query' }
      const field: string = subMatch[1]!
      const resolver = this.queryFields.get(field)
      if (!resolver) return { errors: `Field "${field}" not found` }
      try {
        return { data: { [field]: await resolver.resolve(null, {}, ctx) } }
      } catch (e: any) {
        return { errors: e.message }
      }
    }
    const opType = opMatch[1]!
    const field: string = opMatch[2]!
    if (opType === 'mutation') {
      const resolver = this.mutationFields.get(field)
      if (!resolver) return { errors: `Mutation "${field}" not found` }
      try {
        return { data: { [field]: await resolver.resolve(null, {}, ctx) } }
      } catch (e: any) {
        return { errors: e.message }
      }
    }
    const resolver = this.queryFields.get(field)
    if (!resolver) return { errors: `Field "${field}" not found` }
    try {
      return { data: { [field]: await resolver.resolve(null, {}, ctx) } }
    } catch (e: any) {
      return { errors: e.message }
    }
  }
}

export function graphqlMiddleware(schema: GraphQLSchema) {
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.request.path === '/graphql' && ctx.request.method === 'POST') {
      const { query } = await ctx.request.json()
      const result = await schema.execute(query, ctx)
      ctx.response.json(result)
      return
    }
    return next()
  }
}
