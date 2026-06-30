import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'
import { RouteProfiler, type ProfilerResult } from '../../server/profiler/index.js'

interface ProfileCommandOptions {
  samples?: number
  output?: string
  route?: string
  method?: string
  warmup?: boolean
}

/**
 * speexjs profile [--samples 100] [--output ./profile-report.html]
 * speexjs profile --route "GET /users" [--samples 50]
 */
export async function profileCommand(options: ProfileCommandOptions): Promise<void> {
  const samples = options.samples ?? 100
  const outputPath = options.output
  const routeFilter = options.route

  console.log()
  console.log(`  ${colors.bold('🏎️  SpeexJS Route Profiler')}`)
  console.log()

  // ── Load the user's application ──────────────────────────────
  const distIndex = resolve(process.cwd(), 'dist/index.js')
  const distApp = resolve(process.cwd(), 'dist/app.js')
  const distServer = resolve(process.cwd(), 'dist/server/index.js')

  let appPath: string | null = null
  if (existsSync(distApp)) appPath = distApp
  else if (existsSync(distIndex)) appPath = distIndex
  else if (existsSync(distServer)) appPath = distServer

  if (!appPath) {
    console.error(`  ${colors.red('✗')} No built app found in dist/`)
    console.log(`  ${colors.dim('→')}  Run ${colors.cyan('speexjs build')} first`)
    console.log()
    process.exit(1)
  }

  console.log(`  ${colors.dim('→')}  Loading app from ${colors.cyan(appPath)}`)

  let app: any
  try {
    const mod = await import(appPath)
    // Find the SuperApp instance — could be default export or named 'app'
    app = mod.default ?? mod.app ?? mod.speexjs ?? null

    // If it's a factory function, call it
    if (typeof app === 'function') {
      app = app()
    }

    if (!app || typeof app.router?.getRoutes !== 'function') {
      console.error(`  ${colors.red('✗')} Could not find a SpeexJS SuperApp instance in ${appPath}`)
      console.log(`  ${colors.dim('→')}  Ensure your app exports a SuperApp instance as default or named 'app'`)
      console.log()
      process.exit(1)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`  ${colors.red('✗')} Failed to load app: ${message}`)
    console.log()
    process.exit(1)
  }

  // ── Initialize profiler ──────────────────────────────────────
  const profiler = new RouteProfiler(app)
  const rawRoutes = app.router.getRoutes()

  if (rawRoutes.length === 0) {
    console.log(`  ${colors.yellow('!')} No routes registered.`)
    console.log()
    return
  }

  console.log(`  ${colors.dim('→')}  Found ${colors.bold(String(rawRoutes.length))} route${rawRoutes.length !== 1 ? 's' : ''}`)
  console.log(`  ${colors.dim('→')}  Sampling ${colors.bold(String(samples))} time${samples !== 1 ? 's' : ''} per route`)
  console.log()

  // ── Run profiling ────────────────────────────────────────────
  let results: ProfilerResult[]

  if (routeFilter) {
    // Parse "GET /users" format
    const parts = routeFilter.split(' ')
    const method = parts[0]?.toUpperCase() ?? 'GET'
    const path = parts.slice(1).join(' ') || '/'

    console.log(`  ${colors.cyan('→')}  Profiling single route: ${colors.bold(`${method} ${path}`)}`)

    try {
      const result = await profiler.profileRoute(method, path, samples)
      results = [result]
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  ${colors.red('✗')} ${message}`)
      console.log()
      process.exit(1)
    }
  } else {
    // Profile all routes
    console.log(`  ${colors.dim('Progress:')}`)

    results = await profiler.profileAll({ samples, warmup: options.warmup ?? true })

    process.stdout.write('\n')
  }

  // ── Display results ──────────────────────────────────────────
  displayResults(results)

  // ── Save report ──────────────────────────────────────────────
  if (outputPath) {
    const ext = outputPath.toLowerCase()
    if (ext.endsWith('.html')) {
      const html = profiler.generateHtmlReport(results)
      const fs = await import('node:fs')
      const dir = resolve(process.cwd(), dirname(outputPath))
      if (!existsSync(dir)) {
        const { mkdirSync } = await import('node:fs')
        mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(resolve(process.cwd(), outputPath), html, 'utf-8')
      console.log(`  ${colors.green('✓')} HTML report saved: ${colors.cyan(outputPath)}`)
    } else {
      profiler.saveReport(results, resolve(process.cwd(), outputPath))
      console.log(`  ${colors.green('✓')} JSON report saved: ${colors.cyan(outputPath)}`)
    }
  } else {
    // Default: save HTML report to profile-report.html
    const html = profiler.generateHtmlReport(results)
    const fs = await import('node:fs')
    fs.writeFileSync(resolve(process.cwd(), 'profile-report.html'), html, 'utf-8')
    console.log(`  ${colors.green('✓')} Report saved: ${colors.cyan('profile-report.html')}`)
  }

  console.log()
}

// ── Display helpers ───────────────────────────────────────────────

function displayResults(results: ProfilerResult[]): void {
  const sorted = [...results].sort((a, b) => b.avgMs - a.avgMs)

  console.log()
  console.log(`  ${colors.bold('📊 Results:')}`)
  console.log()

  // Header
  const hMethod = 'Method'.padEnd(8)
  const hRoute = 'Route'.padEnd(40)
  const hSamples = 'Samples'.padEnd(8)
  const hAvg = 'Avg'.padEnd(10)
  const hP50 = 'P50'.padEnd(10)
  const hP95 = 'P95'.padEnd(10)
  const hP99 = 'P99'.padEnd(10)
  const hMem = 'Memory Δ'
  console.log(
    `  ${colors.dim(hMethod)} ${colors.dim(hRoute)} ${colors.dim(hSamples)} ${colors.dim(hAvg)} ${colors.dim(hP50)} ${colors.dim(hP95)} ${colors.dim(hP99)} ${colors.dim(hMem)}`,
  )
  console.log(`  ${colors.dim('─'.repeat(110))}`)

  for (const r of sorted) {
    const methodColored = colorizeMethod(r.method, r.method.padEnd(6))
    const route = r.route.length > 38 ? r.route.slice(0, 35) + '...' : r.route.padEnd(40)
    const samples = String(r.samples).padEnd(8)
    const avg = colorLatency(r.avgMs, 10)
    const p50 = colorLatency(r.p50Ms, 10)
    const p95 = colorLatency(r.p95Ms, 10)
    const p99 = colorLatency(r.p99Ms, 10)
    const mem =
      r.memoryDelta >= 0
        ? colors.yellow(`+${(r.memoryDelta / 1024).toFixed(1)} KB`.padEnd(10))
        : colors.green(`${(r.memoryDelta / 1024).toFixed(1)} KB`.padEnd(10))

    console.log(`  ${methodColored} ${colors.gray(route)} ${samples} ${avg} ${p50} ${p95} ${p99} ${mem}`)
  }

  // Summary
  console.log()
  const fastCount = sorted.filter((r) => r.avgMs <= 200).length
  const mediumCount = sorted.filter((r) => r.avgMs > 200 && r.avgMs <= 500).length
  const slowCount = sorted.filter((r) => r.avgMs > 500).length

  console.log(`  ${colors.green(`✓ ${fastCount} fast`)}  ${colors.yellow(`⚠ ${mediumCount} medium`)}  ${colors.red(`✗ ${slowCount} slow`)}`)
  console.log()
}

function colorizeMethod(method: string, text: string): string {
  switch (method) {
    case 'GET':
      return colors.green(text)
    case 'POST':
      return colors.blue(text)
    case 'PUT':
    case 'PATCH':
      return colors.yellow(text)
    case 'DELETE':
      return colors.red(text)
    default:
      return colors.gray(text)
  }
}

function colorLatency(ms: number, pad: number = 10): string {
  const s = `${ms.toFixed(2)}ms`.padStart(pad)
  if (ms > 500) return colors.red(s)
  if (ms > 200) return colors.yellow(s)
  return colors.green(s)
}

function dirname(p: string): string {
  const idx = p.lastIndexOf('/')
  const idx2 = p.lastIndexOf('\\')
  const sep = idx > idx2 ? idx : idx2
  return sep >= 0 ? p.slice(0, sep) : '.'
}
