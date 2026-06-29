import { readdirSync } from 'node:fs'
import { join, extname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Router } from './index.js'

export async function registerFileRoutes(router: Router, routesDir: string): Promise<void> {
  const absDir = resolve(routesDir)

  function isWithinPagesDir(target: string): boolean {
    return resolve(target).startsWith(absDir + (absDir.endsWith('/') ? '' : '/'))
  }

  async function walk(dir: string): Promise<void> {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (!isWithinPagesDir(full)) continue

      if (entry.isDirectory()) {
        await walk(full)
        continue
      }

      const ext = extname(entry.name)
      if (ext !== '.ts' && ext !== '.tsx' && ext !== '.js' && ext !== '.jsx') continue

      const routePath =
        '/' +
        relative(absDir, full)
          .replace(/\\/g, '/')
          .replace(/\.[jt]sx?$/, '')
          .replace(/\/index$/, '')
          .replace(/\/?$/, '')
          .replace(/\[(\w+)\]/g, ':$1')

      try {
        const mod = await import(pathToFileURL(full).href)
        // Support both named exports and default export with handler methods
        const handlers = mod.default ?? mod
        if (typeof handlers.get === 'function') router.get(routePath, handlers.get)
        if (typeof handlers.post === 'function') router.post(routePath, handlers.post)
        if (typeof handlers.put === 'function') router.put(routePath, handlers.put)
        if (typeof handlers.patch === 'function') router.patch(routePath, handlers.patch)
        if (typeof handlers.del === 'function') router.delete(routePath, handlers.del)
      } catch (err) {
        console.warn(`[file-routing] Skipping ${full}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  await walk(absDir)
}
