import { existsSync, readFileSync, watch } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { spawn, type ChildProcess } from 'node:child_process'
import { colors } from '../../native/colors.js'
import { logger } from '../../native/logger.js'

interface ServeOptions {
  port?: string | number
  host?: string
  dev?: string | boolean
  docs?: boolean
  production?: boolean
  hmr?: boolean
}

type ProcessState = 'idle' | 'starting' | 'running' | 'stopped' | 'restarting'

// ─── HMR 2.0 — Selective Reload Engine ─────────────────────────

enum ChangeType {
  ROUTE = 'route',
  CONTROLLER = 'controller',
  MIDDLEWARE = 'middleware',
  MODEL = 'model',
  VIEW = 'view',
  CONFIG = 'config',
  MIGRATION = 'migration',
  OTHER = 'other',
}

interface HmrStats {
  totalReloads: number
  selectiveReloads: number
  fullRestarts: number
  lastReloadTime: number
  averageReloadTime: number
}

const ROUTE_PATTERNS = [/routes[/\\]/, /router\.ts$/]
const CONTROLLER_PATTERNS = [/controllers[/\\]/, /controller\.ts$/]
const MIDDLEWARE_PATTERNS = [/middleware[/\\]/, /middleware\.ts$/]
const MODEL_PATTERNS = [/models[/\\]/, /model\.ts$/]
const VIEW_PATTERNS = [/views[/\\]/, /\.tsx$/]
const CONFIG_PATTERNS = [/speexjs\.config\./, /\.env/]
const MIGRATION_PATTERNS = [/migrations[/\\]/, /migration\.ts$/]

function classifyChange(filePath: string): ChangeType {
  const normalized = filePath.replace(/\\/g, '/')
  for (const pattern of ROUTE_PATTERNS) {
    if (pattern.test(normalized)) return ChangeType.ROUTE
  }
  for (const pattern of CONTROLLER_PATTERNS) {
    if (pattern.test(normalized)) return ChangeType.CONTROLLER
  }
  for (const pattern of MIDDLEWARE_PATTERNS) {
    if (pattern.test(normalized)) return ChangeType.MIDDLEWARE
  }
  for (const pattern of MODEL_PATTERNS) {
    if (pattern.test(normalized)) return ChangeType.MODEL
  }
  for (const pattern of VIEW_PATTERNS) {
    if (pattern.test(normalized)) return ChangeType.VIEW
  }
  for (const pattern of CONFIG_PATTERNS) {
    if (pattern.test(normalized)) return ChangeType.CONFIG
  }
  for (const pattern of MIGRATION_PATTERNS) {
    if (pattern.test(normalized)) return ChangeType.MIGRATION
  }
  return ChangeType.OTHER
}

class HmrEngine {
  private process: ChildProcess | null = null
  private state: ProcessState = 'idle'
  private stats: HmrStats = { totalReloads: 0, selectiveReloads: 0, fullRestarts: 0, lastReloadTime: 0, averageReloadTime: 0 }
  private moduleCache: Map<string, { mtime: number }> = new Map()
  private watchTimers: Map<string, NodeJS.Timeout> = new Map()
  private debounceMs = 300
  private port: number
  private host: string
  private serverEntry: string
  private onRestart?: () => void

  constructor(port: number, host: string, serverEntry: string) {
    this.port = port
    this.host = host
    this.serverEntry = serverEntry
  }

  onBeforeRestart(cb: () => void): void {
    this.onRestart = cb
  }

  private getReloadMessage(type: ChangeType): string {
    const messages: Record<ChangeType, string> = {
      [ChangeType.ROUTE]: `[HMR] Route change detected — reloading route registry`,
      [ChangeType.CONTROLLER]: `[HMR] Controller change detected — reloading module`,
      [ChangeType.MIDDLEWARE]: `[HMR] Middleware change detected — reloading pipeline`,
      [ChangeType.MODEL]: `[HMR] Model change detected — no reload needed (lazy-loaded)`,
      [ChangeType.VIEW]: `[HMR] View/TSX change detected — reloading view cache`,
      [ChangeType.CONFIG]: `[HMR] Config change detected — full restart required`,
      [ChangeType.MIGRATION]: `[HMR] Migration change detected — auto-running pending migrations`,
      [ChangeType.OTHER]: `[HMR] File change detected — selective reload`,
    }
    return messages[type]
  }

