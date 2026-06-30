import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { colors } from '../../native/colors.js'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'

interface BuildOptions {
  ssg?: boolean
  outDir?: string
  isr?: boolean
  revalidate?: number
}

interface CacheManifest {
  version: string
  generatedAt: string
  pages: CachePageEntry[]
}

interface CachePageEntry {
  path: string
  filePath: string
  generatedAt: string
  revalidateAfter: number | null
  size: number
  params: Record<string, string>
}

let cacheManifest: CacheManifest = { version: '1', generatedAt: '', pages: [] }
const CACHE_MANIFEST_FILE = 'cache-manifest.json'

export function loadCacheManifest(outDir: string): CacheManifest {
  const manifestPath = resolve(process.cwd(), outDir, CACHE_MANIFEST_FILE)
  if (existsSync(manifestPath)) {
    try {
      const raw = readFileSync(manifestPath, 'utf-8')
      cacheManifest = JSON.parse(raw) as CacheManifest
    } catch {
      /* ignore */
    }
  }
  return cacheManifest
}

export function saveCacheManifest(outDir: string): void {
  cacheManifest.generatedAt = new Date().toISOString()
  const manifestPath = resolve(process.cwd(), outDir, CACHE_MANIFEST_FILE)
  writeFileSync(manifestPath, JSON.stringify(cacheManifest, null, 2), 'utf-8')
}

export function getCachedPage(outDir: string, path: string): { html: string; stale: boolean } | null {
  const page = cacheManifest.pages.find((p) => p.path === path)
  if (!page) return null

  const fullPath = resolve(process.cwd(), outDir, 'public', page.filePath.replace(`${outDir}/public/`, ''))
  if (!existsSync(fullPath)) return null

  const html = readFileSync(fullPath, 'utf-8')
  const stale = page.revalidateAfter !== null && Date.now() > page.revalidateAfter
  return { html, stale }
}

export function revalidatePage(outDir: string, path: string): boolean {
  const index = cacheManifest.pages.findIndex((p) => p.path === path)
  if (index === -1) return false
  cacheManifest.pages.splice(index, 1)
  const filePath = routeToFilePath(path, outDir)
  const fullPath = resolve(process.cwd(), filePath)
  if (existsSync(fullPath)) {
    try {
      unlinkSync(fullPath)
    } catch {}
  }
  saveCacheManifest(outDir)
  return true
}

export async function revalidateOnDemand(app: any, outDir: string, path: string, revalidate?: number): Promise<boolean> {
  const filePath = routeToFilePath(path, outDir)
  const fullDir = resolve(process.cwd(), filePath, '..')
  mkdirSync(fullDir, { recursive: true })

  const html = await renderRouteHtml(app, path, {})
  if (html === null) return false

  writeFileSync(resolve(process.cwd(), filePath), html, 'utf-8')

  const existingIdx = cacheManifest.pages.findIndex((p) => p.path === path)
  const entry: CachePageEntry = {
    path,
    filePath,
    generatedAt: new Date().toISOString(),
    revalidateAfter: revalidate ? Date.now() + revalidate * 1000 : null,
    size: Buffer.byteLength(html, 'utf-8'),
    params: {},
  }

  if (existingIdx >= 0) {
    cacheManifest.pages[existingIdx] = entry
  } else {
    cacheManifest.pages.push(entry)
  }
  saveCacheManifest(outDir)

  const relPath = relative(process.cwd(), filePath)
  console.log(`  ${colors.green('✓')} Revalidated ${relPath} (${formatBytes(entry.size)})`)
  return true
}

export async function build(options?: BuildOptions): Promise<void> {
  const isSsg = options?.ssg === true
  const isIsr = options?.isr === true || (options?.revalidate ?? 0) > 0
  const outDir = options?.outDir ?? 'dist'
  const revalidate = options?.revalidate ?? 60

  if (!isSsg && !isIsr) {
    await compileWithTsc()
    return
  }

  console.log(`  ${colors.cyan('→')} Building with tsc...`)
  await compileWithTsc()

  console.log(`  ${colors.cyan('→')} Starting SSG${isIsr ? ' with ISR' : ''}...`)
  await generateStaticSite(outDir, isIsr, revalidate)
  console.log(`  ${colors.green('✓')} SSG complete — files written to ${outDir}/public/`)
}

async function compileWithTsc(): Promise<void> {
  try {
    execSync('tsc', { stdio: 'inherit', cwd: process.cwd() })
    console.log(`  ${colors.green('✓')} TypeScript build complete`)
  } catch {
    console.error(`  ${colors.red('✗')} TypeScript build failed`)
    process.exit(1)
  }
}

interface StaticRoute {
  path: string
  filePath: string
  params: Record<string, string>
}

