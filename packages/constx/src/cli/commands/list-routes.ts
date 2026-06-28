import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

interface RouteInfo {
  method: string
  path: string
}

function extractDecorators(content: string): RouteInfo[] {
  const pattern = /@(get|post|put|patch|del|delete)\s*\(\s*'([^']+)'\s*\)/g
  const results: RouteInfo[] = []

  let match: RegExpExecArray | null = pattern.exec(content)
  while (match !== null) {
    const method =
      match[1] === 'del' ? 'DELETE' : (match[1] as string).toUpperCase()
    const path = match[2] as string
    results.push({ method, path })
    match = pattern.exec(content)
  }

  return results
}

export function listRoutes(): void {
  const routesDir = resolve(process.cwd(), 'src/server/controllers')

  if (!existsSync(routesDir)) {
    console.log(
      `  ${colors.yellow('!')} Tidak ada route terdaftar. Buat controller dulu:`,
    )
    console.log(`    ${colors.cyan('speexjs make:controller <name>')}`)
    return
  }

  const files = readdirSync(routesDir).filter(f => f.endsWith('.ts'))

  if (files.length === 0) {
    console.log(
      `  ${colors.yellow('!')} Tidak ada route terdaftar. Buat controller dulu:`,
    )
    console.log(`    ${colors.cyan('speexjs make:controller <name>')}`)
    return
  }

  let total = 0

  console.log()
  console.log(`  ${colors.bold('📋 Daftar Route:')}`)
  console.log()

  for (const file of files) {
    const content = readFileSync(resolve(routesDir, file), 'utf-8')
    const routes = extractDecorators(content)

    if (routes.length > 0) {
      console.log(`  ${colors.cyan('──')} ${colors.bold(file.replace('.controller.ts', ''))} ${colors.cyan('──')}`)

      for (const { method, path } of routes) {
        const coloredMethod = method === 'GET'
          ? colors.green(method.padEnd(8))
          : method === 'POST'
            ? colors.blue(method.padEnd(8))
            : method === 'PUT' || method === 'PATCH'
              ? colors.yellow(method.padEnd(8))
              : colors.red(method.padEnd(8))

        console.log(`    ${coloredMethod} ${path}`)
        total++
      }

      console.log()
    }
  }

  console.log(`  ${colors.dim(`${total} route${total !== 1 ? 's' : ''} ditemukan`)}`)
  console.log()
}
