import { describe, it, expect } from 'vitest'
import {
  hash,
  simpleHash,
  randomHex,
  base64Encode,
  base64Decode,
  generateToken,
  generateOTP,
  xorCipher,
  checksum,
  constantTimeEqual,
} from '../src/crypto/index.js'

describe('hash', () => {
  it('returns same hash for same input', () => {
    expect(hash('hello')).toBe(hash('hello'))
  })

  it('returns different hash for different input', () => {
    expect(hash('hello')).not.toBe(hash('world'))
  })

  it('returns a number', () => {
    expect(typeof hash('test')).toBe('number')
  })

  it('handles empty string', () => {
    expect(typeof hash('')).toBe('number')
  })
})

describe('simpleHash', () => {
  it('is deterministic', () => {
    expect(simpleHash('hello')).toBe(simpleHash('hello'))
  })

  it('returns a 32-character hex string', () => {
    expect(simpleHash('test')).toMatch(/^[0-9a-f]{32}$/)
  })

  it('produces different values for different inputs', () => {
    expect(simpleHash('hello')).not.toBe(simpleHash('world'))
  })
})

describe('randomHex', () => {
  it('returns correct length hex string', () => {
    expect(randomHex(16)).toMatch(/^[0-9a-f]{32}$/)
    expect(randomHex(8)).toMatch(/^[0-9a-f]{16}$/)
  })

  it('returns different values on successive calls', () => {
    expect(randomHex()).not.toBe(randomHex())
  })

  it('defaults to 16 bytes (32 hex chars)', () => {
    expect(randomHex()).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('base64Encode / base64Decode', () => {
  it('roundtrips a string', () => {
    const original = 'hello world'
    expect(base64Decode(base64Encode(original))).toBe(original)
  })

  it('handles empty string', () => {
    expect(base64Decode(base64Encode(''))).toBe('')
  })

  it('handles special characters', () => {
    const original = 'héllo wörld 🚀'
    expect(base64Decode(base64Encode(original))).toBe(original)
  })

  it('encodes to a non-empty string', () => {
    expect(base64Encode('test').length).toBeGreaterThan(0)
  })
})

describe('generateToken', () => {
  it('returns a hex string', () => {
    expect(generateToken()).toMatch(/^[0-9a-f]+$/)
  })

  it('defaults to 64 characters (32 bytes)', () => {
    expect(generateToken()).toHaveLength(64)
  })

  it('respects custom byte length', () => {
    expect(generateToken(16)).toHaveLength(32)
  })

  it('generates different tokens on each call', () => {
    expect(generateToken()).not.toBe(generateToken())
  })
})

describe('generateOTP', () => {
  it('defaults to 6 digits', () => {
    expect(generateOTP()).toMatch(/^\d{6}$/)
  })

  it('respects custom length', () => {
    expect(generateOTP(4)).toMatch(/^\d{4}$/)
    expect(generateOTP(8)).toMatch(/^\d{8}$/)
  })

  it('contains only numeric characters', () => {
    const otp = generateOTP(100)
    expect(otp).toMatch(/^\d+$/)
  })
})

describe('xorCipher', () => {
  it('is symmetrical (applying twice returns original)', () => {
    const original = 'secret message'
    const encrypted = xorCipher(original, 'key')
    const decrypted = xorCipher(encrypted, 'key')
    expect(decrypted).toBe(original)
  })

  it('produces different output with different keys', () => {
    const input = 'hello'
    expect(xorCipher(input, 'key1')).not.toBe(xorCipher(input, 'key2'))
  })
})

describe('checksum', () => {
  it('returns an 8-character hex string', () => {
    expect(checksum('hello')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('is deterministic', () => {
    expect(checksum('hello')).toBe(checksum('hello'))
  })

  it('differs for different inputs', () => {
    expect(checksum('hello')).not.toBe(checksum('world'))
  })
})

describe('constantTimeEqual', () => {
  it('returns true for matching strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true)
  })

  it('returns false for different strings', () => {
    expect(constantTimeEqual('abc', 'xyz')).toBe(false)
  })

  it('returns false for different lengths', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
  })

  it('returns true for empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true)
  })
})
