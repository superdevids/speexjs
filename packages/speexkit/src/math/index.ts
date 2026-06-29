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

// ─── Parity ─────────────────────────────────────────────

/**
 * Checks if a number is even.
 *
 * @example isEven(4) // true
 * @example isEven(7) // false
 *
 * @param n - The number to check.
 * @returns Whether the number is even.
 */
export function isEven(n: number): boolean {
  return n % 2 === 0
}

/**
 * Checks if a number is odd.
 *
 * @example isOdd(3) // true
 * @example isOdd(8) // false
 *
 * @param n - The number to check.
 * @returns Whether the number is odd.
 */
export function isOdd(n: number): boolean {
  return n % 2 !== 0
}

// ─── Number Theory ──────────────────────────────────────

/**
 * Computes the greatest common divisor (GCD) using the Euclidean algorithm.
 *
 * @example gcd(12, 8) // 4
 * @example gcd(17, 5) // 1
 *
 * @param a - First integer.
 * @param b - Second integer.
 * @returns The GCD.
 */
export function gcd(a: number, b: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new RangeError('Arguments must be integers')
  }
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

/**
 * Computes the least common multiple (LCM).
 *
 * @example lcm(4, 6) // 12
 * @example lcm(7, 5) // 35
 *
 * @param a - First integer.
 * @param b - Second integer.
 * @returns The LCM.
 * @throws {RangeError} If either argument is zero.
 */
export function lcm(a: number, b: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new RangeError('Arguments must be integers')
  }
  if (a === 0 || b === 0) {
    throw new RangeError('Arguments must be non-zero')
  }
  return Math.abs(a * b) / gcd(a, b)
}

/**
 * Computes the factorial of a non-negative integer.
 *
 * @example factorial(5) // 120
 * @example factorial(0) // 1
 *
 * @param n - Non-negative integer.
 * @returns The factorial.
 * @throws {RangeError} If n is negative or not an integer.
 */
export function factorial(n: number): number {
  if (!Number.isInteger(n)) {
    throw new RangeError('Argument must be an integer')
  }
  if (n < 0) {
    throw new RangeError('Factorial is not defined for negative numbers')
  }
  let result = 1
  for (let i = 2; i <= n; i++) {
    result *= i
  }
  return result
}

/**
 * Tests whether a number is prime (optimized trial division).
 *
 * @example isPrime(7) // true
 * @example isPrime(10) // false
 *
 * @param n - Positive integer.
 * @returns Whether the number is prime.
 * @throws {RangeError} If n is not an integer or is less than 2.
 */
export function isPrime(n: number): boolean {
  if (!Number.isInteger(n)) {
    throw new RangeError('Argument must be an integer')
  }
  if (n < 2) return false
  if (n === 2 || n === 3) return true
  if (n % 2 === 0 || n % 3 === 0) return false
  const limit = Math.sqrt(n)
  for (let i = 5; i <= limit; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false
  }
  return true
}

// ─── Angle Conversion ───────────────────────────────────

/**
 * Converts degrees to radians.
 *
 * @example toRadians(180) // ~3.14159
 *
 * @param degrees - Angle in degrees.
 * @returns Angle in radians.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Converts radians to degrees.
 *
 * @example toDegrees(Math.PI) // 180
 *
 * @param radians - Angle in radians.
 * @returns Angle in degrees.
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

// ─── Interpolation & Mapping ────────────────────────────

/**
 * Linearly interpolates between `a` and `b` by `t`.
 *
 * @example lerp(0, 100, 0.5) // 50
 *
 * @param a - Start value.
 * @param b - End value.
 * @param t - Interpolation factor (typically 0–1).
 * @returns The interpolated value.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Calculates what percentage `value` is of `total`.
 *
 * @example percentageOf(25, 200) // 12.5
 *
 * @param value - The part value.
 * @param total - The total value.
 * @returns The percentage.
 * @throws {RangeError} If total is zero.
 */
export function percentageOf(value: number, total: number): number {
  if (total === 0) {
    throw new RangeError('Total must be non-zero')
  }
  return (value / total) * 100
}

/**
 * Maps a value from one range to another.
 *
 * @example mapRange(0.5, 0, 1, 0, 100) // 50
 *
 * @param value - The value to map.
 * @param inMin - Lower bound of the input range.
 * @param inMax - Upper bound of the input range.
 * @param outMin - Lower bound of the output range.
 * @param outMax - Upper bound of the output range.
 * @returns The mapped value.
 * @throws {RangeError} If the input range is zero.
 */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMin === inMax) {
    throw new RangeError('Input range must not be zero')
  }
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
}

// ─── Statistics ─────────────────────────────────────────

/**
 * Computes the statistical mode(s) — the most frequently occurring value(s).
 *
 * @example mode([1, 2, 2, 3]) // [2]
 * @example mode([1, 1, 2, 2]) // [1, 2]
 *
 * @param values - Array of numbers.
 * @returns Array of mode value(s).
 * @throws {RangeError} If the array is empty.
 */
