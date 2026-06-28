import * as nodeCrypto from 'crypto'
import { constantTimeEqual } from './crypto.js'

// ─── Scrypt (OWASP recommended) ──────────────────────────

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64
const SCRYPT_SALT_BYTES = 32

export function hashPassword(password: string): string {
  const salt = nodeCrypto.randomBytes(SCRYPT_SALT_BYTES).toString('base64')
  const derivedKey = nodeCrypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `$scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derivedKey.toString('base64')}`
}

export function verifyPassword(password: string, hash: string): boolean {
  const parts = hash.split('$')
  if (parts.length !== 7 || parts[1] !== 'scrypt') {
    throw new Error('Invalid scrypt hash format')
  }
  const N = Number(parts[2])
  const r = Number(parts[3])
  const p = Number(parts[4])
  const salt = parts[5]!
  const storedHash = parts[6]!
  const derivedKey = nodeCrypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N,
    r,
    p,
  })
  const derivedHash = derivedKey.toString('base64')
  return constantTimeEqual(storedHash, derivedHash)
}

// ─── PBKDF2 (faster, for non-critical use) ──────────────

const PBKDF2_ITERATIONS = 600000
const PBKDF2_KEYLEN = 64
const PBKDF2_SALT_BYTES = 32

export function hashPasswordFast(password: string): string {
  const salt = nodeCrypto.randomBytes(PBKDF2_SALT_BYTES).toString('base64')
  const derivedKey = nodeCrypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    'sha512',
  )
  return `$pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derivedKey.toString('base64')}`
}

export function verifyPasswordFast(password: string, hash: string): boolean {
  const parts = hash.split('$')
  if (parts.length !== 5 || parts[1] !== 'pbkdf2') {
    throw new Error('Invalid pbkdf2 hash format')
  }
  const iterations = Number(parts[2])
  const salt = parts[3]!
  const storedHash = parts[4]!
  const derivedKey = nodeCrypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    PBKDF2_KEYLEN,
    'sha512',
  )
  const derivedHash = derivedKey.toString('base64')
  return constantTimeEqual(storedHash, derivedHash)
}

// ─── Rehash Detection ────────────────────────────────────

const CURRENT_SCRYPT_PREFIX = `$scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}`
const CURRENT_PBKDF2_PREFIX = `$pbkdf2$${PBKDF2_ITERATIONS}`

export function needsRehash(hash: string): boolean {
  if (hash.startsWith('$scrypt$')) {
    const prefix = hash.split('$').slice(0, 5).join('$')
    return prefix !== CURRENT_SCRYPT_PREFIX
  }
  if (hash.startsWith('$pbkdf2$')) {
    const prefix = hash.split('$').slice(0, 3).join('$')
    return prefix !== CURRENT_PBKDF2_PREFIX
  }
  return true
}
