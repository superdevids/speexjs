export interface DebounceOptions {
  leading?: boolean
  trailing?: boolean
  maxWait?: number
}

export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void
  cancel(): void
  flush(): void
}

export interface MemoizedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T>
  cache: Map<string, ReturnType<T>>
}

export interface RetryOptions {
  attempts?: number
  baseDelay?: number
  maxDelay?: number
  shouldRetry?: (error: unknown) => boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function getType(value: unknown): string {
  return Object.prototype.toString.call(value)
}

function clone<T>(value: T, seen: WeakMap<object, unknown>): T {
  if (value === null || typeof value !== 'object') return value

  if (seen.has(value as object)) return seen.get(value as object) as T

  const tag = getType(value)

  if (tag === '[object Date]') {
    const cloned = new Date((value as unknown as Date).getTime())
    seen.set(value as object, cloned)
    return cloned as unknown as T
  }

  if (tag === '[object RegExp]') {
    const regExp = value as unknown as RegExp
    const cloned = new RegExp(regExp.source, regExp.flags)
    cloned.lastIndex = regExp.lastIndex
    seen.set(value as object, cloned)
    return cloned as unknown as T
  }

  if (tag === '[object Map]') {
    const cloned = new Map<unknown, unknown>()
    seen.set(value as object, cloned)
    ;(value as unknown as Map<unknown, unknown>).forEach((v, k) => {
      cloned.set(clone(k, seen), clone(v, seen))
    })
    return cloned as unknown as T
  }

  if (tag === '[object Set]') {
    const cloned = new Set<unknown>()
    seen.set(value as object, cloned)
    ;(value as unknown as Set<unknown>).forEach(v => {
      cloned.add(clone(v, seen))
    })
    return cloned as unknown as T
  }

  if (Array.isArray(value)) {
    const cloned: unknown[] = []
    seen.set(value as object, cloned)
    for (let i = 0; i < value.length; i++) {
      cloned[i] = clone(value[i], seen)
    }
    return cloned as unknown as T
  }

  if (tag === '[object Object]') {
    const cloned: Record<string, unknown> = {}
    seen.set(value as object, cloned)
    const keys = Object.keys(value as Record<string, unknown>)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!
      cloned[key] = clone((value as Record<string, unknown>)[key], seen)
    }
    return cloned as unknown as T
  }

  return value
}

/**
 * Deep clone a value, supporting objects, arrays, Date, RegExp, Map, Set,
 * and cyclic references.
 *
 * @param value - The value to clone.
 * @returns A deep copy of the input value.
 */
export function deepClone<T>(value: T): T {
  const seen = new WeakMap<object, unknown>()
  return clone(value, seen)
}

/**
 * Deep merge multiple objects. Arrays are overwritten, not concatenated.
 * `null` and `undefined` source objects are skipped.
 *
 * @param objects - The objects to merge.
 * @returns A new object with merged properties.
 */
export function deepMerge<T extends Record<string, unknown>>(...objects: Partial<T>[]): T {
  const result = {} as T

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]
    if (obj === null || obj === undefined) continue

    const keys = Object.keys(obj) as (keyof T)[]
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j]!
      const val = obj[key]
      const existing = result[key]

      if (val !== undefined && isPlainObject(val) && isPlainObject(existing)) {
        result[key] = deepMerge(
          existing as Record<string, unknown>,
          val as Record<string, unknown>
        ) as T[keyof T]
      } else if (val !== undefined) {
        result[key] = val as T[keyof T]
      }
    }
  }

  return result
}

