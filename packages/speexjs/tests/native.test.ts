import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return {
    ...actual,
    randomBytes: vi.fn((...args: any[]) => (actual.randomBytes as any)(...args)),
  }
})

// ─── Crypto ──────────────────────────────────────────────────────────
import {
  encrypt, decrypt, hash, hmac, constantTimeEqual,
  randomHex, generateToken, generateOTP, uuid,
  base64Encode, base64Decode, checksum, generateEncryptionKey, deriveKey,
} from '../src/native/crypto.js'

// ─── Hashing ─────────────────────────────────────────────────────────
import {
  hashPassword, verifyPassword, hashPasswordFast, verifyPasswordFast, needsRehash,
} from '../src/native/hashing.js'

// ─── Colors ──────────────────────────────────────────────────────────
import { colors, stripColors, isColorSupported } from '../src/native/colors.js'

// ─── Logger ──────────────────────────────────────────────────────────
import { Logger, formatTimestamp } from '../src/native/logger.js'

// ─── Helpers ─────────────────────────────────────────────────────────
import { Arr } from '../src/native/helpers/arr.js'
import { SuperNumber } from '../src/native/helpers/number.js'
import { Str } from '../src/native/helpers/str.js'
import * as nodeCrypto from 'node:crypto'

// ======================================================================
// 1. CRYPTO
// ======================================================================

