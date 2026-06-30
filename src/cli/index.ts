#!/usr/bin/env node
import { parseArgs } from '../native/args.js'
import { colors } from '../native/colors.js'
import { build as buildCommand } from './commands/build.js'
import { deploy } from './commands/deploy.js'
import { initProject } from './commands/init.js'
import { listRoutes } from './commands/list-routes.js'
import { makeAuth } from './commands/make-auth.js'
import { makeController } from './commands/make-controller.js'
import { makeMiddleware } from './commands/make-middleware.js'
import { makeMigration } from './commands/make-migration.js'
import { makeModel } from './commands/make-model.js'
import { makeCrud } from './commands/make-crud.js'
import { makeResource } from './commands/make-resource.js'
import { makeSchema } from './commands/make-schema.js'
import { makeAgent } from './commands/make-agent.js'
import { makeFlag } from './commands/make-flag.js'
import { generateApp } from './commands/generate-app.js'
import { generateSdk } from './commands/generate-sdk.js'
import { openapiGenerate } from './commands/openapi-generate.js'
import { pluginInstall, pluginList, pluginSearch } from './commands/plugin.js'
import { serve } from './commands/serve.js'
import { envGenerate } from './commands/env-generate.js'
import { envCheck } from './commands/env-check.js'
import { schemaDiff } from './commands/schema-diff.js'
import { schemaMigrate } from './commands/schema-migrate.js'
import { buildFunction } from './commands/build-function.js'
import { profileCommand } from './commands/profile.js'

