/**
 * Validates an Indonesian NPWP (Nomor Pokok Wajib Pajak / Tax Identification Number).
 *
 * A valid NPWP:
 * - Must be 15 or 16 digits (formatted: `XX.XXX.XXX.X-XXX.XXX` or plain digits)
 * - The last digit is a checksum computed from the preceding digits
 *
 * The checksum uses a weighted-sum algorithm with a repeating weight pattern of
 * `[3, 7, 1]`. The computed checksum must equal the last digit.
 *
 * @param value - The NPWP string (formatted with dots & dash, or plain digits)
 * @returns `true` if the value is a valid NPWP
 *
 * @example isNPWP('12.345.678.9-012.344') // => true
 * @example isNPWP('123456789012344')      // => true (plain digits)
 * @example isNPWP('12.345.678.9-012.345') // => false (invalid checksum)
 */
export function isNPWP(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 15 && digits.length !== 16) return false

  const nums: number[] = []
  for (let i = 0; i < digits.length; i++) {
    nums.push(Number.parseInt(digits[i]!, 10))
  }

  const checkDigit = nums[nums.length - 1]!

  let sum = 0
  for (let i = 0; i < nums.length - 1; i++) {
    sum += nums[i]! * [3, 7, 1][i % 3]!
  }

  const computed = (11 - (sum % 11)) % 10
  return computed === checkDigit
}
