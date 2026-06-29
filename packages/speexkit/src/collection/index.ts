/**
 * Groups an array of items by a key extracted from each item.
 *
 * @example groupBy([{ type: 'a' }, { type: 'b' }, { type: 'a' }], x => x.type)
 *          // => { a: [{ type: 'a' }, { type: 'a' }], b: [{ type: 'b' }] }
 */
export function groupBy<T, K extends string | number | symbol>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  const result = {} as Record<K, T[]>
  for (const item of items) {
    const key = keyFn(item)
    if (!result[key]) result[key] = []
    result[key]!.push(item)
  }
  return result
}

/**
 * Creates an object keyed by the result of keyFn for each item.
 *
 * @example keyBy([{ id: 1, name: 'a' }, { id: 2, name: 'b' }], x => x.id)
 *          // => { 1: { id: 1, name: 'a' }, 2: { id: 2, name: 'b' } }
 */
export function keyBy<T, K extends string | number | symbol>(items: T[], keyFn: (item: T) => K): Record<K, T> {
  const result = {} as Record<K, T>
  for (const item of items) {
    const key = keyFn(item)
    result[key] = item
  }
  return result
}

/**
 * Returns a copy of the object with the specified keys omitted.
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj } as T
  for (const key of keys) {
    delete result[key]
  }
  return result as Omit<T, K>
}

/**
 * Returns a copy of the object with only the specified keys.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * Extracts a property value from each item in an array.
 */
export function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map(item => item[key])
}

/**
 * Randomizes array order in-place using the Fisher-Yates algorithm.
 */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]!
    result[i] = result[j]!
    result[j] = temp
  }
  return result
}

/**
 * Returns a random element from the array, or undefined if empty.
 */
export function sample<T>(items: T[]): T | undefined {
  return items.length > 0 ? items[Math.floor(Math.random() * items.length)] : undefined
}

/**
 * Returns an array of `size` random elements (without duplicates).
 */
export function sampleSize<T>(items: T[], size: number): T[] {
  if (size <= 0 || items.length === 0) return []
  const pool = shuffle(items)
  return pool.slice(0, Math.min(size, items.length))
}

/**
 * Splits an array into chunks of the specified size.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0 || items.length === 0) return []
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

/**
 * Returns a sorted copy of the array using the provided criteria functions.
 * Earlier criteria take precedence.
 */
function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : 1
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : 1
  return String(a) < String(b) ? -1 : 1
}

export function sortBy<T>(items: T[], ...criteria: Array<(item: T) => unknown>): T[] {
  return [...items].sort((a, b) => {
    for (const criterion of criteria) {
      const cmp = compareValues(criterion(a), criterion(b))
      if (cmp !== 0) return cmp
    }
    return 0
  })
}

/**
 * Returns a sorted copy of the array by a single key and direction.
 */
export function orderBy<T>(items: T[], key: (item: T) => unknown, direction: SortDirection = 'asc'): T[] {
  return [...items].sort((a, b) => {
    const cmp = compareValues(key(a), key(b))
    return direction === 'asc' ? cmp : -cmp
  })
}

/**
 * Returns unique elements based on the result of keyFn.
 */
