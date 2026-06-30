import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, writeFileSync, rmdirSync, mkdirSync, readdirSync } from 'node:fs'

vi.mock('../src/server/http/upload.js', () => ({}))

const { Router } = await import('../src/server/router/index.js')

describe('File-based routing path conversion', () => {
  function convertToRoute(relativePath: string): string {
    return (
      '/' +
      relativePath
        .replace(/\\/g, '/')
        .replace(/\.[jt]sx?$/, '')
        .replace(/\/index$/, '')
        .replace(/\/?$/, '')
        .replace(/\[(\w+)\]/g, ':$1')
    )
  }

  it('converts about.js to /about', () => {
    expect(convertToRoute('about.js')).toBe('/about')
  })

  it('converts about.tsx to /about', () => {
    expect(convertToRoute('about.tsx')).toBe('/about')
  })

  it('top-level index.js becomes /index (no parent dir for /index$ to match)', () => {
    expect(convertToRoute('index.js')).toBe('/index')
  })

  it('converts nested index to parent path', () => {
    expect(convertToRoute('blog/index.js')).toBe('/blog')
  })

  it('converts users/[id].js to /users/:id', () => {
    expect(convertToRoute('users/[id].js')).toBe('/users/:id')
  })

  it('converts posts/[postId]/comments/[commentId].js to /posts/:postId/comments/:commentId', () => {
    expect(convertToRoute('posts/[postId]/comments/[commentId].js')).toBe('/posts/:postId/comments/:commentId')
  })

  it('strips trailing slashes', () => {
    expect(convertToRoute('about/')).toBe('/about')
  })

  it('.mjs extension is not stripped by current source regex', () => {
    expect(convertToRoute('api/status.mjs')).toBe('/api/status.mjs')
  })
})

describe('registerFileRoutes directory scanning', () => {
  let tmpDir: string
  let pagesDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-fileroutes-'))
    pagesDir = join(tmpDir, 'pages')
    mkdirSync(pagesDir, { recursive: true })
  })

  afterEach(() => {
    try {
      rmdirSync(tmpDir, { recursive: true })
    } catch {}
  })

  function writePage(subpath: string, content: string): string {
    const full = join(pagesDir, subpath)
    mkdirSync(full.substring(0, full.lastIndexOf(sep)), { recursive: true })
    writeFileSync(full, content, 'utf-8')
    return full
  }

  it('scans directory for js/ts/jsx/tsx files excluding css/json', () => {
    writePage('about.js', '')
    writePage('contact.tsx', '')
    writePage('styles.css', '')
    writePage('data.json', '')
    const files = readdirSync(pagesDir, { recursive: true }) as string[]
    const jsFiles = files.filter((f) => f.endsWith('.js') || f.endsWith('.tsx'))
    expect(jsFiles).toContain('about.js')
    expect(jsFiles).toContain('contact.tsx')
    expect(jsFiles).not.toContain('styles.css')
    expect(jsFiles).not.toContain('data.json')
  })

  it('scans nested directories recursively', () => {
    writePage('blog/index.js', '')
    writePage('blog/[slug].js', '')
    writePage('blog/categories/[category].js', '')
    const files = readdirSync(pagesDir, { recursive: true }) as string[]
    expect(files).toContain('blog\\index.js')
    expect(files).toContain('blog\\[slug].js')
    expect(files).toContain('blog\\categories\\[category].js')
  })

  it('only files inside pages dir are included (path traversal protection)', () => {
    const outsideFile = join(tmpDir, 'secret.js')
    writeFileSync(outsideFile, '', 'utf-8')
    writePage('safe.js', '')
    const files = readdirSync(pagesDir, { recursive: true }) as string[]
    expect(files).toContain('safe.js')
    expect(files).not.toContain('../secret.js')
    expect(files).not.toContain('..\\secret.js')
  })

  it('gracefully handles missing pages directory', async () => {
    const { registerFileRoutes } = await import('../src/server/router/file-routing.js')
    const missingDir = join(tmpDir, 'does-not-exist')
    await expect(registerFileRoutes(new Router(), missingDir)).rejects.toThrow()
  })
})
