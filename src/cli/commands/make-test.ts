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

export function makeTest(name: string): void {
  const className = toPascalCase(name)
  const fileName = `${toKebabCase(name)}.test.ts`
  const targetDir = resolve(process.cwd(), 'tests')
  const fullPath = resolve(targetDir, fileName)

  if (existsSync(fullPath)) {
    console.error(colors.red(`File ${fileName} already exists!`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  const content = `import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { createTestApp, testRequest, refreshDatabase, actingAs } from 'speexjs/server/testing/bootstrap'
import { createSqliteMemory } from 'speexjs/server/testing/database'

let app: ReturnType<typeof createTestApp>

beforeAll(async () => {
  app = createTestApp({
    database: await createSqliteMemory(),
  })

  app.get('/${toKebabCase(name)}', (ctx) => {
    ctx.response.json({ message: 'Hello from ${className}' })
  })

  app.listen(0)
})

afterAll(async () => {
  await app.close()
})

beforeEach(async () => {
  await refreshDatabase()
})

describe('${className}', () => {
  it('responds with 200', async () => {
    const res = await testRequest(app).get('/${toKebabCase(name)}')
    expect(res.status).toBe(200)
  })

  it('responds with JSON', async () => {
    const res = await testRequest(app).get('/${toKebabCase(name)}')
    const body = res.json()
    expect(body).toHaveProperty('message')
  })
})
`

  writeFileSync(fullPath, content, 'utf-8')
  console.log(`${colors.green('✅')} Test ${colors.bold(fileName)} created at ${colors.cyan('tests/' + fileName)}`)
}
