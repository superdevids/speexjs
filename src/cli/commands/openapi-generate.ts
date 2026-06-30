import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'
import { generateOpenApiSpec } from '../../server/openapi/index.js'

interface OpenApiGenerateOptions {
  output?: string
  pretty?: boolean
}

export async function openapiGenerate(options?: OpenApiGenerateOptions): Promise<void> {
  console.log(`  ${colors.cyan('→')} Generating OpenAPI 3.1 spec...`)

  const cwd = process.cwd()
  const candidates = [resolve(cwd, 'dist/index.js'), resolve(cwd, 'dist/app.js'), resolve(cwd, 'dist/server/index.js')]

  let app: any = null
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    try {
      const mod = await import(`file://${candidate.replace(/\\/g, '/')}`)
      app = mod.default ?? mod.app
      if (app !== undefined && app.router !== undefined) break
    } catch {
      continue
    }
  }

  if (app === null) {
    console.error(`  ${colors.red('✗')} Could not find compiled app. Run 'speexjs build' first.`)
    process.exit(1)
  }

  const spec = generateOpenApiSpec(app.router, {
    title: process.env.OPENAPI_TITLE || 'SpeexJS API',
    version: process.env.OPENAPI_VERSION || '1.0.0',
    description: process.env.OPENAPI_DESCRIPTION || 'Auto-generated OpenAPI 3.1 specification',
  })

  const outputPath = options?.output ? resolve(cwd, options.output) : resolve(cwd, 'dist/openapi.json')

  const outDir = resolve(outputPath, '..')
  mkdirSync(outDir, { recursive: true })

  const json = options?.pretty !== false ? JSON.stringify(spec, null, 2) : JSON.stringify(spec)

  writeFileSync(outputPath, json, 'utf-8')
  console.log(`  ${colors.green('✓')} OpenAPI spec written to ${outputPath}`)
}
