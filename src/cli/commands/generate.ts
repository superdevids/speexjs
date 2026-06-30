import { writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { colors } from '../../native/colors.js'

interface StaticPage {
  path: string
  content: string
}

export async function generate(pages: StaticPage[], outDir = 'dist'): Promise<void> {
  const out = resolve(process.cwd(), outDir)
  if (!existsSync(out)) mkdirSync(out, { recursive: true })

  for (const page of pages) {
    const filePath =
      page.path === '/' || page.path === '' ? resolve(out, 'index.html') : resolve(out, `${page.path.replace(/^\//, '')}.html`)
    const dir = resolve(filePath, '..')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, page.content, 'utf-8')
    console.log(`  ${colors.green('✓')} Generated ${page.path}`)
  }
  console.log(`  ${colors.cyan('→')} ${pages.length} pages generated to ${outDir}/`)
}

export async function buildStatic(options: { entry?: string; outDir?: string; routes?: string[] } = {}): Promise<void> {
  const outDir = options.outDir ?? 'dist'

  console.log(`  ${colors.cyan('→')} Building TypeScript...`)
  try {
    execSync('npx tsc', { stdio: 'inherit', cwd: process.cwd() })
  } catch {
    console.error(`  ${colors.red('✗')} TypeScript build failed`)
    process.exit(1)
  }

  console.log(`  ${colors.green('✓')} TypeScript compiled`)

  const publicDir = resolve(process.cwd(), 'public')
  if (existsSync(publicDir)) {
    const outPublic = resolve(process.cwd(), outDir)
    if (!existsSync(outPublic)) mkdirSync(outPublic, { recursive: true })
    try {
      cpSync(publicDir, outPublic, { recursive: true })
      console.log(`  ${colors.green('✓')} Copied public/ assets`)
    } catch {
      /* skip if already exists */
    }
  }

  console.log()
  console.log(`  ${colors.bold('SpeexJS')} ${colors.cyan('SSG Build Complete')}`)
  console.log(`  ${colors.dim('→')}  Output: ${colors.dim(outDir)}/`)
  console.log(`  ${colors.dim('→')}  Run ${colors.cyan('speexjs serve --production')} to preview`)
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
}

export function getMimeType(ext: string): string {
  return MIME_TYPES[ext] ?? 'application/octet-stream'
}