export function uniqueBy<T>(items: T[], keyFn: (item: T) => unknown): T[] {
  const seen = new Set<unknown>()
  return items.filter(item => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Flattens an array of arrays one level.
 */
export function flatten<T>(items: T[][]): T[] {
  const result: T[] = []
  for (const sub of items) {
    for (const item of sub) {
      result.push(item)
    }
  }
  return result
}

/**
 * Returns an array with unique primitive values.
 */
export function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

/**
 * Returns the first element, or undefined if empty.
 */
export function first<T>(items: T[]): T | undefined {
  return items[0]
}

/**
 * Returns the last element, or undefined if empty.
 */
export function last<T>(items: T[]): T | undefined {
  return items[items.length - 1]
}

/**
 * Checks if a value is empty.
 * Works for arrays, objects, strings, Map, and Set.
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'string') return value.length === 0
  if (value instanceof Map || value instanceof Set) return value.size === 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

export type SortDirection = 'asc' | 'desc'

export function topoSort<T extends { id: string; dependencies?: string[] }>(items: T[]): T[] {
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  const itemMap = new Map<string, T>()

  for (const item of items) {
    itemMap.set(item.id, item)
    if (!adj.has(item.id)) adj.set(item.id, [])
    if (!inDegree.has(item.id)) inDegree.set(item.id, 0)
  }

  for (const item of items) {
    if (item.dependencies) {
      for (const depId of item.dependencies) {
        adj.get(depId)?.push(item.id)
        inDegree.set(item.id, (inDegree.get(item.id) ?? 0) + 1)
      }
    }
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const sorted: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    sorted.push(id)
    for (const neighbor of adj.get(id) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  if (sorted.length !== items.length) {
    throw new Error('Circular dependency detected')
  }

  return sorted.map(id => itemMap.get(id)!)
}

export function slidingWindows<T>(items: T[], size: number, step: number = 1): T[][] {
  if (size <= 0 || items.length === 0 || step <= 0) return []
  const result: T[][] = []
  for (let i = 0; i + size <= items.length; i += step) {
    result.push(items.slice(i, i + size))
  }
  return result
}

export function tumblingWindows<T>(items: T[], size: number): T[][] {
  if (size <= 0 || items.length === 0) return []
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

/**
 * Gets a nested value from an object using a dot-separated path.
 *
 * @example deepGet({ a: { b: 2 } }, 'a.b') // 2
 * @example deepGet({ a: { b: 2 } }, 'a.c') // undefined
 */
export function deepGet<T = unknown>(obj: unknown, path: string, default_?: T): T | undefined {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined) return default_
    if (typeof current !== 'object') return default_
    const curObj = current as Record<string, unknown>
    if (!(key in curObj)) return default_
    current = curObj[key]
  }
  return (current as T) ?? default_
}

/**
 * Sets a nested value in an object using a dot-separated path.
 * Creates intermediate objects/arrays as needed.
 *
 * @example deepSet({ a: { b: 2 } }, 'a.b', 3) // { a: { b: 3 } }
 * @example deepSet({}, 'a.b.c', 1) // { a: { b: { c: 1 } } }
 */
export function deepSet<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.')
  const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
  for (const key of keys) {
    if (PROTO_KEYS.has(key)) {
      return { ...obj } as T
    }
  }
  const result = { ...obj } as Record<string, unknown>
  let current = result
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!
    const next = current[key]
    if (next === null || next === undefined || typeof next !== 'object') {
      const isArray = /^\d+$/.test(keys[i + 1]!)
      current[key] = isArray ? [] : {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]!] = value
  return result as T
}

/**
 * Splits an array into two groups: those that pass the predicate and those that don't.
 *
 * @example partition([1, 2, 3, 4, 5], n => n % 2 === 0)
 *          // => [[2, 4], [1, 3, 5]]
 */
export function partition<T>(items: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = []
  const fail: T[] = []
  for (const item of items) {
    if (predicate(item)) pass.push(item)
    else fail.push(item)
  }
  return [pass, fail]
}

/**
 * Removes all falsy values from an array (false, null, 0, '', undefined, NaN).
 *
 * @example compact([0, 1, false, 2, '', 3, null, undefined, NaN])
 *          // => [1, 2, 3]
 */
export function compact<T>(items: (T | false | null | 0 | '' | undefined)[]): T[] {
  return items.filter(Boolean) as T[]
}

/**
 * Returns elements in array A that are not in array B (uses SameValueZero).
 *
 * @example difference([1, 2, 3, 4], [2, 4])
 *          // => [1, 3]
 */
export function difference<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b)
  return a.filter(item => !setB.has(item))
}

/**
 * Returns elements present in all given arrays (uses SameValueZero).
 *
 * @example intersection([1, 2, 3], [2, 3, 4])
 *          // => [2, 3]
 */
export function intersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b)
  return a.filter(item => setB.has(item))
}

/**
 * Returns unique elements from all given arrays.
 *
 * @example union([1, 2], [2, 3], [3, 4])
 *          // => [1, 2, 3, 4]
 */
