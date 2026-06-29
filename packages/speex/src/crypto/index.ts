/**
 * Simple hash function using the djb2 algorithm.
 * Fast, non-cryptographic — suitable for hashtables, not security.
 *
 * @param str - The string to hash.
 * @returns A 32-bit integer hash.
 */
export function hash(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0
  }
  return h >>> 0
}

/**
 * Produces a deterministic hex hash from a string.
 * NOT actual MD5 — use for cache keys / deterministic IDs.
 *
 * @param str - The string to hash.
 * @returns A 32-character hex string.
 */
export function simpleHash(str: string): string {
  let h1 = 0x67452301
  let h2 = 0xefcdab89
  let h3 = 0x98badcfe
  let h4 = 0x10325476

  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 = (h1 + c) | 0
    h2 = (h2 + (c << 3) + i) | 0
    h3 = (h3 ^ c) | 0
    h4 = (h4 + (c << 5) + (c << 1)) | 0
  }

  const toHex = (n: number): string => (n >>> 0).toString(16).padStart(8, '0')
  return toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4)
}

function getRandomBytes(size: number): Uint8Array {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(size)
    crypto.getRandomValues(bytes)
    return bytes
  }
  throw new Error('Crypto API unavailable. Cannot generate secure random bytes.')
}

/**
 * Generates random bytes as a hex string.
 *
 * @param size - Number of random bytes (default 16).
 * @returns A hex string of length `size * 2`.
 */
export function randomHex(size: number = 16): string {
  const bytes = getRandomBytes(size)
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += bytes[i]!.toString(16).padStart(2, '0')
  }
  return result
}

function utf8ToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str)
  }
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i)
  }
  return bytes
}

function bytesToUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes)
  }
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]!)
  }
  return result
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  if (typeof btoa === 'function') {
    return btoa(binary)
  }
  return Buffer.from(binary, 'latin1').toString('base64')
}

function base64ToBytes(str: string): Uint8Array {
  let binary: string
  if (typeof atob === 'function') {
    binary = atob(str)
  } else {
    binary = Buffer.from(str, 'base64').toString('latin1')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Encodes a string to base64. Works in both Node.js and browser.
 * Handles UTF-8 characters correctly.
 *
 * @param str - The string to encode.
 * @returns The base64-encoded string.
 */
export function base64Encode(str: string): string {
  const bytes = utf8ToBytes(str)
  return bytesToBase64(bytes)
}

/**
 * Decodes a base64-encoded string. Works in both Node.js and browser.
 *
 * @param str - The base64 string to decode.
 * @returns The decoded string.
 */
export function base64Decode(str: string): string {
  const bytes = base64ToBytes(str)
  return bytesToUtf8(bytes)
}

/**
 * Generates a cryptographically random token string.
 *
 * @param bytes - Number of random bytes (default 32 → 64-char hex).
 * @returns A hex string suitable for API keys, reset tokens, etc.
 */
export function generateToken(bytes: number = 32): string {
  return randomHex(bytes)
}

/**
 * Generates a numeric OTP of the given length.
 *
 * @param length - Number of digits (default 6).
 * @returns A numeric string of the specified length.
 */
export function generateOTP(length: number = 6): string {
  const bytes = getRandomBytes(length)
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += (bytes[i]! % 10).toString()
  }
  return otp
}

/**
 * Simple XOR cipher — symmetrical, for light obfuscation only.
 *
 * ⚠️ WARNING: This is NOT encryption. XOR cipher provides zero security
 * against any attacker. Do NOT use this for passwords, API keys, personal
 * data, or any sensitive information. It can be trivially reversed.
 * For real encryption, use native `crypto.subtle` (Web) or `node:crypto`.
 *
 * Suitable only for: basic data masking, simple anti-scraping, educational purposes.
 *
 * @param str - The input string (will be transformed).
 * @param key - The cipher key.
 * @returns The XOR-transformed string.
 */
export function xorCipher(str: string, key: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(code)
  }
  return result
}

/**
 * Computes a simple checksum (CRC-like) for file integrity checks.
 *
 * @param input - The input string.
 * @returns An 8-character hex checksum.
 */
export function checksum(input: string): string {
  let crc = 0xffffffff
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i)
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320
      } else {
        crc = crc >>> 1
      }
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns Whether the strings are equal.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
