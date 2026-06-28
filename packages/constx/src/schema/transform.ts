import { Schema, SchemaError } from './types.js'
import { msg } from './messages.js'

// ─── CoerceStringSchema ─────────────────────────────────────

export class CoerceStringSchema extends Schema<string> {
  _parse(value: unknown): string {
    if (value === null || value === undefined) throw new SchemaError(msg('type_string'))
    return String(value)
  }
}

// ─── CoerceNumberSchema ─────────────────────────────────────

export class CoerceNumberSchema extends Schema<number> {
  _parse(value: unknown): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length === 0) throw new SchemaError(msg('coerce_number_fail'))
      const num = Number(trimmed)
      if (Number.isNaN(num)) throw new SchemaError(msg('coerce_number_fail'))
      return num
    }
    if (typeof value === 'bigint') return Number(value)
    if (value instanceof Date) return value.getTime()
    throw new SchemaError(msg('coerce_number_fail'))
  }
}

// ─── CoerceBooleanSchema ────────────────────────────────────

export class CoerceBooleanSchema extends Schema<boolean> {
  _parse(value: unknown): boolean {
    if (typeof value === 'boolean') return value
    if (value === 0 || value === 1) return value === 1
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim()
      if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') return true
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') return false
    }
    return Boolean(value)
  }
}

// ─── CoerceDateSchema ───────────────────────────────────────

export class CoerceDateSchema extends Schema<Date> {
  _parse(value: unknown): Date {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) throw new SchemaError(msg('coerce_date_fail'))
      return value
    }
    if (typeof value === 'number' || typeof value === 'string') {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) throw new SchemaError(msg('coerce_date_fail'))
      return date
    }
    throw new SchemaError(msg('coerce_date_fail'))
  }
}

// ─── TransformSchema (standalone) ──────────────────────────

export class StandaloneTransformSchema<T> extends Schema<T> {
  constructor(private readonly fn: (value: unknown) => T) {
    super()
  }

  _parse(value: unknown): T {
    return this.fn(value)
  }
}