export function union<T>(...arrays: T[][]): T[] {
  const set = new Set<T>()
  for (const arr of arrays) {
    for (const item of arr) {
      set.add(item)
    }
  }
  return [...set]
}

/**
 * Merges arrays element-wise into tuples, stopping at the shortest array.
 *
 * @example zip(['a', 'b', 'c'], [1, 2])
 *          // => [['a', 1], ['b', 2]]
 */
export function zip<T, U>(a: T[], b: U[]): [T, U][]
export function zip<T, U, V>(a: T[], b: U[], c: V[]): [T, U, V][]
export function zip<T>(...arrays: T[][]): T[][] {
  if (arrays.length === 0) return []
  const minLen = Math.min(...arrays.map(a => a.length))
  const result: T[][] = []
  for (let i = 0; i < minLen; i++) {
    const tuple: T[] = []
    for (const arr of arrays) {
      tuple.push(arr[i]!)
    }
    result.push(tuple)
  }
  return result
}

/**
 * Inverse of zip: splits an array of tuples back into individual arrays.
 *
 * @example unzip([['a', 1], ['b', 2]])
 *          // => [['a', 'b'], [1, 2]]
 */
export function unzip<T>(paired: T[][]): T[][] {
  if (paired.length === 0) return []
  const tupleLen = paired.reduce((max, t) => Math.max(max, t.length), 0)
  const result: T[][] = Array.from({ length: tupleLen }, () => [])
  for (const tuple of paired) {
    for (let i = 0; i < tupleLen; i++) {
      result[i]!.push(tuple[i] as T)
    }
  }
  return result
}

/**
 * Counts occurrences of each key produced by the key function.
 *
 * @example countBy([1, 2, 3, 4, 5], n => n % 2 === 0 ? 'even' : 'odd')
 *          // => { odd: 3, even: 2 }
 */
export function countBy<T, K extends string | number | symbol>(items: T[], keyFn: (item: T) => K): Record<K, number> {
  const result = {} as Record<K, number>
  for (const item of items) {
    const key = keyFn(item)
    result[key] = (result[key] ?? 0) + 1
  }
  return result
}

/**
 * Returns the element with the maximum value by the key function.
 *
 * @example maxBy([{ name: 'a', score: 10 }, { name: 'b', score: 20 }], x => x.score)
 *          // => { name: 'b', score: 20 }
 */
export function maxBy<T>(items: T[], keyFn: (item: T) => number): T | undefined {
  if (items.length === 0) return undefined
  let maxItem = items[0]!
  let maxVal = keyFn(maxItem)
  for (let i = 1; i < items.length; i++) {
    const val = keyFn(items[i]!)
    if (val > maxVal) {
      maxVal = val
      maxItem = items[i]!
    }
  }
  return maxItem
}

/**
 * Returns the element with the minimum value by the key function.
 *
 * @example minBy([{ name: 'a', score: 10 }, { name: 'b', score: 20 }], x => x.score)
 *          // => { name: 'a', score: 10 }
 */
export function minBy<T>(items: T[], keyFn: (item: T) => number): T | undefined {
  if (items.length === 0) return undefined
  let minItem = items[0]!
  let minVal = keyFn(minItem)
  for (let i = 1; i < items.length; i++) {
    const val = keyFn(items[i]!)
    if (val < minVal) {
      minVal = val
      minItem = items[i]!
    }
  }
  return minItem
}

/**
 * Returns the sum of values produced by the key function.
 *
 * @example sumBy([{ n: 1 }, { n: 2 }, { n: 3 }], x => x.n)
 *          // => 6
 */
export function sumBy<T>(items: T[], keyFn: (item: T) => number): number {
  let total = 0
  for (const item of items) {
    total += keyFn(item)
  }
  return total
}

/**
 * Returns the index of the first element satisfying the predicate, or -1.
 *
 * @example findIndex([1, 3, 5, 8, 10], n => n % 2 === 0)
 *          // => 3
 */
export function findIndex<T>(items: T[], predicate: (item: T) => boolean, fromIndex: number = 0): number {
  for (let i = fromIndex; i < items.length; i++) {
    if (predicate(items[i]!)) return i
  }
  return -1
}