  private getReloadAction(type: ChangeType): 'selective' | 'full-restart' | 'none' {
    switch (type) {
      case ChangeType.ROUTE:
      case ChangeType.CONTROLLER:
      case ChangeType.MIDDLEWARE:
      case ChangeType.VIEW:
      case ChangeType.OTHER:
        return 'selective'
      case ChangeType.CONFIG:
        return 'full-restart'
      case ChangeType.MODEL:
        return 'none'
      case ChangeType.MIGRATION:
        return 'selective'
    }
  }

  async handleChange(filePath: string): Promise<void> {
    const changeType = classifyChange(filePath)
    const action = this.getReloadAction(changeType)
    const message = this.getReloadMessage(changeType)

    console.log(`\n  ${colors.cyan(message)}`)
    console.log(`  ${colors.dim(`  File: ${filePath}`)}`)
    console.log(`  ${colors.dim(`  Action: ${action}`)}`)
    console.log()

    const startTime = Date.now()

    switch (action) {
      case 'selective': {
        const cacheKey = resolve(filePath)
        this.moduleCache.set(cacheKey, { mtime: Date.now() })
        await this.restartProcess()
        this.stats.selectiveReloads++
        const duration = Date.now() - startTime
        console.log(`  ${colors.green(`✅ [HMR] Reloaded in ${duration}ms`)}`)
        break
      }
      case 'full-restart': {
        await this.restartProcess()
        this.stats.fullRestarts++
        const duration = Date.now() - startTime
        console.log(`  ${colors.green(`✅ [HMR] Full restart completed in ${duration}ms`)}`)
        break
      }
      case 'none': {
        console.log(`  ${colors.dim(`  ℹ️  No reload needed — ${changeType} modules are lazy-loaded`)}`)
        break
      }
    }

    this.stats.totalReloads++
    this.stats.lastReloadTime = Date.now() - startTime
    this.stats.averageReloadTime = this.stats.averageReloadTime === 0
      ? Date.now() - startTime
      : (this.stats.averageReloadTime + (Date.now() - startTime)) / 2
  }

  private async restartProcess(): Promise<void> {
    this.state = 'restarting'
    this.onRestart?.()

    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM')
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.log(`  ${colors.yellow('⚠')} Process did not exit gracefully, force killing...`)
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL')
          }
          resolve()
        }, 5000)

        if (this.process) {
          this.process.on('exit', () => {
            clearTimeout(timeout)
            resolve()
          })
        } else {
          clearTimeout(timeout)
          resolve()
        }
      })
    }

    await this.startProcess()
  }

  async startProcess(): Promise<void> {
    return new Promise((pmResolve, reject) => {
      this.state = 'starting'
      const tsxPath = resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')

      if (!existsSync(tsxPath)) {
        console.log(`  ${colors.cyan('→')} Starting server directly (tsx not found)...`)
        this.process = spawn('node', ['--loader', 'tsx', this.serverEntry], {
          env: { ...process.env, PORT: String(this.port), HOST: this.host },
          stdio: 'inherit',
          shell: true,
        })
      } else {
        this.process = spawn(tsxPath, ['watch', this.serverEntry], {
          env: { ...process.env, PORT: String(this.port), HOST: this.host },
          stdio: 'inherit',
          shell: true,
        })
      }

      this.process?.on('spawn', () => {
        this.state = 'running'
        console.log(`  ${colors.green(`✅ Server started on http://${this.host}:${this.port}`)}`)
        console.log(`  ${colors.dim('  HMR 2.0 active — selective reload enabled')}`)
        pmResolve()
      })

      this.process?.on('error', (err) => {
        this.state = 'stopped'
        console.error(`  ${colors.red(`✗ Failed to start server: ${err.message}`)}`)
        reject(err)
      })

      this.process?.on('exit', (code) => {
        if (this.state !== 'restarting') {
          this.state = 'stopped'
          if (code !== 0 && code !== null) {
            console.log(`  ${colors.yellow(`⚠ Server exited with code ${code}. Restarting...`)}`)
            this.restartProcess()
          }
        }
      })
    })
  }

  stop(): void {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM')
    }
    this.state = 'stopped'
  }

  getStats(): HmrStats {
    return { ...this.stats }
  }

  getState(): ProcessState {
    return this.state
  }
}