function showHelp(): void {
  console.log(`${colors.bold('SpeexJS')} ${colors.cyan('v2.0.0')}`)
  console.log('Fullstack JavaScript/TypeScript Framework')
  console.log()
  console.log(`${colors.bold('Usage:')}`)
  console.log('  speexjs init [name] [options]              Create new project')
  console.log('  speexjs build [options]                    Build the project')
  console.log('  speexjs build --ssg                        Build with Static Site Generation')
  console.log('  speexjs build:function --target <type>     Build serverless function (lambda|vercel|cloudflare)')
  console.log('  speexjs bench                              Run benchmarks')
  console.log('  speexjs make:controller <name>             Generate controller')
  console.log('  speexjs make:middleware <name>             Generate middleware')
  console.log('  speexjs make:migration <name>              Generate migration')
  console.log('  speexjs make:model <name>                  Generate model')
  console.log('  speexjs make:auth [options]                Generate auth scaffold')
  console.log('  speexjs make:resource <name>               Generate resource (controller + model + migration)')
  console.log('  speexjs make:schema <name>                 Generate schema')
  console.log('  speexjs make:crud                          Generate complete CRUD (interactive)')
  console.log('  speexjs make:agent <name>                  Generate AI agent')
  console.log('  speexjs make:flag <name>                   Generate feature flag')
  console.log('  speexjs make:admin <name> [fields...]       Generate admin config')
  console.log('  speexjs generate:app <description>          Generate fullstack app from description')
  console.log('  speexjs migrate                            Run migrations')
  console.log('  speexjs db:seed                            Seed the database')
  console.log('  speexjs list-routes                        View all routes')
  console.log('  speexjs serve [options]                    Run server')
  console.log('  speexjs generate:sdk [options]             Generate TypeScript SDK from OpenAPI spec')
  console.log('  speexjs openapi:generate [options]         Generate OpenAPI 3.1 spec from routes')
  console.log('  speexjs plugin:install <name> [options]     Install a plugin')
  console.log('  speexjs plugin:list                        List installed plugins')
  console.log('  speexjs plugin:search <query> [options]    Search the plugin marketplace')
  console.log('  speexjs deploy [options]                   Deploy application (docker/vercel/railway/render/flyio)')
  console.log('  speexjs env:generate [--overwrite]         Generate typed src/env.ts from .env')
  console.log('  speexjs env:check                          Validate environment variables')
  console.log('  speexjs schema:diff [--verbose]             Compare models vs database schema')
  console.log('  speexjs schema:migrate [--dry-run]          Generate migration from schema diff')
  console.log('  speexjs profile [options]                  Profile route performance')
  console.log('  speexjs profile --route "GET /users"       Profile a specific route')
  console.log('  speexjs --help                             Show help')
  console.log()
  console.log(`${colors.bold('Aliases:')}`)
  console.log('  speexjs -v, --version                      View version')
  console.log()
  console.log(`${colors.bold('Options:')}`)
  console.log('  --template <type>    blank, fullstack, api-only')
  console.log('  --frontend <fe>      super, react, vue')
  console.log('  --port <number>      Port server (default: 3000)')
  console.log('  --host <string>      Host address (default: localhost)')
  console.log('  --ssg                Generate static site (with build)')
  console.log('  --docs               Serve documentation site')
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
        console.error(colors.red('Controller name required'))
        console.log(`  ${colors.cyan('speexjs make:controller <name>')}`)
        process.exit(1)
      }
      await makeController(parsed.args[0])
      break
    }
    case 'make:middleware': {
      if (!parsed.args[0]) {
        console.error(colors.red('Middleware name required'))
        console.log(`  ${colors.cyan('speexjs make:middleware <name>')}`)
        process.exit(1)
      }
      await makeMiddleware(parsed.args[0])
      break
    }
    case 'make:schema': {
      if (!parsed.args[0]) {
        console.error(colors.red('Schema name required'))
        console.log(`  ${colors.cyan('speexjs make:schema <name>')}`)
        process.exit(1)
      }
      await makeSchema(parsed.args[0])
      break
    }
    case 'make:migration': {
      if (!parsed.args[0]) {
        console.error(colors.red('Migration name required'))
        console.log(`  ${colors.cyan('speexjs make:migration <name>')}`)
        process.exit(1)
      }
      await makeMigration(parsed.args[0])
      break
    }
    case 'make:model': {
      if (!parsed.args[0]) {
        console.error(colors.red('Model name required'))
        console.log(`  ${colors.cyan('speexjs make:model <name>')}`)
        process.exit(1)
      }
      await makeModel(parsed.args[0])
      break
    }
    case 'make:resource': {
      if (!parsed.args[0]) {
        console.error(colors.red('Resource name required'))
        console.log(`  ${colors.cyan('speexjs make:resource <name>')}`)
        process.exit(1)
      }
      await makeResource(parsed.args[0])
      break
    }
    case 'make:auth': {
      await makeAuth({
        guard: (parsed.options.guard as 'session' | 'token' | 'sanctum') || 'session',
        views: parsed.options['no-views'] !== true,
        api: parsed.options.api === true,
      })
      break
    }
    case 'generate:sdk': {
      await generateSdk({
        output: parsed.options.output as string | undefined,
        name: parsed.options.name as string | undefined,
        format: parsed.options.format as string | undefined,
      })
      break
    }
    case 'plugin:install': {
      if (!parsed.args[0]) {
        console.error(colors.red('Plugin name required'))
        console.log(`  ${colors.cyan('speexjs plugin:install <name> [--source npm:<pkg>|github:<repo>]')}`)
        process.exit(1)
      }
      await pluginInstall(parsed.args[0], parsed.options)
      break
    }
    case 'plugin:list': {
      await pluginList()
      break
    }
    case 'plugin:search': {
      const query = parsed.args[0] || ''
      await pluginSearch(query, parsed.options)
      break
    }
    case 'deploy': {
      await deploy({
        docker: parsed.options.docker === true,
        vercel: parsed.options.vercel === true,
        railway: parsed.options.railway === true,
        render: parsed.options.render === true,
        flyio: parsed.options.flyio === true,
        init: parsed.options.init === true,
      })
      break
    }
    case 'migrate':
    case 'db:seed': {
      const label = command === 'migrate' ? 'Migration' : 'Database seeding'
      console.log(`${colors.yellow('⏳')} ${label} coming soon...`)
      break
    }
    case 'list-routes':
    case 'routes':
    case 'lr': {
      await listRoutes()
      break
    }
    case 'build': {
      await buildCommand({
        ssg: parsed.options.ssg === true,
        outDir: (parsed.options.outDir as string) ?? 'dist',
        isr: parsed.options.isr === true,
        revalidate: parsed.options.revalidate ? Number(parsed.options.revalidate) : undefined,
      })
      break
    }
    case 'openapi:generate': {
      await openapiGenerate({
        output: parsed.options.output as string | undefined,
        pretty: parsed.options.pretty !== false,
      })
      break
    }
    case 'bench':
    case 'benchmark': {
      await runBenchmarks()
      break
    }
    case 'make:agent': {
      if (!parsed.args[0]) {
        console.error(colors.red('Agent name required'))
        console.log(`  ${colors.cyan('speexjs make:agent <name>')}`)
        process.exit(1)
      }
      await makeAgent(parsed.args[0])
      break
    }
    case 'make:admin': {
      if (!parsed.args[0]) {
        console.error(colors.red('Resource name required'))
        console.log(`  ${colors.cyan('speexjs make:admin <resource> [fields...]')}`)
        process.exit(1)
      }
      const args = parsed.args
      const resourceName = args[0] ?? 'resource'
      const fields = args.slice(1).length > 0 ? args.slice(1) : ['name:string', 'email:string']
      const { generateAdminConfig } = await import('./commands/make-admin.js')
      generateAdminConfig(resourceName, fields)
      break
    }
    case 'generate:app': {
      if (!parsed.args[0]) {
        console.error(colors.red('App description required'))
        console.log(`  ${colors.cyan('speexjs generate:app "create a blog with posts"')}`)
        process.exit(1)
      }
      await generateApp(parsed.args.join(' ') || parsed.args[0])
      break
    }
    case 'make:flag': {
      if (!parsed.args[0]) {
        console.error(colors.red('Flag name required'))
        console.log(`  ${colors.cyan('speexjs make:flag <name>')}`)
        process.exit(1)
      }
      await makeFlag(parsed.args[0])
      break
    }
    case 'make:crud':
    case 'crud': {
      await makeCrud()
      break
    }
    case 'serve':
    case 'dev': {
      await serve(parsed.options)
      break
    }
    case 'env:generate': {
      await envGenerate({
        overwrite: parsed.options.overwrite === true,
      })
      break
    }
    case 'build:function': {
      const bfTarget = parsed.options.target as 'lambda' | 'vercel' | 'cloudflare' | undefined
      if (bfTarget === undefined) {
        console.error(colors.red('Target required: --target lambda|vercel|cloudflare'))
        console.log(`  ${colors.cyan('speexjs build:function --target lambda')}`)
        console.log(`  ${colors.cyan('speexjs build:function --target vercel')}`)
        console.log(`  ${colors.cyan('speexjs build:function --target cloudflare')}`)
        process.exit(1)
      }
      if (!['lambda', 'vercel', 'cloudflare'].includes(bfTarget)) {
        console.error(colors.red(`Unknown target '${bfTarget}'. Use lambda, vercel, or cloudflare.`))
        process.exit(1)
      }
      await buildFunction({
        target: bfTarget,
        outDir: (parsed.options.outDir as string) ?? undefined,
      })
      break
    }
    case 'env:check': {
      await envCheck()
      break
    }
    case 'schema:diff': {
      await schemaDiff({
        verbose: parsed.options.verbose === true,
      })
      break
    }
    case 'schema:migrate': {
      await schemaMigrate({
        dryRun: parsed.options['dry-run'] === true,
        force: parsed.options.force === true,
        backup: parsed.options.backup === true,
      })
      break
    }
    case 'profile': {
      await profileCommand({
        samples: parsed.options.samples ? Number(parsed.options.samples) : undefined,
        output: parsed.options.output as string | undefined,
        route: parsed.options.route as string | undefined,
        method: parsed.options.method as string | undefined,
        warmup: parsed.options.warmup !== false,
      })
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
      console.log('SpeexJS v2.0.0')
      break
    }
    default: {
      if (command) {
        console.error(`${colors.red(`Unknown command '${command}'`)}`)
        console.log()
      }
      showHelp()
      if (command) process.exit(1)
    }
  }
}

async function runBenchmarks(): Promise<void> {
  const cwd = process.cwd()

  const benchPaths = [`${cwd}/benchmarks/framework.bench.ts`, `${cwd}/benchmarks/index.bench.ts`]

  for (const bp of benchPaths) {
    const { existsSync } = await import('node:fs')
    if (existsSync(bp)) {
      console.log(`${colors.cyan('→')} Running benchmarks...\n`)
      const { execSync } = await import('node:child_process')
      try {
        execSync(`npx tsx ${bp}`, { stdio: 'inherit', cwd })
      } catch {
        process.exit(1)
      }
      return
    }
  }

  console.error(`${colors.red('✗')} No benchmark file found`)
  console.log(`  Expected: benchmarks/framework.bench.ts or benchmarks/index.bench.ts`)
  process.exit(1)
}

main().catch((err) => {
  console.error(colors.red(`Error: ${err.message}`))
  process.exit(1)
})
