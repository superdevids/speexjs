import { describe, it, expect } from 'vitest'
import { isPhone, isEmail, isURL } from '../src/validation/index.js'

describe('isPhone', () => {
  it('validates global format +1234567890', () => {
    expect(isPhone('+1234567890')).toBe(true)
  })
  it('validates 08123456789 (11 digits)', () => {
    expect(isPhone('08123456789')).toBe(true)
  })
  it('rejects too short (5 digits)', () => {
    expect(isPhone('08123')).toBe(false)
  })
  it('rejects empty string', () => {
    expect(isPhone('')).toBe(false)
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

  it('validates URL with port', () => {
    expect(isURL('https://example.com:8080')).toBe(true)
  })

  it('validates IPv4 as hostname', () => {
    expect(isURL('http://127.0.0.1')).toBe(true)
  })

  it('validates IPv4 with path', () => {
    expect(isURL('http://127.0.0.1/path')).toBe(true)
  })

  it('validates IPv6 literal', () => {
    expect(isURL('http://[::1]')).toBe(true)
  })

  it('validates IPv6 literal with port', () => {
    expect(isURL('http://[::1]:8080')).toBe(true)
  })

  it('validates localhost', () => {
    expect(isURL('http://localhost')).toBe(true)
  })

  it('validates localhost with path', () => {
    expect(isURL('http://localhost/path')).toBe(true)
  })

  it('validates URL with auth', () => {
    expect(isURL('http://user:pass@example.com')).toBe(true)
  })

  it('validates URL with fragment', () => {
    expect(isURL('https://example.com#section')).toBe(true)
  })

  it('validates long hostname with many labels', () => {
    expect(isURL('https://sub.domain.example.com')).toBe(true)
  })
})

describe('isEmail extra coverage', () => {
  it('validates quoted local part', () => {
    expect(isEmail('"quoted@local"@example.com')).toBe(true)
  })

  it('validates quoted local with escaped quote', () => {
    expect(isEmail('"escaped\\"quote"@example.com')).toBe(true)
  })

  it('rejects unterminated quoted local part', () => {
    expect(isEmail('"unterminated@example.com')).toBe(false)
  })

  it('rejects email exceeding 254 characters', () => {
    const local = 'a'.repeat(64)
    const domain = 'b'.repeat(189) + '.com'
    const email = local + '@' + domain
    expect(email.length).toBeGreaterThan(254)
    expect(isEmail(email)).toBe(false)
  })

  it('rejects local part exceeding 64 characters', () => {
    const local = 'a'.repeat(65)
    expect(isEmail(local + '@example.com')).toBe(false)
  })

  it('rejects domain with single label', () => {
    expect(isEmail('user@localhost')).toBe(false)
  })

  it('rejects domain with trailing dot', () => {
    expect(isEmail('user@example.com.')).toBe(false)
  })

  it('rejects domain label starting with hyphen', () => {
    expect(isEmail('user@-example.com')).toBe(false)
  })

  it('validates special chars in local part', () => {
    expect(isEmail('user!test@example.com')).toBe(true)
  })

  it('rejects incomplete escaped quote', () => {
    expect(isEmail('"test\\"@example.com')).toBe(false)
  })
})