/**
 * Finds the last element satisfying the predicate.
 *
 * @example findLast([1, 2, 3, 4, 5], n => n % 2 === 0)
 *          // => 4
 */
export function findLast<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i]!)) return items[i]
  }
  return undefined
}

/**
 * Drops the first n elements from the array.
 *
 * @example drop([1, 2, 3, 4, 5], 2)
 *          // => [3, 4, 5]
 */
export function drop<T>(items: T[], n: number = 1): T[] {
  return items.slice(Math.max(0, n))
}

/**
 * Drops the last n elements from the array.
 *
 * @example dropRight([1, 2, 3, 4, 5], 2)
 *          // => [1, 2, 3]
 */
export function dropRight<T>(items: T[], n: number = 1): T[] {
  return items.slice(0, Math.max(0, items.length - n))
}

/**
 * Takes the first n elements from the array.
 *
 * @example take([1, 2, 3, 4, 5], 2)
 *          // => [1, 2]
 */
export function take<T>(items: T[], n: number = 1): T[] {
  return items.slice(0, Math.max(0, n))
}

/**
 * Takes the last n elements from the array.
 *
 * @example takeRight([1, 2, 3, 4, 5], 2)
 *          // => [4, 5]
 */
export function takeRight<T>(items: T[], n: number = 1): T[] {
  return items.slice(Math.max(0, items.length - n))
}

/**
 * Removes specified values from the array (uses SameValueZero).
 *
 * @example without([1, 2, 1, 3, 1, 4], 1, 3)
 *          // => [2, 4]
 */
export function without<T>(items: T[], ...values: T[]): T[] {
  const exclude = new Set(values)
  return items.filter(item => !exclude.has(item))
}

/**
 * Gets the element at the given index. Supports negative indexing.
 *
 * @example nth([1, 2, 3], 1)   // => 2
 * @example nth([1, 2, 3], -1)  // => 3
 */
export function nth<T>(items: T[], index: number): T | undefined {
  return index < 0 ? items[items.length + index] : items[index]
}

// ─── Object / Dictionary Operations ────────────────────────

const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Pick keys matching a predicate.
 *
 * @param obj - The source object.
 * @param predicate - Function invoked per key-value pair.
 * @returns A new object with only the keys passing the predicate.
 *
 * @example pickBy({ a: 1, b: 'hello', c: 3 }, v => typeof v === 'number')
 *          // => { a: 1, c: 3 }
 */
export function pickBy<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: string) => boolean
): Partial<T> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (predicate(obj[key] as T[keyof T], key)) {
      result[key] = obj[key]
    }
  }
  return result as Partial<T>
}

/**
 * Omit keys matching a predicate.
 *
 * @param obj - The source object.
 * @param predicate - Function invoked per key-value pair.
 * @returns A new object without the keys passing the predicate.
 *
 * @example omitBy({ a: 1, b: 'hello', c: 3 }, v => typeof v === 'number')
 *          // => { b: 'hello' }
 */
export function omitBy<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: string) => boolean
): Partial<T> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (!predicate(obj[key] as T[keyof T], key)) {
      result[key] = obj[key]
    }
  }
  return result as Partial<T>
}

/**
 * Transform object keys using a mapper function.
 *
 * @param obj - The source object.
 * @param mapper - Function that maps old keys to new keys.
 * @returns A new object with transformed keys.
 *
 * @example mapKeys({ a: 1, b: 2 }, k => k.toUpperCase())
 *          // => { A: 1, B: 2 }
 */
export function mapKeys<T extends Record<string, unknown>>(
  obj: T,
  mapper: (key: string, value: T[keyof T]) => string
  ): Record<string, T[keyof T]> {
  const result: Record<string, T[keyof T]> = {}
  for (const key of Object.keys(obj)) {
    const newKey = mapper(key, obj[key] as T[keyof T])
    if (PROTO_KEYS.has(newKey)) continue
    result[newKey] = obj[key] as T[keyof T]
  }
  return result
}

/**
 * Transform object values using a mapper function.
 *
 * @param obj - The source object.
 * @param mapper - Function that maps old values to new values.
 * @returns A new object with transformed values.
 *
 * @example mapValues({ a: 1, b: 2 }, v => v * 2)
 *          // => { a: 2, b: 4 }
 */
