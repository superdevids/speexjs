export interface IsIntOptions {
  min?: number
  max?: number
  allowLeadingZero?: boolean
}

/**
 * Checks if a string is a valid integer.
 *
 * @param value - The string to validate.
 * @param options - Optional constraints for min, max, and leading zeros.
 * @returns Whether the value is a valid integer meeting the constraints.
 *
 * @example
 * isInt('42') // true
 * isInt('3.14') // false
 * isInt('05') // false (leading zero)
 * isInt('05', { allowLeadingZero: true }) // true
 */
export function isInt(value: string, options?: IsIntOptions): boolean {
  if (typeof value !== 'string' || value.length === 0) return false

  const { min, max, allowLeadingZero = false } = options ?? {}
  const re = allowLeadingZero ? /^[+-]?\d+$/ : /^[+-]?(?:0|[1-9]\d*)$/

  if (!re.test(value)) return false

  const num = Number.parseInt(value, 10)
  if (Number.isNaN(num)) return false
  if (min !== undefined && num < min) return false
  if (max !== undefined && num > max) return false

  return true
}
