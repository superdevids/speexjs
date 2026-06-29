import { describe, it, expect, vi } from 'vitest'
import {
  id,
  curry,
  partial,
  partialRight,
  tap,
  trace,
  memoizeSync,
  negate,
  before,
  wrapArray,
  constant,
  over,
  comparing,
  memoizeLast,
} from '../src/nlfunction/index.js'

// ---------------------------------------------------------------------------
// id
// ---------------------------------------------------------------------------

describe('id', () => {
  it('returns the given value unchanged', () => {
    expect(id(42)).toBe(42)
    expect(id('hello')).toBe('hello')
    expect(id(null)).toBe(null)
    expect(id(undefined)).toBe(undefined)
  })

  it('returns the same reference for objects', () => {
    const obj = { a: 1 }
    expect(id(obj)).toBe(obj)
  })
})

// ---------------------------------------------------------------------------
// curry
// ---------------------------------------------------------------------------

describe('curry', () => {
  it('curries a binary function with all args at once', () => {
    const add = curry((a: number, b: number) => a + b)
    expect(add(1, 2)).toBe(3)
  })

  it('curries a binary function with one arg at a time', () => {
    const add = curry((a: number, b: number) => a + b)
    const add1 = add(1)
    expect(add1).toBeTypeOf('function')
    expect(add1(2)).toBe(3)
  })

  it('works with ternary functions', () => {
    const sum3 = curry((a: number, b: number, c: number) => a + b + c)
    expect(sum3(1, 2, 3)).toBe(6)
    expect(sum3(1)(2)(3)).toBe(6)
    expect(sum3(1, 2)(3)).toBe(6)
  })

  it('supports custom arity', () => {
    // Function with default parameters where fn.length < actual arity
    const fn = (a: number, b = 0, c = 0) => a + b + c
    const curried = curry(fn, 3)
    expect(curried(1)(2)(3)).toBe(6)
  })

  it('passes this context correctly', () => {
    const obj = {
      multiplier: 2,
      fn: curry(function (this: any, a: number) {
        return a * this.multiplier
      }),
    }
    expect(obj.fn(5)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// partial
// ---------------------------------------------------------------------------

describe('partial', () => {
  it('presets arguments from the left', () => {
    const add = (a: number, b: number) => a + b
    const add5 = partial(add, 5)
    expect(add5(3)).toBe(8)
  })

  it('works with multiple preset args', () => {
    const sum3 = (a: number, b: number, c: number) => a + b + c
    const add1And2 = partial(sum3, 1, 2)
    expect(add1And2(3)).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// partialRight
// ---------------------------------------------------------------------------

describe('partialRight', () => {
  it('presets arguments from the right', () => {
    const divide = (a: number, b: number) => a / b
    const divideBy2 = partialRight(divide, 2)
    expect(divideBy2(10)).toBe(5)
  })

  it('works with multiple preset args', () => {
    const format = (prefix: string, value: number, suffix: string) =>
      `${prefix}${value}${suffix}`
    const wrapParens = partialRight(format, ')')
    expect(wrapParens('(', 42)).toBe('(42)')
  })
})

// ---------------------------------------------------------------------------
// tap
// ---------------------------------------------------------------------------

describe('tap', () => {
  it('calls the side-effect function and returns the value', () => {
    const sideEffect = vi.fn((x: number) => x * 2)
    const tapped = tap(sideEffect)
    const result = tapped(42)
    expect(result).toBe(42)
    expect(sideEffect).toHaveBeenCalledWith(42)
  })

  it('can be used in a pipeline', () => {
    const log: number[] = []
    const double = (x: number) => x * 2
    const result = double(tap((x: number) => log.push(x))(5))
    expect(log).toEqual([5])
    expect(result).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// trace
// ---------------------------------------------------------------------------

describe('trace', () => {
  it('logs the value and returns it', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const tracer = trace('debug')
    const result = tracer(42)
    expect(result).toBe(42)
    expect(spy).toHaveBeenCalledWith('debug: 42')
    spy.mockRestore()
  })

  it('logs without message prefix', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const tracer = trace()
    tracer('hello')
    expect(spy).toHaveBeenCalledWith('hello')
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// memoizeSync
// ---------------------------------------------------------------------------

describe('memoizeSync', () => {
  it('caches results by first argument', () => {
    let callCount = 0
    const double = memoizeSync((x: number) => {
      callCount++
      return x * 2
    })

    expect(double(5)).toBe(10)
    expect(double(5)).toBe(10)
    expect(double(7)).toBe(14)
    expect(callCount).toBe(2)
  })

  it('uses custom resolver for cache key', () => {
    let callCount = 0
    const fn = memoizeSync(
      (a: number, b: number) => {
        callCount++
        return a + b
      },
      (a, b) => `${a},${b}`,
    )

    expect(fn(1, 2)).toBe(3)
    expect(fn(1, 2)).toBe(3)
    expect(fn(2, 3)).toBe(5)
    expect(callCount).toBe(2)
  })

  it('exposes cache property', () => {
    const fn = memoizeSync((x: number) => x * 2)
    fn(5)
    expect(fn.cache).toBeInstanceOf(Map)
    expect(fn.cache.has('5')).toBe(true)
    expect(fn.cache.get('5')).toBe(10)
  })

  it('respects maxSize limit (LRU eviction)', () => {
    let callCount = 0
    const fn = memoizeSync(
      (x: number) => {
        callCount++
        return x
      },
      undefined,
      2,
    )

    fn(1)
    fn(2)
    fn(3) // should evict key '1'
    expect(fn.cache.size).toBe(2)
    fn(1) // recomputed
    expect(callCount).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// negate
// ---------------------------------------------------------------------------

describe('negate', () => {
  it('negates a predicate', () => {
    const isEven = (n: number) => n % 2 === 0
    const isOdd = negate(isEven)
    expect(isOdd(3)).toBe(true)
    expect(isOdd(4)).toBe(false)
  })

  it('preserves this context', () => {
    const obj = {
      threshold: 5,
      check: function (this: any, x: number) {
        return x > this.threshold
      },
    }
    const notCheck = negate(obj.check)
    expect(notCheck.call(obj, 10)).toBe(false)
    expect(notCheck.call(obj, 3)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// before
// ---------------------------------------------------------------------------

describe('before', () => {
  it('only calls fn n times', () => {
    const fn = vi.fn(() => 'result')
    const limited = before(2, fn)

    expect(limited()).toBe('result')
    expect(limited()).toBe('result')
    expect(limited()).toBeUndefined()
    expect(limited()).toBeUndefined()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('returns undefined after limit', () => {
    const fn = before(1, () => 42)
    expect(fn()).toBe(42)
    expect(fn()).toBeUndefined()
  })

  it('passes arguments', () => {
    const fn = vi.fn((a: number, b: number) => a + b)
    const limited = before(2, fn)
    expect(limited(1, 2)).toBe(3)
    expect(fn).toHaveBeenCalledWith(1, 2)
  })
})

// ---------------------------------------------------------------------------
// wrapArray
// ---------------------------------------------------------------------------

describe('wrapArray', () => {
  it('wraps a non-array value in an array', () => {
    expect(wrapArray('hello')).toEqual(['hello'])
    expect(wrapArray(42)).toEqual([42])
    expect(wrapArray(null)).toEqual([null])
  })

  it('returns an array unchanged', () => {
    const arr = [1, 2, 3]
    expect(wrapArray(arr)).toBe(arr)
  })
})

// ---------------------------------------------------------------------------
// constant
// ---------------------------------------------------------------------------

describe('constant', () => {
  it('always returns the given value', () => {
    const always42 = constant(42)
    expect(always42()).toBe(42)
    expect(always42(1, 2, 3)).toBe(42)
  })

  it('works with object references', () => {
    const obj = { key: 'value' }
    const alwaysObj = constant(obj)
    expect(alwaysObj()).toBe(obj)
  })
})

// ---------------------------------------------------------------------------
// over
// ---------------------------------------------------------------------------

describe('over', () => {
  it('applies args to multiple functions and returns results', () => {
    const minMax = over([Math.min, Math.max])
    expect(minMax(1, 2, 3)).toEqual([1, 3])
  })

  it('works with custom functions', () => {
    const double = (x: number) => x * 2
    const triple = (x: number) => x * 3
    const result = over([double, triple])(5)
    expect(result).toEqual([10, 15])
  })
})

// ---------------------------------------------------------------------------
// comparing
// ---------------------------------------------------------------------------

describe('comparing', () => {
  it('creates a comparator from a transform function', () => {
    const byLength = comparing((s: string) => s.length)
    const words = ['apple', 'pear', 'kiwi', 'banana']
    words.sort(byLength)
    expect(words).toEqual(['pear', 'kiwi', 'apple', 'banana'])
  })

  it('sorts numbers by a derived property', () => {
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }]
    const byValue = comparing((item: { v: number }) => item.v)
    items.sort(byValue)
    expect(items.map((x) => x.v)).toEqual([1, 2, 3])
  })

  it('handles equal values', () => {
    const byValue = comparing((x: number) => x)
    expect(byValue(5, 5)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// memoizeLast
// ---------------------------------------------------------------------------

describe('memoizeLast', () => {
  it('caches the last computed result', () => {
    let callCount = 0
    const double = memoizeLast((x: number) => {
      callCount++
      return x * 2
    })

    expect(double(5)).toBe(10)
    expect(double(5)).toBe(10)
    expect(callCount).toBe(1)
  })

  it('recomputes when argument changes', () => {
    let callCount = 0
    const double = memoizeLast((x: number) => {
      callCount++
      return x * 2
    })

    double(5)
    double(7) // recomputed
    double(5) // recomputed again (last was 7)
    expect(callCount).toBe(3)
  })
})
