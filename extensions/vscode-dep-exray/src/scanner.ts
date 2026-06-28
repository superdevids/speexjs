import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'

export interface ReplacementSuggestion {
  packageName: string
  reason: string
  replacement: string
  estimatedSizeReduction: string
  confidence: 'high' | 'medium' | 'low'
  autoPrReady: boolean
}

export interface SecurityIssue {
  packageName: string
  cveId: string
  severity: string
  fix: string
}

export interface ScanResult {
  projectName: string
  directDeps: number
  transitiveDeps: number
  totalEstimatedSize: string
  highImpactReplacements: ReplacementSuggestion[]
  mediumImpactReplacements: ReplacementSuggestion[]
  securityIssues: SecurityIssue[]
}

interface PackageMapping {
  name: string
  size: string
  replacement: string
  confidence: 'high' | 'medium' | 'low'
  autoPrReady: boolean
  reason: string
}

const KNOWN_MAPPINGS: PackageMapping[] = [
  { name: 'lodash', size: '4.2 MB', replacement: 'speexjs-core', confidence: 'high', autoPrReady: true, reason: 'Most lodash functions have direct replacements in speexjs-core with 99% API compatibility' },
  { name: 'moment', size: '2.5 MB', replacement: 'speexjs-core/date', confidence: 'high', autoPrReady: true, reason: 'Date utilities in speexjs-core cover 95% of common moment use cases' },
  { name: 'date-fns', size: '1.2 MB (tree-shaked ~50KB)', replacement: 'speexjs-core/date', confidence: 'medium', autoPrReady: false, reason: 'Partially overlapping \u2014 speexjs-core covers basic date ops but not all locale support' },
  { name: 'axios', size: '1.6 MB', replacement: 'native fetch + speexjs-core/async/retry', confidence: 'medium', autoPrReady: false, reason: 'Native fetch covers most use cases; needs manual review for interceptors' },
  { name: 'uuid', size: '30 KB', replacement: 'crypto.randomUUID() (native)', confidence: 'high', autoPrReady: true, reason: 'crypto.randomUUID() is available in all modern Node.js and browsers' },
  { name: 'deepmerge', size: '15 KB', replacement: 'speexjs-core', confidence: 'high', autoPrReady: true, reason: 'speexjs-core provides deepMerge out of the box' },
  { name: 'chalk', size: '45 KB', replacement: 'picocolors', confidence: 'medium', autoPrReady: false, reason: 'picocolors is 3KB vs chalk 45KB with same API' },
  { name: 'nanoid', size: '8 KB', replacement: 'speexjs-core/string (nanoid)', confidence: 'high', autoPrReady: true, reason: 'speexjs-core provides nanoid with same API' },
  { name: 'dayjs', size: '50 KB', replacement: 'speexjs-core/date', confidence: 'medium', autoPrReady: false, reason: 'Partially overlapping \u2014 covers basics but not all plugins' },
  { name: 'clsx', size: '5 KB', replacement: 'native template literals', confidence: 'high', autoPrReady: true, reason: 'Can be replaced with simple template literal conditional pattern' },
  { name: 'lodash.merge', size: '25 KB', replacement: 'speexjs-core', confidence: 'high', autoPrReady: true, reason: 'speexjs-core provides deepMerge out of the box' },
]

const KNOWN_CVES: Record<string, { cve: string; severity: string; fix: string }[]> = {
  'ansi-regex': [{ cve: 'CVE-2021-3807', severity: 'high', fix: 'Update to ansi-regex@6.0.1 or later' }],
  'semver': [{ cve: 'CVE-2022-25883', severity: 'medium', fix: 'Update to semver@7.5.2 or later' }],
  'json5': [{ cve: 'CVE-2022-46175', severity: 'high', fix: 'Update to json5@2.2.3 or later' }],
  'lodash': [
    { cve: 'CVE-2020-28502', severity: 'high', fix: 'Update to lodash@4.17.21 or later' },
    { cve: 'CVE-2020-8203', severity: 'medium', fix: 'Update to lodash@4.17.21 or later' },
  ],
}

