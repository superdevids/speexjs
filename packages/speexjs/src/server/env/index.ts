import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

function loadDotEnv(): void {
  try {
    const envPath = join(process.cwd(), '.env')
    const content = readFileSync(envPath, 'utf-8')
    const parsed = parseDotEnv(content)
    for (const [key, value] of Object.entries(parsed)) {
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // .env file not found or unreadable — skip silently
  }
}

loadDotEnv()

function env<T = string>(key: string, defaultValue?: T): T {
  const val = process.env[key]
  if (val === undefined) {
    if (defaultValue !== undefined) return defaultValue
    throw new Error(`Environment variable "${key}" is not set and no default was provided`)
  }
  return val as unknown as T
}

namespace env {
  export function int(key: string, defaultValue?: number): number {
    const val = process.env[key]
    if (val === undefined) {
      if (defaultValue !== undefined) return defaultValue
      throw new Error(`Environment variable "${key}" is not set and no default was provided`)
    }
    const num = Number(val)
    if (Number.isNaN(num)) {
      throw new Error(`Environment variable "${key}" cannot be parsed as integer: "${val}"`)
    }
    return Math.floor(num)
  }

  export function bool(key: string, defaultValue?: boolean): boolean {
    const val = process.env[key]
    if (val === undefined) {
      if (defaultValue !== undefined) return defaultValue
      throw new Error(`Environment variable "${key}" is not set and no default was provided`)
    }
    return val === 'true' || val === '1' || val === 'yes'
  }

  export function array(key: string, defaultValue?: string[]): string[] {
    const val = process.env[key]
    if (val === undefined) {
      if (defaultValue !== undefined) return defaultValue
      throw new Error(`Environment variable "${key}" is not set and no default was provided`)
    }
    return val
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
}

export { env }

export function requireEnv(...keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }
}

export function validateEnv(rules: Record<string, { required?: boolean; pattern?: RegExp; message?: string }>): void {
  for (const [key, rule] of Object.entries(rules)) {
    const value = process.env[key]
    if (rule.required && !value) {
      console.error(rule.message ?? `Missing required env: ${key}`)
      process.exit(1)
    }
    if (value && rule.pattern && !rule.pattern.test(value)) {
      console.error(rule.message ?? `Invalid env: ${key}`)
      process.exit(1)
    }
  }
}

export function generateEnvExample(schema: Record<string, { value?: string; description?: string }>): string {
  const lines: string[] = []
  for (const [key, def] of Object.entries(schema)) {
    if (def.description) {
      lines.push(`# ${def.description}`)
    }
    lines.push(`${key}=${def.value ?? ''}`)
  }
  return lines.join('\n') + '\n'
}
