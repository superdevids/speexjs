import { describe, it, expect } from 'vitest'
import { NDArray } from '../src/nlarray/index.js'

// ---------------------------------------------------------------------------
// 1. Static Factories
// ---------------------------------------------------------------------------

describe('NDArray.zeros', () => {
  it('creates a 1-D array of zeros', () => {
    const a = NDArray.zeros([5])
    expect(a.shape).toEqual([5])
    expect(a.toList()).toEqual([0, 0, 0, 0, 0])
  })

  it('creates a 2-D array of zeros', () => {
    const a = NDArray.zeros([2, 3])
    expect(a.shape).toEqual([2, 3])
    expect(a.toArray()).toEqual([[0, 0, 0], [0, 0, 0]])
  })

  it('creates a 0-element array', () => {
    const a = NDArray.zeros([0])
    expect(a.size).toBe(0)
    expect(a.shape).toEqual([0])
  })
})

describe('NDArray.ones', () => {
  it('creates a 1-D array of ones', () => {
    const a = NDArray.ones([3])
    expect(a.toList()).toEqual([1, 1, 1])
  })

  it('creates a 2-D array of ones', () => {
    const a = NDArray.ones([2, 2])
    expect(a.toArray()).toEqual([[1, 1], [1, 1]])
  })
})

describe('NDArray.full', () => {
  it('fills array with a constant value', () => {
    const a = NDArray.full([2, 3], 7)
    expect(a.toArray()).toEqual([[7, 7, 7], [7, 7, 7]])
  })

  it('works with negative fill values', () => {
    const a = NDArray.full([3], -1)
    expect(a.toList()).toEqual([-1, -1, -1])
  })
})

describe('NDArray.eye', () => {
  it('creates an identity matrix (square)', () => {
    const a = NDArray.eye(3)
    expect(a.shape).toEqual([3, 3])
    expect(a.toArray()).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]])
  })

  it('creates a rectangular identity matrix', () => {
    const a = NDArray.eye(2, 3)
    expect(a.shape).toEqual([2, 3])
    expect(a.toArray()).toEqual([[1, 0, 0], [0, 1, 0]])
  })
})

describe('NDArray.identity', () => {
  it('creates a square identity matrix', () => {
    const a = NDArray.identity(4)
    expect(a.shape).toEqual([4, 4])
    expect(a.get(0, 0)).toBe(1)
    expect(a.get(0, 1)).toBe(0)
    expect(a.get(1, 1)).toBe(1)
  })
})

describe('NDArray.arange', () => {
  it('arange(stop) from 0', () => {
    expect(NDArray.arange(5).toList()).toEqual([0, 1, 2, 3, 4])
  })

  it('arange(start, stop)', () => {
    expect(NDArray.arange(2, 6).toList()).toEqual([2, 3, 4, 5])
  })

  it('arange(start, stop, step)', () => {
    expect(NDArray.arange(0, 1, 0.2).toList()).toEqual([0, 0.2, 0.4, 0.6, 0.8])
  })

  it('arange with negative step', () => {
    expect(NDArray.arange(5, 0, -1).toList()).toEqual([5, 4, 3, 2, 1])
  })

  it('throws on step = 0', () => {
    expect(() => NDArray.arange(0, 5, 0)).toThrow('Step must not be zero')
  })
})

describe('NDArray.linspace', () => {
  it('evenly spaced numbers inclusive', () => {
    const a = NDArray.linspace(0, 1, 5)
    expect(a.toList()).toEqual([0, 0.25, 0.5, 0.75, 1])
  })

  it('defaults to 50 samples', () => {
    expect(NDArray.linspace(0, 1).size).toBe(50)
  })

  it('works with num = 1', () => {
    expect(NDArray.linspace(5, 5, 1).toList()).toEqual([5])
  })

  it('throws when num < 1', () => {
    expect(() => NDArray.linspace(0, 1, 0)).toThrow('at least 1')
  })
})

describe('NDArray.logspace', () => {
  it('evenly spaced on log scale (base 10)', () => {
    const a = NDArray.logspace(0, 2, 3)
    expect(a.toList()).toEqual([1, 10, 100])
  })

  it('works with custom base', () => {
    const a = NDArray.logspace(0, 3, 4, 2)
    expect(a.toList()).toEqual([1, 2, 4, 8])
  })

  it('works with num = 1', () => {
    expect(NDArray.logspace(2, 5, 1).toList()).toEqual([100])
  })

  it('throws when num < 1', () => {
    expect(() => NDArray.logspace(0, 1, 0)).toThrow('at least 1')
  })
})

