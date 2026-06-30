import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

interface EnvCheckResult {
  key: string
  expectedValue: string
  actualValue: string | undefined
  status: 'ok' | 'missing' | 'type-mismatch' | 'empty'
  expectedType: string
}

function parseDotEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

function inferType(value: string): string {
  if (['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) return 'boolean'
  if (/^-?\d+$/.test(value)) return 'number'
  if (/^-?\d+\.\d+$/.test(value)) return 'number'
  if (value.includes(',') && value.split(',').every((p) => p.trim().length > 0)) return 'array'
  return 'string'
}

function validateType(value: string, expectedType: string): boolean {
  switch (expectedType) {
    case 'number':
      return !Number.isNaN(Number(value))
    case 'boolean':
      return ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())
    case 'array':
      return value.includes(',') || value.length > 0
    default:
      return true
  }
}

export async function envCheck(): Promise<void> {
  const cwd = process.cwd()
  const envFiles = ['.env', '.env.local']
  const allVars: Record<string, string> = {}
  const fileSources: Record<string, string> = {}

  for (const file of envFiles) {
    const filePath = resolve(cwd, file)
    if (!existsSync(filePath)) continue
    const content = readFileSync(filePath, 'utf-8')
    const parsed = parseDotEnv(content)
    for (const [key, value] of Object.entries(parsed)) {
      if (!(key in allVars)) {
        allVars[key] = value
        fileSources[key] = file
      }
    }
  }

  if (Object.keys(allVars).length === 0) {
    console.log(`  ${colors.yellow('⚠')} No .env file found in ${cwd}`)
    console.log(`  ${colors.dim('Nothing to validate.')}`)
    process.exit(0)
  }

  const results: EnvCheckResult[] = []

  for (const [key, expectedValue] of Object.entries(allVars)) {
    const actualValue = process.env[key]
    const expectedType = inferType(expectedValue)

    let status: EnvCheckResult['status']

    if (actualValue === undefined) {
      status = expectedValue ? 'missing' : 'empty'
    } else if (actualValue === '') {
      status = 'empty'
    } else if (!validateType(actualValue, expectedType)) {
      status = 'type-mismatch'
    } else {
      status = 'ok'
    }

    results.push({
      key,
      expectedValue,
      actualValue,
      status,
      expectedType,
    })
  }

  const okCount = results.filter((r) => r.status === 'ok').length
  const missingCount = results.filter((r) => r.status === 'missing').length
  const typeMismatchCount = results.filter((r) => r.status === 'type-mismatch').length
  const emptyCount = results.filter((r) => r.status === 'empty').length

  console.log()
  console.log(`  ${colors.bold('🔍 Environment Variable Check')}`)
  console.log()

  for (const r of results) {
    const _source = fileSources[r.key] ?? '.env'
    switch (r.status) {
      case 'ok':
        console.log(`  ${colors.green('✓')} ${r.key} ${colors.dim(`= ${maskSecret(r.key, r.actualValue!)}`)}`)
        break
      case 'missing':
        console.log(`  ${colors.red('✗')} ${r.key} ${colors.dim(`(expected: ${r.expectedType}, from ${_source})`)}`)
        console.log(`    ${colors.red('Not set in environment')}`)
        break
      case 'type-mismatch':
        console.log(`  ${colors.yellow('⚠')} ${r.key} ${colors.dim(`= ${r.actualValue}`)}`)
        console.log(`    ${colors.yellow(`Expected ${r.expectedType}, got string value`)}`)
        break
      case 'empty':
        console.log(`  ${colors.yellow('⚠')} ${r.key} ${colors.dim('(empty value)')}`)
        break
    }
  }

  console.log()
  if (missingCount > 0 || typeMismatchCount > 0) {
    console.log(`  ${colors.red(`${missingCount + typeMismatchCount} issue${missingCount + typeMismatchCount !== 1 ? 's' : ''} found`)}`)
    if (missingCount > 0) console.log(`  ${colors.red(`  ${missingCount} missing`)}`)
    if (typeMismatchCount > 0)
      console.log(`  ${colors.yellow(`  ${typeMismatchCount} type mismatch${typeMismatchCount !== 1 ? 'es' : ''}`)}`)
    if (emptyCount > 0) console.log(`  ${colors.yellow(`  ${emptyCount} empty`)}`)
    process.exit(1)
  }

  console.log(`  ${colors.green(`✓ ${okCount} variable${okCount !== 1 ? 's' : ''} all valid`)}`)
  console.log()
}

function maskSecret(key: string, value: string): string {
  const secretPatterns = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'SALT', 'HASH', 'CREDENTIAL']
  const isSecret = secretPatterns.some((p) => key.toUpperCase().includes(p))
  if (isSecret && value.length > 8) {
    return value.slice(0, 4) + '…' + value.slice(-4)
  }
  return value
}
