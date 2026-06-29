import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  sleep,
  timeout,
  raceWithTimeout,
  allSettledMap,
  parallelMap,
  retryAsync,
  pipeline,
  deferred,
  RateLimiter,
  memoizeAsync,
} from '../src/async/index.js'

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves after the specified time', async () => {
    const fn = vi.fn()
    const promise = sleep(100).then(fn)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    await promise
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves when the promise resolves in time', async () => {
    const promise = sleep(50).then(() => 'ok')
    const result = timeout(promise, 100)
    vi.advanceTimersByTime(50)
    await expect(result).resolves.toBe('ok')
  })

  it('rejects when the promise times out', async () => {
    const slow = new Promise<string>(() => {})
    const result = timeout(slow, 50)
    vi.advanceTimersByTime(50)
    await expect(result).rejects.toThrow('Promise timed out after 50ms')
  })

  it('uses custom error message', async () => {
    const slow = new Promise<string>(() => {})
    const result = timeout(slow, 50, 'Custom timeout message')
    vi.advanceTimersByTime(50)
    await expect(result).rejects.toThrow('Custom timeout message')
  })
})

describe('raceWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the result when promise wins', async () => {
    const promise = sleep(50).then(() => 'data')
    const result = raceWithTimeout(promise, 100)
    vi.advanceTimersByTime(50)
    await expect(result).resolves.toBe('data')
  })

  it('returns "timeout" when timer wins', async () => {
    const slow = new Promise<string>(() => {})
    const result = raceWithTimeout(slow, 50)
    vi.advanceTimersByTime(50)
    await expect(result).resolves.toBe('timeout')
  })
})

describe('allSettledMap', () => {
  it('returns settled results for all promises', async () => {
    const results = await allSettledMap([1, 2, 3], async x => {
      if (x === 2) throw new Error('fail')
      return x * 2
    })
    expect(results[0]).toEqual({ status: 'fulfilled', value: 2 })
    expect(results[1]).toEqual({ status: 'rejected', reason: expect.any(Error) })
    expect(results[2]).toEqual({ status: 'fulfilled', value: 6 })
  })

  it('handles empty array', async () => {
    await expect(allSettledMap([], async x => x)).resolves.toEqual([])
  })
})

describe('parallelMap', () => {
  it('runs all in parallel with no concurrency limit', async () => {
    const order: number[] = []
    const results = await parallelMap([1, 2, 3], async x => {
      order.push(x)
      return x * 2
    })
    expect(results).toEqual([2, 4, 6])
  })

  it('limits concurrency', async () => {
    let concurrent = 0
    let maxConcurrent = 0
    const results = await parallelMap([1, 2, 3, 4], async x => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await sleep(10)
      concurrent--
      return x * 2
    }, 2)
    expect(results).toEqual([2, 4, 6, 8])
    expect(maxConcurrent).toBeLessThanOrEqual(2)
  })
})

describe('retryAsync', () => {
  it('resolves on first try', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(retryAsync(fn, { baseDelay: 10, attempts: 3 })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries then succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok')
    const promise = retryAsync(fn, { baseDelay: 10, attempts: 3 })
    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  }, 15000)

  it('throws after max attempts', async () => {
    const error = new Error('always fail')
    const fn = vi.fn().mockRejectedValue(error)
    const promise = retryAsync(fn, { baseDelay: 10, attempts: 2 })
    await expect(promise).rejects.toThrow('always fail')
    expect(fn).toHaveBeenCalledTimes(2)
  }, 15000)
})

describe('pipeline', () => {
  it('composes async functions sequentially', async () => {
    const result = await pipeline(
      1,
      async x => x + 1,
      async x => x * 2,
      async x => x + 3,
    )
    expect(result).toBe(7)
  })

  it('works with a single function', async () => {
    const result = await pipeline(5, async x => x * 2)
    expect(result).toBe(10)
  })
})