describe('NDArray.random', () => {
  it('creates array with values in [0, 1)', () => {
    const a = NDArray.random([1000])
    expect(a.shape).toEqual([1000])
    for (const v of a.toList()) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('produces different values (statistical)', () => {
    const a = NDArray.random([100])
    const b = NDArray.random([100])
    // Extremely unlikely to be identical
    expect(a.toList()).not.toEqual(b.toList())
  })
})

describe('NDArray.randn', () => {
  it('creates array with standard normal values', () => {
    const a = NDArray.randn([1000])
    expect(a.shape).toEqual([1000])
  })

  it('handles odd sizes', () => {
    const a = NDArray.randn([3])
    expect(a.size).toBe(3)
  })
})

describe('NDArray.from', () => {
  it('creates from flat array (1-D)', () => {
    const a = NDArray.from([1, 2, 3])
    expect(a.shape).toEqual([3])
    expect(a.toList()).toEqual([1, 2, 3])
  })

  it('creates from nested array (2-D)', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    expect(a.shape).toEqual([2, 2])
    expect(a.toArray()).toEqual([[1, 2], [3, 4]])
  })
})

// ---------------------------------------------------------------------------
// 2. Properties
// ---------------------------------------------------------------------------

describe('NDArray properties', () => {
  it('shape returns the correct shape', () => {
    expect(NDArray.zeros([2, 3, 4]).shape).toEqual([2, 3, 4])
  })

  it('ndim returns number of dimensions', () => {
    expect(NDArray.zeros([5]).ndim).toBe(1)
    expect(NDArray.zeros([2, 3]).ndim).toBe(2)
    expect(NDArray.zeros([2, 3, 4]).ndim).toBe(3)
  })

  it('size returns total element count', () => {
    expect(NDArray.zeros([2, 3]).size).toBe(6)
    expect(NDArray.zeros([]).size).toBe(1)
  })

  it('T transposes a 2-D array', () => {
    const a = NDArray.from([[1, 2, 3], [4, 5, 6]])
    expect(a.T.shape).toEqual([3, 2])
    expect(a.T.toArray()).toEqual([[1, 4], [2, 5], [3, 6]])
  })
})

// ---------------------------------------------------------------------------
// 3. Reshape
// ---------------------------------------------------------------------------

describe('reshape', () => {
  it('reshapes a 1-D array to 2-D', () => {
    const a = NDArray.arange(6).reshape([2, 3])
    expect(a.shape).toEqual([2, 3])
    expect(a.toArray()).toEqual([[0, 1, 2], [3, 4, 5]])
  })

  it('throws on invalid shape', () => {
    expect(() => NDArray.arange(6).reshape([2, 2])).toThrow()
  })
})

describe('flatten', () => {
  it('flattens a 2-D array to 1-D', () => {
    const a = NDArray.from([[1, 2], [3, 4]]).flatten()
    expect(a.shape).toEqual([4])
    expect(a.toList()).toEqual([1, 2, 3, 4])
  })

  it('returns a copy, not a view', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    const flat = a.flatten()
    a.set(99, 0, 0)
    expect(flat.toList()[0]).toBe(1) // unaffected
  })
})

describe('ravel', () => {
  it('is an alias for flatten', () => {
    const a = NDArray.from([[1, 2], [3, 4]]).ravel()
    expect(a.shape).toEqual([4])
    expect(a.toList()).toEqual([1, 2, 3, 4])
  })
})

// ---------------------------------------------------------------------------
// 4. Element-wise Operations
// ---------------------------------------------------------------------------

describe('add (scalar)', () => {
  it('adds a scalar', () => {
    const a = NDArray.from([1, 2, 3]).add(10)
    expect(a.toList()).toEqual([11, 12, 13])
  })

  it('preserves shape', () => {
    const a = NDArray.from([[1, 2], [3, 4]]).add(1)
    expect(a.shape).toEqual([2, 2])
  })
})

describe('add (array)', () => {
  it('adds two arrays element-wise', () => {
    const a = NDArray.from([1, 2, 3])
    const b = NDArray.from([10, 20, 30])
    expect(a.add(b).toList()).toEqual([11, 22, 33])
  })

  it('broadcasts when shapes differ', () => {
    const a = NDArray.from([[1, 2, 3], [4, 5, 6]])
    const b = NDArray.from([10, 20, 30])
    const c = a.add(b)
    expect(c.shape).toEqual([2, 3])
    expect(c.toArray()).toEqual([[11, 22, 33], [14, 25, 36]])
  })
})

