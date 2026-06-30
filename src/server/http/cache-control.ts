export function cacheControl(maxAge: number, options?: { public?: boolean; private?: boolean; noCache?: boolean; noStore?: boolean; mustRevalidate?: boolean; staleWhileRevalidate?: number }) {
  return async (ctx: any, next: () => Promise<void>) => {
    await next()
    const directives: string[] = []
    if (options?.public) directives.push('public')
    if (options?.private) directives.push('private')
    if (options?.noCache) directives.push('no-cache')
    if (options?.noStore) directives.push('no-store')
    if (options?.mustRevalidate) directives.push('must-revalidate')
    if (maxAge > 0) directives.push(`max-age=${maxAge}`)
    if (options?.staleWhileRevalidate) directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
    ctx.response.header('cache-control', directives.join(', ') || 'no-cache')
  }
}
