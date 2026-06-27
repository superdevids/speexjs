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
