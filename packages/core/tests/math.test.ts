import { describe, it, expect } from 'vitest'
import {
  add,
  sub,
  mul,
  div,
  round,
  floor,
  ceil,
  approxEqual,
  clamp,
  sum,
  average,
  randomInt,
  inRange,
  DivisionByZeroError,
} from '../src/math/index.js'

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('handles floating point precision', () => {
    expect(add(0.1, 0.2)).toBe(0.3)
  })

  it('handles negative numbers', () => {
    expect(add(-5, 3)).toBe(-2)
    expect(add(-5, -3)).toBe(-8)
  })

  it('handles zero', () => {
    expect(add(0, 0)).toBe(0)
    expect(add(5, 0)).toBe(5)
  })
})

describe('sub', () => {
  it('subtracts two numbers', () => {
    expect(sub(5, 3)).toBe(2)
  })

  it('handles floating point precision', () => {
    expect(sub(0.3, 0.1)).toBe(0.2)
  })

  it('handles negative numbers', () => {
    expect(sub(3, 5)).toBe(-2)
    expect(sub(-5, -3)).toBe(-2)
  })
})

describe('mul', () => {
  it('multiplies two numbers', () => {
    expect(mul(4, 3)).toBe(12)
  })

  it('handles floating point precision', () => {
    expect(mul(0.1, 0.2)).toBe(0.02)
  })

  it('handles negative numbers', () => {
    expect(mul(-4, 3)).toBe(-12)
    expect(mul(-4, -3)).toBe(12)
  })

  it('handles zero', () => {
    expect(mul(5, 0)).toBe(0)
  })
})

describe('div', () => {
  it('divides two numbers', () => {
    expect(div(10, 2)).toBe(5)
  })

  it('handles floating point precision', () => {
    expect(div(0.3, 0.1)).toBe(3)
  })

  it('handles negative numbers', () => {
    expect(div(-10, 2)).toBe(-5)
    expect(div(-10, -2)).toBe(5)
  })

  it('throws DivisionByZeroError on division by zero', () => {
    expect(() => div(5, 0)).toThrow(DivisionByZeroError)
    expect(() => div(5, 0)).toThrow('Division by zero')
  })
})

describe('round', () => {
  it('rounds to integer by default', () => {
    expect(round(3.7)).toBe(4)
    expect(round(3.2)).toBe(3)
  })

  it('rounds with precision', () => {
    expect(round(3.456, 1)).toBe(3.5)
    expect(round(3.456, 2)).toBe(3.46)
  })

  it('handles negative precision', () => {
    expect(round(1234, -2)).toBe(1200)
  })
})

describe('floor', () => {
  it('floors to integer by default', () => {
    expect(floor(3.7)).toBe(3)
    expect(floor(3.2)).toBe(3)
  })

  it('floors with precision', () => {
    expect(floor(3.456, 1)).toBe(3.4)
    expect(floor(3.456, 2)).toBe(3.45)
  })

  it('handles negative numbers', () => {
    expect(floor(-3.7)).toBe(-4)
  })
})

describe('ceil', () => {
  it('ceils to integer by default', () => {
    expect(ceil(3.2)).toBe(4)
    expect(ceil(3.7)).toBe(4)
  })

  it('ceils with precision', () => {
    expect(ceil(3.456, 1)).toBe(3.5)
    expect(ceil(3.456, 2)).toBe(3.46)
  })

  it('handles negative numbers', () => {
    expect(ceil(-3.7)).toBe(-3)
  })
})

describe('approxEqual', () => {
  it('returns true for equal numbers', () => {
    expect(approxEqual(1, 1)).toBe(true)
  })

  it('returns true for approximately equal numbers with default tolerance', () => {
    expect(approxEqual(0.1 + 0.2, 0.3)).toBe(true)
  })

  it('returns false for different numbers', () => {
    expect(approxEqual(1, 2)).toBe(false)
  })

  it('uses custom tolerance', () => {
    expect(approxEqual(10, 12, 3)).toBe(true)
    expect(approxEqual(10, 12, 1)).toBe(false)
  })
})

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns min when below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('returns max when above range', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('handles edge values', () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('throws RangeError when min > max', () => {
    expect(() => clamp(5, 10, 0)).toThrow(RangeError)
  })
})

describe('sum', () => {
  it('sums an array of numbers', () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15)
  })

  it('returns 0 for empty array', () => {
    expect(sum([])).toBe(0)
  })

  it('handles single element', () => {
    expect(sum([42])).toBe(42)
  })

  it('handles negative numbers', () => {
    expect(sum([-1, -2, 3])).toBe(0)
  })
})

describe('average', () => {
  it('computes average of numbers', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3)
  })

  it('handles single element', () => {
    expect(average([42])).toBe(42)
  })

  it('throws RangeError for empty array', () => {
    expect(() => average([])).toThrow(RangeError)
  })
})

describe('randomInt', () => {
  it('returns a number within the range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomInt(1, 6)
      expect(val).toBeGreaterThanOrEqual(1)
      expect(val).toBeLessThanOrEqual(6)
      expect(Number.isInteger(val)).toBe(true)
    }
  })

  it('works with single value range', () => {
    expect(randomInt(5, 5)).toBe(5)
  })

  it('throws RangeError for non-integer arguments', () => {
    expect(() => randomInt(1.5, 5)).toThrow(RangeError)
    expect(() => randomInt(1, 5.5)).toThrow(RangeError)
  })

  it('throws RangeError when min > max', () => {
    expect(() => randomInt(10, 1)).toThrow(RangeError)
  })
})

describe('inRange', () => {
  it('returns true when value is within range', () => {
    expect(inRange(5, 0, 10)).toBe(true)
  })

  it('returns false when value is below min', () => {
    expect(inRange(-1, 0, 10)).toBe(false)
  })

  it('returns false when value is above max', () => {
    expect(inRange(11, 0, 10)).toBe(false)
  })

  it('handles inclusive bounds', () => {
    expect(inRange(0, 0, 10)).toBe(true)
    expect(inRange(10, 0, 10)).toBe(true)
  })
})
