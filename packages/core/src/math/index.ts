/**
 * Error thrown when attempting to divide by zero.
 */
export class DivisionByZeroError extends Error {
  constructor() {
    super('Division by zero')
    this.name = 'DivisionByZeroError'
  }
}

function getPrecision(value: number): number {
  if (!isFinite(value)) return 0
  const eIndex = String(value).indexOf('e')
  if (eIndex > -1) {
    const exp = parseInt(String(value).slice(eIndex + 1), 10)
    if (exp < 0) return Math.abs(exp)
    return 0
  }
  const str = String(value)
  const dot = str.indexOf('.')
  return dot === -1 ? 0 : str.length - dot - 1
}

function toPrecisionFactor(a: number, b: number): number {
  return Math.pow(10, Math.max(getPrecision(a), getPrecision(b)))
}

/**
 * Safely adds two numbers, handling floating-point precision.
 *
 * @param a - First number.
 * @param b - Second number.
 * @returns The sum.
 */
export function add(a: number, b: number): number {
  const factor = toPrecisionFactor(a, b)
  return (Math.round(a * factor) + Math.round(b * factor)) / factor
}

/**
 * Safely subtracts two numbers, handling floating-point precision.
 *
 * @param a - First number.
 * @param b - Second number.
 * @returns The difference.
 */
export function sub(a: number, b: number): number {
  const factor = toPrecisionFactor(a, b)
  return (Math.round(a * factor) - Math.round(b * factor)) / factor
}

/**
 * Safely multiplies two numbers, handling floating-point precision.
 *
 * @param a - First number.
 * @param b - Second number.
 * @returns The product.
 */
export function mul(a: number, b: number): number {
  const factorA = toPrecisionFactor(a, 1)
  const factorB = toPrecisionFactor(1, b)
  const result = (Math.round(a * factorA) * Math.round(b * factorB)) / (factorA * factorB)
  return result
}

/**
 * Safely divides two numbers.
 *
 * @param a - The dividend.
 * @param b - The divisor.
 * @returns The quotient.
 * @throws {DivisionByZeroError} If `b` is zero.
 */
export function div(a: number, b: number): number {
  if (b === 0) throw new DivisionByZeroError()
  const factor = toPrecisionFactor(a, b)
  return Math.round(a * factor) / Math.round(b * factor)
}

/**
 * Rounds a number to the given precision.
 *
 * @param value - The number to round.
 * @param precision - Number of decimal places (default 0).
 * @returns The rounded value.
 */
export function round(value: number, precision: number = 0): number {
  const factor = Math.pow(10, precision)
  // Use toPrecision to avoid floating-point multiplication errors
  // e.g. 1.005 * 100 = 100.49999999999999 without this fix
  const shifted = Number((value * factor).toPrecision(15))
  return Math.round(shifted) / factor
}

/**
 * Floors a number to the given precision.
 *
 * @param value - The number to floor.
 * @param precision - Number of decimal places (default 0).
 * @returns The floored value.
 */
export function floor(value: number, precision: number = 0): number {
  const factor = Math.pow(10, precision)
  return Math.floor(value * factor) / factor
}

/**
 * Ceils a number to the given precision.
 *
 * @param value - The number to ceil.
 * @param precision - Number of decimal places (default 0).
 * @returns The ceiled value.
 */
export function ceil(value: number, precision: number = 0): number {
  const factor = Math.pow(10, precision)
  return Math.ceil(value * factor) / factor
}

/**
 * Checks if two numbers are approximately equal within a tolerance.
 *
 * @param a - First number.
 * @param b - Second number.
 * @param tolerance - Maximum difference (default `Number.EPSILON`).
 * @returns Whether the numbers are approximately equal.
 */
export function approxEqual(a: number, b: number, tolerance: number = Number.EPSILON): boolean {
  return Math.abs(a - b) <= tolerance
}

/**
 * Clamps a value within the inclusive range [min, max].
 *
 * @param value - The value to clamp.
 * @param min - The lower bound.
 * @param max - The upper bound.
 * @returns The clamped value.
 * @throws {RangeError} If `min` exceeds `max`.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError('Minimum value cannot exceed maximum value')
  }
  return Math.min(Math.max(value, min), max)
}

/**
 * Computes the sum of an array of numbers.
 *
 * @param values - Array of numbers.
 * @returns The total sum.
 */
