import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { colors } from '../../native/colors.js'

interface EnvVar {
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'enum'
  enumValues?: string[]
}

interface EnvGenerateOptions {
  overwrite?: boolean
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

function isInteger(s: string): boolean {
  return /^-?\d+$/.test(s)
}

function isBoolean(s: string): boolean {
  return ['true', 'false', '1', '0', 'yes', 'no'].includes(s.toLowerCase())
}

function isLikelyArray(s: string): boolean {
  if (!s.includes(',')) return false
  const parts = s
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  return parts.length > 1 && parts.every((p) => !p.includes(' '))
}

function detectType(_key: string, values: string[]): EnvVar {
  const primary = values[0] ?? ''
  const uniqueValues = [...new Set(values)]

  if (uniqueValues.every((v) => isBoolean(v))) {
    return { key: _key, value: primary, type: 'boolean' }
  }

  if (uniqueValues.every((v) => isInteger(v))) {
    return { key: _key, value: primary, type: 'number' }
  }

  if (uniqueValues.some((v) => isLikelyArray(v))) {
    return { key: _key, value: primary, type: 'array' }
  }

  if (uniqueValues.length >= 2 && uniqueValues.length <= 5) {
    const commonEnums = ['development', 'production', 'testing', 'staging', 'local', 'debug', 'info', 'warn', 'error']
    if (uniqueValues.some((v) => commonEnums.includes(v))) {
      return { key: _key, value: primary, type: 'enum', enumValues: uniqueValues.sort() }
    }
    if (uniqueValues.every((v) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(v))) {
      return { key: _key, value: primary, type: 'enum', enumValues: uniqueValues.sort() }
    }
  }

  return { key: _key, value: primary, type: 'string' }
}

function formatDefaultValue(v: EnvVar): string {
  if (v.value === '') return ''

  switch (v.type) {
    case 'number':
      return String(Number(v.value))
    case 'boolean':
      return String(v.value.toLowerCase() === 'true' || v.value === '1' || v.value.toLowerCase() === 'yes')
    case 'array': {
      const parts = v.value
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
      return `[${parts.map((p) => `'${p}'`).join(', ')}]`
    }
    case 'enum':
    case 'string':
      return `'${v.value.replace(/'/g, "\\'")}'`
  }
}

function generateEnvTs(vars: EnvVar[]): string {
  const lines: string[] = []
  lines.push('// AUTO-GENERATED — DO NOT EDIT')
  lines.push('// Run: speexjs env:generate')
  lines.push("import { env } from 'speexjs'")
  lines.push('')
  lines.push('export const Env = {')

  const sorted = [...vars].sort((a, b) => a.key.localeCompare(b.key))

  for (const v of sorted) {
    const key = v.key

    let expr: string
    switch (v.type) {
      case 'number': {
        const defaultVal = v.value ? formatDefaultValue(v) : ''
        expr = `env.int('${key}'${defaultVal ? `, ${defaultVal}` : ''})`
        break
      }
      case 'boolean': {
        const defaultVal = v.value ? formatDefaultValue(v) : ''
        expr = `env.bool('${key}'${defaultVal ? `, ${defaultVal}` : ''})`
        break
      }
      case 'array': {
        const defaultVal = v.value ? formatDefaultValue(v) : ''
        expr = `env.array('${key}'${defaultVal ? `, ${defaultVal}` : ''})`
        break
      }
      case 'enum': {
        const unionStr = v.enumValues?.map((ev) => `'${ev}'`).join(' | ') ?? 'string'
        const defaultVal = v.value ? formatDefaultValue(v) : ''
        expr = `env('${key}'${defaultVal ? `, ${defaultVal}` : ''}) as ${unionStr}`
        break
      }
      default: {
        const defaultVal = v.value ? formatDefaultValue(v) : ''
        expr = `env('${key}'${defaultVal ? `, ${defaultVal}` : ''})`
        break
      }
    }

    lines.push(`  ${key}: ${expr},`)
  }

  lines.push('} as const')
  lines.push('')

  return lines.join('\n')
}

export async function envGenerate(options: EnvGenerateOptions = {}): Promise<void> {
  const cwd = process.cwd()
  const envFiles = ['.env', '.env.local', '.env.production', '.env.staging']

  const parsedVars: Record<string, string[]> = {}

  for (const file of envFiles) {
    const filePath = resolve(cwd, file)
    if (!existsSync(filePath)) continue
    const content = readFileSync(filePath, 'utf-8')
    const parsed = parseDotEnv(content)
    for (const [key, value] of Object.entries(parsed)) {
      if (!parsedVars[key]) parsedVars[key] = []
      parsedVars[key]!.push(value)
    }
  }

  if (Object.keys(parsedVars).length === 0) {
    console.error(`  ${colors.red('✗')} No .env file found in ${cwd}`)
    console.log(`  ${colors.dim('Create a .env file first, then run speexjs env:generate')}`)
    process.exit(1)
  }

  const envVars: EnvVar[] = []
  for (const [key, values] of Object.entries(parsedVars)) {
    envVars.push(detectType(key, values))
  }

  const outPath = resolve(cwd, 'src/env.ts')
  if (existsSync(outPath) && !options.overwrite) {
    console.log(`  ${colors.yellow('⚠')} src/env.ts already exists — use --overwrite to regenerate`)
    process.exit(0)
  }

  const content = generateEnvTs(envVars)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, content, 'utf-8')

  const typeLabels: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    array: 'string[]',
    enum: 'union',
  }

  console.log(
    `  ${colors.green('✓')} Generated ${colors.bold('src/env.ts')} with ${envVars.length} variable${envVars.length !== 1 ? 's' : ''}`,
  )
  console.log()
  for (const v of envVars) {
    const label = typeLabels[v.type] ?? v.type
    const extra = v.type === 'enum' && v.enumValues ? ` (${v.enumValues.join(' | ')})` : ''
    const defaultValue = v.value ? ` = ${formatDefaultValue(v)}` : ''
    console.log(`  ${colors.cyan('→')} ${v.key}${colors.dim(`: ${label}${extra}${defaultValue}`)}`)
  }
  console.log()
  console.log(`  ${colors.dim('Import in your code with:')} ${colors.bold("import { Env } from './env'")}`)
}
