/**
 * coverage-boost.test.ts
 *
 * Targeted tests to push line coverage to 100%.
 * Each section covers specific uncovered branches in the source.
 *
 * Coverage targets:
 *   1. crypto/index.ts     - Buffer fallback (delete btoa/atob)
 *   2. math/index.ts       - edge cases: mode, weightedAverage, geometricMean all-zeros,
 *                            correlation constant arrays, permutations/combinations extremes,
 *                            median, stddev, sampleStddev, percentile, formatCurrency,
 *                            getPrecision scientific notation, etc.
 *   3. nlfunction/index.ts - memoizeLast cache hit, debounce/throttle/once wrappers
 *   4. validation/isEmail.ts - escaped char at boundary, non-ASCII domain
 *   5. validation/isURL.ts   - invalid hostname chars (underscore)
 *   6. collection/index.ts   - hasPath non-object intermediate, unset null intermediate
 *   7. async/queue.ts        - priority, pause/resume, onIdle, clear
 *   8. async/semaphore.ts    - concurrency=0 throws
 *   9. async/mutex.ts        - use with async function
 *   10. error/MultiError.ts  - toJSON stack fields
 *   11. error/createError.ts - toJSON with cause
 */

import { describe, it, expect, vi, afterEach } from 'vitest'

// ============================================================================
// 1. crypto/index.ts — Buffer-based base64 fallback
// ============================================================================
import {
  base64Encode,
  base64Decode,
  hash,
  simpleHash,
} from '../src/crypto/index.js'

describe('crypto: base64 Buffer fallback', () => {
  const origBtoa = globalThis.btoa
  const origAtob = globalThis.atob

  afterEach(() => {
    // Restore in case of test failure
    if (!globalThis.btoa && origBtoa) (globalThis as any).btoa = origBtoa
    if (!globalThis.atob && origAtob) (globalThis as any).atob = origAtob
  })

  it('base64Encode uses Buffer when btoa is unavailable', () => {
    delete (globalThis as any).btoa
    delete (globalThis as any).atob

    const encoded = base64Encode('hello world')
    expect(encoded).toBe('aGVsbG8gd29ybGQ=')
  })

  it('base64Decode uses Buffer when atob is unavailable', () => {
    delete (globalThis as any).btoa
    delete (globalThis as any).atob

    const decoded = base64Decode('aGVsbG8gd29ybGQ=')
    expect(decoded).toBe('hello world')
  })

  it('roundtrip works with Buffer fallback', () => {
    delete (globalThis as any).btoa
    delete (globalThis as any).atob

    const original = 'héllo wörld 🚀'
    expect(base64Decode(base64Encode(original))).toBe(original)
  })

  it('restores btoa/atob after tests', () => {
    // After Buffer tests, verify the globals are restored by afterEach
    expect(typeof globalThis.btoa).toBe('function')
    expect(typeof globalThis.atob).toBe('function')
  })
})

// ============================================================================
// 2. math/index.ts — edge case and untested function coverage
// ============================================================================
import {
  // Edge cases for previously-tested functions:
  mode,
  weightedAverage,
  geometricMean,
  correlation,
  permutations,
  combinations,
  range,
  percentageOf,
  mapRange,
  factorial,
  gcd,
  lcm,
  isPrime,

  // Untested statistical functions:
  median,
  stddev,
  sampleStddev,
  percentile,
  formatCurrency,

  // Other uncovered branches:
  add,
  randomInt,
} from '../src/math/index.js'

describe('math: mode edge case', () => {
  it('handles all same values', () => {
    expect(mode([5, 5, 5, 5])).toEqual([5])
  })

  it('handles all distinct values (all are mode)', () => {
    const result = mode([1, 2, 3])
    expect(result.sort()).toEqual([1, 2, 3])
  })
})

describe('math: weightedAverage edge cases', () => {
  it('throws when arrays differ in length', () => {
    expect(() => weightedAverage([1, 2], [1])).toThrow(RangeError)
  })

  it('throws when sum of weights is zero', () => {
    expect(() => weightedAverage([10, 20], [0, 0])).toThrow(RangeError)
  })
})