export function sum(values: number[]): number {
  let total = 0
  for (let i = 0; i < values.length; i++) {
    total += values[i]!
  }
  return total
}

/**
 * Computes the average (mean) of an array of numbers.
 *
 * @param values - Array of numbers.
 * @returns The average.
 * @throws {RangeError} If the array is empty.
 */
export function average(values: number[]): number {
  if (values.length === 0) {
    throw new RangeError('Cannot compute average of an empty array')
  }
  return sum(values) / values.length
}

/**
 * Generates a random integer between `min` and `max` (inclusive).
 *
 * @param min - The minimum integer.
 * @param max - The maximum integer.
 * @returns A random integer.
 * @throws {RangeError} If arguments are not integers or `min > max`.
 */
export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new RangeError('Arguments must be integers')
  }
  if (min > max) {
    throw new RangeError('Minimum value cannot exceed maximum value')
  }
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Checks if a number is within the inclusive range [min, max].
 *
 * @param value - The number to check.
 * @param min - The lower bound.
 * @param max - The upper bound.
 * @returns Whether the value is in range.
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

// ─── Statistics ─────────────────────────────────────────

/**
 * Computes the median of an array of numbers.
 *
 * @param values - Array of numbers.
 * @returns The median value.
 * @throws {RangeError} If the array is empty.
 */
export function median(values: number[]): number {
  if (values.length === 0) throw new RangeError('Cannot compute median of an empty array')
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/**
 * Computes the population standard deviation.
 *
 * @param values - Array of numbers.
 * @returns The standard deviation.
 * @throws {RangeError} If the array has fewer than 2 values.
 */
export function stddev(values: number[]): number {
  if (values.length < 2) throw new RangeError('Need at least 2 values for stddev')
  const mean = sum(values) / values.length
  const sqDiffs = values.map((v) => (v - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length)
}

/**
 * Computes the sample standard deviation (Bessel's correction).
 *
 * @param values - Array of numbers.
 * @returns The sample standard deviation.
 * @throws {RangeError} If the array has fewer than 2 values.
 */
export function sampleStddev(values: number[]): number {
  if (values.length < 2) throw new RangeError('Need at least 2 values for sample stddev')
  const mean = sum(values) / values.length
  const sqDiffs = values.map((v) => (v - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1))
}

/**
 * Computes the percentile value (0-100) using linear interpolation.
 *
 * @param values - Array of numbers.
 * @param p - Percentile (0-100).
 * @returns The percentile value.
 * @throws {RangeError} If p is outside [0, 100] or array is empty.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) throw new RangeError('Cannot compute percentile of empty array')
  if (p < 0 || p > 100) throw new RangeError('Percentile must be between 0 and 100')
  const sorted = [...values].sort((a, b) => a - b)
  const rank = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  if (lower === upper) return sorted[lower]!
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (rank - lower)
}

/**
 * Computes the Pearson correlation coefficient between two arrays.
 *
 * @param x - First array.
 * @param y - Second array.
 * @returns The correlation coefficient (-1 to 1).
 * @throws {RangeError} If arrays have different lengths or fewer than 2 pairs.
 */
export function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length) throw new RangeError('Arrays must have the same length')
  if (x.length < 2) throw new RangeError('Need at least 2 pairs for correlation')
  const n = x.length
  const meanX = sum(x) / n
  const meanY = sum(y) / n
  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - meanX
    const dy = y[i]! - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  if (denX === 0 || denY === 0) return 0
  return num / Math.sqrt(denX * denY)
}

/**
 * Formats a number as a currency string with locale support.
 *
 * @example formatCurrency(1500000) // "Rp1.500.000"
 * @example formatCurrency(1500000, { notation: 'compact' }) // "Rp1,5 jt"
 * @example formatCurrency(99.99, { locale: 'en-US', currency: 'USD' }) // "$99.99"
 *
 * @param value - The number to format.
 * @param options - Formatting options.
 * @returns The formatted currency string.
 */
export function formatCurrency(
  value: number,
  options?: { locale?: string; currency?: string; notation?: 'standard' | 'compact' },
): string {
  const locale = options?.locale ?? 'id-ID'
  const currency = options?.currency ?? 'IDR'
  const notation = options?.notation ?? 'standard'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString(locale)}`
  }
}
