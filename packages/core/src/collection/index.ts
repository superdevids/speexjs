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
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'string') return value.length === 0
  if (value instanceof Map || value instanceof Set) return value.size === 0
  if (value !== null && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

export type SortDirection = 'asc' | 'desc'