describe('sub', () => {
  it('subtracts a scalar', () => {
    const a = NDArray.from([5, 10, 15]).sub(5)
    expect(a.toList()).toEqual([0, 5, 10])
  })

  it('subtracts two arrays', () => {
    const a = NDArray.from([10, 20, 30])
    const b = NDArray.from([1, 2, 3])
    expect(a.sub(b).toList()).toEqual([9, 18, 27])
  })
})

describe('mul', () => {
  it('multiplies by a scalar', () => {
    expect(NDArray.from([1, 2, 3]).mul(3).toList()).toEqual([3, 6, 9])
  })

  it('multiplies element-wise', () => {
    const a = NDArray.from([1, 2, 3])
    const b = NDArray.from([2, 3, 4])
    expect(a.mul(b).toList()).toEqual([2, 6, 12])
  })
})

describe('div', () => {
  it('divides by a scalar', () => {
    expect(NDArray.from([2, 4, 6]).div(2).toList()).toEqual([1, 2, 3])
  })

  it('divides element-wise', () => {
    const a = NDArray.from([10, 20, 30])
    const b = NDArray.from([2, 4, 5])
    expect(a.div(b).toList()).toEqual([5, 5, 6])
  })
})

describe('pow', () => {
  it('raises elements to a power', () => {
    expect(NDArray.from([1, 2, 3]).pow(2).toList()).toEqual([1, 4, 9])
  })

  it('handles fractional exponent', () => {
    const a = NDArray.from([4, 9]).pow(0.5)
    expect(a.toList()).toEqual([2, 3])
  })
})

describe('sqrt', () => {
  it('computes square root', () => {
    expect(NDArray.from([4, 9, 16]).sqrt().toList()).toEqual([2, 3, 4])
  })
})

describe('abs', () => {
  it('computes absolute values', () => {
    expect(NDArray.from([-1, 0, 1]).abs().toList()).toEqual([1, 0, 1])
  })
})

describe('neg', () => {
  it('negates all elements', () => {
    expect(NDArray.from([1, -2, 3]).neg().toList()).toEqual([-1, 2, -3])
  })
})

describe('clip', () => {
  it('clips values to [min, max]', () => {
    const a = NDArray.from([1, 5, 10]).clip(2, 8)
    expect(a.toList()).toEqual([2, 5, 8])
  })

  it('works with only min', () => {
    expect(NDArray.from([-1, 0, 5]).clip(0).toList()).toEqual([0, 0, 5])
  })

  it('works with only max', () => {
    expect(NDArray.from([1, 5, 10]).clip(undefined, 8).toList()).toEqual([1, 5, 8])
  })
})

describe('round', () => {
  it('rounds to integer by default', () => {
    const a = NDArray.from([1.2, 2.7, 3.5]).round()
    expect(a.toList()).toEqual([1, 3, 4])
  })

  it('rounds to specified decimals', () => {
    const a = NDArray.from([1.234, 2.567]).round(1)
    expect(a.toList()).toEqual([1.2, 2.6])
  })
})

describe('floor', () => {
  it('computes floor', () => {
    expect(NDArray.from([1.2, 2.7, -1.1]).floor().toList()).toEqual([1, 2, -2])
  })
})

describe('ceil', () => {
  it('computes ceil', () => {
    expect(NDArray.from([1.2, 2.7, -1.1]).ceil().toList()).toEqual([2, 3, -1])
  })
})

// ---------------------------------------------------------------------------
// 5. Aggregation
// ---------------------------------------------------------------------------

describe('sum', () => {
  it('sums all elements (no axis)', () => {
    expect(NDArray.from([1, 2, 3]).sum()).toBe(6)
  })

  it('sums along axis 0', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    const result = a.sum(0)
    expect(result.shape).toEqual([2])
    expect(result.toList()).toEqual([4, 6])
  })

  it('sums along axis 1', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    const result = a.sum(1)
    expect(result.shape).toEqual([2])
    expect(result.toList()).toEqual([3, 7])
  })
})

describe('mean', () => {
  it('computes mean (no axis)', () => {
    expect(NDArray.from([1, 2, 3, 4]).mean()).toBe(2.5)
  })

  it('computes mean along axis', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    expect((a.mean(0) as NDArray).toList()).toEqual([2, 3])
    expect((a.mean(1) as NDArray).toList()).toEqual([1.5, 3.5])
  })
})