export async function runDepExrayScan(filePath: string): Promise<ScanResult> {
  try {
    const projectRoot = findProjectRoot(filePath)
    const output = execSync(`npx --yes speexjs-dep-exray "${projectRoot}" --json`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    return JSON.parse(output)
  } catch {
    return runBuiltinScan(filePath)
  }
}

export function runBuiltinScan(filePath: string): ScanResult {
  const projectRoot = findProjectRoot(filePath)
  const pkgPath = resolve(projectRoot, 'package.json')

  if (!existsSync(pkgPath)) {
    return {
      projectName: 'unknown',
      directDeps: 0,
      transitiveDeps: 0,
      totalEstimatedSize: '0 KB',
      highImpactReplacements: [],
      mediumImpactReplacements: [],
      securityIssues: [],
    }
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies }
  const depCount = Object.keys(deps).length

  const highImpact: ReplacementSuggestion[] = []
  const mediumImpact: ReplacementSuggestion[] = []
  const securityIssues: SecurityIssue[] = []

  const sizeMap = new Map(KNOWN_MAPPINGS.map(m => [m.name, m.size]))

  for (const [depName] of Object.entries(deps)) {
    const mapping = KNOWN_MAPPINGS.find(m => m.name === depName)
    if (!mapping) continue

    const mappingSize = parseSize(sizeMap.get(depName) || '0 KB')
    const replacementSize = mapping.replacement.startsWith('native') ? 0 : 5
    const reductionStr = mappingSize > 1024
      ? `${(mappingSize / 1024).toFixed(1)} MB \u2192 ${replacementSize} KB`
      : `${mappingSize.toFixed(0)} KB \u2192 ${replacementSize} KB`

    const suggestion: ReplacementSuggestion = {
      packageName: depName,
      reason: mapping.reason,
      replacement: mapping.replacement,
      estimatedSizeReduction: reductionStr,
      confidence: mapping.confidence,
      autoPrReady: mapping.autoPrReady,
    }

    if (mapping.confidence === 'high') {
      highImpact.push(suggestion)
    } else {
      mediumImpact.push(suggestion)
    }
  }

  for (const [name, cves] of Object.entries(KNOWN_CVES)) {
    if (deps[name]) {
      for (const cveItem of cves) {
        securityIssues.push({
          packageName: name,
          cveId: cveItem.cve,
          severity: cveItem.severity,
          fix: cveItem.fix,
        })
      }
    }
  }

  let totalSizeKB = 0
  for (const depName of Object.keys(deps)) {
    const sizeStr = sizeMap.get(depName)
    if (sizeStr) {
      totalSizeKB += parseSize(sizeStr)
    } else {
      totalSizeKB += 50
    }
  }
  totalSizeKB += Math.floor(depCount * 3.5) * 30

  const totalSizeStr = totalSizeKB > 1024
    ? `${(totalSizeKB / 1024).toFixed(1)} MB`
    : `${totalSizeKB.toFixed(0)} KB`

  return {
    projectName: pkg.name || 'unknown',
    directDeps: depCount,
    transitiveDeps: Math.floor(depCount * 3.5),
    totalEstimatedSize: totalSizeStr,
    highImpactReplacements: highImpact,
    mediumImpactReplacements: mediumImpact,
    securityIssues,
  }
}

function findProjectRoot(filePath: string): string {
  let dir = dirname(filePath)
  while (dir !== resolve(dir, '..')) {
    if (existsSync(resolve(dir, 'package.json'))) {
      return dir
    }
    dir = resolve(dir, '..')
  }
  return dirname(filePath)
}

function parseSize(value: string): number {
  const cleaned = value.replace(/\(.*?\)/g, '').trim()
  const match = cleaned.match(/^([\d.]+)\s*(KB|MB)/i)
  if (!match) return 0
  const num = Number.parseFloat(match[1])
  if (!match[2]) return 0
  if (match[2].toUpperCase() === 'MB') return num * 1024
  return num
}
