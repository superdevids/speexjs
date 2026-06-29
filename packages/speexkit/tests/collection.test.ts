import { describe, it, expect } from 'vitest'
import {
  groupBy,
  keyBy,
  omit,
  pick,
  pluck,
  shuffle,
  sample,
  sampleSize,
  chunk,
  sortBy,
  orderBy,
  uniqueBy,
  flatten,
  uniq,
  first,
  last,
  isEmpty,
} from '../src/collection/index.js'

describe('groupBy', () => {
  it('groups items by key', () => {
    const items = [
      { type: 'a', val: 1 },
      { type: 'b', val: 2 },
      { type: 'a', val: 3 },
    ]
    const result = groupBy(items, x => x.type)
    expect(result).toEqual({
      a: [{ type: 'a', val: 1 }, { type: 'a', val: 3 }],
      b: [{ type: 'b', val: 2 }],
    })
  })

  it('returns empty object for empty array', () => {
    expect(groupBy([], x => x)).toEqual({})
  })
})

describe('keyBy', () => {
  it('indexes items by key', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]
    const result = keyBy(items, x => x.id)
    expect(result).toEqual({
      1: { id: 1, name: 'a' },
      2: { id: 2, name: 'b' },
    })
  })
})

describe('omit', () => {
  it('omits specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 }
    expect(omit(obj, ['a', 'c'])).toEqual({ b: 2 })
  })

  it('returns a new object', () => {
    const obj = { a: 1 }
    expect(omit(obj, [])).not.toBe(obj)
  })
})

describe('pick', () => {
  it('picks specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 }
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 })
  })

  it('ignores keys that do not exist', () => {
    const obj = { a: 1 }
    expect(pick(obj, ['a', 'b' as keyof typeof obj])).toEqual({ a: 1 })
  })
})

describe('pluck', () => {
  it('extracts property values', () => {
    const items = [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
    expect(pluck(items, 'name')).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array for empty input', () => {
    expect(pluck([], 'name' as keyof never)).toEqual([])
  })
})

describe('shuffle', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffle(arr)
    expect(result).toHaveLength(5)
  })

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffle(arr)
    expect(result.sort()).toEqual(arr.sort())
  })

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3]
    const result = shuffle(arr)
    expect(result).not.toBe(arr)
    expect(arr).toEqual([1, 2, 3])
  })
})

describe('sample', () => {
  it('returns an element from the array', () => {
    const arr = [1, 2, 3]
    const result = sample(arr)
    expect(arr).toContain(result)
  })

  it('returns undefined for empty array', () => {
    expect(sample([])).toBeUndefined()
  })

  it('returns the only element for single-item array', () => {
    expect(sample([42])).toBe(42)
  })
})

describe('sampleSize', () => {
  it('returns n random distinct elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = sampleSize(arr, 3)
    expect(result).toHaveLength(3)
    for (const item of result) {
      expect(arr).toContain(item)
    }
  })

  it('returns empty array for size <= 0', () => {
    expect(sampleSize([1, 2, 3], 0)).toEqual([])
    expect(sampleSize([1, 2, 3], -1)).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(sampleSize([], 3)).toEqual([])
  })

  it('returns all elements when size > length', () => {
    const arr = [1, 2]
    expect(sampleSize(arr, 5)).toHaveLength(2)
  })
})

describe('chunk', () => {
  it('splits array into chunks of given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns single chunk when size >= length', () => {
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]])
  })

  it('returns empty array for empty input', () => {
    expect(chunk([], 3)).toEqual([])
  })

  it('returns empty array for size <= 0', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([])
    expect(chunk([1, 2, 3], -1)).toEqual([])
  })

  it('handles exact division', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
  })
})

