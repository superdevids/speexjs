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