describe('var', () => {
  it('computes population variance (no axis)', () => {
    const a = NDArray.from([1, 2, 3, 4])
    expect(a.var()).toBe(1.25)
  })

  it('computes variance along axis', () => {
    const a = NDArray.from([[1, 3], [5, 7]])
    const v0 = a.var(0) as NDArray
    const v1 = a.var(1) as NDArray
    expect(v0.toList()).toEqual([4, 4])
    expect(v1.toList()).toEqual([1, 1])
  })
})

describe('std', () => {
  it('computes population std (no axis)', () => {
    const a = NDArray.from([1, 2, 3, 4])
    expect(a.std()).toBeCloseTo(Math.sqrt(1.25))
  })

  it('computes std along axis', () => {
    const a = NDArray.from([[1, 3], [5, 7]])
    const s0 = a.std(0) as NDArray
    expect((s0.get(0) as number)).toBeCloseTo(2)
  })
})

describe('min / max', () => {
  const a = NDArray.from([3, 1, 4, 1, 5])

  it('min (no axis)', () => {
    expect(a.min()).toBe(1)
  })

  it('max (no axis)', () => {
    expect(a.max()).toBe(5)
  })

  it('min along axis', () => {
    const m = NDArray.from([[1, 4], [3, 2]]).min(1) as NDArray
    expect(m.toList()).toEqual([1, 2])
  })

  it('max along axis', () => {
    const m = NDArray.from([[1, 4], [3, 2]]).max(0) as NDArray
    expect(m.toList()).toEqual([3, 4])
  })
})

describe('argmin / argmax', () => {
  it('argmin returns flat index of minimum', () => {
    expect(NDArray.from([3, 1, 4, 1, 5]).argmin()).toBe(1)
  })

  it('argmax returns flat index of maximum', () => {
    expect(NDArray.from([3, 1, 4, 1, 5]).argmax()).toBe(4)
  })

  it('throws on empty array', () => {
    expect(() => NDArray.zeros([0]).argmin()).toThrow('empty')
    expect(() => NDArray.zeros([0]).argmax()).toThrow('empty')
  })
})

describe('all / any', () => {
  it('all returns true if all truthy', () => {
    expect(NDArray.from([1, 2, 3]).all()).toBe(true)
  })

  it('all returns false if any falsy', () => {
    expect(NDArray.from([1, 0, 3]).all()).toBe(false)
  })

  it('any returns true if any truthy', () => {
    expect(NDArray.from([0, 0, 1]).any()).toBe(true)
  })

  it('any returns false if all falsy', () => {
    expect(NDArray.from([0, 0, 0]).any()).toBe(false)
  })

  it('all along axis', () => {
    const a = NDArray.from([[1, 1], [1, 0]])
    const result = a.all(0) as NDArray<boolean>
    expect(result.toList()).toEqual([true, false])
  })
})

// ---------------------------------------------------------------------------
// 6. Matrix Operations
// ---------------------------------------------------------------------------

describe('dot (1-D)', () => {
  it('computes inner product of two 1-D arrays', () => {
    const a = NDArray.from([1, 2, 3])
    const b = NDArray.from([4, 5, 6])
    expect(a.dot(b)).toBe(32) // 1*4 + 2*5 + 3*6
  })

  it('throws on length mismatch', () => {
    expect(() => NDArray.from([1, 2]).dot(NDArray.from([1, 2, 3]))).toThrow(
      'Incompatible shapes',
    )
  })
})

describe('dot (2-D)', () => {
  it('computes matrix multiplication (2-D @ 2-D)', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    const b = NDArray.from([[5, 6], [7, 8]])
    const c = a.dot(b) as NDArray
    expect(c.toArray()).toEqual([[19, 22], [43, 50]])
  })

  it('computes matrix-vector (2-D @ 1-D)', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    const v = NDArray.from([1, 2])
    const r = a.dot(v) as NDArray
    expect(r.toList()).toEqual([5, 11])
  })

  it('computes vector-matrix (1-D @ 2-D)', () => {
    const v = NDArray.from([1, 2])
    const a = NDArray.from([[1, 2], [3, 4]])
    const r = v.dot(a) as NDArray
    expect(r.toList()).toEqual([7, 10])
  })

  it('throws on incompatible shapes', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    const b = NDArray.from([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
    expect(() => a.dot(b)).toThrow()
  })
})

describe('matmul', () => {
  it('performs 2-D matmul', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    const b = NDArray.from([[5, 6], [7, 8]])
    const c = a.matmul(b)
    expect(c.toArray()).toEqual([[19, 22], [43, 50]])
  })

  it('performs batched matmul with broadcasting', () => {
    const a = new NDArray([1, 2, 3, 4], [1, 2, 2]) // shape [1, 2, 2]
    const b = new NDArray([5, 6, 7, 8, 1, 2, 3, 4], [2, 2, 2]) // shape [2, 2, 2]
    const r = a.matmul(b)
    expect(r.shape).toEqual([2, 2, 2])
  })

  it('handles 1-D @ 1-D as dot', () => {
    const r = NDArray.from([1, 2, 3]).matmul(NDArray.from([4, 5, 6]))
    expect(r.toList()).toEqual([32])
  })
})