export function mode(values: number[]): number[] {
  if (values.length === 0) {
    throw new RangeError('Cannot compute mode of an empty array')
  }
  const freq = new Map<number, number>()
  let maxFreq = 0
  for (const v of values) {
    const count = (freq.get(v) ?? 0) + 1
    freq.set(v, count)
    if (count > maxFreq) maxFreq = count
  }
  const result: number[] = []
  for (const [v, count] of freq) {
    if (count === maxFreq) result.push(v)
  }
  return result
}

/**
 * Generates an array of numbers from `start` to `end` (inclusive),
 * incremented by `step`.
 *
 * @example range(1, 5) // [1, 2, 3, 4, 5]
 * @example range(0, 10, 2) // [0, 2, 4, 6, 8, 10]
 *
 * @param start - Start of the range.
 * @param end - End of the range (inclusive).
 * @param step - Increment (defaults to 1 or -1 based on direction).
 * @returns Array of numbers.
 * @throws {RangeError} If step is zero.
 */
export function range(start: number, end: number, step?: number): number[] {
  const dir = end >= start ? 1 : -1
  const s = step ?? dir
  if (s === 0) {
    throw new RangeError('Step must not be zero')
  }
  if ((end - start) * s < 0) {
    return []
  }
  const result: number[] = []
  let i = start
  if (s > 0) {
    while (i <= end) {
      result.push(i)
      i += s
    }
  } else {
    while (i >= end) {
      result.push(i)
      i += s
    }
  }
  return result
}

/**
 * Computes the weighted mean of values with corresponding weights.
 *
 * @example weightedAverage([10, 20], [1, 4]) // 18
 *
 * @param values - Array of values.
 * @param weights - Array of weights.
 * @returns The weighted average.
 * @throws {RangeError} If arrays are empty, differ in length, or sum of weights is zero.
 */
export function weightedAverage(values: number[], weights: number[]): number {
  if (values.length === 0 || weights.length === 0) {
    throw new RangeError('Arrays must not be empty')
  }
  if (values.length !== weights.length) {
    throw new RangeError('Values and weights must have the same length')
  }
  let weightedSum = 0
  let weightSum = 0
  for (let i = 0; i < values.length; i++) {
    weightedSum += values[i]! * weights[i]!
    weightSum += weights[i]!
  }
  if (weightSum === 0) {
    throw new RangeError('Sum of weights must be non-zero')
  }
  return weightedSum / weightSum
}

/**
 * Computes the geometric mean of an array of numbers.
 *
 * @example geometricMean([4, 9]) // 6
 *
 * @param values - Array of positive numbers.
 * @returns The geometric mean.
 * @throws {RangeError} If the array is empty or contains negative values.
 */
export function geometricMean(values: number[]): number {
  if (values.length === 0) {
    throw new RangeError('Cannot compute geometric mean of an empty array')
  }
  for (const v of values) {
    if (v < 0) {
      throw new RangeError('Values must be non-negative for geometric mean')
    }
  }
  const logSum = values.reduce((acc, v) => (v === 0 ? acc : acc + Math.log(v)), 0)
  // logSum is 0 if all values are 0 (reduce starts at 0, each 0 keeps it at 0)
  // so we never reach -Infinity here. Math.exp(0/n) = 1 for all-zero input.
  return Math.exp(logSum / values.length)
}

/**
 * Computes the number of combinations (n choose k) — selecting k items from n without order.
 *
 * @example combinations(5, 2) // 10
 *
 * @param n - Total items.
 * @param k - Chosen items.
 * @returns The number of combinations.
 * @throws {RangeError} If n < k, or either is negative / non-integer.
 */
export function combinations(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k)) {
    throw new RangeError('Arguments must be integers')
  }
  if (n < 0 || k < 0) {
    throw new RangeError('Arguments must be non-negative')
  }
  if (k > n) {
    throw new RangeError('k must not exceed n')
  }
  if (k === 0 || k === n) return 1
  const r = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= r; i++) {
    result = (result * (n - r + i)) / i
  }
  return result
}

/**
 * Computes the number of permutations — selecting k items from n in order.
 *
 * @example permutations(5, 2) // 20
 *
 * @param n - Total items.
 * @param k - Chosen items.
 * @returns The number of permutations.
 * @throws {RangeError} If n < k, or either is negative / non-integer.
 */
export function permutations(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k)) {
    throw new RangeError('Arguments must be integers')
  }
  if (n < 0 || k < 0) {
    throw new RangeError('Arguments must be non-negative')
  }
  if (k > n) {
    throw new RangeError('k must not exceed n')
  }
  let result = 1
  for (let i = n; i > n - k; i--) {
    result *= i
  }
  return result
}
