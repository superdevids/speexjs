/**
 * Checks if a value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Checks if a value is a number (not NaN, not Infinity).
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Checks if a value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Checks if a value is a plain object (not null, not array, typeof 'object').
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Checks if a value is an array.
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Checks if a value is a function.
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function'
}

/**
 * Checks if a value is a Date.
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

/**
 * Checks if a value is a RegExp.
 */
export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp
}

/**
 * Checks if a value is a Map.
 */
export function isMap(value: unknown): value is Map<unknown, unknown> {
  return value instanceof Map
}

/**
 * Checks if a value is a Set.
 */
export function isSet(value: unknown): value is Set<unknown> {
  return value instanceof Set
}

/**
 * Checks if a value is a Promise.
 */
export function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise
}

/**
 * Checks if a value is null.
 */
export function isNull(value: unknown): value is null {
  return value === null
}

/**
 * Checks if a value is undefined.
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined
}

/**
 * Checks if a value is null or undefined.
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Checks if a value is empty.
 * Works for strings, arrays, objects, Map, and Set.
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.length === 0
  if (Array.isArray(value)) return value.length === 0
  if (value instanceof Map || value instanceof Set) return value.size === 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

/**
 * Asserts that a value is defined (not null or undefined).
 * Throws if the value is null or undefined.
 */
export function assertDefined<T>(value: T, message?: string): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Expected value to be defined')
  }
}

/**
 * Asserts that a value matches a type guard. Throws if it doesn't.
 */
export function assertType<T>(value: unknown, guard: (v: unknown) => v is T, message?: string): asserts value is T {
  if (!guard(value)) {
    throw new Error(message ?? 'Value does not match expected type')
  }
}

/**
 * Wraps a value in an array if it is not already one.
 */
export function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

/** Alias for ensureArray. */
export const castArray = ensureArray

export function isError(value: unknown): value is Error {
  return value instanceof Error
}

export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol'
}

export function isWeakMap(value: unknown): value is WeakMap<object, unknown> {
  return value instanceof WeakMap
}

export function isWeakSet(value: unknown): value is WeakSet<object> {
  return value instanceof WeakSet
}

export function isTypedArray(value: unknown): boolean {
  return ArrayBuffer.isView(value) && !(value instanceof DataView)
}

export function isDataView(value: unknown): value is DataView {
  return value instanceof DataView
}

export function isArguments(value: unknown): boolean {
  return value !== null && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Arguments]'
}

/**
 * Checks if a value is a plain object (created by {} or new Object()).
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || value === undefined || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

export function getType(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'function') return 'function'
  if (typeof value === 'symbol') return 'symbol'
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'nan'
    if (!Number.isFinite(value)) return 'infinity'
    return 'number'
  }
  if (Array.isArray(value)) return 'array'
  if (value instanceof Date) return 'date'
  if (value instanceof RegExp) return 'regexp'
  if (value instanceof Map) return 'map'
  if (value instanceof Set) return 'set'
  if (value instanceof Promise) return 'promise'
  if (value instanceof Error) return 'error'
  if (value instanceof WeakMap) return 'weakmap'
  if (value instanceof WeakSet) return 'weakset'
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) return 'typedarray'
  if (value instanceof DataView) return 'dataview'
  if (Object.prototype.toString.call(value) === '[object Arguments]') return 'arguments'
  return 'object'
}
