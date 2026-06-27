import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import type { ScanResult, ReplacementSuggestion, SecurityIssue, ScannerConfig } from '../types.js'
import { KNOWN_MAPPINGS, KNOWN_CVES, type PackageMapping } from '../known-mappings.js'

interface LockfilePackages {
  [key: string]: { version?: string; dependencies?: Record<string, string> } | undefined
}

interface LockfileData {
  packages: LockfilePackages
}

function parsePackageJson(path: string): { name: string; dependencies: Record<string, string>; devDependencies: Record<string, string> } {
  const raw = readFileSync(path, 'utf-8')
  const json = JSON.parse(raw)
  return {
    name: json.name ?? basename(join(path, '..')),
    dependencies: (json.dependencies as Record<string, string>) ?? {},
    devDependencies: (json.devDependencies as Record<string, string>) ?? {},
  }
}

function parseLockfile(projectPath: string): LockfileData | null {
  const lockPath = join(projectPath, 'package-lock.json')
  if (!existsSync(lockPath)) return null
  try {
    const raw = readFileSync(lockPath, 'utf-8')
    const json = JSON.parse(raw)
    const packages: LockfilePackages = {}

    if (json.packages) {
      for (const [key, val] of Object.entries(json.packages as Record<string, { version?: string }>)) {
        if (key) {
          packages[key] = val
        }
      }
    }

    if (json.dependencies && Object.keys(packages).length === 0) {
      for (const [key, val] of Object.entries(json.dependencies as Record<string, { version?: string; requires?: Record<string, string> }>)) {
        packages[key] = { version: val.version, dependencies: val.requires }
      }
    }

    return { packages }
  } catch {
    return null
  }
}

function detectImportInFile(filePath: string, regex: RegExp): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return regex.test(content)
  } catch {
    return false
  }
}

function detectImportsInSrc(projectPath: string, mapping: PackageMapping): boolean {
  const regex = new RegExp(mapping.detectionPattern)
  const srcDir = join(projectPath, 'src')
  if (!existsSync(srcDir)) return false

  try {
    const files = collectSourceFiles(srcDir)
    for (const file of files) {
      if (detectImportInFile(file, regex)) return true
    }
  } catch {
    return false
  }
  return false
}

function collectSourceFiles(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'coverage' || entry.name === '.tsup') {
        continue
      }
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...collectSourceFiles(full))
      } else if (entry.isFile()) {
        const ext = entry.name.split('.').pop()
        if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
          results.push(full)
        }
      }
    }
  } catch {
    // skip inaccessible dirs
  }
  return results
}

function estimateTransitiveCount(lockfile: LockfileData | null, directNames: Set<string>): number {
  if (!lockfile) return 0
  let count = 0
  for (const key of Object.keys(lockfile.packages)) {
    if (!key || key === '') continue
    const name = key.startsWith('node_modules/') ? key.slice('node_modules/'.length) : key
    const rootName = name.startsWith('@') ? `${name.split('/')[0]}/${name.split('/')[1]}` : name.split('/')[0]
    if (rootName && !directNames.has(rootName)) {
      count++
    }
  }
  return count
}

function parseSize(value: string): number {
  const cleaned = value.replace(/\(.*?\)/g, '').trim()
  const match = cleaned.match(/^([\d.]+)\s*(KB|MB)/i)
  if (!match) return 0
  const num = Number.parseFloat(match[1]!)
  if (!match[2]) return 0
  if (match[2].toUpperCase() === 'MB') return num * 1024
  return num
}

export async function scanProject(config: ScannerConfig): Promise<ScanResult> {
  const projectPath = config.path ?? '.'
  const pkgPath = join(projectPath, 'package.json')

  if (!existsSync(pkgPath)) {
    throw new Error(`No package.json found at ${projectPath}. Run dep-exray in a JavaScript/TypeScript project directory.`)
  }

  const pkg = parsePackageJson(pkgPath)
  const lockfile = parseLockfile(projectPath)

  const allDeps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies }
  const directNames = new Set(Object.keys(allDeps))

  const transitiveCount = estimateTransitiveCount(lockfile, directNames)

  const highImpactReplacements: ReplacementSuggestion[] = []
  const mediumImpactReplacements: ReplacementSuggestion[] = []
  const securityIssues: SecurityIssue[] = []

  const sizeMap: Record<string, string> = {}
  for (const m of KNOWN_MAPPINGS) {
    sizeMap[m.name] = m.size
  }

  for (const mapping of KNOWN_MAPPINGS) {
    const isDirect = directNames.has(mapping.name)
    if (!isDirect) continue

    const isUsed = detectImportsInSrc(projectPath, mapping)
    if (!isUsed && !config.verbose) continue

    const mappingSize = parseSize(sizeMap[mapping.name] ?? '0 KB')
    const replacementSize = mapping.replacement.startsWith('native') ? 0 : 5
    const reductionStr = mappingSize > 1024
      ? `${(mappingSize / 1024).toFixed(1)} MB → ${replacementSize} KB`
      : `${mappingSize.toFixed(0)} KB → ${replacementSize} KB`

    const suggestion: ReplacementSuggestion = {
      packageName: mapping.name,
      reason: mapping.reason,
      replacement: mapping.replacement,
      estimatedSizeReduction: reductionStr,
      confidence: mapping.confidence,
      autoPrReady: mapping.autoPrReady,
    }

    if (mapping.confidence === 'high') {
      highImpactReplacements.push(suggestion)
    } else {
      mediumImpactReplacements.push(suggestion)
    }
  }

  for (const [name, cves] of Object.entries(KNOWN_CVES)) {
    if (directNames.has(name)) {
      for (const cveItem of cves) {
        securityIssues.push({
          packageName: name,
          cveId: cveItem.cve,
          severity: cveItem.severity as SecurityIssue['severity'],
          fix: cveItem.fix,
        })
      }
    }
  }

  let totalSizeKB = 0
  for (const depName of directNames) {
    const sizeStr = sizeMap[depName]
    if (sizeStr) {
      totalSizeKB += parseSize(sizeStr)
    } else {
      totalSizeKB += 50
    }
  }
  totalSizeKB += transitiveCount * 30

  const totalSizeStr = totalSizeKB > 1024
    ? `${(totalSizeKB / 1024).toFixed(1)} MB`
    : `${totalSizeKB.toFixed(0)} KB`

  return {
    projectName: pkg.name,
    directDeps: directNames.size,
    transitiveDeps: transitiveCount,
    totalEstimatedSize: totalSizeStr,
    highImpactReplacements,
    mediumImpactReplacements,
    securityIssues,
  }
}
