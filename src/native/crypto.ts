import * as nodeCrypto from 'crypto'

// ─── Encryption (AES-256-GCM) ──────────────────────────

export interface EncryptedData {
  encrypted: string
  iv: string
  tag: string
}

export function encrypt(data: string, key: string): EncryptedData {
  const keyBuffer = Buffer.from(key, 'base64')
  if (keyBuffer.length !== 32) {
    throw new Error('Key must be 32 bytes (256 bits) for AES-256-GCM')
  }
  const iv = nodeCrypto.randomBytes(16)
  const cipher = nodeCrypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const tag = cipher.getAuthTag().toString('base64')
  return { encrypted, iv: iv.toString('base64'), tag }
}

export function decrypt(encrypted: EncryptedData, key: string): string {
  const keyBuffer = Buffer.from(key, 'base64')
  if (keyBuffer.length !== 32) {
    throw new Error('Key must be 32 bytes (256 bits) for AES-256-GCM')
  }
  const decipher = nodeCrypto.createDecipheriv(
    'aes-256-gcm',
    keyBuffer,
    Buffer.from(encrypted.iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'))
  let decrypted = decipher.update(encrypted.encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// ─── Hashing ────────────────────────────────────────────

export function hash(
  data: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256',
): string {
  return nodeCrypto.createHash(algorithm).update(data, 'utf8').digest('hex')
}

export function hmac(
  data: string,
  secret: string,
  algorithm: 'sha256' | 'sha384' = 'sha256',
): string {
  return nodeCrypto
    .createHmac(algorithm, secret)
    .update(data, 'utf8')
    .digest('hex')
}

export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    return false
  }
  return nodeCrypto.timingSafeEqual(bufA, bufB)
}

// ─── Random ─────────────────────────────────────────────

export function randomHex(bytes: number = 32): string {
  return nodeCrypto.randomBytes(bytes).toString('hex')
}

export function generateToken(bytes: number = 48): string {
  return nodeCrypto.randomBytes(bytes).toString('base64url')
}

export function generateOTP(length: number = 6): string {
  const bytes = nodeCrypto.randomBytes(Math.ceil(length * 0.5))
  let otp = ''
  for (const b of bytes) {
    otp += (b % 10).toString()
    if (otp.length >= length) break
  }
  return otp
}

export function uuid(): string {
  return nodeCrypto.randomUUID()
}

// ─── Encoding ───────────────────────────────────────────

export function base64Encode(data: string): string {
  return Buffer.from(data, 'utf8').toString('base64')
}

export function base64Decode(data: string): string {
  return Buffer.from(data, 'base64').toString('utf8')
}

export function checksum(data: string): string {
  return nodeCrypto
    .createHash('sha256')
    .update(data, 'utf8')
    .digest('base64')
    .slice(0, 8)
}

// ─── Key Generation ────────────────────────────────────

export function generateEncryptionKey(): string {
  return nodeCrypto.randomBytes(32).toString('base64')
}

export function deriveKey(
  password: string,
  salt?: string,
  iterations: number = 600000,
): { key: string; salt: string } {
  const actualSalt = salt ?? nodeCrypto.randomBytes(32).toString('hex')
  const derivedKey = nodeCrypto.pbkdf2Sync(
    password,
    actualSalt,
    iterations,
    32,
    'sha512',
  )
  return { key: derivedKey.toString('base64'), salt: actualSalt }
}
