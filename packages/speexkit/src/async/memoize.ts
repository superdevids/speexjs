/**
 * Options for memoizeAsync.
 */
export interface MemoizeAsyncOptions {
  /** Time-to-live in milliseconds (default: 60000) */
  ttl?: number
  /** Return stale value while fetching fresh data (default: false) */
  staleWhileRevalidate?: boolean
  /** Maximum number of cached entries (default: 100) */
  maxSize?: number
  /** Custom cache key resolver. Defaults to JSON.stringify of args. */
  resolver?: (...args: unknown[]) => string
}

interface CacheEntry {
  value: unknown
  timestamp: number
  promise?: Promise<unknown>
}

/**
 * Memoizes an async function with TTL, stale-while-revalidate, and bounded cache.
 *
 * @example
 * const fetchData = memoizeAsync(async (id: string) => {
 *   return await api.fetch(id)
 * }, { ttl: 5000, staleWhileRevalidate: true })
 *
 * const data = await fetchData('123') // cached for 5s
 * const data2 = await fetchData('123') // returns cached, refreshes in bg
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: MemoizeAsyncOptions,
): T & {
  cache: Map<string, CacheEntry>
  clear: () => void
} {
  const {
    ttl = 60000,
    staleWhileRevalidate = false,
    maxSize = 100,
    resolver = (...args: unknown[]) => JSON.stringify(args),
  } = options ?? {}

  const cache = new Map<string, CacheEntry>()

  const memoized = (async (...args: unknown[]): Promise<unknown> => {
    const key = resolver(...args)
    const now = Date.now()
    const entry = cache.get(key)

    if (entry && now - entry.timestamp < ttl) {
      return entry.value
    }

    if (entry && staleWhileRevalidate && now - entry.timestamp >= ttl) {
      if (entry.promise) {
        return entry.value
      }
      entry.promise = fn(...args)
        .then((result) => {
          entry.value = result
          entry.timestamp = now
          entry.promise = undefined
          return result
        })
        .catch((err) => {
          entry.promise = undefined
          throw err
        })
      return entry.value
    }

    const result = await fn(...args)
    cache.set(key, { value: result, timestamp: now })

    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) cache.delete(firstKey)
    }

    return result
  }) as T & {
    cache: Map<string, CacheEntry>
    clear: () => void
  }

  memoized.cache = cache
  memoized.clear = () => cache.clear()

  return memoized
}

export default memoizeAsync
