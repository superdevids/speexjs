/**
 * Validates an Indonesian NIK (Nomor Induk Kependudukan / Resident Identity Number).
 *
 * A valid NIK:
 * - Must be exactly 16 digits
 * - Structure: PP CC DD DDMMYY SSSS
 *   - PP: Province code (2 digits)
 *   - CC: City code (2 digits)
 *   - DD: District code (2 digits)
 *   - DDMMYY: Birth date (6 digits; for women the day is incremented by 40)
 *   - SSSS: Serial number (4 digits)
 * - The birth date must correspond to a valid calendar date
 *
 * @param value - The NIK string (digits only or with dots)
 * @returns `true` if the value is a valid NIK
 *
 * @example isNIK('3201010203940001') // => true (male, born 2 March 1994)
 * @example isNIK('3201015203940001') // => true (female, born 12 March 1994)
 * @example isNIK('1234567890123456') // => false (invalid birth date)
 * @example isNIK('320101')          // => false (too short)
 */
export function isNIK(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 16) return false

  const rawDay = Number.parseInt(digits.slice(6, 8), 10)
  const month = Number.parseInt(digits.slice(8, 10), 10)
  const year = Number.parseInt(digits.slice(10, 12), 10)

  if (rawDay < 1 || rawDay > 71) return false
  if (month < 1 || month > 12) return false

  let day = rawDay
  if (day >= 41) day -= 40

  const fullYear = year < 70 ? 2000 + year : 1900 + year
  const date = new Date(fullYear, month - 1, day)

  return (
    date.getFullYear() === fullYear &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}
