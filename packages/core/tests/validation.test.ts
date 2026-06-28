import { describe, it, expect } from 'vitest'
import { isNIK, isNPWP, isPhone, isEmail, isURL } from '../src/validation/index.js'

describe('isNIK', () => {
  it('validates correct male NIK', () => {
    expect(isNIK('3201010203940001')).toBe(true) // Male, born 2 Mar 1994
  })
  it('validates correct female NIK (day+40)', () => {
    expect(isNIK('3201015203940001')).toBe(true) // Female, born 12 Mar 1994
  })
  it('rejects too short', () => {
    expect(isNIK('12345')).toBe(false)
  })
  it('rejects too long', () => {
    expect(isNIK('12345678901234567890')).toBe(false)
  })
  it('rejects non-numeric', () => {
    expect(isNIK('ABCDEFGHIJKLMNOP')).toBe(false)
  })
  it('rejects invalid month', () => {
    expect(isNIK('3201010213940001')).toBe(false) // month 13
  })
  it('rejects invalid date (Feb 29 non-leap)', () => {
    expect(isNIK('3201012902230001')).toBe(false) // 29 Feb 2023
  })
  it('accepts valid date (Feb 29 leap)', () => {
    expect(isNIK('3201012902240001')).toBe(true) // 29 Feb 2024
  })
  it('rejects empty string', () => {
    expect(isNIK('')).toBe(false)
  })
  it('accepts with dots as separator', () => {
    expect(isNIK('32.01.01.020394.0001')).toBe(true)
  })
})

describe('isNPWP', () => {
  it('validates correct NPWP (15 digits)', () => {
    // Checksum: 12345678901234 → (11 - 205%11) % 10 = 4, so 123456789012344
    expect(isNPWP('123456789012344')).toBe(true)
  })
  it('rejects invalid checksum', () => {
    expect(isNPWP('123456789012345')).toBe(false)
  })
  it('rejects too short', () => {
    expect(isNPWP('12345')).toBe(false)
  })
  it('rejects non-numeric', () => {
    expect(isNPWP('ABCDEFGHIJKLMNO')).toBe(false)
  })
  it('accepts formatted NPWP', () => {
    expect(isNPWP('12.345.678.9-012.344')).toBe(true)
  })
  it('rejects empty string', () => {
    expect(isNPWP('')).toBe(false)
  })
})

describe('isPhone', () => {
  it('validates Indonesian mobile (08xx)', () => {
    expect(isPhone('08123456789')).toBe(true)
  })
  it('validates Indonesian mobile (+628xx)', () => {
    expect(isPhone('+628123456789')).toBe(true)
  })
  it('validates Indonesian mobile (628xx)', () => {
    expect(isPhone('628123456789')).toBe(true)
  })
  it('rejects too short', () => {
    expect(isPhone('08123')).toBe(false)
  })
  it('rejects invalid prefix', () => {
    expect(isPhone('0800123456789')).toBe(false)
  })
  it('rejects empty string', () => {
    expect(isPhone('')).toBe(false)
  })
  it('validates any country phone', () => {
    expect(isPhone('+14155552671', 'any')).toBe(true)
  })
  it('rejects non-numeric after +', () => {
    expect(isPhone('+62abc')).toBe(false)
  })
})

describe('isEmail', () => {
  it('validates simple email', () => {
    expect(isEmail('user@example.com')).toBe(true)
  })
  it('validates email with dots', () => {
    expect(isEmail('user.name@example.com')).toBe(true)
  })
  it('validates email with plus', () => {
    expect(isEmail('user+tag@example.com')).toBe(true)
  })
  it('rejects missing @', () => {
    expect(isEmail('userexample.com')).toBe(false)
  })
  it('rejects empty', () => {
    expect(isEmail('')).toBe(false)
  })
  it('rejects double dots in domain', () => {
    expect(isEmail('user@example..com')).toBe(false)
  })
  it('rejects no domain', () => {
    expect(isEmail('user@')).toBe(false)
  })
  it('rejects no local part', () => {
    expect(isEmail('@example.com')).toBe(false)
  })
})

describe('isURL', () => {
  it('validates https URL', () => {
    expect(isURL('https://example.com')).toBe(true)
  })
  it('validates http URL', () => {
    expect(isURL('http://example.com')).toBe(true)
  })
  it('validates URL with path', () => {
    expect(isURL('https://example.com/path/to/page')).toBe(true)
  })
  it('validates URL with query', () => {
    expect(isURL('https://example.com?q=search')).toBe(true)
  })
  it('rejects missing protocol', () => {
    expect(isURL('example.com')).toBe(false)
  })
  it('rejects ftp protocol', () => {
    expect(isURL('ftp://example.com')).toBe(false)
  })
  it('rejects empty string', () => {
    expect(isURL('')).toBe(false)
  })
  it('rejects just protocol', () => {
    expect(isURL('https://')).toBe(false)
  })
})