// ─── Main Serve Function ───────────────────────────────────────

export async function serve(options: Record<string, any>): Promise<void> {
  const isProduction = options.production === true || options.production === 'true' || process.env.NODE_ENV === 'production'
  const opts: ServeOptions = {
    port: options.port || options.p || 3000,
    host: options.host || options.H || 'localhost',
    dev: isProduction ? false : options.dev !== false,
    docs: !!options.docs,
    production: isProduction,
    hmr: options.hmr !== false,
  }

  const host = String(opts.host)

  async function findPort(start: number): Promise<number> {
    if (start > 65535) {
      console.error('No available ports')
      process.exit(1)
    }
    return new Promise((resolve) => {
      const server = createServer()
      server.on('error', () => {
        server.close()
        resolve(findPort(start + 1))
      })
      server.listen(start, () => {
        server.close()
        resolve(start)
      })
    })
  }

  const port = await findPort(parseInt(String(opts.port), 10))
  const serverEntry = resolve(process.cwd(), 'src', 'bootstrap.ts')

  console.log()
  console.log(`  ${colors.bold('SpeexJS Dev Server')} ${colors.dim('v2.1.0')}`)
  console.log(`  ${colors.dim('─'.repeat(40))}`)
  console.log()

  if (opts.production) {
    console.log(`  ${colors.cyan('→')} Starting in production mode...`)
    const prodServer = spawn('node', [resolve(process.cwd(), 'dist', 'index.js')], {
      env: { ...process.env, PORT: String(port), HOST: host, NODE_ENV: 'production' },
      stdio: 'inherit',
      shell: true,
    })
    prodServer.on('error', (err) => {
      console.error(`  ${colors.red(`✗ ${err.message}`)}`)
      process.exit(1)
    })
    prodServer.on('exit', (code) => {
      process.exit(code ?? 0)
    })
    return
  }

  // HMR 2.0 — Start with selective reload
  if (opts.hmr && !opts.production) {
    const hmr = new HmrEngine(port, host, serverEntry)

    await hmr.startProcess()

    const srcDir = resolve(process.cwd(), 'src')
    if (existsSync(srcDir)) {
      console.log(`  ${colors.cyan('→')} Watching for file changes in ${srcDir}...`)
      console.log()

      watch(srcDir, { recursive: true }, async (eventType, filename) => {
        if (!filename) return
        const ext = extname(filename)
        if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return
        if (filename.includes('node_modules')) return

        const fullPath = resolve(srcDir, filename)

        const existing = hmr['watchTimers'].get(fullPath)
        if (existing) clearTimeout(existing)

        const timer = setTimeout(async () => {
          hmr['watchTimers'].delete(fullPath)
          await hmr.handleChange(fullPath)
        }, hmr['debounceMs'])
        hmr['watchTimers'].set(fullPath, timer)
      })

      console.log(`  ${colors.dim(`  Server: http://${host}:${port}`)}`)
      console.log(`  ${colors.dim('  HMR:    Enabled (selective reload)')}`)
      console.log(`  ${colors.dim('  Watch:  ' + srcDir)}`)
      console.log()
    }

    const shutdown = () => {
      console.log(`\n  ${colors.yellow('⚠')} Shutting down...`)
      hmr.stop()
      process.exit(0)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    return
  }

  // Fallback: simple server start without HMR
  console.log(`  ${colors.cyan('→')} Starting without HMR...`)
  const server = spawn('node', ['--loader', 'tsx', serverEntry], {
    env: { ...process.env, PORT: String(port), HOST: host },
    stdio: 'inherit',
    shell: true,
  })

  server.on('error', (err) => {
    console.error(`  ${colors.red(`✗ ${err.message}`)}`)
    process.exit(1)
  })

  server.on('exit', (code) => {
    if (code !== 0) {
      console.error(`  ${colors.red(`✗ Server exited with code ${code}`)}`)
    }
    process.exit(code ?? 0)
  })

  console.log(`  ${colors.dim(`  Server: http://${host}:${port}`)}`)
  console.log()
}
