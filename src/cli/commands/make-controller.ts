import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase())
    .replace(/^(.)/, (c: string) => c.toUpperCase())
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase())
    .replace(/^(.)/, (c: string) => c.toLowerCase())
}

export function makeController(name: string): void {
  const className = `${toPascalCase(name)}Controller`
  const fileName = `${toKebabCase(name)}.controller.ts`
  const targetDir = resolve(process.cwd(), 'src/server/controllers')
  const fullPath = resolve(targetDir, fileName)
  const varName = toCamelCase(name)

  if (existsSync(fullPath)) {
    console.error(colors.red(`File ${fileName} already exists!`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  const content = `import { Controller, get, post, put, del } from 'speexjs/server'
import type { RouteContext } from 'speexjs/server/router'

export class ${className} extends Controller {
  @get('/')
  async index({ response }: RouteContext) {
    return response.json({ data: [] })
  }

  @get('/:id')
  async show({ response, params }: RouteContext) {
    return response.json({ data: { id: params.id } })
  }

  @post('/')
  async store({ request, response }: RouteContext) {
    const body = await request.body()
    return response.json({ data: body }, 201)
  }

  @put('/:id')
  async update({ request, response, params }: RouteContext) {
    const body = await request.body()
    return response.json({ data: { id: params.id, ...body } })
  }

  @del('/:id')
  async destroy({ response, params }: RouteContext) {
    return response.json({ message: \`${className} deleted \${params.id}\` })
  }
}

export const ${varName}Controller = ${className}
`

  writeFileSync(fullPath, content, 'utf-8')
  console.log(
    `${colors.green('✅')} Controller ${colors.bold(className)} created at ${colors.cyan(fileName)}`,
  )
}