/**
 * Creates a debounced function that delays invoking `fn` until after `wait`
 * milliseconds have elapsed since the last invocation. Supports leading,
 * trailing, and maxWait options. The returned function also has `.cancel()`
 * and `.flush()` methods.
 *
 * @param fn - The function to debounce.
 * @param wait - The number of milliseconds to delay.
 * @param options - Optional configuration.
 * @returns A debounced function with `.cancel()` and `.flush()`.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
  options?: DebounceOptions
): DebouncedFunction<T> {
  const { leading = false, trailing = true, maxWait } = options ?? {}

  let timer: ReturnType<typeof setTimeout> | null = null
  let maxTimer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastCallTime: number | null = null
  let lastInvokeTime = 0

  function invoke(time: number): void {
    lastInvokeTime = time
    if (lastArgs) {
      fn(...lastArgs)
      lastArgs = null
    }
  }

  function startTimer(waitTime: number): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const now = Date.now()
      if (lastArgs && trailing) {
        invoke(now)
      }
      timer = null
      lastCallTime = null
    }, waitTime)
  }

  function startMaxTimer(): void {
    if (maxWait === undefined || maxTimer) return
    maxTimer = setTimeout(() => {
      if (lastArgs) {
        invoke(Date.now())
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        lastCallTime = null
      }
    }, maxWait)
  }

  function clearAllTimers(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (maxTimer) {
      clearTimeout(maxTimer)
      maxTimer = null
    }
  }

  function shouldInvoke(time: number): boolean {
    if (lastCallTime === null) return true
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime
    return (
      timeSinceLastCall >= wait ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    )
  }

  const debounced = function (this: unknown, ...args: Parameters<T>): void {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastCallTime = time

    if (isInvoking && !timer && leading) {
      invoke(time)
    }

    if (!timer) {
      startTimer(wait)
      if (maxWait !== undefined) {
        startMaxTimer()
      }
    }
  } as DebouncedFunction<T>

  debounced.cancel = (): void => {
    clearAllTimers()
    lastArgs = null
    lastCallTime = null
    lastInvokeTime = 0
  }

  debounced.flush = (): void => {
    if (timer && lastArgs) {
      invoke(Date.now())
      clearAllTimers()
      lastCallTime = null
    }
  }

  return debounced
}

/**
 * Creates a throttled function that only invokes `fn` at most once per
 * `wait` milliseconds.
 *
 * @param fn - The function to throttle.
 * @param wait - The number of milliseconds to throttle invocations to.
 * @returns A throttled function.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const throttled = function (this: unknown, ...args: Parameters<T>): void {
    const now = Date.now()
    const remaining = wait - (now - lastTime)

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      lastTime = now
      lastArgs = null
      fn.apply(this, args)
    } else {
      lastArgs = args
      if (!timer) {
        timer = setTimeout(() => {
          lastTime = Date.now()
          timer = null
          if (lastArgs) {
            fn.apply(this, lastArgs)
            lastArgs = null
          }
        }, remaining)
      }
    }
  }

  return throttled
}

/**
 * Creates a memoized version of `fn`. Uses a `Map` cache keyed by the
 * first argument by default, or by a custom `resolver` function.
 *
 * @param fn - The function to memoize.
 * @param resolver - Optional function to determine the cache key.
 * @returns The memoized function with a `.cache` property.
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  resolver?: (...args: Parameters<T>) => string
): MemoizedFunction<T> {
  const cache = new Map<string, ReturnType<T>>()

  const memoized = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = resolver ? resolver(...args) : String(args[0])
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>
    }
    const result = fn.apply(this, args) as ReturnType<T>
    cache.set(key, result)
    return result
  }

  memoized.cache = cache

  return memoized as MemoizedFunction<T>
}

/**
 * Retries an async function with exponential backoff and jitter.
 *
 * @param fn - The async function to retry.
 * @param options - Retry configuration.
 * @returns A promise that resolves with the function result.
 */
export function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const {
    attempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
  } = options ?? {}

  let attempt = 0

  const execute = (): Promise<T> => {
    attempt++
    return fn().catch((error: unknown) => {
      if (attempt >= attempts || !shouldRetry(error)) {
        throw error
      }

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * baseDelay,
        maxDelay
      )

      return new Promise<T>(resolve => {
        setTimeout(() => {
          resolve(execute())
        }, delay)
      })
    })
  }

  return execute()
}

/**
 * A no-operation function that returns `undefined`.
 */
export function noop(): void {
  return undefined
}

/**
 * Returns the given value unchanged.
 *
 * @param value - The value to return.
 * @returns The same value.
 */
export function identity<T>(value: T): T {
  return value
}

/**
 * Creates a function that invokes `fn` only once. Subsequent calls return
 * the result of the first invocation.
 *
 * @param fn - The function to wrap.
 * @returns A function that runs only once.
 */
export function once<T extends (...args: unknown[]) => unknown>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  let called = false
  let result: ReturnType<T>

  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    if (!called) {
      called = true
      result = fn.apply(this, args) as ReturnType<T>
    }
    return result
  }
}
