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
  mode,
  weightedAverage,
  geometricMean,
  correlation,
  isEven,
  isOdd,
  gcd,
  lcm,
  factorial,
  isPrime,
  toRadians,
  toDegrees,
  lerp,
  percentageOf,
  mapRange,
  range,
  permutations,
  combinations,
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

describe('mode', () => {
  it('returns the most frequent value', () => {
    expect(mode([1, 2, 2, 3])).toEqual([2])
  })

  it('returns multiple values when tied', () => {
    expect(mode([1, 1, 2, 2])).toEqual([1, 2])
  })

  it('returns the single element', () => {
    expect(mode([42])).toEqual([42])
  })

  it('throws RangeError for empty array', () => {
    expect(() => mode([])).toThrow(RangeError)
  })
})

describe('weightedAverage', () => {
  it('computes weighted average', () => {
    expect(weightedAverage([10, 20], [1, 4])).toBe(18)
  })

  it('throws RangeError for empty arrays', () => {
    expect(() => weightedAverage([], [])).toThrow(RangeError)
  })
})

describe('geometricMean', () => {
  it('computes geometric mean of positive numbers', () => {
    expect(geometricMean([4, 9])).toBeCloseTo(6, 10)
  })

  it('returns 0 when any value is zero', () => {
    expect(geometricMean([0, 9])).toBe(3)
  })

  it('throws RangeError for empty array', () => {
    expect(() => geometricMean([])).toThrow(RangeError)
  })
})

describe('correlation', () => {
  it('computes strong positive correlation', () => {
    const r = correlation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])
    expect(r).toBeCloseTo(1, 10)
  })

  it('computes strong negative correlation', () => {
    const r = correlation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])
    expect(r).toBeCloseTo(-1, 10)
  })

  it('returns 0 for constant array (division by zero)', () => {
    expect(correlation([1, 2, 3], [5, 5, 5])).toBe(0)
  })
})

describe('isEven / isOdd', () => {
  it('isEven returns true for even numbers', () => {
    expect(isEven(4)).toBe(true)
    expect(isEven(0)).toBe(true)
    expect(isEven(7)).toBe(false)
  })

  it('isOdd returns true for odd numbers', () => {
    expect(isOdd(3)).toBe(true)
    expect(isOdd(8)).toBe(false)
  })
})

describe('gcd / lcm', () => {
  it('gcd computes greatest common divisor', () => {
    expect(gcd(12, 8)).toBe(4)
    expect(gcd(17, 5)).toBe(1)
  })

  it('lcm computes least common multiple', () => {
    expect(lcm(4, 6)).toBe(12)
    expect(lcm(7, 5)).toBe(35)
  })
})

describe('factorial', () => {
  it('factorial of 0 is 1', () => {
    expect(factorial(0)).toBe(1)
  })

  it('factorial of 1 is 1', () => {
    expect(factorial(1)).toBe(1)
  })

  it('factorial of 5 is 120', () => {
    expect(factorial(5)).toBe(120)
  })
})

describe('isPrime', () => {
  it('returns true for 2', () => {
    expect(isPrime(2)).toBe(true)
  })

  it('returns true for 3', () => {
    expect(isPrime(3)).toBe(true)
  })

  it('returns false for 4', () => {
    expect(isPrime(4)).toBe(false)
  })

  it('returns true for 17', () => {
    expect(isPrime(17)).toBe(true)
  })

  it('returns false for 1', () => {
    expect(isPrime(1)).toBe(false)
  })
})

describe('toRadians / toDegrees', () => {
  it('toRadians converts degrees to radians', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 10)
  })

  it('toDegrees converts radians to degrees', () => {
    expect(toDegrees(Math.PI)).toBeCloseTo(180, 10)
  })
})

describe('lerp', () => {
  it('linearly interpolates', () => {
    expect(lerp(0, 100, 0.5)).toBe(50)
    expect(lerp(0, 100, 0)).toBe(0)
    expect(lerp(0, 100, 1)).toBe(100)
  })
})

describe('percentageOf', () => {
  it('computes percentage', () => {
    expect(percentageOf(25, 200)).toBe(12.5)
  })
})

describe('mapRange', () => {
  it('maps a value between ranges', () => {
    expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50)
  })
})

describe('range', () => {
  it('generates ascending range', () => {
    expect(range(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('generates range with step', () => {
    expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8, 10])
  })

  it('returns empty when sign mismatched', () => {
    expect(range(5, 1)).toEqual([5, 4, 3, 2, 1])
  })
})

describe('permutations / combinations', () => {
  it('combinations of 5 choose 2 is 10', () => {
    expect(combinations(5, 2)).toBe(10)
  })

  it('permutations of 5 choose 2 is 20', () => {
    expect(permutations(5, 2)).toBe(20)
  })
})
