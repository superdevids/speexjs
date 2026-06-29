import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseCsv,
  stringifyCsv,
  safeJsonParse,
  env,
  envInt,
  envBool,
} from '../src/io/index.js'

describe('parseCsv', () => {
  it('parses CSV with headers', () => {
    const csv = 'name,age\nAlice,30\nBob,25'
    const result = parseCsv(csv)
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('parses CSV without headers', () => {
    const csv = 'Alice,30\nBob,25'
    const result = parseCsv(csv, { header: false })
    expect(result).toEqual([
      { '0': 'Alice', '1': '30' },
      { '0': 'Bob', '1': '25' },
    ])
  })

  it('uses custom delimiter', () => {
    const csv = 'name;age\nAlice;30\nBob;25'
    const result = parseCsv(csv, { delimiter: ';' })
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('skips empty lines by default', () => {
    const csv = 'name,age\n\nAlice,30\n\nBob,25\n'
    const result = parseCsv(csv)
    expect(result).toHaveLength(2)
  })

  it('handles quoted fields with commas', () => {
    const csv = 'name,desc\nAlice,"has a cat, and a dog"\nBob,none'
    const result = parseCsv(csv)
    expect(result[0].desc).toBe('has a cat, and a dog')
  })

  it('returns empty array for empty input', () => {
    expect(parseCsv('')).toEqual([])
  })

  it('handles escaped quotes', () => {
    const csv = [
      'name,quote',
      'Alice,"she said ""hello"""',
      'Bob,"""yes"',
    ].join('\n')
    const result = parseCsv(csv)
    expect(result[0].quote).toBe('she said "hello"')
  })
})

describe('stringifyCsv', () => {
  it('converts records to CSV string', () => {
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]
    const result = stringifyCsv(data)
    expect(result).toBe('name,age\nAlice,30\nBob,25')
  })

  it('escapes fields containing delimiter', () => {
    const data = [{ name: 'Alice', desc: 'has a cat, and a dog' }]
    const result = stringifyCsv(data)
    expect(result).toBe('name,desc\nAlice,"has a cat, and a dog"')
  })

  it('returns empty string for empty array', () => {
    expect(stringifyCsv([])).toBe('')
  })

  it('uses custom delimiter', () => {
    const data = [{ name: 'Alice', age: 30 }]
    const result = stringifyCsv(data, { delimiter: ';' })
    expect(result).toBe('name;age\nAlice;30')
  })

  it('escapes fields with quotes', () => {
    const data = [{ note: 'she said "hello"' }]
    const result = stringifyCsv(data)
    expect(result).toBe('note\n"she said ""hello"""')
  })
})

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse<{ a: number }>('{"a": 1}')).toEqual({ a: 1 })
  })

  it('returns null for invalid JSON with no default', () => {
    expect(safeJsonParse('invalid')).toBeNull()
  })

  it('returns custom default for invalid JSON', () => {
    expect(safeJsonParse('invalid', { fallback: true })).toEqual({ fallback: true })
  })

  it('parses arrays', () => {
    expect(safeJsonParse<number[]>('[1, 2, 3]')).toEqual([1, 2, 3])
  })
})

describe('env / envInt / envBool', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('reads string env var', () => {
    process.env.TEST_VAR = 'hello'
    expect(env('TEST_VAR')).toBe('hello')
  })

  it('returns default when env var is not set', () => {
    expect(env('NONEXISTENT', 'default')).toBe('default')
  })

  it('returns empty string when env var is not set and no default', () => {
    expect(env('NONEXISTENT')).toBe('')
  })

  it('reads integer env var', () => {
    process.env.TEST_INT = '42'
    expect(envInt('TEST_INT')).toBe(42)
  })

  it('returns default for missing int env var', () => {
    expect(envInt('NONEXISTENT', 99)).toBe(99)
  })

  it('returns default for invalid int env var', () => {
    process.env.TEST_INT = 'not-a-number'
    expect(envInt('TEST_INT', 0)).toBe(0)
  })

  it('reads boolean env var', () => {
    process.env.TEST_BOOL = 'true'
    expect(envBool('TEST_BOOL')).toBe(true)
    process.env.TEST_BOOL = '1'
    expect(envBool('TEST_BOOL')).toBe(true)
    process.env.TEST_BOOL = 'yes'
    expect(envBool('TEST_BOOL')).toBe(true)
  })

  it('returns false for non-truthy values', () => {
    process.env.TEST_BOOL = 'false'
    expect(envBool('TEST_BOOL')).toBe(false)
    process.env.TEST_BOOL = '0'
    expect(envBool('TEST_BOOL')).toBe(false)
    process.env.TEST_BOOL = 'no'
    expect(envBool('TEST_BOOL')).toBe(false)
  })

  it('returns default for missing bool env var', () => {
    expect(envBool('NONEXISTENT', true)).toBe(true)
  })
})