describe('math: geometricMean edge cases', () => {
  it('handles zero values correctly', () => {
    // geometricMean([0, x, 0]) where x > 0
    const result = geometricMean([0, 1, 0])
    expect(result).toBe(1)
  })

  it('throws for negative values', () => {
    expect(() => geometricMean([4, -1])).toThrow(RangeError)
  })
})

describe('math: correlation edge cases', () => {
  it('returns 0 when both arrays are constant', () => {
    expect(correlation([5, 5, 5], [10, 10, 10])).toBe(0)
  })

  it('returns 0 when x is constant', () => {
    // denX === 0 because all dx === 0
    expect(correlation([1, 1, 1], [1, 2, 3])).toBe(0)
  })
})

describe('math: permutations/combinations extremes', () => {
  it('combinations k=0 returns 1', () => {
    expect(combinations(5, 0)).toBe(1)
  })

  it('combinations k=n returns 1', () => {
    expect(combinations(5, 5)).toBe(1)
  })

  it('combinations throws when n < k', () => {
    expect(() => combinations(2, 5)).toThrow(RangeError)
  })

  it('combinations throws for non-integer arguments', () => {
    expect(() => combinations(1.5, 2)).toThrow(RangeError)
  })

  it('combinations throws for negative arguments', () => {
    expect(() => combinations(-1, 2)).toThrow(RangeError)
  })

  it('permutations k=0 returns 1', () => {
    expect(permutations(5, 0)).toBe(1)
  })

  it('permutations throws when n < k', () => {
    expect(() => permutations(2, 5)).toThrow(RangeError)
  })

  it('permutations throws for non-integer arguments', () => {
    expect(() => permutations(1.5, 2)).toThrow(RangeError)
  })

  it('permutations throws for negative arguments', () => {
    expect(() => permutations(-1, 2)).toThrow(RangeError)
  })
})

describe('math: range edge cases', () => {
  it('throws when step is zero', () => {
    expect(() => range(1, 5, 0)).toThrow(RangeError)
  })

  it('returns empty array when step direction mismatches range direction', () => {
    expect(range(1, 5, -1)).toEqual([])
    expect(range(5, 1, 1)).toEqual([])
  })
})

describe('math: percentageOf edge cases', () => {
  it('throws when total is zero', () => {
    expect(() => percentageOf(10, 0)).toThrow(RangeError)
  })
})

describe('math: mapRange edge cases', () => {
  it('throws when input range is zero', () => {
    expect(() => mapRange(5, 10, 10, 0, 100)).toThrow(RangeError)
  })
})

describe('math: factorial edge cases', () => {
  it('throws for non-integer argument', () => {
    expect(() => factorial(1.5)).toThrow(RangeError)
  })

  it('throws for negative argument', () => {
    expect(() => factorial(-1)).toThrow(RangeError)
  })
})

describe('math: gcd edge cases', () => {
  it('throws for non-integer arguments', () => {
    expect(() => gcd(1.5, 2)).toThrow(RangeError)
    expect(() => gcd(2, 1.5)).toThrow(RangeError)
  })

  it('handles negative values (uses absolute)', () => {
    expect(gcd(-12, 8)).toBe(4)
    expect(gcd(12, -8)).toBe(4)
    expect(gcd(-12, -8)).toBe(4)
  })
})

describe('math: lcm edge cases', () => {
  it('throws for zero arguments', () => {
    expect(() => lcm(0, 5)).toThrow(RangeError)
    expect(() => lcm(5, 0)).toThrow(RangeError)
  })

  it('throws for non-integer arguments', () => {
    expect(() => lcm(1.5, 2)).toThrow(RangeError)
  })
})

describe('math: isPrime edge cases', () => {
  it('throws for non-integer argument', () => {
    expect(() => isPrime(1.5)).toThrow(RangeError)
  })

  it('returns false for numbers < 2', () => {
    expect(isPrime(1)).toBe(false)
    expect(isPrime(0)).toBe(false)
    expect(isPrime(-5)).toBe(false)
  })

  it('handles 2 and 3 correctly', () => {
    expect(isPrime(2)).toBe(true)
    expect(isPrime(3)).toBe(true)
  })

  it('handles multiples of 2 and 3', () => {
    expect(isPrime(9)).toBe(false)
    expect(isPrime(15)).toBe(false)
  })
})