describe('sortBy', () => {
  it('sorts by a single numeric criterion', () => {
    const items = [{ age: 30 }, { age: 20 }, { age: 25 }]
    const result = sortBy(items, x => x.age)
    expect(result.map(x => x.age)).toEqual([20, 25, 30])
  })

  it('sorts by a single string criterion', () => {
    const items = [{ name: 'c' }, { name: 'a' }, { name: 'b' }]
    const result = sortBy(items, x => x.name)
    expect(result.map(x => x.name)).toEqual(['a', 'b', 'c'])
  })

  it('sorts by multiple criteria', () => {
    const items = [
      { cat: 'a', val: 2 },
      { cat: 'a', val: 1 },
      { cat: 'b', val: 1 },
    ]
    const result = sortBy(items, x => x.cat, x => x.val)
    expect(result.map(x => x.val)).toEqual([1, 2, 1])
  })

  it('does not mutate original array', () => {
    const items = [3, 1, 2]
    const result = sortBy(items, x => x)
    expect(result).not.toBe(items)
    expect(items).toEqual([3, 1, 2])
  })
})

describe('orderBy', () => {
  it('sorts ascending by default', () => {
    const items = [{ val: 3 }, { val: 1 }, { val: 2 }]
    const result = orderBy(items, x => x.val)
    expect(result.map(x => x.val)).toEqual([1, 2, 3])
  })

  it('sorts descending', () => {
    const items = [{ val: 3 }, { val: 1 }, { val: 2 }]
    const result = orderBy(items, x => x.val, 'desc')
    expect(result.map(x => x.val)).toEqual([3, 2, 1])
  })
})

describe('uniqueBy', () => {
  it('returns unique elements by key function', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 1, name: 'c' },
    ]
    const result = uniqueBy(items, x => x.id)
    expect(result).toHaveLength(2)
  })
})

describe('flatten', () => {
  it('flattens one level', () => {
    expect(flatten([[1, 2], [3], [4, 5]])).toEqual([1, 2, 3, 4, 5])
  })

  it('returns empty array for empty input', () => {
    expect(flatten([])).toEqual([])
  })
})

describe('uniq', () => {
  it('removes duplicate primitive values', () => {
    expect(uniq([1, 2, 2, 3, 1, 4])).toEqual([1, 2, 3, 4])
  })

  it('returns empty array for empty input', () => {
    expect(uniq([])).toEqual([])
  })

  it('preserves order of first occurrence', () => {
    expect(uniq(['b', 'a', 'b', 'c'])).toEqual(['b', 'a', 'c'])
  })
})

describe('first', () => {
  it('returns first element', () => {
    expect(first([1, 2, 3])).toBe(1)
  })

  it('returns undefined for empty array', () => {
    expect(first([])).toBeUndefined()
  })
})

describe('last', () => {
  it('returns last element', () => {
    expect(last([1, 2, 3])).toBe(3)
  })

  it('returns undefined for empty array', () => {
    expect(last([])).toBeUndefined()
  })
})

describe('isEmpty', () => {
  it('returns true for empty array', () => {
    expect(isEmpty([])).toBe(true)
  })

  it('returns false for non-empty array', () => {
    expect(isEmpty([1, 2])).toBe(false)
  })

  it('returns true for empty string', () => {
    expect(isEmpty('')).toBe(true)
  })

  it('returns false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false)
  })

  it('returns true for empty object', () => {
    expect(isEmpty({})).toBe(true)
  })

  it('returns false for non-empty object', () => {
    expect(isEmpty({ a: 1 })).toBe(false)
  })

  it('returns true for empty Map', () => {
    expect(isEmpty(new Map())).toBe(true)
  })

  it('returns true for empty Set', () => {
    expect(isEmpty(new Set())).toBe(true)
  })

  it('returns false for non-empty Set', () => {
    expect(isEmpty(new Set([1]))).toBe(false)
  })

  it('returns false for non-object non-collection values', () => {
    expect(isEmpty(42)).toBe(false)
    expect(isEmpty(true)).toBe(false)
    expect(isEmpty(null)).toBe(true)
  })
})
