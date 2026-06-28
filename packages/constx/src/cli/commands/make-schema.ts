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

export function makeSchema(name: string): void {
  const schemaName = `${toPascalCase(name)}Schema`
  const typeName = toPascalCase(name)
  const fileName = `${toKebabCase(name)}.schema.ts`
  const targetDir = resolve(process.cwd(), 'src/schemas')
  const fullPath = resolve(targetDir, fileName)

  if (existsSync(fullPath)) {
    console.error(colors.red(`File ${fileName} sudah ada!`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  const content = `import { s, type Infer } from 'speexjs/schema'

export const ${schemaName} = s.object({
  id: s.string().uuid(),
  name: s.string().min(1).max(255),
  createdAt: s.string().datetime(),
  updatedAt: s.string().datetime().optional(),
})

export type ${typeName} = Infer<typeof ${schemaName}>

export const create${typeName}Schema = s.object({
  name: s.string().min(1).max(255),
})

export type Create${typeName} = Infer<typeof create${typeName}Schema>
`

  writeFileSync(fullPath, content, 'utf-8')
  console.log(
    `${colors.green('✅')} Schema ${colors.bold(schemaName)} dibuat di ${colors.cyan(fileName)}`,
  )
}
