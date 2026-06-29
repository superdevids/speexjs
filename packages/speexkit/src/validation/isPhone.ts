/**
 * Validates a phone number globally.
 * 
 * - Accepts formats: +62812..., 0812..., 62812... etc
 * - Minimum 7 digits, maximum 15 digits (after removing non-digit chars)
 * - Strips +, spaces, dashes, parentheses before checking
 *
 * @param value - The phone number string
 * @returns `true` if the value is a valid phone number
 *
 * @example isPhone('+1234567890')      // => true
 * @example isPhone('08123456789')       // => true
 * @example isPhone('12345')            // => false (too short)
 * @example isPhone('')                 // => false
 */
export function isPhone(value: string): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) return false

  const digits = value.replace(/\D/g, '')

  // Must have digits
  if (digits.length === 0) return false

  // Global standard: 7-15 digits (ITU-T E.164 recommendation)
  return digits.length >= 7 && digits.length <= 15
}
