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

export function makeMiddleware(name: string): void {
  const functionName = toCamelCase(name)
  const className = toPascalCase(name)
  const fileName = `${toKebabCase(name)}.middleware.ts`
  const targetDir = resolve(process.cwd(), 'src/server/middleware')
  const fullPath = resolve(targetDir, fileName)

  if (existsSync(fullPath)) {
    console.error(colors.red(`File ${fileName} sudah ada!`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  const content = `import type { RouteContext } from 'speexjs/server/router'

export function ${functionName}(options?: Record<string, unknown>) {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const start = Date.now()

    await next()

    const duration = Date.now() - start
    console.log(\`[${className}Middleware] \${ctx.request.method} \${ctx.request.url} \${duration}ms\`)
  }
}
`

  writeFileSync(fullPath, content, 'utf-8')
  console.log(
    `${colors.green('✅')} Middleware ${colors.bold(functionName)} dibuat di ${colors.cyan(fileName)}`,
  )
}
