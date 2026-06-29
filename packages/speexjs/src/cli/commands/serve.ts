import { existsSync, readFileSync, watch } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { spawn } from 'node:child_process'
import { colors } from '../../native/colors.js'
import { logger } from '../../native/logger.js'

interface ServeOptions {
  port?: string | number
  host?: string
  dev?: string | boolean
  docs?: boolean
}

export async function serve(options: Record<string, any>): Promise<void> {
  const opts: ServeOptions = {
    port: options.port || options.p || 3000,
    host: options.host || options.H || 'localhost',
    dev: options.dev !== false,
    docs: !!options.docs,
  }

  const host = String(opts.host)

  async function findPort(start: number): Promise<number> {
    if (start > 65535) { console.error('No available ports'); process.exit(1) }
    return new Promise((resolve) => {
      const server = createNetServer()
      server.on('error', () => { server.close(); resolve(findPort(start + 1)) })
      server.listen(start, () => { server.close(); resolve(start) })
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
    console.error(
      colors.red(
        'Entry point not found. Create src/app.ts or src/index.ts',
      ),
    )
    process.exit(1)
  }

  // ── Spawn child process with tsx ─────────────────────────
  let child: any
  let restarting = false

  const startChild = () => {
    const childProcess = spawn('npx', ['tsx', entryPath], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
    })
    childProcess.on('exit', (code) => {
      if (code !== null && code !== 0 && !restarting) {
        console.error(`Child process exited with code ${code}`)
        process.exit(code)
      }
    })
    childProcess.on('error', (err) => {
      if (!restarting) {
        console.error(`Failed to start: ${err.message}`)
        process.exit(1)
      }
    })
    return childProcess
  }

  if (opts.dev) {
    logger.info(
      `Development server starting at ${colors.cyan(`http://${host}:${port}`)}`,
    )
  }

  // ── File watching for dev ──────────────────────────────
  if (opts.dev) {
    const srcDir = resolve(process.cwd(), 'src')
    try {
      watch(srcDir, { recursive: true }, (_eventType, filename) => {
        if (filename && (filename.endsWith('.ts') || filename.endsWith('.tsx'))) {
          console.log(`\n🔄 File changed: ${filename}. Restarting...`)
          restarting = true
          child.kill()
          child = startChild()
          restarting = false
        }
      })
      console.log(`  ${colors.dim('📁 Watching src/ for changes...')}`)
    } catch { /* watch not available */ }
  }

  child = startChild()
}
