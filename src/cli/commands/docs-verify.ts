import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

interface Meta {
  version: string
  releaseDate: string
  testCount: number
  coverage: string
  cliCommands: number
  cliWired: number
  subpathExports: number
  features: number
  knownBugs: number
  bundleSize: string
  bundleSizeGzip: string
}

interface DocCheck {
  file: string
  field: string
  expected: string
  found: string | null
  ok: boolean
}

function loadMeta(root: string): Meta | null {
  const path = resolve(root, 'project.meta.json')
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8')) as Meta
}

function readDoc(root: string, file: string): string | null {
  const path = resolve(root, file)
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf-8')
}

function checkVersion(doc: string, version: string): { ok: boolean; found: string | null } {
  const rx = new RegExp(`v${version.replace(/\./g, '\\.')}`)
  if (rx.test(doc)) return { ok: true, found: `v${version}` }
  const alt = doc.match(/v\d+\.\d+\.\d+/)
  return { ok: false, found: alt ? alt[0] : null }
}

function checkFeatureCount(doc: string, expected: number): { ok: boolean; found: string | null } {
  const m = doc.match(/(\d+)\+?\s*features/i)
  if (!m || m[1] === undefined) return { ok: false, found: null }
  const val = parseInt(m[1], 10)
  return { ok: val === expected, found: m[0] ?? null }
}

function checkTestCount(doc: string, expected: number): { ok: boolean; found: string | null } {
  const m = doc.match(/~?\s*([\d,]+)\+?\s*tests/i)
  if (!m || m[1] === undefined) return { ok: false, found: null }
  const val = parseInt(m[1].replace(/,/g, ''), 10)
  const approx = val >= expected * 0.9 && val <= expected * 1.1
  return { ok: approx, found: m[0] ?? null }
}

function checkCoverage(doc: string, expected: string): { ok: boolean; found: string | null } {
  const m = doc.match(/([\d.]+)%/)
  if (!m || m[1] === undefined) return { ok: false, found: null }
  return { ok: m[1] === expected, found: `${m[1]}%` }
}

function checkBundleSize(doc: string, expected: string): { ok: boolean; found: string | null } {
  const m = doc.match(/(\d+\s*KB)/i)
  if (!m || m[1] === undefined) return { ok: false, found: null }
  const normalized = m[1].replace(/\s+/g, ' ')
  return { ok: normalized.toLowerCase() === expected.toLowerCase(), found: normalized }
}

function checkCliCommandCount(doc: string, expected: number): { ok: boolean; found: string | null } {
  const m = doc.match(/(\d+)\+?\s*CLI commands/i)
  if (!m || m[1] === undefined) return { ok: false, found: null }
  const val = parseInt(m[1], 10)
  return { ok: val === expected, found: m[0] ?? null }
}

function checkSubpathExports(doc: string, expected: number): { ok: boolean; found: string | null } {
  const m = doc.match(/(\d+)\+?\s*subpath/i)
  if (!m || m[1] === undefined) return { ok: false, found: null }
  const val = parseInt(m[1], 10)
  return { ok: val === expected, found: m[0] ?? null }
}

export async function docsVerify(): Promise<void> {
  const root = process.cwd()
  const meta = loadMeta(root)

  if (!meta) {
    console.error(`${colors.red('✗')} project.meta.json not found in ${root}`)
    process.exit(1)
  }

  const docs: Array<{ file: string; checks: Array<(doc: string) => DocCheck | null> }> = [
    {
      file: 'README.md',
      checks: [
        (doc) => {
          const r = checkVersion(doc, meta.version)
          return { file: 'README.md', field: 'version', expected: meta.version, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkFeatureCount(doc, meta.features)
          return { file: 'README.md', field: 'features', expected: `${meta.features}+`, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkTestCount(doc, meta.testCount)
          return { file: 'README.md', field: 'tests', expected: `~${meta.testCount}`, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkCoverage(doc, meta.coverage)
          return { file: 'README.md', field: 'coverage', expected: `${meta.coverage}%`, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkBundleSize(doc, meta.bundleSize)
          return { file: 'README.md', field: 'bundleSize', expected: meta.bundleSize, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkSubpathExports(doc, meta.subpathExports)
          return { file: 'README.md', field: 'subpathExports', expected: `${meta.subpathExports}`, found: r.found, ok: r.ok }
        },
      ],
    },
    {
      file: 'SUMMARY.md',
      checks: [
        (doc) => {
          const r = checkVersion(doc, meta.version)
          return { file: 'SUMMARY.md', field: 'version', expected: meta.version, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkFeatureCount(doc, meta.features)
          return { file: 'SUMMARY.md', field: 'features', expected: `${meta.features}+`, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkTestCount(doc, meta.testCount)
          return { file: 'SUMMARY.md', field: 'tests', expected: `~${meta.testCount}`, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkSubpathExports(doc, meta.subpathExports)
          return { file: 'SUMMARY.md', field: 'subpathExports', expected: `${meta.subpathExports}`, found: r.found, ok: r.ok }
        },
      ],
    },
    {
      file: 'ARCHITECTURE.md',
      checks: [
        (doc) => {
          const r = checkVersion(doc, meta.version)
          return { file: 'ARCHITECTURE.md', field: 'version', expected: meta.version, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkCoverage(doc, meta.coverage)
          return { file: 'ARCHITECTURE.md', field: 'coverage', expected: `${meta.coverage}%`, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkBundleSize(doc, meta.bundleSize)
          return { file: 'ARCHITECTURE.md', field: 'bundleSize', expected: meta.bundleSize, found: r.found, ok: r.ok }
        },
      ],
    },
    {
      file: 'ROADMAP.md',
      checks: [
        (doc) => {
          const r = checkVersion(doc, meta.version)
          return { file: 'ROADMAP.md', field: 'version', expected: meta.version, found: r.found, ok: r.ok }
        },
        (doc) => {
          const r = checkFeatureCount(doc, meta.features)
          return { file: 'ROADMAP.md', field: 'features', expected: `${meta.features}+`, found: r.found, ok: r.ok }
        },
      ],
    },
  ]

  const allResults: DocCheck[] = []

  for (const entry of docs) {
    const content = readDoc(root, entry.file)
    if (!content) {
      console.log(`  ${colors.yellow('⚠')} ${entry.file} not found — skipping`)
      continue
    }
    for (const check of entry.checks) {
      const result = check(content)
      if (result) allResults.push(result)
    }
  }

  const failures = allResults.filter((r) => !r.ok)

  console.log()
  console.log(`  ${colors.bold('📋 Documentation SSOT Verification')}`)
  console.log()

  if (failures.length === 0) {
    console.log(`  ${colors.green('✓ All documentation values match project.meta.json')}`)
    console.log()
    process.exit(0)
  }

  for (const f of failures) {
    const expected = f.found
      ? `${colors.dim(`expected ${colors.white(f.expected)}, found ${colors.red(f.found)}`)}`
      : `${colors.dim(`expected ${colors.white(f.expected)}, but value not found`)}`
    console.log(`  ${colors.red('✗')} ${f.file} — ${f.field} ${expected}`)
  }

  console.log()
  console.log(`  ${colors.red(`${failures.length} mismatch${failures.length !== 1 ? 'es' : ''} found`)}`)
  console.log()
  process.exit(1)
}
