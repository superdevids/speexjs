import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

function toPascalCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase()).replace(/^(.)/, (c: string) => c.toUpperCase())
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function toCamelCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase()).replace(/^(.)/, (c: string) => c.toLowerCase())
}

export function makeFlag(name: string): void {
  const className = toPascalCase(name)
  const fileName = `${toKebabCase(name)}.flag.ts`
  const targetDir = resolve(process.cwd(), 'src/config/flags')
  const fullPath = resolve(targetDir, fileName)

  if (existsSync(fullPath)) {
    console.error(colors.red(`File ${fileName} already exists!`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  const flagName = toCamelCase(name)
  const content = `import { FlagManager } from 'speexjs/server/flags/dashboard'

export function register${className}Flag(): void {
  FlagManager.instance.define({
    name: '${flagName}',
    description: 'Description for ${flagName}',
    enabled: false,
    rollout: 100,
    targets: [
      // { type: 'user', value: 'user-id' },
      // { type: 'role', value: 'admin' },
      // { type: 'email', value: 'user@example.com' },
    ],
    variants: {
      // A: 50,
      // B: 50,
    },
  })
}
`

  writeFileSync(fullPath, content, 'utf-8')
  console.log(`${colors.green('✅')} Flag ${colors.bold(className)} created at ${colors.cyan(fileName)}`)
  console.log(`  ${colors.dim('Import and call register')}${colors.cyan(className)}${colors.dim('Flag() in your app bootstrap.')}`)
}