describe('math: median', () => {
  it('computes median of odd-length array', () => {
    expect(median([1, 3, 5])).toBe(3)
  })

  it('computes median of even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('throws for empty array', () => {
    expect(() => median([])).toThrow(RangeError)
  })

  it('handles single element', () => {
    expect(median([42])).toBe(42)
  })
})

describe('math: stddev', () => {
  it('computes population standard deviation', () => {
    const result = stddev([2, 4, 4, 4, 5, 5, 7, 9])
    expect(result).toBeCloseTo(2, 1)
  })

  it('returns 0 for constant array', () => {
    expect(stddev([5, 5, 5])).toBe(0)
  })

  it('throws for fewer than 2 values', () => {
    expect(() => stddev([1])).toThrow(RangeError)
  })
})

describe('math: sampleStddev', () => {
  it('computes sample standard deviation', () => {
    const result = sampleStddev([2, 4, 4, 4, 5, 5, 7, 9])
    expect(result).toBeCloseTo(2.138, 2)
  })

  it('returns 0 for constant array', () => {
    expect(sampleStddev([5, 5, 5])).toBe(0)
  })

  it('throws for fewer than 2 values', () => {
    expect(() => sampleStddev([1])).toThrow(RangeError)
  })
})

describe('math: percentile', () => {
  it('computes 0th percentile', () => {
    expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1)
  })

  it('computes 50th percentile (median)', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3)
  })

  it('computes 100th percentile', () => {
    expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5)
  })

  it('computes interpolated percentile', () => {
    const p = percentile([1, 2, 3, 4], 25)
    expect(p).toBeGreaterThan(1)
    expect(p).toBeLessThan(2)
  })

  it('throws for empty array', () => {
    expect(() => percentile([], 50)).toThrow(RangeError)
  })

  it('throws for p < 0', () => {
    expect(() => percentile([1, 2, 3], -1)).toThrow(RangeError)
  })

  it('throws for p > 100', () => {
    expect(() => percentile([1, 2, 3], 101)).toThrow(RangeError)
  })
})

describe('math: formatCurrency', () => {
  it('formats with default locale (id-ID, IDR)', () => {
    const result = formatCurrency(1500000)
    expect(result).toContain('Rp')
    expect(result).toContain('.')
  })

  it('formats with custom locale and currency', () => {
    const result = formatCurrency(99.99, { locale: 'en-US', currency: 'USD' })
    expect(result).toContain('$')
    expect(result).toContain('99')
  })

  it('formats with compact notation', () => {
    const result = formatCurrency(1500000, { notation: 'compact' })
    // Should produce a shorter representation
    expect(result.length).toBeLessThan('Rp1.500.000'.length + 3)
  })

  it('handles invalid locale gracefully (fallback)', () => {
    const result = formatCurrency(1000, { locale: 'invalid-locale' })
    // Should still return something
    expect(result).toBeTruthy()
  })
})

// ============================================================================
// 3. nlfunction/index.ts — memoizeLast, debounce/throttle/once wrappers
// ============================================================================
import {
  memoizeLast,
  debounce,
  throttle,
  once,
} from '../src/nlfunction/index.js'

describe('nlfunction: memoizeLast edge', () => {
  it('caches by first arg string key (undefined/null/number)', () => {
    let calls = 0
    const fn = memoizeLast((x: unknown) => {
      calls++
      return String(x)
    })

    // First call — lastKey is null, branch: lastKey !== null === false
    expect(fn(42)).toBe('42')
    expect(calls).toBe(1)

    // Same key — cache hit, branch: lastKey !== null === true && lastKey === key
    expect(fn(42)).toBe('42')
    expect(calls).toBe(1)

    // Different key — cache miss, branch: lastKey !== null === true && lastKey !== key
    expect(fn(99)).toBe('99')
    expect(calls).toBe(2)
  })

  it('handles undefined argument (stringified to "undefined")', () => {
    let calls = 0
    const fn = memoizeLast((x?: unknown) => {
      calls++
      return x === undefined ? 'none' : String(x)
    })

    expect(fn(undefined)).toBe('none')
    expect(calls).toBe(1)
    expect(fn(undefined)).toBe('none') // cache hit
    expect(calls).toBe(1)
  })

  it('handles no arguments (args[0] is undefined)', () => {
    let calls = 0
    const fn = memoizeLast(() => {
      calls++
      return 'always'
    })

    expect(fn()).toBe('always')
    expect(calls).toBe(1)
    expect(fn()).toBe('always') // cache hit on "undefined"
    expect(calls).toBe(1)
  })
})