// ---------------------------------------------------------------------------
// 7. Manipulation
// ---------------------------------------------------------------------------

describe('transpose', () => {
  it('transposes a 2-D matrix', () => {
    const a = NDArray.from([[1, 2, 3], [4, 5, 6]])
    const t = a.transpose()
    expect(t.shape).toEqual([3, 2])
    expect(t.toArray()).toEqual([[1, 4], [2, 5], [3, 6]])
  })

  it('is a no-op for 1-D arrays', () => {
    const a = NDArray.from([1, 2, 3])
    expect(a.transpose().toList()).toEqual([1, 2, 3])
  })
})

describe('squeeze', () => {
  it('removes dimensions of size 1', () => {
    const a = new NDArray([1, 2, 3], [1, 3, 1])
    const s = a.squeeze()
    expect(s.shape).toEqual([3])
    expect(s.toList()).toEqual([1, 2, 3])
  })

  it('handles all-1 shape', () => {
    const a = new NDArray([42], [1, 1, 1])
    const s = a.squeeze()
    expect(s.shape).toEqual([1])
    expect(s.toList()).toEqual([42])
  })
})

describe('slice', () => {
  it('slices a 2-D array', () => {
    const a = NDArray.from([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
    const s = a.slice([0, 0], [2, 2])
    expect(s.shape).toEqual([2, 2])
    expect(s.toArray()).toEqual([[1, 2], [4, 5]])
  })

  it('handles negative indices', () => {
    const a = NDArray.from([[1, 2, 3], [4, 5, 6]])
    const s = a.slice([-2, -3], [2, 3])
    expect(s.toArray()).toEqual([[1, 2, 3], [4, 5, 6]])
  })

  it('throws on empty slice', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    expect(() => a.slice([1, 0], [0, 1])).toThrow('Invalid slice')
  })
})

// ---------------------------------------------------------------------------
// 8. Conversion / Utilities
// ---------------------------------------------------------------------------

describe('toArray', () => {
  it('returns nested arrays for 2-D', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    expect(a.toArray()).toEqual([[1, 2], [3, 4]])
  })

  it('returns flat array for 1-D', () => {
    expect(NDArray.from([1, 2, 3]).toArray()).toEqual([1, 2, 3])
  })
})

describe('toList', () => {
  it('returns flat JS array', () => {
    expect(NDArray.from([[1, 2], [3, 4]]).toList()).toEqual([1, 2, 3, 4])
  })
})

describe('toString', () => {
  it('formats 1-D array', () => {
    const s = NDArray.from([1, 2, 3]).toString()
    expect(s).toMatch(/^\[1,\s*2,\s*3\]$/)
  })

  it('formats 2-D array', () => {
    const s = NDArray.from([[1, 2], [3, 4]]).toString()
    expect(s).toContain('[[')
    expect(s).toContain(']]')
  })
})

describe('copy', () => {
  it('returns a deep copy', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    const c = a.copy()
    expect(c.toArray()).toEqual(a.toArray())
    c.set(99, 0, 0)
    expect(a.get(0, 0)).toBe(1)
  })
})

describe('equals', () => {
  it('returns true for equal arrays', () => {
    const a = NDArray.from([1, 2, 3])
    const b = NDArray.from([1, 2, 3])
    expect(a.equals(b)).toBe(true)
  })

  it('returns false for different values', () => {
    expect(NDArray.from([1, 2]).equals(NDArray.from([1, 3]))).toBe(false)
  })

  it('returns false for different shapes', () => {
    expect(NDArray.from([1, 2]).equals(NDArray.from([[1], [2]]))).toBe(false)
  })
})

describe('get', () => {
  it('gets element at given indices', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    expect(a.get(0, 1)).toBe(2)
    expect(a.get(1, 0)).toBe(3)
  })

  it('handles negative indices', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    expect(a.get(-1, -1)).toBe(4)
    expect(a.get(-2, -1)).toBe(2)
  })
})