export async function generateStaticSite(outDir: string, isIsr = false, revalidate = 60): Promise<void> {
  const app = await loadUserApp()
  if (app === null) {
    console.error(`  ${colors.red('✗')} Could not find app export in compiled output`)
    console.log(`    Expected 'dist/index.js' or 'dist/app.js' to export 'app' or a default export`)
    process.exit(1)
  }

  const router = app.router
  if (router === undefined) {
    console.error(`  ${colors.red('✗')} Loaded app has no router`)
    process.exit(1)
  }

  loadCacheManifest(outDir)

  const allRoutes = router.getRoutes()
  const getRoutes = allRoutes.filter((r: any) => Array.isArray(r.methods) && r.methods.includes('GET'))
  const nonInternal = getRoutes.filter((r: any) => !r.path.startsWith('/_'))

  if (nonInternal.length === 0) {
    console.log(`  ${colors.yellow('!')} No GET routes found to generate`)
    return
  }

  const staticRoutes: StaticRoute[] = []

  for (const route of nonInternal) {
    const path = route.path as string

    if (path.includes(':')) {
      const paramsList = await getGenerateStaticParams(route)
      if (paramsList === null || paramsList.length === 0) {
        console.log(`  ${colors.yellow('!')} Skipping dynamic route ${path} (no generateStaticParams)`)
        continue
      }
      for (const params of paramsList) {
        const filledPath = fillRouteParams(path, params)
        staticRoutes.push({ path: filledPath, filePath: routeToFilePath(filledPath, outDir), params })
      }
    } else {
      staticRoutes.push({ path, filePath: routeToFilePath(path, outDir), params: {} })
    }
  }

  for (const sr of staticRoutes) {
    const fullDir = resolve(process.cwd(), sr.filePath, '..')
    mkdirSync(fullDir, { recursive: true })

    const existing = isIsr ? cacheManifest.pages.find((p) => p.path === sr.path) : undefined
    if (existing && existing.revalidateAfter !== null && Date.now() < existing.revalidateAfter) {
      const relPath = relative(process.cwd(), sr.filePath)
      console.log(`  ${colors.dim('·')} ${relPath} (cached, revalidates at ${new Date(existing.revalidateAfter).toISOString()})`)
      continue
    }

    const html = await renderRouteHtml(app, sr.path, sr.params)
    if (html === null) continue

    writeFileSync(resolve(process.cwd(), sr.filePath), html, 'utf-8')

    const entry: CachePageEntry = {
      path: sr.path,
      filePath: sr.filePath,
      generatedAt: new Date().toISOString(),
      revalidateAfter: isIsr ? Date.now() + revalidate * 1000 : null,
      size: Buffer.byteLength(html, 'utf-8'),
      params: sr.params,
    }

    const existingIdx = cacheManifest.pages.findIndex((p) => p.path === sr.path)
    if (existingIdx >= 0) {
      cacheManifest.pages[existingIdx] = entry
    } else {
      cacheManifest.pages.push(entry)
    }

    const relPath = relative(process.cwd(), sr.filePath)
    console.log(`  ${colors.green('✓')} ${relPath} (${formatBytes(Buffer.byteLength(html, 'utf-8'))})`)
  }

  saveCacheManifest(outDir)
}

async function loadUserApp(): Promise<any> {
  const cwd = process.cwd()
  const candidates = [
    resolve(cwd, 'dist/index.js'),
    resolve(cwd, 'dist/app.js'),
    resolve(cwd, 'dist/server/index.js'),
    resolve(cwd, 'dist/src/index.js'),
    resolve(cwd, 'dist/src/app.js'),
  ]

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    try {
      const mod = await import(`file://${candidate.replace(/\\/g, '/')}`)
      const app = mod.default ?? mod.app
      if (app !== undefined && app.router !== undefined) {
        return app
      }
    } catch {
      continue
    }
  }

  return null
}

async function getGenerateStaticParams(route: any): Promise<Record<string, string>[] | null> {
  const handler = route.handler as Function | undefined
  if (handler === undefined) return null

  const fnStr = handler.toString()
  const modPathMatch = fnStr.match(/require\("(.+?)"\)/) || fnStr.match(/import\("(.+?)"\)/)
  if (modPathMatch === null) return null

  try {
    const mod = await import(modPathMatch[1]!)
    if (typeof mod.generateStaticParams === 'function') {
      const result = await mod.generateStaticParams()
      return result as Record<string, string>[]
    }
  } catch {}

  return null
}

function fillRouteParams(path: string, params: Record<string, string>): string {
  let result = path
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(value))
  }
  return result
}

function routeToFilePath(routePath: string, outDir: string): string {
  let clean = routePath.replace(/\/$/, '')
  if (clean === '' || clean.startsWith('/')) {
    clean = clean.slice(1)
  }
  if (clean === '') {
    return `${outDir}/public/index.html`
  }
  return `${outDir}/public/${clean}/index.html`
}

export async function renderRouteHtml(app: any, path: string, params: Record<string, string>): Promise<string | null> {
  const socket = new Socket()
  const msg = new IncomingMessage(socket)
  msg.method = 'GET'
  msg.url = path
  msg.headers = { host: 'localhost', accept: 'text/html' }

  let bodyBuffer = ''
  const nodeRes = new ServerResponse(msg as any)
  const origEnd = nodeRes.end.bind(nodeRes)
  nodeRes.end = function (this: ServerResponse, data?: any): ServerResponse {
    if (data !== undefined && data !== null) {
      bodyBuffer = data.toString()
    }
    return origEnd(data)
  } as any

  const { SuperRequest } = await import('../../server/http/request.js')
  const { SuperResponse } = await import('../../server/http/response.js')
  const req = new SuperRequest(msg as any)
  req.params = params
  const res = new SuperResponse(nodeRes as any)

  try {
    await app.handleRequest(req, res)
    if (!res.headersSent) {
      await res.flush()
    }
  } catch {
    return null
  }

  if (bodyBuffer.length === 0) {
    return null
  }

  return bodyBuffer
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
