import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'
import { logger } from '../../native/logger.js'

interface ServeOptions {
  port?: string | number
  host?: string
  dev?: string | boolean
}

export async function serve(options: Record<string, any>): Promise<void> {
  const opts: ServeOptions = {
    port: options.port || options.p || 3000,
    host: options.host || options.H || 'localhost',
    dev: options.dev !== false,
  }

  const port = parseInt(String(opts.port), 10)
  const host = String(opts.host)

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
        'Tidak ditemukan file entry point. Buat src/app.ts atau src/index.ts',
      ),
    )
    process.exit(1)
  }

  if (opts.dev) {
    logger.info(
      `Development server starting at ${colors.cyan(`http://${host}:${port}`)}`,
    )

    try {
      const { app } = await import(entryPath)

      if (!app || typeof app.listen !== 'function') {
        console.error(
          colors.red(
            'Entry point harus export { app } dengan method .listen()',
          ),
        )
        process.exit(1)
      }

      app.listen(port, host, () => {
        console.log()
        console.log(`  ${colors.bold('SpeexJS')} ${colors.green('running')}`)
        console.log(`  ${colors.dim('→')}  ${colors.cyan(`http://${host}:${port}`)}`)
        console.log()
      })
    } catch (err: any) {
      console.error(colors.red(`Gagal menjalankan server: ${err.message}`))
      process.exit(1)
    }
  } else {
    try {
      const { app } = await import(entryPath)

      if (!app || typeof app.listen !== 'function') {
        console.error(
          colors.red(
            'Entry point harus export { app } dengan method .listen()',
          ),
        )
        process.exit(1)
      }

      app.listen(port, host, () => {
        console.log()
        console.log(`  ${colors.bold('SpeexJS')} ${colors.green('running')}`)
        console.log(`  ${colors.dim('→')}  ${colors.cyan(`http://${host}:${port}`)}`)
        console.log()
      })
    } catch (err: any) {
      console.error(colors.red(`Gagal menjalankan server: ${err.message}`))
      process.exit(1)
    }
  }
}