export function mapValues<T extends Record<string, unknown>, R>(
  obj: T,
  mapper: (value: T[keyof T], key: string) => R
): Record<string, R> {
  const result: Record<string, R> = {}
  for (const key of Object.keys(obj)) {
    result[key] = mapper(obj[key] as T[keyof T], key)
  }
  return result
}

/**
 * Swap keys and values (values become keys, keys become values).
 * Duplicate values overwrite previous keys.
 *
 * @param obj - The source object with string/number/symbol values.
 * @returns A new object with keys and values swapped.
 *
 * @example invert({ a: 'x', b: 'y', c: 'x' })
 *          // => { x: 'c', y: 'b' }
 */
export function invert<T extends Record<string, string | number | symbol>>(
  obj: T
): { [K in T[keyof T]]: string } {
  const result = {} as Record<string | number | symbol, string>
  for (const key of Object.keys(obj)) {
    const val = obj[key] as T[keyof T]
    result[val as unknown as string | number | symbol] = key
  }
  return result as { [K in T[keyof T]]: string }
}

/**
 * Swap keys and values with a value mapper for non-unique values.
 * Groups keys by the mapped value.
 *
 * @param obj - The source object.
 * @param mapper - Optional function to transform values before inverting.
 * @returns An object where each key maps to an array of original keys.
 *
 * @example invertBy({ a: 1, b: 2, c: 1 })
 *          // => { 1: ['a', 'c'], 2: ['b'] }
 * @example invertBy({ a: 1, b: 2, c: 3 }, v => (v as number) % 2 === 0 ? 'even' : 'odd')
 *          // => { odd: ['a', 'c'], even: ['b'] }
 */
export function invertBy<T extends Record<string, unknown>>(
  obj: T,
  mapper?: (value: T[keyof T]) => string
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const key of Object.keys(obj)) {
    const val = mapper ? mapper(obj[key] as T[keyof T]) : String(obj[key])
    if (!result[val]) result[val] = []
    result[val]!.push(key)
  }
  return result
}

/**
 * Convert object to array of [key, value] pairs.
 *
 * @param obj - The source object.
 * @returns An array of key-value tuples.
 *
 * @example toPairs({ a: 1, b: 2 })
 *          // => [['a', 1], ['b', 2]]
 */
export function toPairs<T extends Record<string, unknown>>(
  obj: T
): Array<[string, T[keyof T]]> {
  return Object.keys(obj).map(key => [key, obj[key] as T[keyof T]])
}

/**
 * Convert array of [key, value] pairs to object.
 *
 * @param pairs - An array of key-value tuples.
 * @returns A new object built from the pairs.
 *
 * @example fromPairs([['a', 1], ['b', 2]])
 *          // => { a: 1, b: 2 }
 */
export function fromPairs<T>(pairs: Array<[string, T]>): Record<string, T> {
  const result: Record<string, T> = {}
  for (const [key, value] of pairs) {
    if (PROTO_KEYS.has(key)) continue
    result[key] = value
  }
  return result
}

/**
 * Check if a nested path exists in an object (dot-separated).
 *
 * @param obj - The object to inspect.
 * @param path - Dot-separated path string.
 * @returns True if the path exists, false otherwise.
 *
 * @example hasPath({ a: { b: 2 } }, 'a.b') // true
 * @example hasPath({ a: { b: 2 } }, 'a.c') // false
 */
export function hasPath(obj: unknown, path: string): boolean {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined) return false
    if (typeof current !== 'object') return false
    const curObj = current as Record<string, unknown>
    if (!(key in curObj)) return false
    current = curObj[key]
  }
  return true
}

/**
 * Deep delete a nested property from an object.
 * Returns a new object without modifying the original.
 *
 * @param obj - The source object.
 * @param path - Dot-separated path to delete.
 * @returns A new object with the property removed.
 *
 * @example unset({ a: { b: 2, c: 3 } }, 'a.b')
 *          // => { a: { c: 3 } }
 */