describe('deferred', () => {
  it('creates a deferred that resolves externally', async () => {
    const d = deferred<number>()
    d.resolve(42)
    await expect(d.promise).resolves.toBe(42)
  })

  it('creates a deferred that rejects externally', async () => {
    const d = deferred<number>()
    d.reject(new Error('fail'))
    await expect(d.promise).rejects.toThrow('fail')
  })
})

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tryAcquire returns true when under limit', () => {
    const limiter = new RateLimiter({ maxRequests: 2, perWindow: 1000 })
    expect(limiter.tryAcquire()).toBe(true)
    expect(limiter.tryAcquire()).toBe(true)
  })

  it('tryAcquire returns false when limit reached', () => {
    const limiter = new RateLimiter({ maxRequests: 2, perWindow: 1000 })
    limiter.tryAcquire()
    limiter.tryAcquire()
    expect(limiter.tryAcquire()).toBe(false)
  })

  it('tryAcquire allows again after window expires', () => {
    const limiter = new RateLimiter({ maxRequests: 1, perWindow: 1000 })
    expect(limiter.tryAcquire()).toBe(true)
    expect(limiter.tryAcquire()).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(limiter.tryAcquire()).toBe(true)
  })

  it('acquire waits when limit reached', async () => {
    const limiter = new RateLimiter({ maxRequests: 1, perWindow: 1000 })
    limiter.tryAcquire()
    const promise = limiter.acquire()
    vi.advanceTimersByTime(1000)
    await promise
  })

  it('pending getter returns correct count', () => {
    const limiter = new RateLimiter({ maxRequests: 3, perWindow: 5000 })
    expect(limiter.pending).toBe(0)
    limiter.tryAcquire()
    expect(limiter.pending).toBe(1)
    limiter.tryAcquire()
    expect(limiter.pending).toBe(2)
  })

  it('pending reflects pruned entries', () => {
    const limiter = new RateLimiter({ maxRequests: 2, perWindow: 1000 })
    limiter.tryAcquire()
    vi.advanceTimersByTime(1000)
    expect(limiter.pending).toBe(0)
  })

  it('construction with invalid options throws', () => {
    expect(() => new RateLimiter({ maxRequests: 0, perWindow: 1000 })).toThrow(RangeError)
    expect(() => new RateLimiter({ maxRequests: 1, perWindow: 0 })).toThrow(RangeError)
  })
})

describe('memoizeAsync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns cached value within TTL', async () => {
    const fn = vi.fn().mockResolvedValue('value')
    const memoized = memoizeAsync(fn, { ttl: 1000 })
    const r1 = await memoized('a')
    const r2 = await memoized('a')
    expect(r1).toBe('value')
    expect(r2).toBe('value')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('evicts after TTL expires', async () => {
    const fn = vi.fn().mockResolvedValue('old')
    const memoized = memoizeAsync(fn, { ttl: 1000 })
    await memoized('a')
    vi.advanceTimersByTime(1001)
    fn.mockResolvedValue('new')
    const result = await memoized('a')
    expect(result).toBe('new')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('staleWhileRevalidate returns stale and refreshes', async () => {
    const fn = vi.fn()
    fn.mockResolvedValue('stale')
    const memoized = memoizeAsync(fn, { ttl: 1000, staleWhileRevalidate: true })
    expect(await memoized('x')).toBe('stale')
    vi.advanceTimersByTime(1001)
    fn.mockResolvedValue('fresh')
    const staleResult = await memoized('x')
    expect(staleResult).toBe('stale')
    await vi.advanceTimersByTimeAsync(0)
    const freshResult = await memoized('x')
    expect(freshResult).toBe('fresh')
  })

  it('clear() empties the cache', async () => {
    const fn = vi.fn().mockResolvedValue('val')
    const memoized = memoizeAsync(fn, { ttl: 10000 })
    await memoized('a')
    memoized.clear()
    await memoized('a')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('maxSize evicts oldest entries', async () => {
    const fn = vi.fn().mockImplementation(async (x: string) => x)
    const memoized = memoizeAsync(fn as (...args: unknown[]) => Promise<unknown>, { ttl: 10000, maxSize: 2 })
    await memoized('a')
    await memoized('b')
    await memoized('c')
    expect(fn).toHaveBeenCalledTimes(3)
    await memoized('a')
    expect(fn).toHaveBeenCalledTimes(4)
  })
})
