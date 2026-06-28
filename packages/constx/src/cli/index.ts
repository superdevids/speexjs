#!/usr/bin/env node
import { parseArgs } from '../native/args.js'
import { colors } from '../native/colors.js'
import { initProject } from './commands/init.js'
import { makeController } from './commands/make-controller.js'
import { makeMiddleware } from './commands/make-middleware.js'
import { makeSchema } from './commands/make-schema.js'
import { listRoutes } from './commands/list-routes.js'
import { serve } from './commands/serve.js'

function showHelp(): void {
  console.log(`${colors.bold('ConstX')} ${colors.cyan('v0.2.0')}`)
  console.log('Fullstack JavaScript/TypeScript Framework')
  console.log()
  console.log(`${colors.bold('Usage:')}`)
  console.log('  ConstX init [name] [options]        Buat project baru')
  console.log('  ConstX make:controller <name>        Generate controller')
  console.log('  ConstX make:middleware <name>        Generate middleware')
  console.log('  ConstX make:schema <name>            Generate schema')
  console.log('  ConstX list-routes                   Lihat semua route')
  console.log('  ConstX serve [options]               Jalankan server')
  console.log('  ConstX --help                        Bantuan ini')
  console.log()
  console.log(`${colors.bold('Aliases:')}`)
  console.log('  ConstX -v, --version                 Lihat versi')
  console.log()
  console.log(`${colors.bold('Options:')}`)
  console.log('  --template <type>    blank, fullstack, api-only')
  console.log('  --frontend <fe>      super, react, vue')
  console.log('  --port <number>      Port server (default: 3000)')
  console.log('  --host <string>      Host address (default: localhost)')
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv)
  const command = parsed.command

  switch (command) {
    case 'init': {
      await initProject(parsed.args[0] || 'my-app', parsed.options)
      break
    }
    case 'make:controller': {
      if (!parsed.args[0]) {
        console.error(colors.red('Nama controller diperlukan'))
        console.log(`  ${colors.cyan('ConstX make:controller <name>')}`)
        process.exit(1)
      }
      await makeController(parsed.args[0])
      break
    }
    case 'make:middleware': {
      if (!parsed.args[0]) {
        console.error(colors.red('Nama middleware diperlukan'))
        console.log(`  ${colors.cyan('ConstX make:middleware <name>')}`)
        process.exit(1)
      }
      await makeMiddleware(parsed.args[0])
      break
    }
    case 'make:schema': {
      if (!parsed.args[0]) {
        console.error(colors.red('Nama schema diperlukan'))
        console.log(`  ${colors.cyan('ConstX make:schema <name>')}`)
        process.exit(1)
      }
      await makeSchema(parsed.args[0])
      break
    }
    case 'list-routes':
    case 'routes':
    case 'lr': {
      await listRoutes()
      break
    }
    case 'serve':
    case 'dev': {
      await serve(parsed.options)
      break
    }
    case 'help':
    case '--help':
    case '-h': {
      showHelp()
      break
    }
    case 'version':
    case '--version':
    case '-v': {
      console.log('ConstX v0.2.0')
      break
    }
    default: {
      if (command) {
        console.error(`${colors.red(`Command '${command}' tidak dikenal`)}`)
        console.log()
      }
      showHelp()
      if (command) process.exit(1)
    }
  }
}

main().catch(err => {
  console.error(colors.red(`Error: ${err.message}`))
  process.exit(1)
})