export function unset<T extends Record<string, unknown>>(obj: T, path: string): T {
  const keys = path.split('.')
  for (const key of keys) {
    if (PROTO_KEYS.has(key)) return { ...obj } as T
  }

  const result = { ...obj } as Record<string, unknown>
  let current = result

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!
    const next = current[key]
    if (next === null || next === undefined || typeof next !== 'object') {
      return result as T
    }
    current[key] = { ...(next as Record<string, unknown>) }
    current = current[key] as Record<string, unknown>
  }

  delete current[keys[keys.length - 1]!]
  return result as T
}

/**
 * Deep merge with custom merge strategy for arrays.
 *
 * @param target - The target object.
 * @param source - The source object to merge in.
 * @param mergeFn - Custom merge function: receives (targetValue, sourceValue, key).
 * @returns A new merged object.
 *
 * @example mergeWith({ a: [1], b: 2 }, { a: [2], c: 3 },
 *   (t, s) => Array.isArray(t) ? [...t, ...(s as unknown[])] : s)
 * // => { a: [1, 2], b: 2, c: 3 }
 */
export function mergeWith<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
  mergeFn: (targetValue: unknown, sourceValue: unknown, key: string) => unknown
): T {
  const result = { ...target } as Record<string, unknown>

  for (const key of Object.keys(source)) {
    if (PROTO_KEYS.has(key)) continue
    const sourceVal = (source as Record<string, unknown>)[key]
    const targetVal = result[key]

    if (key in result) {
      result[key] = mergeFn(targetVal, sourceVal, key)
    } else {
      result[key] = sourceVal
    }
  }

  return result as T
}

/**
 * Fill default values (only undefined values in target are overwritten).
 *
 * @param target - The target object.
 * @param sources - Source objects providing default values.
 * @returns A new object with defaults applied.
 *
 * @example defaults({ a: 1, b: undefined }, { a: 99, b: 2, c: 3 })
 *          // => { a: 1, b: 2, c: 3 }
 */
export function defaults<T extends Record<string, unknown>>(
  target: T,
  ...sources: Array<Partial<T>>
): T {
  const result = { ...target } as Record<string, unknown>
  for (const source of sources) {
    if (source === null || source === undefined) continue
    for (const key of Object.keys(source)) {
      if (PROTO_KEYS.has(key)) continue
      if (result[key] === undefined) {
        result[key] = (source as Record<string, unknown>)[key]
      }
    }
  }
  return result as T
}

/**
 * Deep version of defaults. Recursively fills undefined values from sources.
 *
 * @param target - The target object.
 * @param sources - Source objects providing default values (applied left-to-right).
 * @returns A new object with deep defaults applied.
 *
 * @example defaultsDeep({ a: { x: 1 } }, { a: { x: 99, y: 2 }, b: 3 })
 *          // => { a: { x: 1, y: 2 }, b: 3 }
 */
export function defaultsDeep<T extends Record<string, unknown>>(
  target: T,
  ...sources: Array<Partial<T>>
): T {
  let result = { ...target } as Record<string, unknown>

  for (const source of sources) {
    if (source === null || source === undefined) continue

    for (const key of Object.keys(source)) {
      if (PROTO_KEYS.has(key)) continue

      const sourceVal = (source as Record<string, unknown>)[key]
      const existingVal = result[key]

      if (existingVal === undefined) {
        result[key] = sourceVal
      } else if (
        typeof existingVal === 'object' &&
        existingVal !== null &&
        !Array.isArray(existingVal) &&
        typeof sourceVal === 'object' &&
        sourceVal !== null &&
        !Array.isArray(sourceVal)
      ) {
        result[key] = defaultsDeep(
          existingVal as Record<string, unknown>,
          sourceVal as Record<string, unknown>
        )
      }
    }
  }

  return result as T
}

/**
 * Deep freeze an object (recursive Object.freeze).
 *
 * @param obj - The object to freeze.
 * @returns The same object, now deeply frozen.
 *
 * @example const frozen = deepFreeze({ a: { b: 1 } })
 *          // Object.isFrozen(frozen.a) === true
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj

  const propNames = Object.getOwnPropertyNames(obj)
  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name]
    if (value !== null && typeof value === 'object') {
      deepFreeze(value)
    }
  }

  return Object.freeze(obj)
}

/**
 * Get values at multiple dot-separated paths.
 *
 * @param obj - The object to query.
 * @param paths - Array of dot-separated path strings.
 * @returns Array of values at the specified paths.
 *
 * @example at({ a: { b: 1, c: 2 } }, ['a.b', 'a.c'])
 *          // => [1, 2]
 */
