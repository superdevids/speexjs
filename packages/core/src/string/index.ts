import { formatCurrency } from '../math/index.js'

const WORD_SPLIT_RE = /[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\b)|\d+/g

function splitWords(str: string): string[] {
  return str.match(WORD_SPLIT_RE) ?? []
}

/**
 * Capitalizes the first character and lowercases the rest.
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str
  return str[0]!.toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Converts a string to camelCase.
 */
export function camelCase(str: string): string {
  const words = splitWords(str)
  if (words.length === 0) return ''
  const [firstWord, ...rest] = words
  return firstWord!.toLowerCase() + rest.map(w => w[0]!.toUpperCase() + w.slice(1).toLowerCase()).join('')
}

/**
 * Converts a string to kebab-case.
 */
export function kebabCase(str: string): string {
  return splitWords(str).map(w => w.toLowerCase()).join('-')
}

/**
 * Converts a string to snake_case.
 */
export function snakeCase(str: string): string {
  return splitWords(str).map(w => w.toLowerCase()).join('_')
}

/**
 * Converts a string to PascalCase.
 */
export function pascalCase(str: string): string {
  return splitWords(str).map(w => w[0]!.toUpperCase() + w.slice(1).toLowerCase()).join('')
}

/**
 * Truncates a string to the specified length, appending a suffix (default "...").
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str
  return str.slice(0, Math.max(0, maxLength - suffix.length)) + suffix
}

/**
 * Simple string interpolation using {{key}} syntax.
 *
 * @example template("Hello {{name}}", { name: "world" }) // => "Hello world"
 */
export function template(str: string, data: Record<string, string | number>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = data[key]
    return value !== undefined ? String(value) : `{{${key}}}`
  })
}

/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID when available, falls back to manual implementation.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const hex = '0123456789abcdef'
  const chars: string[] = []
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      chars.push('-')
    } else if (i === 14) {
      chars.push('4')
    } else if (i === 19) {
      chars.push(hex[Math.floor(Math.random() * 4) + 8]!)
    } else {
      chars.push(hex[Math.floor(Math.random() * 16)]!)
    }
  }
  return chars.join('')
}

/**
 * Generates a short random ID with configurable length and alphabet.
 *
 * @default size = 21, alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-"
 */
export function nanoid(size = 21, alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-'): string {
  const len = alphabet.length
  let result = ''
  for (let i = 0; i < size; i++) {
    result += alphabet[Math.floor(Math.random() * len)]!
  }
  return result
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const HTML_UNESCAPE_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
}

/**
 * Escapes HTML special characters (&, <, >, ", ').
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch] ?? ch)
}

/**
 * Unescapes common HTML entities.
 */
