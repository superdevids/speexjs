import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

function toCamelCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ?? '').toUpperCase()).replace(/^(.)/, (c) => c.toLowerCase())
}

export function makeMigration(name: string): void {
  const fileName = `${Date.now()}_${toSnakeCase(name)}.ts`
  const targetDir = resolve(process.cwd(), 'src/database/migrations')
  const fullPath = resolve(targetDir, fileName)

  if (existsSync(fullPath)) {
    console.error(colors.red(`File ${fileName} already exists!`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  const className = toCamelCase(name).charAt(0).toUpperCase() + toCamelCase(name).slice(1)

  const content = `import { SchemaBuilder } from 'speexjs/server/database'

export async function up(schema: SchemaBuilder): Promise<void> {
  schema.createTable('${toSnakeCase(name)}', (table) => {
    table.increments('id')
    table.timestamps()
  })
}

export async function down(schema: SchemaBuilder): Promise<void> {
  schema.dropTable('${toSnakeCase(name)}')
}
`

  writeFileSync(fullPath, content, 'utf-8')
  console.log(`${colors.green('✅')} Migration ${colors.bold(className)} created at ${colors.cyan(fileName)}`)
}
