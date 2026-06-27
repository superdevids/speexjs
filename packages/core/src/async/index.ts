import type { RetryOptions } from '../core/index.js'

/**
 * Delays execution for the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Rejects a promise if it does not resolve within the specified timeout.
 */
export async function timeout<T>(promise: Promise<T>, ms: number, errorMessage?: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage ?? `Promise timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * Races a promise against a timeout, returning 'timeout' if the timer wins.
 */
export async function raceWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<'timeout'>(resolve => {
    timer = setTimeout(() => resolve('timeout'), ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * Maps over an array with an async function, using Promise.allSettled.
 * Returns an array of PromiseSettledResult.
 */
export async function allSettledMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  return await Promise.allSettled(items.map(fn))
}

/**
 * Maps over an array with an async function, limiting concurrency.
 *
 * @param concurrency - Maximum number of concurrent operations (default Infinity)
 */
export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = Number.POSITIVE_INFINITY,
): Promise<R[]> {
  if (concurrency === Number.POSITIVE_INFINITY) {
    return await Promise.all(items.map(fn))
  }

  const results: R[] = []
  const queue = [...items]

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const item = queue.shift()!
      results.push(await fn(item))
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  const workers = Array.from({ length: workerCount }, () => worker())
  await Promise.all(workers)
  return results
}

/**
 * Retries an async function with exponential backoff.
 */
export async function retryAsync<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const { attempts = 3, baseDelay = 1000, maxDelay = 30000, shouldRetry = () => true } = options ?? {}
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!shouldRetry(error) || attempt >= attempts - 1) break
      const delay = Math.min(baseDelay * 2 ** attempt + Math.random() * baseDelay, maxDelay)
      await sleep(delay)
    }
  }
  throw lastError
}

/**
 * Composes async functions, passing the result of each to the next.
 */
export async function pipeline<T>(initial: T, ...fns: Array<(arg: T) => Promise<T>>): Promise<T> {
  let result = initial
  for (const fn of fns) {
    result = await fn(result)
  }
  return result
}

/**
 * Creates a deferred promise with external resolve and reject methods.
 */
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}
