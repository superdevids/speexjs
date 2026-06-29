import { existsSync, readFileSync, watch } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'
import { colors } from '../../native/colors.js'
import { logger } from '../../native/logger.js'
// HMR uses dynamic import of 'ws' - graceful fallback if unavailable

interface ServeOptions {
  port?: string | number
  host?: string
  dev?: string | boolean
  docs?: boolean
}

type ProcessState = 'idle' | 'starting' | 'running' | 'stopped' | 'restarting'

export async function serve(options: Record<string, any>): Promise<void> {
  const opts: ServeOptions = {
    port: options.port || options.p || 3000,
    host: options.host || options.H || 'localhost',
    dev: options.dev !== false,
    docs: !!options.docs,
  }

  const host = String(opts.host)

  async function findPort(start: number): Promise<number> {
    if (start > 65535) {
      console.error('No available ports')
      process.exit(1)
    }
    return new Promise((resolve) => {
      const server = createNetServer()
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

  if (opts.docs) {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const docsPath = resolve(__dirname, '../../docs/index.html')
    if (!existsSync(docsPath)) {
      console.error(colors.red('Documentation not found. Ensure docs/index.html exists in the speexjs package.'))
      process.exit(1)
    }
    const html = readFileSync(docsPath, 'utf-8')
    createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
    }).listen(port, host, () => {
      console.log()
      console.log(`  ${colors.bold('SpeexJS')} ${colors.green('docs')}`)
      console.log(`  ${colors.dim('→')}  ${colors.cyan(`http://${host}:${port}`)}`)
      console.log()
    })
    return
  }

  const serverEntry = resolve(process.cwd(), 'src/app.ts')
  const serverEntryAlt = resolve(process.cwd(), 'src/server/index.ts')
  const serverEntryIndex = resolve(process.cwd(), 'src/index.ts')

  let entryPath: string | null = null
  if (existsSync(serverEntry)) entryPath = serverEntry
  else if (existsSync(serverEntryAlt)) entryPath = serverEntryAlt
  else if (existsSync(serverEntryIndex)) entryPath = serverEntryIndex

  if (!entryPath) {
    console.error(colors.red('Entry point not found. Create src/app.ts or src/index.ts'))
    process.exit(1)
  }

  // ── Child process state machine ─────────────────────────
  let currentChild: ChildProcess | null = null
  let currentChildId = 0
  let state: ProcessState = 'idle'
  let restartCount = 0
  let startupTimer: ReturnType<typeof setTimeout> | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function clearStartupTimer(): void {
    if (startupTimer !== null) {
      clearTimeout(startupTimer)
      startupTimer = null
    }
  }

  function startChild(): ChildProcess {
    clearStartupTimer()

    const childId = ++currentChildId
    state = 'starting'
    restartCount = 0

    const childProcess = spawn('npx', ['tsx', entryPath!], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
    }) as ChildProcess
    currentChild = childProcess

    childProcess.on('exit', (code) => {
      if (childId !== currentChildId) return

      clearStartupTimer()
      currentChild = null

      if (code === 0) {
        state = 'stopped'
        return
      }

      // Non-dev mode: hard exit (original behavior)
      if (!opts.dev) {
        console.error(`Child process exited with code ${code}`)
        process.exit(code ?? 1)
        return
      }

      // ── Dev mode: graceful handling ──────────────────────
      if (state === 'starting' || state === 'restarting') {
        console.log(`\n  ${colors.yellow('⚠')}  Compilation error (process exited with code ${code})`)
        console.log(`  ${colors.yellow('⚠')}  Fix the error and save again — watcher is still running...`)
        state = 'stopped'
        return
      }

      if (state === 'running') {
        console.log(`\n  ${colors.red('✖')}  Process crashed unexpectedly (exit code ${code})`)
        if (restartCount < 3) {
          restartCount++
          console.log(`  ${colors.cyan('🔄')}  Auto-restarting in 1s (attempt ${restartCount}/3)...`)
          setTimeout(() => startChild(), 1000)
        } else {
          console.log(`  ${colors.red('✖')}  Max restart attempts reached. Waiting for file changes...`)
          state = 'stopped'
        }
        return
      }

      state = 'stopped'
    })

    childProcess.on('error', (err) => {
      if (childId !== currentChildId) return
      clearStartupTimer()
      currentChild = null
      console.error(`${colors.red('✖')}  Failed to start: ${err.message}`)
      process.exit(1)
    })

    // Startup verification: mark as 'running' only after 500ms of successful operation
    startupTimer = setTimeout(() => {
      startupTimer = null
      if (childId === currentChildId && childProcess.exitCode === null) {
        state = 'running'
        restartCount = 0
      }
    }, 500)

    return childProcess
  }

  // ── HMR WebSocket server (signals browser to reload) ────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hmrServer: any = null

  function sendHmrReload(): void {
    if (hmrServer) {
      const msg = JSON.stringify({ type: 'reload' })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      for (const client of hmrServer.clients as Set<{ readyState: number; send: (msg: string) => void }>) {
        if (client.readyState === 1) {
          client.send(msg)
        }
      }
    }
  }

  // ── Debounced restart scheduler (300ms) ─────────────────
  function scheduleRestart(filename: string): void {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      sendHmrReload()
      console.log(`\n${colors.cyan('🔄')}  File changed: ${filename} — Restarting...`)

      currentChildId++
      state = 'restarting'

      if (currentChild !== null) {
        currentChild.kill()
        currentChild = null
      }

      startChild()
    }, 300)
  }

  // ── HMR + File watching for dev ─────────────────────────
  if (opts.dev) {
    logger.info(`Development server starting at ${colors.cyan(`http://${host}:${port}`)}`)

    // Start HMR WebSocket server (requires optional 'ws' package)
    try {
      // @ts-expect-error - ws is optional; falls back gracefully if not installed
      const { WebSocketServer } = await import('ws')
      const hmrPort = port + 1
      hmrServer = new WebSocketServer({ port: hmrPort }) as any
      console.log(`  ${colors.dim('📡 HMR WebSocket at')} ${colors.cyan(`ws://${host}:${hmrPort}`)}`)
    } catch {
      /* ws not available — HMR client reload disabled */
    }

    const srcDir = resolve(process.cwd(), 'src')
    try {
      watch(srcDir, { recursive: true }, (_eventType, filename) => {
        if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx'))) {
          scheduleRestart(filename)
        }
      })
      console.log(`  ${colors.dim('📁 Watching src/ for changes...')}`)
    } catch {
      /* watch not available */
    }
  }

  startChild()
}
