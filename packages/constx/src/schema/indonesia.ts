import { Schema, SchemaError } from './types.js'
import { msg } from './messages.js'

//
// Validator functions below are derived from constx-core/validation.
// When the monorepo workspace is active, these can be replaced with:
//   import { isNIK, isNPWP, isPhone } from 'constx-core/validation'
//

// ─── NIK validator ──────────────────────────────────────────

function isNIK(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 16) return false

  const rawDay = Number.parseInt(digits.slice(6, 8), 10)
  const month = Number.parseInt(digits.slice(8, 10), 10)
  const year = Number.parseInt(digits.slice(10, 12), 10)

  if (rawDay < 1 || rawDay > 71) return false
  if (month < 1 || month > 12) return false

  let day = rawDay
  if (day >= 41) day -= 40

  const fullYear = year < 70 ? 2000 + year : 1900 + year
  const date = new Date(fullYear, month - 1, day)

  return (
    date.getFullYear() === fullYear &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

// ─── NPWP validator ─────────────────────────────────────────

function isNPWP(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 15 && digits.length !== 16) return false

  const nums: number[] = []
  for (let i = 0; i < digits.length; i++) {
    nums.push(Number.parseInt(digits[i]!, 10))
  }

  const checkDigit = nums[nums.length - 1]!

  let sum = 0
  for (let i = 0; i < nums.length - 1; i++) {
    sum += nums[i]! * [3, 7, 1][i % 3]!
  }

  const computed = (11 - (sum % 11)) % 10
  return computed === checkDigit
}

// ─── Phone validator ────────────────────────────────────────

const INDONESIAN_PREFIXES: ReadonlyArray<[number, number]> = [
  [11, 19],
  [21, 29],
  [51, 59],
  [77, 79],
  [95, 99],
]

function isValidIndonesianPrefix(prefix: number): boolean {
  for (const [min, max] of INDONESIAN_PREFIXES) {
    if (prefix >= min && prefix <= max) return true
  }
  return false
}

function isPhone(value: string, country: 'id' | 'any' = 'id'): boolean {
  const digits = value.replace(/\D/g, '')

  if (country === 'any') {
    return digits.length >= 10 && digits.length <= 15
  }

  if (digits.length < 10) return false

  let normalized: string
  if (digits.startsWith('62')) {
    normalized = digits.slice(2)
  } else if (digits.startsWith('0')) {
    normalized = digits.slice(1)
  } else {
    normalized = digits
  }

  if (normalized.length < 10 || normalized.length > 13) return false
  if (!normalized.startsWith('8')) return false

  const prefix = Number.parseInt(normalized.slice(1, 3), 10)
  return isValidIndonesianPrefix(prefix)
}

// ─── Schema classes ─────────────────────────────────────────

export class NIKSchema extends Schema<string> {
  _parse(value: unknown): string {
    if (typeof value !== 'string') throw new SchemaError(msg('type_string'))
    if (!isNIK(value)) throw new SchemaError(msg('indonesia_nik'))
    return value
  }
}

export class NPWPSchema extends Schema<string> {
  _parse(value: unknown): string {
    if (typeof value !== 'string') throw new SchemaError(msg('type_string'))
    if (!isNPWP(value)) throw new SchemaError(msg('indonesia_npwp'))
    return value
  }
}

export class PhoneSchema extends Schema<string> {
  _parse(value: unknown): string {
    if (typeof value !== 'string') throw new SchemaError(msg('type_string'))
    if (!isPhone(value, 'id')) throw new SchemaError(msg('indonesia_phone'))
    return value
  }
}

const ALAMAT_KEYWORDS = [
  /^jl[.\s]/i,
  /^jalan\s/i,
  /^gg[.\s]/i,
  /^gang\s/i,
  /rt\s*\d/i,
  /rw\s*\d/i,
  /dsn/i,
  /dusun/i,
  /kec/i,
  /kelurahan/i,
  /desa/i,
  /perum/i,
  /komplek/i,
]

export class AlamatSchema extends Schema<string> {
  _parse(value: unknown): string {
    if (typeof value !== 'string') throw new SchemaError(msg('type_string'))
    if (value.length < 10) throw new SchemaError(msg('indonesia_alamat'))

    let hasKeyword = false
    for (const pattern of ALAMAT_KEYWORDS) {
      if (pattern.test(value)) {
        hasKeyword = true
        break
      }
    }
    if (!hasKeyword) throw new SchemaError(msg('indonesia_alamat'))

    return value
  }
}

export class KodeposSchema extends Schema<string> {
  _parse(value: unknown): string {
    if (typeof value !== 'string') throw new SchemaError(msg('type_string'))
    const digits = value.replace(/\s/g, '')
    if (!/^\d{5}$/.test(digits)) throw new SchemaError(msg('indonesia_kodepos'))
    return digits
  }
}

export class RekeningSchema extends Schema<string> {
  _parse(value: unknown): string {
    if (typeof value !== 'string') throw new SchemaError(msg('type_string'))
    const digits = value.replace(/\s/g, '')
    if (!/^\d{10,16}$/.test(digits)) throw new SchemaError(msg('indonesia_rekening'))
    return digits
  }
}
