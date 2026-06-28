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