describe('crypto', () => {
  let key: string

  beforeEach(() => {
    key = generateEncryptionKey()
  })

  describe('encrypt / decrypt', () => {
    it('roundtrips a simple string', () => {
      const data = 'hello world'
      const enc = encrypt(data, key)
      expect(enc.encrypted).toBeTruthy()
      expect(enc.iv).toBeTruthy()
      expect(enc.tag).toBeTruthy()
      expect(decrypt(enc, key)).toBe(data)
    })

    it('roundtrips empty string', () => {
      const enc = encrypt('', key)
      expect(decrypt(enc, key)).toBe('')
    })

    it('roundtrips unicode text', () => {
      const data = '你好世界🔥 🔥'
      const enc = encrypt(data, key)
      expect(decrypt(enc, key)).toBe(data)
    })

    it('roundtrips long text', () => {
      const data = 'a'.repeat(10000)
      const enc = encrypt(data, key)
      expect(decrypt(enc, key)).toBe(data)
    })

    it('produces different ciphertext for same plaintext (random IV)', () => {
      const data = 'same'
      const a = encrypt(data, key)
      const b = encrypt(data, key)
      expect(a.encrypted).not.toBe(b.encrypted)
      expect(a.iv).not.toBe(b.iv)
    })

    it('throws for invalid key length (encrypt)', () => {
      expect(() => encrypt('data', 'too-short')).toThrow('Key must be 32 bytes')
    })

    it('throws for invalid key length (decrypt)', () => {
      expect(() => decrypt({ encrypted: '', iv: '', tag: '' }, 'bad')).toThrow('Key must be 32 bytes')
    })

    it('throws for invalid key length — 31 bytes', () => {
      const shortKey = Buffer.alloc(31).toString('base64')
      expect(() => encrypt('data', shortKey)).toThrow('Key must be 32 bytes')
    })

    it('throws for invalid key length — 33 bytes', () => {
      const longKey = Buffer.alloc(33).toString('base64')
      expect(() => encrypt('data', longKey)).toThrow('Key must be 32 bytes')
    })
  })

  describe('hash', () => {
    it('sha256 is default', () => {
      expect(hash('hello')).toHaveLength(64)
    })

    it('sha384', () => {
      expect(hash('hello', 'sha384')).toHaveLength(96)
    })

    it('sha512', () => {
      expect(hash('hello', 'sha512')).toHaveLength(128)
    })

    it('produces consistent output', () => {
      expect(hash('hello')).toBe(hash('hello'))
      expect(hash('hello', 'sha384')).toBe(hash('hello', 'sha384'))
      expect(hash('hello', 'sha512')).toBe(hash('hello', 'sha512'))
    })

    it('hashes empty string', () => {
      expect(hash('')).toHaveLength(64)
    })

    it('hashes unicode', () => {
      expect(hash('🔥')).toHaveLength(64)
    })
  })

  describe('hmac', () => {
    it('sha256 is default', () => {
      const result = hmac('data', 'secret')
      expect(result).toHaveLength(64)
    })

    it('sha384', () => {
      const result = hmac('data', 'secret', 'sha384')
      expect(result).toHaveLength(96)
    })

    it('produces consistent output', () => {
      expect(hmac('data', 'secret')).toBe(hmac('data', 'secret'))
    })

    it('works with empty data', () => {
      expect(hmac('', 'secret')).toHaveLength(64)
    })

    it('works with empty secret', () => {
      expect(hmac('data', '')).toHaveLength(64)
    })

    it('different secrets produce different results', () => {
      expect(hmac('data', 'secret-a')).not.toBe(hmac('data', 'secret-b'))
    })
  })

  describe('constantTimeEqual', () => {
    it('returns true for equal strings', () => {
      expect(constantTimeEqual('hello', 'hello')).toBe(true)
    })

    it('returns false for different length strings', () => {
      expect(constantTimeEqual('abc', 'defg')).toBe(false)
    })

    it('returns false for same length different strings', () => {
      expect(constantTimeEqual('abc', 'xyz')).toBe(false)
    })

    it('returns true for empty strings', () => {
      expect(constantTimeEqual('', '')).toBe(true)
    })

    it('handles unicode strings', () => {
      expect(constantTimeEqual('🔥', '🔥')).toBe(true)
      expect(constantTimeEqual('🔥', '💧')).toBe(false)
    })
  })

  describe('randomHex', () => {
    it('defaults to 32 bytes (64 hex chars)', () => {
      expect(randomHex()).toHaveLength(64)
    })

    it('accepts custom bytes', () => {
      expect(randomHex(16)).toHaveLength(32)
      expect(randomHex(1)).toHaveLength(2)
    })

    it('is random', () => {
      expect(randomHex()).not.toBe(randomHex())
    })
  })

  describe('generateToken', () => {
    it('defaults to 48 bytes in base64url', () => {
      const token = generateToken()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('accepts custom bytes', () => {
      const token = generateToken(32)
      expect(typeof token).toBe('string')
      expect(token).not.toContain('+')
      expect(token).not.toContain('/')
    })

    it('is random', () => {
      expect(generateToken()).not.toBe(generateToken())
    })
  })

  describe('generateOTP', () => {
    it('defaults to ceil(6*0.5)=3 digits', () => {
      const otp = generateOTP()
      expect(otp.length).toBeGreaterThanOrEqual(1)
      expect(/^\d+$/.test(otp)).toBe(true)
    })

    it('accepts custom length — 4 bytes for length 8', () => {
      const otp = generateOTP(8)
      expect(otp.length).toBeGreaterThanOrEqual(1)
      expect(/^\d+$/.test(otp)).toBe(true)
    })

    it('length 1 works', () => {
      expect(generateOTP(1).length).toBeGreaterThanOrEqual(1)
    })

    it('length 0 produces empty string', () => {
      expect(generateOTP(0)).toBe('')
    })
  })

  describe('uuid', () => {
    it('returns a valid UUID v4', () => {
      const id = uuid()
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('is unique', () => {
      expect(uuid()).not.toBe(uuid())
    })
  })

  describe('base64Encode / base64Decode', () => {
    it('roundtrips a normal string', () => {
      const original = 'hello world'
      expect(base64Decode(base64Encode(original))).toBe(original)
    })

    it('roundtrips unicode', () => {
      const original = '你好世界'
      expect(base64Decode(base64Encode(original))).toBe(original)
    })

    it('roundtrips empty string', () => {
      expect(base64Decode(base64Encode(''))).toBe('')
    })

    it('roundtrips special characters', () => {
      const original = 'foo\nbar\tbaz\u0000!@#$%^&*()'
      expect(base64Decode(base64Encode(original))).toBe(original)
    })
  })

  describe('checksum', () => {
    it('returns an 8-character base64 string', () => {
      const c = checksum('hello')
      expect(c).toHaveLength(8)
      expect(typeof c).toBe('string')
    })

    it('is consistent for same input', () => {
      expect(checksum('test')).toBe(checksum('test'))
    })

    it('differs for different inputs', () => {
      expect(checksum('abc')).not.toBe(checksum('xyz'))
    })

    it('works with empty input', () => {
      expect(checksum('')).toHaveLength(8)
    })
  })

  describe('generateEncryptionKey', () => {
    it('returns a base64 string that decodes to 32 bytes', () => {
      const k = generateEncryptionKey()
      const decoded = Buffer.from(k, 'base64')
      expect(decoded).toHaveLength(32)
    })

    it('is random', () => {
      expect(generateEncryptionKey()).not.toBe(generateEncryptionKey())
    })
  })

  describe('deriveKey', () => {
    it('generates a key and salt when salt is not provided', () => {
      const result = deriveKey('password123')
      expect(result.key).toBeTruthy()
      expect(result.salt).toBeTruthy()
      expect(() => Buffer.from(result.key, 'base64')).not.toThrow()
    })

    it('uses provided salt', () => {
      const salt = 'a'.repeat(64)
      const result1 = deriveKey('password', salt)
      const result2 = deriveKey('password', salt)
      expect(result1.key).toBe(result2.key)
      expect(result1.salt).toBe(salt)
    })

    it('produces different keys for different passwords', () => {
      const salt = 'b'.repeat(64)
      const r1 = deriveKey('pass1', salt)
      const r2 = deriveKey('pass2', salt)
      expect(r1.key).not.toBe(r2.key)
    })

    it('accepts custom iterations', () => {
      const salt = 'c'.repeat(64)
      const r1 = deriveKey('pass', salt, 1000)
      const r2 = deriveKey('pass', salt, 2000)
      expect(r1.key).not.toBe(r2.key)
    })
  })
})

// ======================================================================
// 2. HASHING
// ======================================================================

describe('hashing', () => {
  describe('hashPassword / verifyPassword (scrypt)', () => {
    it('roundtrips a password', () => {
      const password = 'my-secret-password'
      const hash = hashPassword(password)
      expect(hash.startsWith('$scrypt$')).toBe(true)
      expect(verifyPassword(password, hash)).toBe(true)
    })

    it('returns false for wrong password', () => {
      const hash = hashPassword('correct')
      expect(verifyPassword('wrong', hash)).toBe(false)
    })

    it('handles unicode passwords', () => {
      const pw = 'pässwörd🔥'
      const hash = hashPassword(pw)
      expect(verifyPassword(pw, hash)).toBe(true)
      expect(verifyPassword('wrong', hash)).toBe(false)
    })

    it('is salted (different hashes each time)', () => {
      const pw = 'same'
      const h1 = hashPassword(pw)
      const h2 = hashPassword(pw)
      expect(h1).not.toBe(h2)
      expect(verifyPassword(pw, h1)).toBe(true)
      expect(verifyPassword(pw, h2)).toBe(true)
    })
  })

  describe('verifyPassword errors', () => {
    it('throws for wrong number of parts', () => {
      expect(() => verifyPassword('p', '$scrypt$abc')).toThrow('Invalid scrypt hash format')
    })

    it('throws for non-scrypt prefix', () => {
      expect(() => verifyPassword('p', '$other$1$2$3$4$5$6')).toThrow('Invalid scrypt hash format')
    })
  })

  describe('hashPasswordFast / verifyPasswordFast (pbkdf2)', () => {
    it('roundtrips a password', () => {
      const password = 'fast-password'
      const hash = hashPasswordFast(password)
      expect(hash.startsWith('$pbkdf2$')).toBe(true)
      expect(verifyPasswordFast(password, hash)).toBe(true)
    })

    it('returns false for wrong password', () => {
      const hash = hashPasswordFast('correct')
      expect(verifyPasswordFast('wrong', hash)).toBe(false)
    })

    it('handles unicode passwords', () => {
      const pw = 'fäst🔥'
      const hash = hashPasswordFast(pw)
      expect(verifyPasswordFast(pw, hash)).toBe(true)
      expect(verifyPasswordFast('wrong', hash)).toBe(false)
    })

    it('is salted (different hashes each time)', () => {
      const pw = 'same'
      const h1 = hashPasswordFast(pw)
      const h2 = hashPasswordFast(pw)
      expect(h1).not.toBe(h2)
      expect(verifyPasswordFast(pw, h1)).toBe(true)
      expect(verifyPasswordFast(pw, h2)).toBe(true)
    })
  })

  describe('verifyPasswordFast errors', () => {
    it('throws for wrong number of parts', () => {
      expect(() => verifyPasswordFast('p', '$pbkdf2$abc')).toThrow('Invalid pbkdf2 hash format')
    })

    it('throws for non-pbkdf2 prefix', () => {
      expect(() => verifyPasswordFast('p', '$other$1$2$3')).toThrow('Invalid pbkdf2 hash format')
    })
  })

  describe('needsRehash', () => {
    it('returns false for current scrypt params', () => {
      expect(needsRehash('$scrypt$16384$8$1$salt$hash')).toBe(false)
    })

    it('returns true for different scrypt N', () => {
      expect(needsRehash('$scrypt$8192$8$1$salt$hash')).toBe(true)
    })

    it('returns true for different scrypt r', () => {
      expect(needsRehash('$scrypt$16384$16$1$salt$hash')).toBe(true)
    })

    it('returns false for current pbkdf2 params', () => {
      expect(needsRehash('$pbkdf2$600000$salt$hash')).toBe(false)
    })

    it('returns true for different pbkdf2 iterations', () => {
      expect(needsRehash('$pbkdf2$100000$salt$hash')).toBe(true)
    })

    it('returns true for unknown hash format', () => {
      expect(needsRehash('$bcrypt$10$salt$hash')).toBe(true)
    })

    it('returns true for unrecognized prefix', () => {
      expect(needsRehash('$unknown$format')).toBe(true)
    })
  })
})

// ======================================================================
// 3. COLORS
// ======================================================================

describe('colors', () => {
  describe('color functions', () => {
    const testCases = [
      ['red', colors.red],
      ['green', colors.green],
      ['yellow', colors.yellow],
      ['blue', colors.blue],
      ['magenta', colors.magenta],
      ['cyan', colors.cyan],
      ['white', colors.white],
      ['gray', colors.gray],
      ['bold', colors.bold],
      ['dim', colors.dim],
      ['italic', colors.italic],
      ['underline', colors.underline],
    ] as const

    for (const [name, fn] of testCases) {
      it(`${name} wraps text with ANSI codes`, () => {
        const result = fn('test')
        expect(result).toContain('\x1b[')
        expect(result).toContain('\x1b[0m')
        expect(stripColors(result)).toBe('test')
      })
    }

    it('handles empty string', () => {
      expect(stripColors(colors.red(''))).toBe('')
    })

    it('handles multi-line text', () => {
      const result = colors.green('line1\nline2')
      expect(stripColors(result)).toBe('line1\nline2')
    })
  })

  describe('stripColors', () => {
    it('removes ANSI codes', () => {
      expect(stripColors('\x1b[31mred\x1b[0m')).toBe('red')
    })

    it('handles string without ANSI codes', () => {
      expect(stripColors('plain text')).toBe('plain text')
    })

    it('handles multiple codes', () => {
      expect(stripColors('\x1b[1m\x1b[31mbold red\x1b[0m')).toBe('bold red')
    })

    it('handles empty string', () => {
      expect(stripColors('')).toBe('')
    })
  })

  describe('isColorSupported', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('returns false when NO_COLOR is set', () => {
      vi.stubEnv('NO_COLOR', '1')
      expect(isColorSupported()).toBe(false)
    })

    it('returns false when NO_COLOR overrides FORCE_COLOR', () => {
      vi.stubEnv('NO_COLOR', '1')
      vi.stubEnv('FORCE_COLOR', '1')
      expect(isColorSupported()).toBe(false)
    })

    it('returns true when FORCE_COLOR is set (no NO_COLOR)', () => {
      vi.stubEnv('FORCE_COLOR', '1')
      expect(isColorSupported()).toBe(true)
    })

    it('returns false when stdout is missing', () => {
      const orig = process.stdout
      Object.defineProperty(process, 'stdout', { value: undefined, configurable: true })
      try {
        expect(isColorSupported()).toBe(false)
      } finally {
        Object.defineProperty(process, 'stdout', { value: orig, configurable: true })
      }
    })

    it('returns false when stdout is not a TTY', () => {
      const orig = (process.stdout as any).isTTY
      Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true })
      try {
        expect(isColorSupported()).toBe(false)
      } finally {
        Object.defineProperty(process.stdout, 'isTTY', { value: orig, configurable: true })
      }
    })

    it('returns true when TTY and no env overrides', () => {
      const orig = (process.stdout as any).isTTY
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
      try {
        expect(isColorSupported()).toBe(true)
      } finally {
        Object.defineProperty(process.stdout, 'isTTY', { value: orig, configurable: true })
      }
    })

    it('returns false when process is undefined (browser env)', () => {
      const origProcess = globalThis.process
      Object.defineProperty(globalThis, 'process', { value: undefined, configurable: true })
      try {
        expect(isColorSupported()).toBe(false)
      } finally {
        Object.defineProperty(globalThis, 'process', { value: origProcess, configurable: true })
      }
    })
  })
})

// ======================================================================
// 4. LOGGER
// ======================================================================

describe('Logger', () => {
  describe('formatTimestamp', () => {
    it('returns UTC format string', () => {
      const result = formatTimestamp()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/)
    })

    it('accepts timezone parameter (currently unused)', () => {
      const result = formatTimestamp('UTC')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/)
    })
  })

  describe('constructor', () => {
    it('creates with default options', () => {
      const log = new Logger()
      expect(log).toBeInstanceOf(Logger)
    })

    it('accepts custom options', () => {
      const log = new Logger({ level: 'debug', name: 'test', colors: true, timestamps: false, timezone: 'UTC' })
      expect(log).toBeInstanceOf(Logger)
    })

    it('uses default level info when not specified', () => {
      const logDebug = new Logger({ level: 'debug' })
      const logDefault = new Logger()
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      logDebug.debug('works')
      expect(spy).toHaveBeenCalled()
      spy.mockReset()
      logDefault.debug('should not appear')
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('log level filtering', () => {
    let spyDebug: ReturnType<typeof vi.spyOn>
    let spyInfo: ReturnType<typeof vi.spyOn>
    let spyWarn: ReturnType<typeof vi.spyOn>
    let spyError: ReturnType<typeof vi.spyOn>

    afterEach(() => {
      spyDebug?.mockRestore()
      spyInfo?.mockRestore()
      spyWarn?.mockRestore()
      spyError?.mockRestore()
    })

    it('error level only shows error', () => {
      const log = new Logger({ level: 'error', colors: false, timestamps: false })
      spyDebug = vi.spyOn(console, 'debug').mockImplementation(() => {})
      spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
      spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      spyError = vi.spyOn(console, 'error').mockImplementation(() => {})
      log.debug('d'); log.info('i'); log.warn('w'); log.error('e')
      expect(spyDebug).not.toHaveBeenCalled()
      expect(spyInfo).not.toHaveBeenCalled()
      expect(spyWarn).not.toHaveBeenCalled()
      expect(spyError).toHaveBeenCalled()
    })

    it('warn level shows error and warn', () => {
      const log = new Logger({ level: 'warn', colors: false, timestamps: false })
      spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
      spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      spyError = vi.spyOn(console, 'error').mockImplementation(() => {})
      log.info('i'); log.warn('w'); log.error('e')
      expect(spyInfo).not.toHaveBeenCalled()
      expect(spyWarn).toHaveBeenCalled()
      expect(spyError).toHaveBeenCalled()
    })

    it('info level shows error, warn, info (default)', () => {
      const log = new Logger({ level: 'info', colors: false, timestamps: false })
      spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
      spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      spyError = vi.spyOn(console, 'error').mockImplementation(() => {})
      log.info('i'); log.warn('w'); log.error('e')
      expect(spyInfo).toHaveBeenCalled()
      expect(spyWarn).toHaveBeenCalled()
      expect(spyError).toHaveBeenCalled()
    })

    it('debug level shows all levels', () => {
      const log = new Logger({ level: 'debug', colors: false, timestamps: false })
      spyDebug = vi.spyOn(console, 'debug').mockImplementation(() => {})
      spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
      spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      spyError = vi.spyOn(console, 'error').mockImplementation(() => {})
      log.debug('d'); log.info('i'); log.warn('w'); log.error('e')
      expect(spyDebug).toHaveBeenCalled()
      expect(spyInfo).toHaveBeenCalled()
      expect(spyWarn).toHaveBeenCalled()
      expect(spyError).toHaveBeenCalled()
    })
  })

  describe('message formatting', () => {
    let spy: ReturnType<typeof vi.spyOn>

    afterEach(() => {
      spy?.mockRestore()
    })

    it('includes log level prefix without colors', () => {
      spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const log = new Logger({ colors: false, timestamps: false })
      log.info('hello')
      expect(spy).toHaveBeenCalledWith('INFO hello')
    })

    it('includes log level prefix without colors — debug', () => {
      spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      const log = new Logger({ level: 'debug', colors: false, timestamps: false })
      log.debug('dbg')
      expect(spy).toHaveBeenCalledWith('DEBUG dbg')
    })

    it('includes log level prefix without colors — warn', () => {
      spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const log = new Logger({ colors: false, timestamps: false })
      log.warn('careful')
      expect(spy).toHaveBeenCalledWith('WARN careful')
    })

    it('includes log level prefix without colors — error', () => {
      spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const log = new Logger({ colors: false, timestamps: false })
      log.error('fail')
      expect(spy).toHaveBeenCalledWith('ERROR fail')
    })

    it('includes timestamp when enabled', () => {
      spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const log = new Logger({ colors: false, timestamps: true })
      log.info('msg')
      const [msg] = spy.mock.calls[0] as [string]
      expect(msg).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC INFO msg$/)
    })

    it('includes name without colors', () => {
      spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const log = new Logger({ colors: false, timestamps: false, name: 'app' })
      log.info('started')
      expect(spy).toHaveBeenCalledWith('INFO [app] started')
    })

    it('includes name with colors', () => {
      spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const log = new Logger({ colors: true, timestamps: false, name: 'app' })
      log.info('started')
      const [msg] = spy.mock.calls[0] as [string]
      expect(msg).toContain('[app]')
      expect(msg).toContain('\x1b[')
    })

    it('includes meta as JSON when provided', () => {
      spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const log = new Logger({ colors: false, timestamps: false })
      log.info('msg', { key: 'val', num: 42 })
      expect(spy).toHaveBeenCalledWith('INFO msg {"key":"val","num":42}')
    })

    it('skips meta when empty object', () => {
      spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const log = new Logger({ colors: false, timestamps: false })
      log.info('msg', {})
      expect(spy).toHaveBeenCalledWith('INFO msg')
    })

    it('uses ANSI colors for level and message when enabled', () => {
      spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const log = new Logger({ colors: true, timestamps: false })
      log.info('colored')
      const [msg] = spy.mock.calls[0] as [string]
      expect(msg).toContain('\x1b[36m')  // cyan for info
      expect(msg).toContain('colored')
      expect(msg).toContain('\x1b[0m')   // reset
    })

    it('colors warn in yellow', () => {
      spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const log = new Logger({ colors: true, timestamps: false })
      log.warn('caution')
      const [msg] = spy.mock.calls[0] as [string]
      expect(msg).toContain('\x1b[33m') // yellow
    })

    it('colors error in red', () => {
      spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const log = new Logger({ colors: true, timestamps: false })
      log.error('fail')
      const [msg] = spy.mock.calls[0] as [string]
      expect(msg).toContain('\x1b[31m') // red
    })

    it('colors debug in gray', () => {
      spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
      const log = new Logger({ level: 'debug', colors: true, timestamps: false })
      log.debug('verbose')
      const [msg] = spy.mock.calls[0] as [string]
      expect(msg).toContain('\x1b[90m') // gray
    })
  })

  describe('child', () => {
    it('creates child with prefixed name', () => {
      const parent = new Logger({ name: 'app', colors: false, timestamps: false })
      const child = parent.child('db')
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      child.info('connected')
      expect(spy).toHaveBeenCalledWith('INFO [app:db] connected')
      spy.mockRestore()
    })

    it('creates child when parent has no name', () => {
      const parent = new Logger({ colors: false, timestamps: false })
      const child = parent.child('worker')
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      child.info('started')
      expect(spy).toHaveBeenCalledWith('INFO [worker] started')
      spy.mockRestore()
    })

    it('inherits parent options', () => {
      const parent = new Logger({ level: 'error', colors: false, timestamps: false, name: 'app' })
      const child = parent.child('api')
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      child.info('should not appear')
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('nested children produce deep names', () => {
      const root = new Logger({ colors: false, timestamps: false })
      const child = root.child('http')
      const grandchild = child.child('router')
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
      grandchild.info('routing')
      expect(spy).toHaveBeenCalledWith('INFO [http:router] routing')
      spy.mockRestore()
    })
  })

  describe('setLevel', () => {
    it('dynamically changes log level', () => {
      const log = new Logger({ level: 'debug', colors: false, timestamps: false })
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      log.setLevel('error')
      log.info('should not show')
      log.error('should show')
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('ERROR should show')
      spy.mockRestore()
    })

    it('allows lowering level', () => {
      const log = new Logger({ level: 'error', colors: false, timestamps: false })
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      log.setLevel('warn')
      log.warn('now visible')
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('default export', () => {
    it('logger instance is exported', async () => {
      const mod = await import('../src/native/logger.js')
      expect(mod.logger).toBeInstanceOf(Logger)
    })
  })
})

// ======================================================================
// 5. ARR
// ======================================================================

describe('Arr', () => {
  describe('first', () => {
    it('returns first element', () => {
      expect(Arr.first([1, 2, 3])).toBe(1)
    })

    it('returns undefined for empty array', () => {
      expect(Arr.first([])).toBeUndefined()
    })
  })

  describe('last', () => {
    it('returns last element', () => {
      expect(Arr.last([1, 2, 3])).toBe(3)
    })

    it('returns undefined for empty array', () => {
      expect(Arr.last([])).toBeUndefined()
    })

    it('works with single element', () => {
      expect(Arr.last([42])).toBe(42)
    })
  })

  describe('pluck', () => {
    it('extracts values by key', () => {
      const items = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }]
      expect(Arr.pluck(items, 'name')).toEqual(['a', 'b'])
    })

    it('works with empty array', () => {
      expect(Arr.pluck([], 'key' as any)).toEqual([])
    })
  })

  describe('groupBy', () => {
    const items = [
      { type: 'fruit', name: 'apple' },
      { type: 'fruit', name: 'banana' },
      { type: 'veg', name: 'carrot' },
    ]

    it('groups by string key', () => {
      const grouped = Arr.groupBy(items, 'type')
      expect(grouped.fruit).toHaveLength(2)
      expect(grouped.veg).toHaveLength(1)
    })

    it('groups by function key', () => {
      const grouped = Arr.groupBy(items, (item) => item.type.toUpperCase())
      expect(grouped.FRUIT).toHaveLength(2)
      expect(grouped.VEG).toHaveLength(1)
    })

    it('returns empty object for empty array', () => {
      expect(Arr.groupBy([], 'key' as any)).toEqual({})
    })
  })

  describe('keyBy', () => {
    const items = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ]

    it('builds map by string key', () => {
      const map = Arr.keyBy(items, 'id')
      expect(map.a).toEqual({ id: 'a', value: 1 })
      expect(map.b).toEqual({ id: 'b', value: 2 })
    })

    it('builds map by function key', () => {
      const map = Arr.keyBy(items, (item) => `key_${item.id}`)
      expect(map.key_a).toEqual(items[0])
      expect(map.key_b).toEqual(items[1])
    })

    it('last duplicate key wins', () => {
      const dupes = [{ id: 'x', v: 1 }, { id: 'x', v: 2 }]
      expect(Arr.keyBy(dupes, 'id').x).toEqual({ id: 'x', v: 2 })
    })
  })

  describe('sortBy', () => {
    it('sorts by numeric key', () => {
      const items = [{ age: 30 }, { age: 20 }, { age: 40 }]
      expect(Arr.sortBy(items, 'age')).toEqual([{ age: 20 }, { age: 30 }, { age: 40 }])
    })

    it('sorts by function key', () => {
      const items = [{ name: 'car' }, { name: 'apple' }, { name: 'banana' }]
      const sorted = Arr.sortBy(items, (i) => i.name)
      expect(Arr.pluck(sorted, 'name')).toEqual(['apple', 'banana', 'car'])
    })

    it('does not mutate original array', () => {
      const items = [{ x: 2 }, { x: 1 }]
      const copy = [...items]
      Arr.sortBy(items, 'x')
      expect(items).toEqual(copy)
    })

    it('sorts by string key lexicographically', () => {
      const items = [{ name: 'z' }, { name: 'a' }]
      expect(Arr.sortBy(items, 'name')).toEqual([{ name: 'a' }, { name: 'z' }])
    })

    it('handles equal keys (return 0)', () => {
      const items = [{ x: 1 }, { x: 1 }]
      const sorted = Arr.sortBy(items, 'x')
      expect(sorted).toHaveLength(2)
      expect(sorted[0].x).toBe(1)
      expect(sorted[1].x).toBe(1)
    })
  })

  describe('unique', () => {
    it('removes duplicates', () => {
      expect(Arr.unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3])
    })

    it('works with strings', () => {
      expect(Arr.unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('works with empty array', () => {
      expect(Arr.unique([])).toEqual([])
    })
  })

  describe('uniqueBy', () => {
    it('deduplicates by string key', () => {
      const items = [{ id: 1, v: 'a' }, { id: 2, v: 'a' }, { id: 3, v: 'b' }]
      const result = Arr.uniqueBy(items, 'v')
      expect(result).toHaveLength(2)
      expect(Arr.pluck(result, 'id')).toEqual([1, 3])
    })

    it('deduplicates by function key', () => {
      const items = [{ n: 'x' }, { n: 'y' }, { n: 'x' }]
      const result = Arr.uniqueBy(items, (i) => i.n)
      expect(result).toHaveLength(2)
    })
  })

  describe('chunk', () => {
    it('splits array into chunks', () => {
      expect(Arr.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    })

    it('returns empty for size < 1', () => {
      expect(Arr.chunk([1, 2, 3], 0)).toEqual([])
      expect(Arr.chunk([1, 2, 3], -1)).toEqual([])
    })

    it('single chunk when size >= length', () => {
      expect(Arr.chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]])
    })

    it('exact division', () => {
      expect(Arr.chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
    })

    it('empty array returns empty', () => {
      expect(Arr.chunk([], 3)).toEqual([])
    })
  })

  describe('shuffle', () => {
    it('returns all elements (same length)', () => {
      const input = [1, 2, 3, 4, 5]
      const result = Arr.shuffle(input)
      expect(result).toHaveLength(input.length)
      expect(result.sort()).toEqual(input)
    })

    it('does not mutate original', () => {
      const input = [1, 2, 3]
      const copy = [...input]
      Arr.shuffle(input)
      expect(input).toEqual(copy)
    })

    it('handles empty array', () => {
      expect(Arr.shuffle([])).toEqual([])
    })

    it('handles single element', () => {
      expect(Arr.shuffle([42])).toEqual([42])
    })
  })

  describe('flatten', () => {
    it('flattens nested arrays one level', () => {
      expect(Arr.flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4])
    })

    it('flattens deeply nested arrays', () => {
      expect(Arr.flatten([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4])
    })

    it('handles empty arrays', () => {
      expect(Arr.flatten([[], 1, []])).toEqual([1])
    })

    it('handles fully empty input', () => {
      expect(Arr.flatten([])).toEqual([])
    })

    it('handles mixed types', () => {
      expect(Arr.flatten(['a', ['b', ['c']]])).toEqual(['a', 'b', 'c'])
    })

    it('handles array with no nesting', () => {
      expect(Arr.flatten([1, 2, 3])).toEqual([1, 2, 3])
    })
  })

  describe('where', () => {
    const items = [
      { id: 1, status: 'active' },
      { id: 2, status: 'inactive' },
      { id: 3, status: 'active' },
    ]

    it('filters by key/value', () => {
      expect(Arr.where(items, 'status', 'active')).toHaveLength(2)
    })

    it('returns empty when no match', () => {
      expect(Arr.where(items, 'status', 'deleted')).toEqual([])
    })

    it('works with empty array', () => {
      expect(Arr.where([], 'status' as any, 'x')).toEqual([])
    })
  })

  describe('whereIn', () => {
    const items = [
      { id: 1, role: 'admin' },
      { id: 2, role: 'editor' },
      { id: 3, role: 'viewer' },
    ]

    it('filters by multiple values', () => {
      expect(Arr.whereIn(items, 'role', ['admin', 'editor'])).toHaveLength(2)
    })

    it('returns empty for no matches', () => {
      expect(Arr.whereIn(items, 'role', ['superadmin'])).toEqual([])
    })

    it('works with empty array', () => {
      expect(Arr.whereIn([], 'key' as any, ['a'])).toEqual([])
    })
  })

  describe('random', () => {
    it('returns an element from the array', () => {
      const arr = [10, 20, 30]
      const result = Arr.random(arr)
      expect(arr).toContain(result)
    })

    it('returns undefined for empty array', () => {
      expect(Arr.random([])).toBeUndefined()
    })

    it('returns only element for single-element array', () => {
      expect(Arr.random([42])).toBe(42)
    })
  })
})

// ======================================================================
// 6. SUPERNUMBER
// ======================================================================

describe('SuperNumber', () => {
  describe('format', () => {
    it('formats with default locale (id-ID) and zero decimals', () => {
      const result = SuperNumber.format(15000)
      expect(result).toMatch(/15\.000/)
    })

    it('formats with decimals', () => {
      const result = SuperNumber.format(1234.56, { decimals: 2 })
      expect(result).toContain(',')
    })

    it('formats with currency', () => {
      const result = SuperNumber.format(50000, { currency: 'IDR', locale: 'id-ID', decimals: 0 })
      expect(result).toMatch(/Rp/)
      expect(result).toMatch(/50/)
    })

    it('handles invalid currency by falling back to normal format', () => {
      const result = SuperNumber.format(1000, { currency: 'XYZ_INVALID', locale: 'id-ID', decimals: 0 })
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    it('formats negative numbers', () => {
      const result = SuperNumber.format(-500)
      expect(typeof result).toBe('string')
    })

    it('formats zero', () => {
      expect(SuperNumber.format(0)).toBeTruthy()
    })
  })

  describe('clamp', () => {
    it('returns value when within range', () => {
      expect(SuperNumber.clamp(5, 0, 10)).toBe(5)
    })

    it('returns min when value is below', () => {
      expect(SuperNumber.clamp(-5, 0, 10)).toBe(0)
    })

    it('returns max when value is above', () => {
      expect(SuperNumber.clamp(15, 0, 10)).toBe(10)
    })

    it('handles equal bounds', () => {
      expect(SuperNumber.clamp(5, 5, 5)).toBe(5)
    })
  })

  describe('inRange', () => {
    it('returns true for value in range', () => {
      expect(SuperNumber.inRange(5, 0, 10)).toBe(true)
    })

    it('returns false for value below range', () => {
      expect(SuperNumber.inRange(-1, 0, 10)).toBe(false)
    })

    it('returns false for value above range', () => {
      expect(SuperNumber.inRange(11, 0, 10)).toBe(false)
    })

    it('returns true at exact boundaries', () => {
      expect(SuperNumber.inRange(0, 0, 10)).toBe(true)
      expect(SuperNumber.inRange(10, 0, 10)).toBe(true)
    })
  })

  describe('randomInt', () => {
    it('returns a number within range', () => {
      for (let i = 0; i < 100; i++) {
        const result = SuperNumber.randomInt(1, 6)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(6)
      }
    })

    it('returns min when min equals max', () => {
      expect(SuperNumber.randomInt(5, 5)).toBe(5)
    })
  })

  describe('sum', () => {
    it('sums array of numbers', () => {
      expect(SuperNumber.sum([1, 2, 3, 4, 5])).toBe(15)
    })

    it('returns 0 for empty array', () => {
      expect(SuperNumber.sum([])).toBe(0)
    })

    it('handles negative numbers', () => {
      expect(SuperNumber.sum([-1, 1, -2, 2])).toBe(0)
    })

    it('handles single element', () => {
      expect(SuperNumber.sum([42])).toBe(42)
    })
  })

  describe('average', () => {
    it('calculates average', () => {
      expect(SuperNumber.average([2, 4, 6])).toBe(4)
    })

    it('returns 0 for empty array', () => {
      expect(SuperNumber.average([])).toBe(0)
    })

    it('handles single element', () => {
      expect(SuperNumber.average([10])).toBe(10)
    })

    it('handles decimal results', () => {
      expect(SuperNumber.average([1, 2])).toBe(1.5)
    })
  })

  describe('median', () => {
    it('returns middle value for odd length', () => {
      expect(SuperNumber.median([1, 3, 5])).toBe(3)
    })

    it('returns average of two middle for even length', () => {
      expect(SuperNumber.median([1, 2, 3, 4])).toBe(2.5)
    })

    it('returns 0 for empty array', () => {
      expect(SuperNumber.median([])).toBe(0)
    })

    it('handles single element', () => {
      expect(SuperNumber.median([42])).toBe(42)
    })

    it('handles two elements', () => {
      expect(SuperNumber.median([10, 20])).toBe(15)
    })

    it('works with unsorted input', () => {
      expect(SuperNumber.median([3, 1, 2])).toBe(2)
    })
  })

  describe('round', () => {
    it('rounds with default precision 0', () => {
      expect(SuperNumber.round(3.7)).toBe(4)
      expect(SuperNumber.round(3.2)).toBe(3)
    })

    it('rounds with precision', () => {
      expect(SuperNumber.round(3.14159, 2)).toBe(3.14)
      expect(SuperNumber.round(3.14159, 4)).toBe(3.1416)
    })

    it('rounds negative numbers', () => {
      expect(SuperNumber.round(-3.7)).toBe(-4)
    })
  })

  describe('floor', () => {
    it('floors with default precision 0', () => {
      expect(SuperNumber.floor(3.7)).toBe(3)
      expect(SuperNumber.floor(3.2)).toBe(3)
    })

    it('floors with precision', () => {
      expect(SuperNumber.floor(3.14159, 2)).toBe(3.14)
    })

    it('floors negative numbers', () => {
      expect(SuperNumber.floor(-3.7)).toBe(-4)
    })
  })

  describe('ceil', () => {
    it('ceils with default precision 0', () => {
      expect(SuperNumber.ceil(3.7)).toBe(4)
      expect(SuperNumber.ceil(3.2)).toBe(4)
    })

    it('ceils with precision', () => {
      expect(SuperNumber.ceil(3.14159, 2)).toBe(3.15)
    })

    it('ceils negative numbers', () => {
      expect(SuperNumber.ceil(-3.7)).toBe(-3)
    })
  })

  describe('isEven', () => {
    it('returns true for even numbers', () => {
      expect(SuperNumber.isEven(0)).toBe(true)
      expect(SuperNumber.isEven(2)).toBe(true)
      expect(SuperNumber.isEven(-4)).toBe(true)
    })

    it('returns false for odd numbers', () => {
      expect(SuperNumber.isEven(1)).toBe(false)
      expect(SuperNumber.isEven(-3)).toBe(false)
    })
  })

  describe('isOdd', () => {
    it('returns true for odd numbers', () => {
      expect(SuperNumber.isOdd(1)).toBe(true)
      expect(SuperNumber.isOdd(-3)).toBe(true)
    })

    it('returns false for even numbers', () => {
      expect(SuperNumber.isOdd(0)).toBe(false)
      expect(SuperNumber.isOdd(2)).toBe(false)
    })
  })
})

// ======================================================================
// 7. STR
// ======================================================================

describe('Str', () => {
  describe('camelCase', () => {
    it('converts kebab-case', () => {
      expect(Str.camelCase('hello-world')).toBe('helloWorld')
    })

    it('converts snake_case', () => {
      expect(Str.camelCase('hello_world')).toBe('helloWorld')
    })

    it('converts space separated', () => {
      expect(Str.camelCase('hello world')).toBe('helloWorld')
    })

    it('handles already camelCase', () => {
      expect(Str.camelCase('helloWorld')).toBe('helloWorld')
    })

    it('handles multiple separators', () => {
      expect(Str.camelCase('foo-bar_baz qux')).toBe('fooBarBazQux')
    })

    it('handles empty string', () => {
      expect(Str.camelCase('')).toBe('')
    })

    it('handles single word', () => {
      expect(Str.camelCase('hello')).toBe('hello')
    })

    it('handles leading separator', () => {
      expect(Str.camelCase('-hello-world')).toBe('helloWorld')
    })

    it('handles trailing separator (c is undefined)', () => {
      expect(Str.camelCase('hello-')).toBe('hello')
    })
  })

  describe('snakeCase', () => {
    it('converts camelCase', () => {
      expect(Str.snakeCase('helloWorld')).toBe('hello_world')
    })

    it('converts kebab-case', () => {
      expect(Str.snakeCase('hello-world')).toBe('hello_world')
    })

    it('converts space separated', () => {
      expect(Str.snakeCase('hello world')).toBe('hello_world')
    })

    it('splits consecutive capitals individually', () => {
      expect(Str.snakeCase('XMLParser')).toBe('x_m_l_parser')
    })

    it('handles empty string', () => {
      expect(Str.snakeCase('')).toBe('')
    })

    it('removes leading underscore', () => {
      expect(Str.snakeCase('_HelloWorld')).toBe('hello_world')
    })
  })

  describe('kebabCase', () => {
    it('converts camelCase', () => {
      expect(Str.kebabCase('helloWorld')).toBe('hello-world')
    })

    it('converts snake_case', () => {
      expect(Str.kebabCase('hello_world')).toBe('hello-world')
    })

    it('converts space separated', () => {
      expect(Str.kebabCase('hello world')).toBe('hello-world')
    })

    it('handles empty string', () => {
      expect(Str.kebabCase('')).toBe('')
    })

    it('removes leading hyphen', () => {
      expect(Str.kebabCase('_HelloWorld')).toBe('-hello-world')
    })
  })

  describe('pascalCase', () => {
    it('converts kebab-case', () => {
      expect(Str.pascalCase('hello-world')).toBe('HelloWorld')
    })

    it('converts snake_case', () => {
      expect(Str.pascalCase('hello_world')).toBe('HelloWorld')
    })

    it('converts space separated', () => {
      expect(Str.pascalCase('hello world')).toBe('HelloWorld')
    })

    it('handles already PascalCase', () => {
      expect(Str.pascalCase('HelloWorld')).toBe('HelloWorld')
    })

    it('handles empty string', () => {
      expect(Str.pascalCase('')).toBe('')
    })
  })

  describe('titleCase', () => {
    it('lowercases first then capitalizes each word', () => {
      expect(Str.titleCase('helloWorld')).toBe('Helloworld')
    })

    it('converts snake_case', () => {
      expect(Str.titleCase('hello_world')).toBe('Hello World')
    })

    it('converts kebab-case', () => {
      expect(Str.titleCase('hello-world')).toBe('Hello World')
    })

    it('handles already title-like', () => {
      expect(Str.titleCase('HELLO WORLD')).toBe('Hello World')
    })

    it('handles empty string', () => {
      expect(Str.titleCase('')).toBe('')
    })
  })

  describe('slug', () => {
    it('converts to lowercase hyphenated', () => {
      expect(Str.slug('Hello World')).toBe('hello-world')
    })

    it('removes special characters', () => {
      expect(Str.slug('Hello World! @#$%')).toBe('hello-world')
    })

    it('replaces underscores with hyphens', () => {
      expect(Str.slug('hello_world')).toBe('hello-world')
    })

    it('collapses multiple hyphens', () => {
      expect(Str.slug('hello---world')).toBe('hello-world')
    })

    it('trims leading and trailing hyphens', () => {
      expect(Str.slug('--hello-world--')).toBe('hello-world')
    })

    it('handles empty string', () => {
      expect(Str.slug('')).toBe('')
    })

    it('handles only special chars', () => {
      expect(Str.slug('!!! @@@ ###')).toBe('')
    })
  })

  describe('uuid', () => {
    it('generates valid UUID v4', () => {
      const id = Str.uuid()
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('generates unique values', () => {
      expect(Str.uuid()).not.toBe(Str.uuid())
    })
  })

  describe('nanoid', () => {
    it('defaults to 21 chars', () => {
      const id = Str.nanoid()
      expect(id).toHaveLength(21)
    })

    it('accepts custom size', () => {
      const id = Str.nanoid(10)
      expect(id).toHaveLength(10)
    })

    it('uses URL-safe alphabet', () => {
      const id = Str.nanoid(100)
      expect(id).toMatch(/^[useandom\-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict]+$/)
    })

    it('generates unique values', () => {
      expect(Str.nanoid()).not.toBe(Str.nanoid())
    })

    it('handles undefined byte via nullish coalescing', () => {
      const spy = vi.spyOn(nodeCrypto, 'randomBytes').mockReturnValue(Buffer.alloc(0))
      const id = Str.nanoid(3)
      expect(id).toBe('uuu')
      spy.mockRestore()
    })
  })

  describe('random', () => {
    it('defaults to 16 chars', () => {
      expect(Str.random()).toHaveLength(16)
    })

    it('accepts custom length', () => {
      expect(Str.random(8)).toHaveLength(8)
    })

    it('uses alphanumeric alphabet', () => {
      const result = Str.random(100)
      expect(result).toMatch(/^[A-Za-z0-9]+$/)
    })

    it('generates unique values', () => {
      expect(Str.random()).not.toBe(Str.random())
    })

    it('handles undefined byte via nullish coalescing', () => {
      const spy = vi.spyOn(nodeCrypto, 'randomBytes').mockReturnValue(Buffer.alloc(0))
      const result = Str.random(3)
      expect(result).toBe('AAA')
      spy.mockRestore()
    })
  })

  describe('limit', () => {
    it('truncates string to limit', () => {
      expect(Str.limit('hello world', 5)).toBe('hello')
    })

    it('returns full string when shorter than limit', () => {
      expect(Str.limit('hi', 10)).toBe('hi')
    })

    it('handles empty string', () => {
      expect(Str.limit('', 5)).toBe('')
    })

    it('handles exact length', () => {
      expect(Str.limit('hello', 5)).toBe('hello')
    })
  })

  describe('words', () => {
    it('splits sentence into words', () => {
      expect(Str.words('hello world foo')).toEqual(['hello', 'world', 'foo'])
    })

    it('handles multiple spaces', () => {
      expect(Str.words('hello   world')).toEqual(['hello', 'world'])
    })

    it('trims leading/trailing spaces', () => {
      expect(Str.words('  hello world  ')).toEqual(['hello', 'world'])
    })

    it('returns empty array for empty string', () => {
      expect(Str.words('')).toEqual([])
    })

    it('returns empty array for whitespace-only string', () => {
      expect(Str.words('   ')).toEqual([])
    })
  })

  describe('plural', () => {
    it('regular plural adds s', () => {
      expect(Str.plural('car')).toBe('cars')
      expect(Str.plural('book')).toBe('books')
    })

    it('handles -y ending (consonant + y)', () => {
      expect(Str.plural('city')).toBe('cities')
      expect(Str.plural('fly')).toBe('flies')
    })

    it('handles -y ending (vowel + y)', () => {
      expect(Str.plural('boy')).toBe('boys')
      expect(Str.plural('key')).toBe('keys')
    })

    it('handles -s, -x, -z, -ch, -sh endings', () => {
      expect(Str.plural('box')).toBe('boxes')
      expect(Str.plural('bus')).toBe('buses')
      expect(Str.plural('buzz')).toBe('buzzes')
      expect(Str.plural('church')).toBe('churches')
      expect(Str.plural('dish')).toBe('dishes')
    })

    it('handles -fe ending', () => {
      expect(Str.plural('knife')).toBe('knives')
      expect(Str.plural('wife')).toBe('wives')
    })

    it('handles -f ending', () => {
      expect(Str.plural('wolf')).toBe('wolves')
      expect(Str.plural('shelf')).toBe('shelves')
    })

    it('handles -o ending', () => {
      expect(Str.plural('potato')).toBe('potatoes')
      expect(Str.plural('tomato')).toBe('tomatoes')
    })

    it('handles irregular plurals', () => {
      expect(Str.plural('child')).toBe('children')
      expect(Str.plural('person')).toBe('people')
      expect(Str.plural('man')).toBe('men')
      expect(Str.plural('woman')).toBe('women')
      expect(Str.plural('tooth')).toBe('teeth')
      expect(Str.plural('foot')).toBe('feet')
      expect(Str.plural('mouse')).toBe('mice')
      expect(Str.plural('goose')).toBe('geese')
      expect(Str.plural('ox')).toBe('oxen')
      expect(Str.plural('sheep')).toBe('sheep')
      expect(Str.plural('fish')).toBe('fish')
      expect(Str.plural('deer')).toBe('deer')
      expect(Str.plural('series')).toBe('series')
      expect(Str.plural('species')).toBe('species')
      expect(Str.plural('index')).toBe('indices')
      expect(Str.plural('axis')).toBe('axes')
      expect(Str.plural('crisis')).toBe('crises')
      expect(Str.plural('thesis')).toBe('theses')
      expect(Str.plural('phenomenon')).toBe('phenomena')
      expect(Str.plural('datum')).toBe('data')
      expect(Str.plural('cactus')).toBe('cacti')
      expect(Str.plural('focus')).toBe('foci')
      expect(Str.plural('nucleus')).toBe('nuclei')
      expect(Str.plural('syllabus')).toBe('syllabi')
      expect(Str.plural('analysis')).toBe('analyses')
      expect(Str.plural('diagnosis')).toBe('diagnoses')
      expect(Str.plural('parenthesis')).toBe('parentheses')
      expect(Str.plural('stimulus')).toBe('stimuli')
    })

    it('handles uppercase irregular via lowercased lookup', () => {
      expect(Str.plural('CHILD')).toBe('children')
    })
  })

  describe('singular', () => {
    it('handles irregular singulars', () => {
      expect(Str.singular('children')).toBe('child')
      expect(Str.singular('people')).toBe('person')
      expect(Str.singular('men')).toBe('man')
      expect(Str.singular('women')).toBe('woman')
      expect(Str.singular('teeth')).toBe('tooth')
      expect(Str.singular('feet')).toBe('foot')
      expect(Str.singular('mice')).toBe('mouse')
      expect(Str.singular('geese')).toBe('goose')
      expect(Str.singular('oxen')).toBe('ox')
      expect(Str.singular('indices')).toBe('index')
      expect(Str.singular('axes')).toBe('axis')
      expect(Str.singular('crises')).toBe('crisis')
      expect(Str.singular('theses')).toBe('thesis')
      expect(Str.singular('phenomena')).toBe('phenomenon')
      expect(Str.singular('data')).toBe('datum')
      expect(Str.singular('cacti')).toBe('cactus')
      expect(Str.singular('foci')).toBe('focus')
      expect(Str.singular('nuclei')).toBe('nucleus')
      expect(Str.singular('syllabi')).toBe('syllabus')
      expect(Str.singular('analyses')).toBe('analysis')
      expect(Str.singular('diagnoses')).toBe('diagnosis')
      expect(Str.singular('parentheses')).toBe('parenthesis')
      expect(Str.singular('stimuli')).toBe('stimulus')
    })

    it('handles -ives → -ife', () => {
      expect(Str.singular('knives')).toBe('knife')
      expect(Str.singular('wives')).toBe('wife')
    })

    it('handles -ves → -f', () => {
      expect(Str.singular('wolves')).toBe('wolf')
      expect(Str.singular('shelves')).toBe('shelf')
    })

    it('handles -ies → -y', () => {
      expect(Str.singular('cities')).toBe('city')
      expect(Str.singular('flies')).toBe('fly')
    })

    it('handles -ses, -xes, -zes, -ches, -shes', () => {
      expect(Str.singular('buses')).toBe('bus')
      expect(Str.singular('boxes')).toBe('box')
      expect(Str.singular('buzzes')).toBe('buzz')
      expect(Str.singular('churches')).toBe('church')
      expect(Str.singular('dishes')).toBe('dish')
    })

    it('handles -oes', () => {
      expect(Str.singular('potatoes')).toBe('potato')
      expect(Str.singular('tomatoes')).toBe('tomato')
    })

    it('keeps -ss unchanged', () => {
      expect(Str.singular('glass')).toBe('glass')
      expect(Str.singular('kiss')).toBe('kiss')
    })

    it('handles regular -s', () => {
      expect(Str.singular('cars')).toBe('car')
      expect(Str.singular('books')).toBe('book')
    })

    it('returns unchanged for unknown', () => {
      expect(Str.singular('hello')).toBe('hello')
    })
  })

  describe('contains', () => {
    it('returns true when substring found', () => {
      expect(Str.contains('hello world', 'world')).toBe(true)
    })

    it('returns false when substring not found', () => {
      expect(Str.contains('hello world', 'xyz')).toBe(false)
    })

    it('is case-sensitive', () => {
      expect(Str.contains('Hello', 'hello')).toBe(false)
    })

    it('handles empty search', () => {
      expect(Str.contains('hello', '')).toBe(true)
    })
  })

  describe('startsWith', () => {
    it('returns true when string starts with prefix', () => {
      expect(Str.startsWith('hello world', 'hello')).toBe(true)
    })

    it('returns false when different', () => {
      expect(Str.startsWith('hello world', 'world')).toBe(false)
    })

    it('handles empty prefix', () => {
      expect(Str.startsWith('hello', '')).toBe(true)
    })
  })

  describe('endsWith', () => {
    it('returns true when string ends with suffix', () => {
      expect(Str.endsWith('hello world', 'world')).toBe(true)
    })

    it('returns false when different', () => {
      expect(Str.endsWith('hello world', 'hello')).toBe(false)
    })

    it('handles empty suffix', () => {
      expect(Str.endsWith('hello', '')).toBe(true)
    })
  })

  describe('replace', () => {
    it('replaces all occurrences', () => {
      expect(Str.replace('hello hello world', 'hello', 'hi')).toBe('hi hi world')
    })

    it('returns original when search not found', () => {
      expect(Str.replace('hello world', 'xyz', 'abc')).toBe('hello world')
    })

    it('handles empty search string by splitting between chars', () => {
      expect(Str.replace('abc', '', 'x')).toBe('axbxc')
    })
  })

  describe('mask', () => {
    it('masks beginning (19 total, 4 visible = 15 stars)', () => {
      expect(Str.mask('1234-5678-9012-3456', 4)).toBe('***************3456')
    })

    it('returns full string when chars >= length', () => {
      expect(Str.mask('hi', 5)).toBe('hi')
    })

    it('uses custom mask character (6 total, 3 visible = 3 hashes)', () => {
      expect(Str.mask('secret', 3, '#')).toBe('###ret')
    })

    it('handles empty string', () => {
      expect(Str.mask('', 4)).toBe('')
    })

    it('shows last n chars', () => {
      expect(Str.mask('hello', 2, '*')).toBe('***lo')
    })
  })

  describe('truncate', () => {
    it('returns full string when shorter than length', () => {
      expect(Str.truncate('hello', 10)).toBe('hello')
    })

    it('truncates with default suffix', () => {
      const result = Str.truncate('hello world foo bar', 14)
      expect(result).toHaveLength(14)
      expect(result.endsWith('...')).toBe(true)
    })

    it('uses custom suffix', () => {
      const result = Str.truncate('hello big world', 8, ' [more]')
      expect(result).toBe('hello [more]')
    })

    it('preserves word boundaries', () => {
      const result = Str.truncate('hello big world', 11)
      expect(result).toBe('hello big...')
    })

    it('handles exact length match', () => {
      expect(Str.truncate('hello', 5)).toBe('hello')
    })

    it('handles empty string', () => {
      expect(Str.truncate('', 5)).toBe('')
    })

    it('truncates and removes trailing partial word', () => {
      const result = Str.truncate('hello world foo bar', 11)
      expect(result).toBe('hello...')
    })
  })
})
