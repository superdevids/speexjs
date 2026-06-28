const INDONESIAN_PREFIXES: ReadonlyArray<[number, number]> = [
  [11, 19],
  [21, 29],
  [51, 59],
  [77, 79],
  [95, 99],
]

function isValidIndonesianPrefix(prefix: number): boolean {
  for (const [min, max] of INDONESIAN_PREFIXES) {
    if (prefix >= min && prefix <= max) return true
  }
  return false
}

/**
 * Validates a phone number.
 *
 * For Indonesian numbers (`country = 'id'`):
 * - Accepted formats: `08xx…`, `+628xx…`, `628xx…`
 * - Must start with a valid operator prefix:
 *   0811-0819, 0821-0829, 0851-0859, 0877-0879, 0895-0899
 * - 10–13 digits after the country code
 *
 * For generic numbers (`country = 'any'`):
 * - Any string with 10–15 digits is accepted
 *
 * @param value - The phone number string
 * @param country - Country to validate against (`'id'` or `'any'`; default `'id'`)
 * @returns `true` if the value is a valid phone number
 *
 * @example isPhone('08123456789')       // => true
 * @example isPhone('+628123456789')     // => true
 * @example isPhone('628123456789')      // => true
 * @example isPhone('081234567')         // => false (too short)
 * @example isPhone('089123456789')      // => false (invalid prefix 91)
 */
export function isPhone(value: string, country: 'id' | 'any' = 'id'): boolean {
  const digits = value.replace(/\D/g, '')

  if (country === 'any') {
    return digits.length >= 10 && digits.length <= 15
  }

  if (digits.length < 10) return false

  let normalized: string
  if (digits.startsWith('62')) {
    normalized = digits.slice(2)
  } else if (digits.startsWith('0')) {
    normalized = digits.slice(1)
  } else {
    normalized = digits
  }

  if (normalized.length < 10 || normalized.length > 13) return false
  if (!normalized.startsWith('8')) return false

  const prefix = Number.parseInt(normalized.slice(1, 3), 10)
  return isValidIndonesianPrefix(prefix)
}
