import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

function toPascalCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ?? '').toUpperCase()).replace(/^(.)/, (c) => c.toUpperCase())
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

function toPlural(str: string): string {
  if (str.endsWith('s')) return str
  if (str.endsWith('y')) return str.slice(0, -1) + 'ies'
  return str + 's'
}

export function makeModel(name: string): void {
  const className = toPascalCase(name)
  const tableName = toPlural(toSnakeCase(name))
  const fileName = `${toSnakeCase(name)}.model.ts`
  const targetDir = resolve(process.cwd(), 'src/models')
  const fullPath = resolve(targetDir, fileName)

  if (existsSync(fullPath)) {
    console.error(colors.red(`File ${fileName} already exists!`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  const content = `import { Model } from 'speexjs/server/database'

export class ${className} extends Model {
  static table = '${tableName}'
  
  // Define relationships here
  // belongsTo(RelatedModel, 'foreign_key', 'owner_key')
  // hasMany(RelatedModel, 'foreign_key', 'local_key')
}
`

  writeFileSync(fullPath, content, 'utf-8')
  console.log(`${colors.green('✅')} Model ${colors.bold(className)} created at ${colors.cyan(fileName)}`)
}