export function unescapeHtml(str: string): string {
  return str.replace(/&(?:amp|lt|gt|quot|#39|#x27);/g, entity => HTML_UNESCAPE_MAP[entity] ?? entity)
}

/**
 * Removes whitespace from both ends of a string.
 */
export function trim(str: string): string {
  return str.trim()
}

/**
 * Removes whitespace from the start of a string.
 */
export function trimStart(str: string): string {
  return str.trimStart()
}

/**
 * Removes whitespace from the end of a string.
 */
export function trimEnd(str: string): string {
  return str.trimEnd()
}

/**
 * Pads a string to the given length by adding characters to both sides.
 */
export function pad(str: string, length: number, char = ' '): string {
  const totalPadding = Math.max(0, length - str.length)
  const leftPad = Math.floor(totalPadding / 2)
  const rightPad = totalPadding - leftPad
  return char.repeat(leftPad) + str + char.repeat(rightPad)
}

/**
 * Pads the start of a string to the given length.
 */
export function padStart(str: string, length: number, char = ' '): string {
  return str.padStart(length, char)
}

/**
 * Pads the end of a string to the given length.
 */
export function padEnd(str: string, length: number, char = ' '): string {
  return str.padEnd(length, char)
}

/**
 * Reverses a string.
 */
export function reverse(str: string): string {
  return str.split('').reverse().join('')
}

/**
 * Splits a string into words.
 */
export function words(str: string): string[] {
  return splitWords(str)
}

/**
 * Converts a string to a URL-friendly slug.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/**
 * Counts occurrences of a substring in a string.
 */
export function countOccurrences(str: string, substring: string): number {
  if (substring.length === 0 || str.length === 0) return 0
  let count = 0
  let pos = 0
  while ((pos = str.indexOf(substring, pos)) !== -1) {
    count++
    pos += substring.length
  }
  return count
}

/**
 * Computes the Levenshtein distance between two strings.
 * Uses iterative DP with O(min(m,n)) space.
 */
export function levenshtein(a: string, b: string): number {
  const an = a.length
  const bn = b.length
  if (an === 0) return bn
  if (bn === 0) return an
  if (an < bn) return levenshtein(b, a)

  let prev = new Uint32Array(bn + 1)
  let curr = new Uint32Array(bn + 1)
  for (let j = 0; j <= bn; j++) prev[j] = j

  for (let i = 1; i <= an; i++) {
    curr[0] = i
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j]! + 1,
        curr[j - 1]! + 1,
        prev[j - 1]! + cost,
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[bn]!
}

/**
 * Performs a simple fuzzy match: checks if all characters of query
 * appear in str in order (case-insensitive).
 */
export function fuzzyMatch(str: string, query: string): boolean {
  if (query.length === 0) return true
  if (str.length === 0) return false
  const sl = str.toLowerCase()
  const ql = query.toLowerCase()
  let si = 0
  for (let qi = 0; qi < ql.length; qi++) {
    si = sl.indexOf(ql[qi]!, si)
    if (si === -1) return false
    si++
  }
  return true
}

/**
 * Masks parts of a string, useful for data compliance (PDPA/GDPR).
 *
 * @example maskString('08123456789') // "0812****789"
 * @example maskString('hello@email.com') // "h***@e***.com"
 * @example maskString('1234567890', { start: 0, end: 4, char: '#' }) // "####567890"
 */
export function maskString(
  str: string,
  options?: {
    start?: number
    end?: number
    char?: string
  },
): string {
  if (str.length === 0) return str
  const maskChar = options?.char ?? '*'
  const start = options?.start ?? Math.ceil(str.length * 0.25)
  const end = options?.end ?? Math.floor(str.length * 0.75)

  if (start >= end || start < 0) return str
  const clampedStart = Math.max(0, start)
  const clampedEnd = Math.min(str.length, end)
  return (
    str.slice(0, clampedStart) +
    maskChar.repeat(clampedEnd - clampedStart) +
    str.slice(clampedEnd)
  )
}

// ─── Indonesian Locale Utilities ────────────────────────

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'] as const
const BELASAN = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'] as const
const PULUHAN = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'] as const

function _terbilang(n: number): string {
  if (n < 0) return 'minus ' + _terbilang(-n)
  if (n === 0) return 'nol'
  if (n < 10) return SATUAN[n]!
  if (n < 20) return n === 10 ? 'sepuluh' : n === 11 ? 'sebelas' : BELASAN[n - 10]!
  if (n < 100) {
    const pul = Math.floor(n / 10)
    const sat = n % 10
    return PULUHAN[pul]! + (sat > 0 ? ' ' + SATUAN[sat]! : '')
  }
  if (n < 1000) {
    const ratus = Math.floor(n / 100)
    const sis = n % 100
    const ratusStr = ratus === 1 ? 'seratus' : SATUAN[ratus]! + ' ratus'
    return ratusStr + (sis > 0 ? ' ' + _terbilang(sis) : '')
  }
  if (n < 1_000_000) {
    const rib = Math.floor(n / 1000)
    const sis = n % 1000
    const ribStr = rib === 1 ? 'seribu' : _terbilang(rib) + ' ribu'
    return ribStr + (sis > 0 ? ' ' + _terbilang(sis) : '')
  }
  if (n < 1_000_000_000) {
    const jut = Math.floor(n / 1_000_000)
    const sis = n % 1_000_000
    return _terbilang(jut) + ' juta' + (sis > 0 ? ' ' + _terbilang(sis) : '')
  }
  if (n < 1_000_000_000_000) {
    const mil = Math.floor(n / 1_000_000_000)
    const sis = n % 1_000_000_000
    return _terbilang(mil) + ' miliar' + (sis > 0 ? ' ' + _terbilang(sis) : '')
  }
  const tril = Math.floor(n / 1_000_000_000_000)
  const sis = n % 1_000_000_000_000
  return _terbilang(tril) + ' triliun' + (sis > 0 ? ' ' + _terbilang(sis) : '')
}

/**
 * Converts a number to Indonesian words (terbilang).
 *
 * @example terbilang(1500000) // "satu juta lima ratus ribu"
 * @example terbilang(2024)    // "dua ribu dua puluh empat"
 * @example terbilang(11)      // "sebelas"
 * @example terbilang(100)     // "seratus"
 */
export function terbilang(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError('Input must be a finite number')
  if (value > Number.MAX_SAFE_INTEGER) throw new RangeError('Input terlalu besar')
  return _terbilang(Math.floor(Math.abs(value)))
}

/**
 * Formats a number as Indonesian Rupiah string.
 *
 * @example formatRupiah(1500000) // "Rp1.500.000"
 * @example formatRupiah(1500000, { notation: 'compact' }) // "Rp1,5 jt"
 */
export function formatRupiah(
  value: number,
  options?: { notation?: 'standard' | 'compact' },
): string {
  return formatCurrency(value, { locale: 'id-ID', currency: 'IDR', notation: options?.notation })
}

/**
 * Formats a byte count into a human-readable string.
 *
 * @example formatBytes(1024) // "1 KB"
 * @example formatBytes(1536) // "1.5 KB"
 * @example formatBytes(1048576) // "1 MB"
 * @example formatBytes(0) // "0 B"
 */
export function formatBytes(bytes: number, options?: { decimals?: number }): string {
  if (bytes === 0) return '0 B'
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const dm = options?.decimals ?? (i === 0 ? 0 : 1)
  const index = Math.min(i, sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, index)).toFixed(dm)) + ' ' + sizes[index]
}

/**
 * Generates a random alphanumeric string of the specified length.
 *
 * @example randomString() // "a3F8k2..."
 * @example randomString(8) // "X7j2K9mQ"
 */
export function randomString(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/**
 * Returns a random boolean value.
 *
 * @example randomBoolean() // true or false
 */
export function randomBoolean(): boolean {
  return Math.random() >= 0.5
}

/**
 * Basic English pluralization helper. Adds 's' or 'es' based on simple rules.
 *
 * @example pluralize(1, 'apple') // "apple"
 * @example pluralize(3, 'apple') // "apples"
 * @example pluralize(0, 'box')   // "boxes"
 * @example pluralize(1, 'box')   // "box"
 */
export function pluralize(count: number, singular: string): string {
  if (count === 1) return singular
  const last = singular[singular.length - 1]
  const lastTwo = singular.slice(-2)
  if (last === 's' || last === 'x' || last === 'z' || lastTwo === 'ch' || lastTwo === 'sh') {
    return singular + 'es'
  }
  if (last === 'y' && singular.length > 2 && !'aeiou'.includes(singular[singular.length - 2]!)) {
    return singular.slice(0, -1) + 'ies'
  }
  return singular + 's'
}
