import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  deepClone,
  deepMerge,
  debounce,
  throttle,
  memoize,
  retry,
  noop,
  identity,
  once,
} from '../src/core/index.js'

describe('deepClone', () => {
  it('clones a plain object', () => {
    const obj = { a: 1, b: 'hello', c: true }
    const cloned = deepClone(obj)
    expect(cloned).toEqual(obj)
    expect(cloned).not.toBe(obj)
  })

  it('clones a nested object', () => {
    const obj = { a: { b: { c: 42 } } }
    const cloned = deepClone(obj)
    expect(cloned).toEqual(obj)
    expect(cloned.a).not.toBe(obj.a)
    expect(cloned.a.b).not.toBe(obj.a.b)
  })

  it('clones an array', () => {
    const arr = [1, [2, [3]]]
    const cloned = deepClone(arr)
    expect(cloned).toEqual(arr)
    expect(cloned).not.toBe(arr)
    expect(cloned[1]).not.toBe(arr[1])
  })

  it('clones a Date', () => {
    const date = new Date('2024-01-15')
    const cloned = deepClone(date)
    expect(cloned).toEqual(date)
    expect(cloned).not.toBe(date)
    expect(cloned.getTime()).toBe(date.getTime())
  })

  it('clones a RegExp', () => {
    const re = /test/gi
    const cloned = deepClone(re)
    expect(cloned).toEqual(re)
    expect(cloned).not.toBe(re)
    expect(cloned.source).toBe('test')
    expect(cloned.flags).toBe('gi')
  })

  it('clones a Map', () => {
    const map = new Map<string, number>([['a', 1], ['b', 2]])
    const cloned = deepClone(map)
    expect(cloned).toEqual(map)
    expect(cloned).not.toBe(map)
    expect(cloned.get('a')).toBe(1)
  })

  it('clones a Set', () => {
    const set = new Set([1, 2, 3])
    const cloned = deepClone(set)
    expect(cloned).toEqual(set)
    expect(cloned).not.toBe(set)
    expect(cloned.has(1)).toBe(true)
  })

  it('handles circular references', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    const cloned = deepClone(obj)
    expect(cloned.a).toBe(1)
    expect(cloned.self).toBe(cloned)
  })

  it('returns primitives as-is', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone('hello')).toBe('hello')
    expect(deepClone(true)).toBe(true)
  })

  it('handles null and undefined', () => {
    expect(deepClone(null)).toBeNull()
    expect(deepClone(undefined)).toBeUndefined()
  })
})

describe('deepMerge', () => {
  it('merges two flat objects', () => {
    const result = deepMerge({ a: 1 }, { b: 2 })
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('merges nested objects deeply', () => {
    const result = deepMerge(
      { a: { x: 1, y: 2 } },
      { a: { z: 3 } }
    )
    expect(result).toEqual({ a: { x: 1, y: 2, z: 3 } })
  })

  it('overwrites arrays (not concatenates)', () => {
    const result = deepMerge({ items: [1, 2] }, { items: [3, 4] })
    expect(result).toEqual({ items: [3, 4] })
  })

  it('skips null and undefined sources', () => {
    const result = deepMerge({ a: 1 }, null as unknown as Record<string, unknown>, undefined, { b: 2 })
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('returns a new object', () => {
    const a = { x: 1 }
    const result = deepMerge(a)
    expect(result).not.toBe(a)
    expect(result).toEqual(a)
  })

  it('handles multiple sources', () => {
    const result = deepMerge({ a: 1 }, { b: 2 }, { c: 3 })
    expect(result).toEqual({ a: 1, b: 2, c: 3 })
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays invocation (trailing)', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('calls immediately with leading', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true })
    debounced()
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('only trailing when both leading and trailing are true', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, { leading: true, trailing: true })
    debounced()
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('cancels pending invocation', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
  })

  it('flushes pending invocation', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced.flush()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('invokes with maxWait', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 1000, { maxWait: 200 })
    debounced()
    vi.advanceTimersByTime(150)
    debounced()
    vi.advanceTimersByTime(150)
    debounced()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls immediately first time', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ignores calls within wait window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled()
    throttled()
    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('trailing call fires after wait', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled()
    vi.advanceTimersByTime(50)
    throttled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('memoize', () => {
  it('caches results by first argument', () => {
    const fn = vi.fn((x: number) => x * 2)
    const memoized = memoize(fn)
    expect(memoized(2)).toBe(4)
    expect(memoized(2)).toBe(4)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(memoized(3)).toBe(6)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('uses custom resolver', () => {
    const fn = vi.fn((a: number, b: number) => a + b)
    const memoized = memoize(fn, (a, b) => `${a},${b}`)
    expect(memoized(1, 2)).toBe(3)
    expect(memoized(1, 2)).toBe(3)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(memoized(2, 1)).toBe(3)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('exposes cache property', () => {
    const fn = vi.fn((x: number) => x * 2)
    const memoized = memoize(fn)
    memoized(5)
    expect(memoized.cache).toBeInstanceOf(Map)
    expect(memoized.cache.get('5')).toBe(10)
  })
})

describe('retry', () => {
  it('resolves on first try', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(retry(fn, { baseDelay: 10 })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries then succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok')
    const promise = retry(fn, { baseDelay: 10, attempts: 3 })
    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  }, 15000)

  it('throws after max attempts exceeded', async () => {
    const error = new Error('always fail')
    const fn = vi.fn().mockRejectedValue(error)
    const promise = retry(fn, { baseDelay: 10, attempts: 2 })
    await expect(promise).rejects.toThrow('always fail')
    expect(fn).toHaveBeenCalledTimes(2)
  }, 15000)
})

describe('noop', () => {
  it('returns undefined', () => {
    expect(noop()).toBeUndefined()
  })
})

describe('identity', () => {
  it('returns the given value', () => {
    expect(identity(42)).toBe(42)
    expect(identity('hello')).toBe('hello')
    const obj = { a: 1 }
    expect(identity(obj)).toBe(obj)
  })
})

describe('once', () => {
  it('calls fn only once', () => {
    const fn = vi.fn(() => 42)
    const wrapped = once(fn)
    expect(wrapped()).toBe(42)
    expect(wrapped()).toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns same result on subsequent calls', () => {
    let counter = 0
    const fn = vi.fn(() => ++counter)
    const wrapped = once(fn)
    expect(wrapped()).toBe(1)
    expect(wrapped()).toBe(1)
    expect(wrapped()).toBe(1)
  })
})