export function at<T = unknown>(
  obj: unknown,
  paths: string[]
): (T | undefined)[] {
  return paths.map(path => deepGet<T>(obj, path))
}

/**
 * Rename object keys based on a mapping.
 *
 * @param obj - The source object.
 * @param keyMap - A mapping of old keys to new keys.
 * @returns A new object with renamed keys. Unmapped keys are preserved.
 *
 * @example renameKeys({ a: 1, b: 2, c: 3 }, { a: 'x', b: 'y' })
 *          // => { x: 1, y: 2, c: 3 }
 */
export function renameKeys<T extends Record<string, unknown>>(
  obj: T,
  keyMap: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const newKey = key in keyMap ? keyMap[key]! : key
    if (PROTO_KEYS.has(newKey)) continue
    result[newKey] = obj[key]
  }
  return result
}

/**
 * Deep diff between two objects. Returns keys present in both with differing values,
 * plus keys only in the first object (with value set to `undefined`).
 * Arrays are treated as atomic values and compared by their content (not recursively merged).
 *
 * @param a - The first object (original).
 * @param b - The second object (changed).
 * @returns An object with only the changed/removed keys.
 *
 * @example diff({ a: 1, b: 2, c: 3 }, { a: 1, b: 99, d: 4 })
 *          // => { b: 99, c: undefined }
 */
export function diff<T>(a: T, b: T): Partial<T> {
  const result: Record<string, unknown> = {}
  const allKeys = new Set([
    ...Object.keys(a as Record<string, unknown>),
    ...Object.keys(b as Record<string, unknown>)
  ])

  for (const key of allKeys) {
    const aVal = (a as Record<string, unknown>)[key]
    const bVal = (b as Record<string, unknown>)[key]

    // Key only in second object: skip (diff only includes keys from first object)
    if (!(key in (a as Record<string, unknown>))) {
      continue
    }

    // Key only in first object: mark as removed
    if (!(key in (b as Record<string, unknown>))) {
      result[key] = undefined
      continue
    }

    // Both values are plain objects (not arrays): deep diff
    if (
      typeof aVal === 'object' &&
      aVal !== null &&
      typeof bVal === 'object' &&
      bVal !== null &&
      !Array.isArray(aVal) &&
      !Array.isArray(bVal)
    ) {
      const nested = diff(aVal, bVal)
      if (Object.keys(nested).length > 0) {
        result[key] = nested
      }
      continue
    }

    // For arrays: compare by value (atomic - don't recurse into elements)
    if (Array.isArray(aVal) && Array.isArray(bVal)) {
      if (!arraysEqual(aVal, bVal)) {
        result[key] = bVal
      }
      continue
    }

    // For primitives: compare with Object.is
    if (!Object.is(aVal, bVal)) {
      result[key] = bVal
    }
  }

  return result as Partial<T>
}

/**
 * Shallow value comparison for arrays.
 */
function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false
  }
  return true
}

/**
 * Creates an object from a list of keys and a value or value-generating function.
 *
 * @param keys - Array of keys.
 * @param value - A static value, or a function (key, index) => value.
 * @returns A new object with the given keys all set to the specified value.
 *
 * @example fromKeys(['a', 'b', 'c'], 0)
 *          // => { a: 0, b: 0, c: 0 }
 * @example fromKeys(['x', 'y'], (k, i) => `${k}${i}`)
 *          // => { x: 'x0', y: 'y1' }
 */
export function fromKeys<K extends string, V>(
  keys: K[],
  value: V | ((key: K, index: number) => V)
): Record<K, V> {
  const result = {} as Record<K, V>
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!
    if (PROTO_KEYS.has(key)) continue
    result[key] = typeof value === 'function'
      ? (value as (key: K, index: number) => V)(key, i)
      : value
  }
  return result
}

