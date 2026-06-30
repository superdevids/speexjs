import { revalidateOnDemand, getCachedPage, loadCacheManifest } from '../../cli/commands/build.js'

interface IsrConfig {
  secret?: string
  outDir?: string
  app?: any
}

export function createRevalidateHandler(config: IsrConfig) {
  return async (ctx: any) => {
    const { request, response } = ctx

    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed. Use POST.' })
      return
    }

    const path = request.query.path as string | undefined
    if (!path) {
      response.status(400).json({ error: 'Missing "path" query parameter' })
      return
    }

    const providedSecret = request.headers.get('x-revalidate-secret')
    if (config.secret && providedSecret !== config.secret) {
      response.status(401).json({ error: 'Invalid revalidation secret' })
      return
    }

    const outDir = config.outDir ?? 'dist'
    const app = config.app

    if (!app) {
      response.status(500).json({ error: 'No app instance provided for revalidation' })
      return
    }

    try {
      const success = await revalidateOnDemand(app, outDir, path)
      if (success) {
        response.json({ revalidated: true, path })
      } else {
        response.status(404).json({ error: `Path "${path}" not found or revalidation failed` })
      }
    } catch (err: any) {
      response.status(500).json({ error: err.message })
    }
  }
}

export function staleWhileRevalidateMiddleware(config: IsrConfig) {
  const outDir = config.outDir ?? 'dist'
  loadCacheManifest(outDir)

  return async (ctx: any, next: () => Promise<void>) => {
    const { request, response } = ctx
    const path = request.path

    const cached = getCachedPage(outDir, path)
    if (cached) {
      response.setHeader('x-cache', cached.stale ? 'STALE' : 'HIT')
      response.setHeader('x-cache-stale', cached.stale ? 'true' : 'false')

      if (cached.stale && config.app) {
        response.setHeader('x-cache-revalidating', 'true')
        revalidateOnDemand(config.app, outDir, path).catch(() => {})
      }

      response.type('text/html; charset=utf-8').send(cached.html)
      return
    }

    await next()

    if (response.statusCode >= 200 && response.statusCode < 300) {
      const body = response.body
      if (body) {
        const entry = {
          path,
          filePath: '',
          generatedAt: new Date().toISOString(),
          revalidateAfter: null,
          size: typeof body === 'string' ? body.length : body.toString().length,
          params: {},
        }
        const { saveCacheManifest } = await import('../../cli/commands/build.js')
        const manifest = loadCacheManifest(outDir)
        const existingIdx = manifest.pages.findIndex((p) => p.path === path)
        if (existingIdx >= 0) {
          manifest.pages[existingIdx] = entry
        } else {
          manifest.pages.push(entry)
        }
        saveCacheManifest(outDir)
      }
    }
  }
}