describe('nlfunction: debounce wrapper', () => {
  it('imports and wraps core debounce', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced()

    expect(fn).not.toHaveBeenCalled()
  })
})

describe('nlfunction: throttle wrapper', () => {
  it('imports and wraps core throttle', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    throttled()

    // Should have been called at least once
    expect(fn).toHaveBeenCalled()
  })
})

describe('nlfunction: once wrapper', () => {
  it('imports and wraps core once', () => {
    const fn = vi.fn(() => 42)
    const wrapped = once(fn)

    expect(wrapped()).toBe(42)
    expect(wrapped()).toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// 4. validation/isEmail.ts — escaped char at boundary, non-ASCII domain
// ============================================================================
import { isEmail } from '../src/validation/index.js'

describe('isEmail: escape handling in quoted local part', () => {
  it('handles escaped regular char (not quote)', () => {
    // "test\ab"@example.com — escape at [5]→i=6, then 'a','b' before closing "
    // local.len=8, loop runs while i < 7. i=6 → ch='a', i=7, loop ends. returns true.
    expect(isEmail('"test\\ab"@example.com')).toBe(true)
  })

  it('handles escaped char at boundary (escape before closing quote)', () => {
    // "test\"@example.com — escape at last char before closing "
    // local = "test\" (len 6) → i=5 sees \ → i becomes 6 → 6 >= 5 → return false
    expect(isEmail('"test\\"@example.com')).toBe(false)
  })

  it('rejects quoted string with internal unescaped quote', () => {
    // "quote"inside"@example.com — second quote causes false
    expect(isEmail('"quote"inside"@example.com')).toBe(false)
  })

  it('rejects unclosed quoted local part', () => {
    expect(isEmail('"unclosed@example.com')).toBe(false)
  })
})

describe('isEmail: domain with non-ASCII characters', () => {
  it('rejects domain with non-ASCII char (ü)', () => {
    expect(isEmail('user@exämple.com')).toBe(false)
  })

  it('rejects domain with emoji', () => {
    expect(isEmail('user@exa😀ple.com')).toBe(false)
  })

  it('rejects domain label with underscore', () => {
    expect(isEmail('user@exa_mple.com')).toBe(false)
  })
})

// ============================================================================
// 5. validation/isURL.ts — invalid hostname characters
// ============================================================================
import { isURL } from '../src/validation/index.js'

describe('isURL: hostname character validation', () => {
  it('rejects URL with space in hostname', () => {
    // new URL('http://exam ple.com') will throw → caught → false
    expect(isURL('http://exam ple.com')).toBe(false)
  })

  it('rejects URL with underscore in hostname label', () => {
    // URL parser passes exa_mple.com as hostname, but isValidDNSHostname rejects _
    expect(isURL('http://exa_mple.com')).toBe(false)
  })

  it('rejects URL with invalid char in TLD', () => {
    expect(isURL('http://example.c_m')).toBe(false)
  })

  it('rejects invalid port number (throws in URL parser)', () => {
    expect(isURL('http://example.com:99999')).toBe(false)
  })

  it('rejects hostname with invalid characters', () => {
    expect(isURL('http://exam ple.com')).toBe(false)
  })
})

// ============================================================================
// 6. collection/index.ts — hasPath non-object, unset null intermediate
// ============================================================================
import { hasPath, unset } from '../src/collection/index.js'

describe('collection: hasPath with non-object intermediate', () => {
  it('returns false when a primitive value is encountered mid-path', () => {
    // obj.a = 42 (a number, not an object) → typeof current !== 'object' → false
    expect(hasPath({ a: 42 }, 'a.b')).toBe(false)
  })

  it('returns false when a string value is encountered mid-path', () => {
    expect(hasPath({ a: 'hello' }, 'a.b.c')).toBe(false)
  })
})

describe('collection: unset with null/undefined intermediate', () => {
  it('returns early when intermediate value is null', () => {
    // unset({ a: null }, 'a.b') → next is null → returns result early
    const result = unset({ a: null } as Record<string, unknown>, 'a.b')
    expect(result).toEqual({ a: null })
  })

  it('returns early when intermediate value is undefined', () => {
    const result = unset({ a: undefined } as Record<string, unknown>, 'a.b')
    expect('a' in result).toBe(true)
    expect(result.a).toBeUndefined()
  })

  it('returns early when intermediate value is a primitive', () => {
    const result = unset({ a: 42 } as Record<string, unknown>, 'a.b')
    expect(result).toEqual({ a: 42 })
  })
})

// ============================================================================
// 7. async/queue.ts — priority, pause/resume, onIdle, clear
// ============================================================================
import { Queue } from '../src/async/index.js'
import { sleep } from '../src/async/index.js'

describe('Queue: basic operations', () => {
  it('processes tasks with default concurrency of 1', async () => {
    const queue = new Queue()
    const results: number[] = []

    const p1 = queue.add(async () => { results.push(1); return 1 })
    const p2 = queue.add(async () => { results.push(2); return 2 })

    await expect(p1).resolves.toBe(1)
    await expect(p2).resolves.toBe(2)
    expect(results).toEqual([1, 2])
  })

  it('provides pending and running getters', () => {
    const queue = new Queue({ concurrency: 2 })
    expect(queue.pending).toBe(0)
    expect(queue.running).toBe(0)
  })
})

describe('Queue: priority sorting', () => {
  it('executes higher-priority tasks first', async () => {
    const order: string[] = []

    const queue = new Queue({ concurrency: 1 })

    // Pause queue so tasks don't start immediately
    queue.pause()

    // Add low priority first, then high priority (both while paused)
    const p1 = queue.add(async () => { order.push('low'); return 'low' }, { priority: 0 })
    const p2 = queue.add(async () => { order.push('high'); return 'high' }, { priority: 10 })

    // Resume - should process higher priority first
    queue.resume()

    await p1
    await p2

    // High priority (p2) should execute first despite being added second
    expect(order).toEqual(['high', 'low'])
  })
})

describe('Queue: pause and resume', () => {
  it('pauses processing and resumes later', async () => {
    const queue = new Queue({ concurrency: 1 })
    const executed: string[] = []

    queue.pause()

    // Add task while paused
    const promise = queue.add(async () => { executed.push('done'); return 'ok' })

    // Task shouldn't be running yet
    expect(executed).toEqual([])

    queue.resume()
    await promise
    expect(executed).toEqual(['done'])
  })
})

describe('Queue: onIdle', () => {
  it('resolves immediately when queue is idle', async () => {
    const queue = new Queue()
    await expect(queue.onIdle()).resolves.toBeUndefined()
  })

  it('resolves when all tasks complete', async () => {
    const queue = new Queue({ concurrency: 1 })
    const p1 = queue.add(async () => 'a')
    const p2 = queue.add(async () => 'b')

    const idle = queue.onIdle()
    await p1
    await p2
    await expect(idle).resolves.toBeUndefined()
  })
})

describe('Queue: clear', () => {
  it('rejects pending tasks with "Queue cleared"', async () => {
    const queue = new Queue({ concurrency: 1 })

    // Add a blocking task and a pending task
    const blocking = queue.add(async () => {
      await sleep(50)
      return 'blocking'
    })

    const pending = queue.add(async () => 'never')

    // Give the blocking task time to start
    await sleep(10)

    queue.clear()

    await expect(blocking).resolves.toBe('blocking')
    await expect(pending).rejects.toThrow('Queue cleared')
    expect(queue.pending).toBe(0)
  })
})

// ============================================================================
// 8. async/semaphore.ts — concurrency=0 throws
// ============================================================================
import { Semaphore } from '../src/async/index.js'

describe('Semaphore: concurrency validation', () => {
  it('throws RangeError when concurrency is 0', () => {
    expect(() => new Semaphore(0)).toThrow(RangeError)
  })

  it('throws RangeError when concurrency is negative', () => {
    expect(() => new Semaphore(-1)).toThrow(RangeError)
  })

  it('accepts concurrency of 1', () => {
    const sem = new Semaphore(1)
    expect(sem.available).toBe(1)
  })
})

// ============================================================================
// 9. async/mutex.ts — Mutex.use with async function
// ============================================================================
import { Mutex } from '../src/async/index.js'

describe('Mutex: use with async function', () => {
  it('runs async function and returns result', async () => {
    const mutex = new Mutex()
    const result = await mutex.use(async () => {
      return 42
    })
    expect(result).toBe(42)
  })

  it('releases lock after use', async () => {
    const mutex = new Mutex()
    await mutex.use(async () => 'done')
    expect(mutex.locked).toBe(false)
  })

  it('works with sequential acquisition', async () => {
    const mutex = new Mutex()
    const results: number[] = []

    const p1 = mutex.use(async () => {
      results.push(1)
      return 1
    })

    const p2 = mutex.use(async () => {
      results.push(2)
      return 2
    })

    await p1
    await p2
    expect(results).toEqual([1, 2])
  })
})

// ============================================================================
// 10. error/MultiError.ts — toJSON with stack fields
// ============================================================================
import { MultiError } from '../src/error/index.js'

describe('MultiError: toJSON coverage', () => {
  it('includes stack in serialized output when present', () => {
    const inner = new Error('inner error')
    const multi = new MultiError([inner], 'parent message')

    const json = multi.toJSON()
    expect(json.name).toBe('MultiError')
    expect(json.message).toBe('parent message')
    expect(json.errors).toHaveLength(1)
    expect(json.errors[0].name).toBe('Error')
    expect(json.errors[0].message).toBe('inner error')
    // Both inner and outer errors should have stacks in Node.js
    expect(json.errors[0].stack).toBeTypeOf('string')
    expect(json.stack).toBeTypeOf('string')
  })

  it('toJSON works with default message (joined)', () => {
    const multi = new MultiError([new Error('err1'), new Error('err2')])
    const json = multi.toJSON()
    expect(json.message).toBe('err1; err2')
  })
})

// ============================================================================
// 11. error/createError.ts — toJSON with cause
// ============================================================================
import { createError, TypedError } from '../src/error/index.js'

describe('TypedError: toJSON with cause', () => {
  it('includes cause in toJSON output', () => {
    const cause = new Error('root cause')
    const err = createError('INTERNAL', 'Something broke', { cause })

    const json = err.toJSON()
    expect(json.name).toBe('TypedError')
    expect(json.code).toBe('INTERNAL')
    expect(json.status).toBe(500)
    expect(json.message).toBe('Something broke')
    expect(json.cause).toBe(cause)
    expect(json.stack).toBeTypeOf('string')
  })

  it('supports cause without details', () => {
    const cause = new Error('upstream failure')
    const err = createError('BAD_GATEWAY', 'Upstream error', { cause })

    expect(err.cause).toBe(cause)
    expect(err.details).toBeUndefined()
  })

  it('toString includes code', () => {
    const err = createError('NOT_FOUND', 'Not found')
    expect(err.toString()).toContain('[NOT_FOUND]')
    expect(err.toString()).toContain('Not found')
  })
})

// ============================================================================
// 12. math: randomInt edge — non-integer args
// ============================================================================
describe('math: randomInt non-integer throws', () => {
  it('throws for non-integer min', () => {
    expect(() => randomInt(1.5, 5)).toThrow(RangeError)
  })

  it('throws for non-integer max', () => {
    expect(() => randomInt(1, 5.5)).toThrow(RangeError)
  })
})

// ============================================================================
// 13. math: getPrecision scientific notation coverage via add
// ============================================================================
describe('math: scientific notation precision handling', () => {
  it('handles very small numbers (scientific notation)', () => {
    // 1e-7 has small exponent → getPrecision should handle it
    const result = add(1e-7, 2e-7)
    expect(result).toBeCloseTo(3e-7, 10)
  })
})
