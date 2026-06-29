const WORD_SPLIT_RE = /[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\b)|\d+/g

function splitWords(str: string): string[] {
  if (typeof str !== 'string' || str.length === 0) return []
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
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return `{{${key}}}`
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
  const bytes = new Uint8Array(size)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    throw new Error('Crypto API unavailable. Cannot generate secure random ID.')
  }
  let result = ''
  for (let i = 0; i < size; i++) {
    result += alphabet[bytes[i]! % len]!
  }
  return result
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
  '/': '&#x2F;',
}

const HTML_UNESCAPE_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&#96;': '`',
  '&#x2F;': '/',
}

/**
 * Escapes HTML special characters (&, <, >, ", ').
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`\/]/g, ch => HTML_ESCAPE_MAP[ch] ?? ch)
}

/**
 * Unescapes common HTML entities.
 */
export function unescapeHtml(str: string): string {
  return str.replace(/&(?:amp|lt|gt|quot|#39|#x27|#96|#x2F);/g, entity => HTML_UNESCAPE_MAP[entity] ?? entity)
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
  const bytes = new Uint8Array(length)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    throw new Error('Crypto API unavailable. Cannot generate secure random string.')
  }
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % chars.length]
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

/**
 * Removes HTML tags from a string. Only removes tags, not their content.
 *
 * @example stripHtml('<p>Hello <b>world</b></p>') // "Hello world"
 * @example stripHtml('<script>alert("x")</script>hi') // 'alert("x")hi'
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

/**
 * Truncates a string by word count, appending a suffix when truncated.
 *
 * @example truncateWords('hello world foo bar', 2) // "hello world..."
 * @example truncateWords('hello world foo bar', 2, '…') // "hello world…"
 */
export function truncateWords(str: string, count: number, suffix = '...'): string {
  const words = str.split(/\s+/).filter(Boolean)
  if (words.length <= count) return str
  return words.slice(0, count).join(' ') + suffix
}

/**
 * Checks if a string is a palindrome, ignoring case, spaces, and punctuation.
 *
 * @example isPalindrome('A man, a plan, a canal: Panama') // true
 * @example isPalindrome('race a car') // false
 */
export function isPalindrome(str: string): boolean {
  const cleaned = str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (cleaned.length <= 1) return true
  let left = 0
  let right = cleaned.length - 1
  while (left < right) {
    if (cleaned[left] !== cleaned[right]) return false
    left++
    right--
  }
  return true
}

/**
 * Checks if two strings are anagrams, ignoring case and spaces.
 *
 * @example isAnagram('listen', 'silent') // true
 * @example isAnagram('hello', 'world') // false
 */
export function isAnagram(str1: string, str2: string): boolean {
  const clean = (s: string) => s.replace(/\s/g, '').toLowerCase().split('').sort().join('')
  return clean(str1) === clean(str2)
}

/**
 * Computes the Dice coefficient similarity between two strings (0-1).
 *
 * @example similarity('hello', 'hallo') // 0.666...
 * @example similarity('abc', 'xyz') // 0
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const bigrams = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2)
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1)
  }
  let intersection = 0
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2)
    const count = bigrams.get(bg) ?? 0
    if (count > 0) {
      bigrams.set(bg, count - 1)
      intersection++
    }
  }
  return (2 * intersection) / (a.length + b.length - 2)
}

/**
 * Removes common leading whitespace from each line in a multi-line string.
 *
 * @example dedent('  hello\n  world') // "hello\nworld"
 * @example dedent('    foo\n      bar') // "foo\n  bar"
 */
export function dedent(str: string): string {
  const lines = str.split('\n')
  if (lines.length === 0) return str
  const indent = lines.reduce<number | null>((min, line) => {
    if (line.trim().length === 0) return min
    const leading = line.match(/^[ \t]*/)?.[0]?.length ?? 0
    return min === null ? leading : Math.min(min, leading)
  }, null)
  if (indent === null || indent === 0) return str
  return lines.map(line => line.slice(indent)).join('\n')
}

/**
 * Counts the number of words in a string, handling multiple spaces and punctuation.
 *
 * @example wordCount('hello world') // 2
 * @example wordCount('  hello   world! ') // 2
 */
export function wordCount(str: string): number {
  const match = str.match(/[a-zA-Z0-9]+(?:['\u2019][a-zA-Z]+)?/g)
  return match ? match.length : 0
}

/**
 * Swaps the case of each character in a string (upper to lower, lower to upper).
 *
 * @example swapCase('Hello World') // "hELLO wORLD"
 * @example swapCase('ABC123') // "abc123"
 */
export function swapCase(str: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!
    if (ch >= 'a' && ch <= 'z') {
      result += ch.toUpperCase()
    } else if (ch >= 'A' && ch <= 'Z') {
      result += ch.toLowerCase()
    } else {
      result += ch
    }
  }
  return result
}

/**
 * Converts a string to COBOL / SCREAMING_SNAKE_CASE.
 *
 * @example toCobolCase('helloWorld') // "HELLO_WORLD"
 * @example toCobolCase('getUserByID') // "GET_USER_BY_ID"
 */
export function toCobolCase(str: string): string {
  const words = splitWords(str)
  return words.map(w => w.toUpperCase()).join('_')
}

/**
 * Escapes special regex characters in a string.
 *
 * @param str - String to escape.
 * @returns Escaped string safe for use in the RegExp constructor.
 *
 * @example escapeRegExp('hello.world') // 'hello\.world'
 * @example escapeRegExp('(test)')      // '\(test\)'
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Counts character frequency in a string.
 *
 * @example charCount('hello') // { h: 1, e: 1, l: 2, o: 1 }
 * @example charCount('aabb') // { a: 2, b: 2 }
 */
export function charCount(str: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!
    result[ch] = (result[ch] ?? 0) + 1
  }
  return result
}

export function upperFirst(str:string):string{if(str.length===0)return str;return str[0]!.toUpperCase()+str.slice(1)}

export function lowerFirst(str:string):string{if(str.length===0)return str;return str[0]!.toLowerCase()+str.slice(1)}

export function startCase(str:string):string{const w=splitWords(str);return w.map(x=>x[0]!.toUpperCase()+x.slice(1).toLowerCase()).join(' ')}

export function lowerCase(str:string):string{return splitWords(str).map(w=>w.toLowerCase()).join(' ')}

export function upperCase(str:string):string{return splitWords(str).map(w=>w.toUpperCase()).join(' ')}

export function lines(str:string):string[]{if(str.length===0)return[];return str.split(/\r?\n/)}

export function chars(str:string):string[]{return str.split('')}