describe('set', () => {
  it('sets element at given indices', () => {
    const a = NDArray.zeros([2, 2])
    a.set(5, 0, 1)
    expect(a.get(0, 1)).toBe(5)
  })

  it('handles negative indices', () => {
    const a = NDArray.zeros([2, 2])
    a.set(7, -1, -1)
    expect(a.get(1, 1)).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// 9. Static Ufuncs
// ---------------------------------------------------------------------------

describe('NDArray.sin', () => {
  it('computes element-wise sine', () => {
    const a = NDArray.from([0, Math.PI / 2])
    const r = NDArray.sin(a)
    expect(r.get(0)).toBeCloseTo(0)
    expect(r.get(1)).toBeCloseTo(1)
  })
})

describe('NDArray.cos', () => {
  it('computes element-wise cosine', () => {
    const a = NDArray.from([0, Math.PI])
    const r = NDArray.cos(a)
    expect(r.get(0)).toBeCloseTo(1)
    expect(r.get(1)).toBeCloseTo(-1)
  })
})

describe('NDArray.exp', () => {
  it('computes element-wise exponential', () => {
    const a = NDArray.from([0, 1])
    const r = NDArray.exp(a)
    expect(r.get(0)).toBeCloseTo(1)
    expect(r.get(1)).toBeCloseTo(Math.E)
  })
})

describe('NDArray.log', () => {
  it('computes element-wise natural log', () => {
    const a = NDArray.from([1, Math.E])
    const r = NDArray.log(a)
    expect(r.get(0)).toBeCloseTo(0)
    expect(r.get(1)).toBeCloseTo(1)
  })
})

describe('NDArray.sqrt', () => {
  it('computes element-wise sqrt', () => {
    const a = NDArray.from([4, 9, 16])
    const r = NDArray.sqrt(a)
    expect(r.toList()).toEqual([2, 3, 4])
  })
})

describe('NDArray.concatenate', () => {
  it('joins arrays along axis 0', () => {
    const a = NDArray.ones([2, 3])
    const b = NDArray.zeros([2, 3])
    const c = NDArray.concatenate([a, b], 0)
    expect(c.shape).toEqual([4, 3])
  })

  it('joins arrays along axis 1', () => {
    const a = NDArray.ones([2, 2])
    const b = NDArray.zeros([2, 2])
    const c = NDArray.concatenate([a, b], 1)
    expect(c.shape).toEqual([2, 4])
  })

  it('throws on shape mismatch', () => {
    const a = NDArray.ones([2, 3])
    const b = NDArray.zeros([3, 3])
    expect(() => NDArray.concatenate([a, b], 0)).toThrow('Incompatible')
  })

  it('throws on empty list', () => {
    expect(() => NDArray.concatenate([])).toThrow('No arrays')
  })
})

describe('NDArray.stack', () => {
  it('stacks arrays along new axis 0', () => {
    const a = NDArray.ones([3])
    const b = NDArray.zeros([3])
    const c = NDArray.stack([a, b])
    expect(c.shape).toEqual([2, 3])
  })

  it('stacks along new axis 1', () => {
    const a = NDArray.ones([3])
    const b = NDArray.zeros([3])
    const c = NDArray.stack([a, b], 1)
    expect(c.shape).toEqual([3, 2])
  })

  it('throws on shape mismatch', () => {
    const a = NDArray.ones([3])
    const b = NDArray.ones([4])
    expect(() => NDArray.stack([a, b])).toThrow('same shape')
  })
})

describe('NDArray.hstack', () => {
  it('stacks 1-D arrays as rows horizontally', () => {
    const a = NDArray.from([1, 2, 3])
    const b = NDArray.from([4, 5, 6])
    const c = NDArray.hstack([a, b])
    expect(c.shape).toEqual([2, 3])
    expect(c.toArray()).toEqual([[1, 2, 3], [4, 5, 6]])
  })

  it('stacks 2-D arrays column-wise', () => {
    const a = NDArray.from([[1], [2]])
    const b = NDArray.from([[3], [4]])
    const c = NDArray.hstack([a, b])
    expect(c.shape).toEqual([2, 2])
    expect(c.toArray()).toEqual([[1, 3], [2, 4]])
  })
})

describe('NDArray.vstack', () => {
  it('stacks 1-D arrays as rows vertically', () => {
    const a = NDArray.from([1, 2, 3])
    const b = NDArray.from([4, 5, 6])
    const c = NDArray.vstack([a, b])
    expect(c.shape).toEqual([2, 3])
    expect(c.toArray()).toEqual([[1, 2, 3], [4, 5, 6]])
  })

  it('stacks 2-D arrays row-wise', () => {
    const a = NDArray.from([[1, 2]])
    const b = NDArray.from([[3, 4]])
    const c = NDArray.vstack([a, b])
    expect(c.shape).toEqual([2, 2])
    expect(c.toArray()).toEqual([[1, 2], [3, 4]])
  })
})

// ---------------------------------------------------------------------------
// Extra: standalone ufunc exports
// ---------------------------------------------------------------------------

import { sin, cos, exp, log, sqrt as standaloneSqrt } from '../src/nlarray/index.js'

describe('standalone ufunc exports', () => {
  it('sin works as standalone', () => {
    const r = sin(NDArray.from([0, Math.PI / 2]))
    expect(r.get(0)).toBeCloseTo(0)
    expect(r.get(1)).toBeCloseTo(1)
  })

  it('cos works as standalone', () => {
    const r = cos(NDArray.from([0, Math.PI]))
    expect(r.get(0)).toBeCloseTo(1)
    expect(r.get(1)).toBeCloseTo(-1)
  })

  it('exp works as standalone', () => {
    const r = exp(NDArray.from([0]))
    expect(r.get(0)).toBeCloseTo(1)
  })

  it('log works as standalone', () => {
    const r = log(NDArray.from([1, Math.E]))
    expect(r.get(0)).toBeCloseTo(0)
    expect(r.get(1)).toBeCloseTo(1)
  })

  it('sqrt works as standalone', () => {
    const r = standaloneSqrt(NDArray.from([4, 9]))
    expect(r.toList()).toEqual([2, 3])
  })
})

// ---------------------------------------------------------------------------
// 10. Edge Cases & Errors
// ---------------------------------------------------------------------------

describe('edge cases — empty arrays', () => {
  it('sum of empty returns 0', () => {
    expect(NDArray.zeros([0]).sum()).toBe(0)
  })

  it('mean of empty returns NaN', () => {
    expect(NDArray.zeros([0]).mean()).toBeNaN()
  })
})

describe('edge cases — scalar broadcasting', () => {
  it('adds scalar to 2-D array', () => {
    const a = NDArray.ones([2, 2]).add(5)
    expect(a.toArray()).toEqual([[6, 6], [6, 6]])
  })

  it('broadcasts (3,) + (1,)', () => {
    const a = NDArray.from([1, 2, 3]).add(NDArray.from([10]))
    expect(a.toList()).toEqual([11, 12, 13])
  })
})

describe('edge cases — shape mismatch errors', () => {
  it('throws when constructor data mismatches shape', () => {
    expect(() => new NDArray([1, 2, 3], [2, 2])).toThrow()
  })

  it('throws on broadcast conflict', () => {
    const a = NDArray.from([1, 2, 3])
    const b = NDArray.from([1, 2])
    expect(() => a.add(b)).toThrow('cannot be broadcast')
  })

  it('throws on constructor with inconsistent row lengths', () => {
    expect(() => NDArray.from([[1, 2], [3]])).toThrow('Inconsistent row lengths')
  })

  it('throws on get with wrong number of indices', () => {
    expect(() => NDArray.from([1]).get(0, 0)).toThrow('Expected 1 indices')
  })

  it('throws on set with wrong number of indices', () => {
    const a = NDArray.zeros([2, 2])
    expect(() => a.set(1, 0)).toThrow('Expected 2 indices')
  })
})

describe('edge cases — negative indices', () => {
  it('get with negative indices wraps correctly', () => {
    const a = NDArray.from([10, 20, 30])
    expect(a.get(-1)).toBe(30)
    expect(a.get(-3)).toBe(10)
  })

  it('set with negative indices wraps correctly', () => {
    const a = NDArray.zeros([3])
    a.set(99, -1)
    expect(a.get(-1)).toBe(99)
  })
})

describe('edge cases — empty shape', () => {
  it('NDArray with empty shape [0]', () => {
    const a = new NDArray([], [0])
    expect(a.shape).toEqual([0])
    expect(a.size).toBe(0)
    expect(a.toList()).toEqual([])
  })
})

describe('transpose (3-D)', () => {
  it('transposes a 3-D array', () => {
    const a = NDArray.arange(8).reshape([2, 2, 2])
    const t = a.transpose()
    expect(t.shape).toEqual([2, 2, 2])
    // [0,1,2,3,4,5,6,7] -> transposed
    expect(t.get(0, 0, 0)).toBe(0)
    expect(t.get(0, 0, 1)).toBe(4)
    expect(t.get(1, 1, 0)).toBe(3)
    expect(t.get(1, 1, 1)).toBe(7)
  })
})

describe('squeeze (additional)', () => {
  it('handles 1-D unchanged', () => {
    const a = NDArray.from([1, 2, 3])
    expect(a.squeeze().shape).toEqual([3])
  })
})

describe('repeat', () => {
  it('repeats each element when no axis', () => {
    const a = NDArray.from([1, 2, 3]).repeat(2)
    expect(a.toList()).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('repeats along axis 0', () => {
    const a = NDArray.from([[1, 2], [3, 4]]).repeat(2, 0)
    expect(a.shape).toEqual([4, 2])
    expect(a.toArray()).toEqual([[1, 2], [3, 4], [1, 2], [3, 4]])
  })

  it('repeats along axis 1', () => {
    const a = NDArray.from([[1, 2], [3, 4]]).repeat(2, 1)
    expect(a.shape).toEqual([2, 4])
    expect(a.toArray()).toEqual([[1, 2, 1, 2], [3, 4, 3, 4]])
  })

  it('n=1 returns a copy', () => {
    const a = NDArray.from([1, 2, 3])
    const r = a.repeat(1)
    expect(r.toList()).toEqual([1, 2, 3])
    expect(r).not.toBe(a)
  })

  it('throws when n < 1', () => {
    expect(() => NDArray.from([1]).repeat(0)).toThrow('Repeat count must be at least 1')
  })
})

describe('where', () => {
  it('filters by boolean NDArray', () => {
    const a = NDArray.from([1, 2, 3, 4])
    const cond = NDArray.from([true, false, true, false])
    const result = a.where(cond)
    expect(result.toList()).toEqual([1, 3])
  })

  it('filters by predicate function', () => {
    const a = NDArray.from([1, 2, 3, 4])
    const result = a.where(v => v > 2)
    expect(result.toList()).toEqual([3, 4])
  })

  it('throws on size mismatch', () => {
    const a = NDArray.from([1, 2])
    const cond = NDArray.from([true, false, true])
    expect(() => a.where(cond)).toThrow('same total size')
  })
})

describe('all / any (additional)', () => {
  it('all returns false for all falsy', () => {
    expect(NDArray.from([0, 0, 0]).all()).toBe(false)
  })

  it('any returns false for all falsy', () => {
    expect(NDArray.from([0, 0, 0]).any()).toBe(false)
  })

  it('any returns true for any truthy', () => {
    expect(NDArray.from([0, 0, 1]).any()).toBe(true)
  })
})

describe('NDArray.tan', () => {
  it('computes element-wise tangent', () => {
    const a = NDArray.from([0, Math.PI / 4])
    const r = NDArray.tan(a)
    expect(r.get(0)).toBeCloseTo(0)
    expect(r.get(1)).toBeCloseTo(1, 1)
  })
})

describe('NDArray.log2', () => {
  it('computes base-2 logarithm', () => {
    const a = NDArray.from([1, 2, 8])
    const r = NDArray.log2(a)
    expect(r.get(0)).toBeCloseTo(0)
    expect(r.get(1)).toBeCloseTo(1)
    expect(r.get(2)).toBeCloseTo(3)
  })
})

describe('NDArray.log10', () => {
  it('computes base-10 logarithm', () => {
    const a = NDArray.from([1, 10, 100])
    const r = NDArray.log10(a)
    expect(r.get(0)).toBeCloseTo(0)
    expect(r.get(1)).toBeCloseTo(1)
    expect(r.get(2)).toBeCloseTo(2)
  })
})

describe('NDArray.stack (additional)', () => {
  it('stacks 1-D arrays into 2-D', () => {
    const a = NDArray.ones([3])
    const b = NDArray.zeros([3])
    const c = NDArray.stack([a, b])
    expect(c.shape).toEqual([2, 3])
  })
})

describe('NDArray.vstack (additional)', () => {
  it('stacks 1-D arrays vertically', () => {
    const a = NDArray.from([1, 2, 3])
    const b = NDArray.from([4, 5, 6])
    const c = NDArray.vstack([a, b])
    expect(c.shape).toEqual([2, 3])
    expect(c.toArray()).toEqual([[1, 2, 3], [4, 5, 6]])
  })
})

describe('edge cases — apply', () => {
  it('apply transforms each element', () => {
    const a = NDArray.from([1, 2, 3])
    const result = a.apply(v => v * 2)
    expect(result.toList()).toEqual([2, 4, 6])
  })
})

describe('edge cases — map', () => {
  it('map passes indices', () => {
    const a = NDArray.from([[1, 2], [3, 4]])
    const result = a.map((v, i, j) => v + i + j)
    expect(result.toArray()).toEqual([[1, 3], [4, 6]])
  })
})
