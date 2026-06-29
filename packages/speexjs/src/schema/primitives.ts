import { Schema, SchemaError } from './types.js'
import { msg } from './messages.js'

// ─── StringSchema ───────────────────────────────────────────

export class StringSchema extends Schema<string> {
  private checks: Array<(val: string) => void> = []

  min(n: number): this {
    this.checks.push(val => {
      if (val.length < n) throw new SchemaError(msg('string_min', { min: n }))
    })
    return this
  }

  max(n: number): this {
    this.checks.push(val => {
      if (val.length > n) throw new SchemaError(msg('string_max', { max: n }))
    })
    return this
  }

  length(n: number): this {
    this.checks.push(val => {
      if (val.length !== n) throw new SchemaError(msg('string_length', { length: n }))
    })
    return this
  }

  email(): this {
    this.checks.push(val => {
      if (!isValidEmail(val)) throw new SchemaError(msg('string_email'))
    })
    return this
  }

  url(): this {
    this.checks.push(val => {
      try {
        const url = new URL(val)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
      } catch {
        throw new SchemaError(msg('string_url'))
      }
    })
    return this
  }

  regex(pattern: RegExp): this {
    this.checks.push(val => {
      if (!pattern.test(val)) throw new SchemaError(msg('string_regex'))
    })
    return this
  }

  includes(substring: string): this {
    this.checks.push(val => {
      if (!val.includes(substring)) throw new SchemaError(msg('string_includes', { substring }))
    })
    return this
  }

  startsWith(prefix: string): this {
    this.checks.push(val => {
      if (!val.startsWith(prefix)) throw new SchemaError(msg('string_starts_with', { prefix }))
    })
    return this
  }

  endsWith(suffix: string): this {
    this.checks.push(val => {
      if (!val.endsWith(suffix)) throw new SchemaError(msg('string_ends_with', { suffix }))
    })
    return this
  }

  trim(): StringTrimSchema {
    return new StringTrimSchema(this)
  }

  lowercase(): StringLowercaseSchema {
    return new StringLowercaseSchema(this)
  }

  uppercase(): StringUppercaseSchema {
    return new StringUppercaseSchema(this)
  }

  _parse(value: unknown): string {
    if (typeof value !== 'string') throw new SchemaError(msg('type_string'))
    for (const check of this.checks) check(value)
    return value
  }
}

// ─── String transform variants ──────────────────────────────

class StringTrimSchema extends Schema<string> {
  constructor(private readonly inner: StringSchema) {
    super()
  }

  _parse(value: unknown): string {
    const result = this.inner._parse(value)
    return result.trim()
  }
}

class StringLowercaseSchema extends Schema<string> {
  constructor(private readonly inner: StringSchema) {
    super()
  }

  _parse(value: unknown): string {
    const result = this.inner._parse(value)
    return result.toLowerCase()
  }
}

class StringUppercaseSchema extends Schema<string> {
  constructor(private readonly inner: StringSchema) {
    super()
  }

  _parse(value: unknown): string {
    const result = this.inner._parse(value)
    return result.toUpperCase()
  }
}

// ─── NumberSchema ───────────────────────────────────────────

export class NumberSchema extends Schema<number> {
  private checks: Array<(val: number) => void> = []

  min(n: number): this {
    this.checks.push(val => {
      if (val < n) throw new SchemaError(msg('number_min', { min: n }))
    })
    return this
  }

  max(n: number): this {
    this.checks.push(val => {
      if (val > n) throw new SchemaError(msg('number_max', { max: n }))
    })
    return this
  }

  int(): this {
    this.checks.push(val => {
      if (!Number.isInteger(val)) throw new SchemaError(msg('number_int'))
    })
    return this
  }

  positive(): this {
    this.checks.push(val => {
      if (val <= 0) throw new SchemaError(msg('number_positive'))
    })
    return this
  }

  negative(): this {
    this.checks.push(val => {
      if (val >= 0) throw new SchemaError(msg('number_negative'))
    })
    return this
  }

  finite(): this {
    this.checks.push(val => {
      if (!Number.isFinite(val)) throw new SchemaError(msg('number_finite'))
    })
    return this
  }

  safe(): this {
    this.checks.push(val => {
      if (!Number.isSafeInteger(val)) throw new SchemaError(msg('number_safe'))
    })
    return this
  }

  _parse(value: unknown): number {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new SchemaError(msg('type_number'))
    }
    for (const check of this.checks) check(value)
    return value
  }
}

// ─── BooleanSchema ──────────────────────────────────────────

export class BooleanSchema extends Schema<boolean> {
  _parse(value: unknown): boolean {
    if (typeof value !== 'boolean') throw new SchemaError(msg('type_boolean'))
    return value
  }
}

// ─── BigIntSchema ───────────────────────────────────────────

export class BigIntSchema extends Schema<bigint> {
  _parse(value: unknown): bigint {
    if (typeof value !== 'bigint') throw new SchemaError(msg('type_bigint'))
    return value
  }
}

// ─── SymbolSchema ───────────────────────────────────────────

export class SymbolSchema extends Schema<symbol> {
  _parse(value: unknown): symbol {
    if (typeof value !== 'symbol') throw new SchemaError(msg('type_symbol'))
    return value
  }
}

// ─── UndefinedSchema ────────────────────────────────────────

export class UndefinedSchema extends Schema<undefined> {
  _parse(value: unknown): undefined {
    if (value !== undefined) throw new SchemaError(msg('type_undefined'))
    return undefined
  }
}

// ─── NullSchema ─────────────────────────────────────────────

export class NullSchema extends Schema<null> {
  _parse(value: unknown): null {
    if (value !== null) throw new SchemaError(msg('type_null'))
    return null
  }
}

// ─── NaNSchema ──────────────────────────────────────────────

export class NaNSchema extends Schema<number> {
  _parse(value: unknown): number {
    if (typeof value !== 'number' || !Number.isNaN(value)) {
      throw new SchemaError(msg('type_nan'))
    }
    return value as number
  }
}

// ─── Internal email validator ───────────────────────────────

function isValidEmail(value: string): boolean {
  if (value.length > 254) return false

  const atIndex = value.lastIndexOf('@')
  if (atIndex < 1 || atIndex === value.length - 1) return false

  const localPart = value.slice(0, atIndex)
  const domainPart = value.slice(atIndex + 1)

  if (localPart.length > 64) return false
  if (domainPart.length > 255) return false
  if (domainPart.split('.').length < 2) return false

  if (localPart.startsWith('"') && localPart.endsWith('"')) {
    if (localPart.length < 2) return false
    let i = 1
    while (i < localPart.length - 1) {
      const ch = localPart[i]!
      if (ch === '\\') {
        i++
        if (i >= localPart.length - 1) return false
      } else if (ch === '"') {
        return false
      }
      i++
    }
    return true
  }

  if (localPart.length === 0 || localPart.startsWith('.') || localPart.endsWith('.')) return false
  for (let i = 0; i < localPart.length; i++) {
    const ch = localPart[i]!
    if ('<>=()[]\\,;:\u0040\u0022'.includes(ch)) return false
  }
  for (let i = 1; i < localPart.length; i++) {
    if (localPart[i] === '.' && localPart[i - 1] === '.') return false
  }

  for (const label of domainPart.split('.')) {
    if (label.length === 0 || label.length > 63) return false
    if (label.startsWith('-') || label.endsWith('-')) return false
    for (let i = 0; i < label.length; i++) {
      const ch = label[i]!
      if (!((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '-')) {
        return false
      }
    }
  }

  return true
}
