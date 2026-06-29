import { describe, it, expect } from 'vitest'
import {
  pickBy,
  omitBy,
  mapKeys,
  mapValues,
  invert,
  invertBy,
  toPairs,
  fromPairs,
  hasPath,
  unset,
  mergeWith,
  defaults,
  defaultsDeep,
  deepFreeze,
  at,
  renameKeys,
  diff,
  fromKeys,
} from '../src/collection/index.js'

// ─── pickBy ───────────────────────────────────────────────

describe('pickBy', () => {
  it('picks keys where predicate returns true', () => {
    const obj = { a: 1, b: 'hello', c: 3, d: 'world' }
    const result = pickBy(obj, v => typeof v === 'number')
    expect(result).toEqual({ a: 1, c: 3 })
  })

  it('passes both value and key to predicate', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = pickBy(obj, (_v, k) => k === 'a' || k === 'c')
    expect(result).toEqual({ a: 1, c: 3 })
  })

  it('returns empty object when nothing matches', () => {
    const obj = { a: 1, b: 2 }
    expect(pickBy(obj, () => false)).toEqual({})
  })

  it('returns a new object (not mutated)', () => {
    const obj = { a: 1, b: 2 }
    const result = pickBy(obj, v => v === 1)
    expect(result).not.toBe(obj)
    expect(obj).toEqual({ a: 1, b: 2 })
  })
})

// ─── omitBy ───────────────────────────────────────────────

describe('omitBy', () => {
  it('omits keys where predicate returns true', () => {
    const obj = { a: 1, b: 'hello', c: 3, d: 'world' }
    const result = omitBy(obj, v => typeof v === 'number')
    expect(result).toEqual({ b: 'hello', d: 'world' })
  })

  it('passes both value and key to predicate', () => {
    const obj = { a: 'x', b: 'y', c: 'z' }
    const result = omitBy(obj, (_v, k) => k === 'b')
    expect(result).toEqual({ a: 'x', c: 'z' })
  })

  it('returns full object when nothing matches predicate', () => {
    const obj = { a: 1, b: 2 }
    expect(omitBy(obj, () => false)).toEqual({ a: 1, b: 2 })
  })

  it('returns empty object when everything is omitted', () => {
    const obj = { a: 1, b: 2 }
    expect(omitBy(obj, () => true)).toEqual({})
  })
})

// ─── mapKeys ──────────────────────────────────────────────

describe('mapKeys', () => {
  it('transforms keys using mapper function', () => {
    const obj = { a: 1, b: 2 }
    const result = mapKeys(obj, k => k.toUpperCase())
    expect(result).toEqual({ A: 1, B: 2 })
  })

  it('passes both key and value to mapper', () => {
    const obj = { a: 1, b: 2 }
    const result = mapKeys(obj, (k, v) => `${k}${v}`)
    expect(result).toEqual({ a1: 1, b2: 2 })
  })

  it('skips proto-polluting keys', () => {
    const obj = { a: 1 }
    const result = mapKeys(obj, () => '__proto__')
    expect(result).toEqual({})
  })

  it('returns empty object for empty input', () => {
    expect(mapKeys({}, k => k)).toEqual({})
  })
})

// ─── mapValues ────────────────────────────────────────────

describe('mapValues', () => {
  it('transforms values using mapper function', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = mapValues(obj, v => v * 2)
    expect(result).toEqual({ a: 2, b: 4, c: 6 })
  })

  it('passes both value and key to mapper', () => {
    const obj = { a: 1, b: 2 }
    const result = mapValues(obj, (v, k) => `${k}:${v}`)
    expect(result).toEqual({ a: 'a:1', b: 'b:2' })
  })

  it('returns empty object for empty input', () => {
    expect(mapValues({}, v => v)).toEqual({})
  })

  it('does not mutate the original object', () => {
    const obj = { a: 1, b: 2 }
    mapValues(obj, v => v * 10)
    expect(obj).toEqual({ a: 1, b: 2 })
  })
})

// ─── invert ───────────────────────────────────────────────

describe('invert', () => {
  it('swaps keys and values', () => {
    const obj = { a: 'x', b: 'y' } as const
    const result = invert(obj)
    expect(result).toEqual({ x: 'a', y: 'b' })
  })

  it('last duplicate value wins', () => {
    const obj = { a: 'x', b: 'y', c: 'x' } as const
    const result = invert(obj)
    expect(result).toEqual({ x: 'c', y: 'b' })
  })

  it('returns empty object for empty input', () => {
    expect(invert({})).toEqual({})
  })

  it('handles numeric values as keys', () => {
    const obj = { a: 1, b: 2 } as const
    const result = invert(obj)
    expect(result).toEqual({ 1: 'a', 2: 'b' })
  })
})

// ─── invertBy ─────────────────────────────────────────────

describe('invertBy', () => {
  it('groups keys by stringified values', () => {
    const obj = { a: 1, b: 2, c: 1 }
    const result = invertBy(obj)
    expect(result).toEqual({ 1: ['a', 'c'], 2: ['b'] })
  })

  it('groups keys by mapped values when a mapper is provided', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = invertBy(obj, v => ((v as number) % 2 === 0 ? 'even' : 'odd'))
    expect(result).toEqual({ odd: ['a', 'c'], even: ['b'] })
  })

  it('returns empty object for empty input', () => {
    expect(invertBy({})).toEqual({})
  })

  it('handles string values', () => {
    const obj = { a: 'apple', b: 'banana', c: 'apple' }
    const result = invertBy(obj)
    expect(result).toEqual({ apple: ['a', 'c'], banana: ['b'] })
  })
})

// ─── toPairs ──────────────────────────────────────────────

describe('toPairs', () => {
  it('converts object to array of key-value pairs', () => {
    const obj = { a: 1, b: 2 }
    const result = toPairs(obj)
    expect(result).toEqual([['a', 1], ['b', 2]])
  })

  it('returns empty array for empty object', () => {
    expect(toPairs({})).toEqual([])
  })

  it('handles mixed value types', () => {
    const obj = { n: 42, s: 'hello', b: true, nll: null }
    const result = toPairs(obj)
    expect(result).toContainEqual(['n', 42])
    expect(result).toContainEqual(['s', 'hello'])
    expect(result).toContainEqual(['b', true])
    expect(result).toContainEqual(['nll', null])
  })
})

// ─── fromPairs ────────────────────────────────────────────

describe('fromPairs', () => {
  it('converts pairs array to object', () => {
    const pairs: Array<[string, unknown]> = [['a', 1], ['b', 2]]
    expect(fromPairs(pairs)).toEqual({ a: 1, b: 2 })
  })

  it('rejects proto-polluting keys', () => {
    const pairs: Array<[string, unknown]> = [['__proto__', 'polluted'], ['a', 1]]
    const result = fromPairs(pairs)
    expect(result).toEqual({ a: 1 })
    expect(Object.keys(result)).not.toContain('__proto__')
  })

  it('rejects constructor keys', () => {
    const pairs: Array<[string, unknown]> = [['constructor', { polluted: true }], ['a', 1]]
    const result = fromPairs(pairs)
    expect(result).toEqual({ a: 1 })
  })

  it('rejects prototype keys', () => {
    const pairs: Array<[string, unknown]> = [['prototype', 'polluted'], ['a', 1]]
    const result = fromPairs(pairs)
    expect(result).toEqual({ a: 1 })
  })

  it('returns empty object for empty array', () => {
    expect(fromPairs([])).toEqual({})
  })

  it('later pairs overwrite earlier ones', () => {
    const pairs: Array<[string, unknown]> = [['a', 1], ['a', 99]]
    expect(fromPairs(pairs)).toEqual({ a: 99 })
  })
})

// ─── hasPath ──────────────────────────────────────────────

describe('hasPath', () => {
  it('returns true for existing nested property', () => {
    const obj = { a: { b: { c: 42 } } }
    expect(hasPath(obj, 'a.b.c')).toBe(true)
  })

  it('returns false for non-existent nested property', () => {
    const obj = { a: { b: 2 } }
    expect(hasPath(obj, 'a.c')).toBe(false)
  })

  it('returns false when intermediate is null', () => {
    const obj = { a: null }
    expect(hasPath(obj, 'a.b')).toBe(false)
  })

  it('returns true for top-level property', () => {
    const obj = { x: 1 }
    expect(hasPath(obj, 'x')).toBe(true)
  })

  it('returns false for non-existent top-level property', () => {
    const obj = { x: 1 }
    expect(hasPath(obj, 'y')).toBe(false)
  })

  it('returns false when obj is null/undefined', () => {
    expect(hasPath(null, 'a')).toBe(false)
    expect(hasPath(undefined, 'a')).toBe(false)
  })
})

// ─── unset ────────────────────────────────────────────────

describe('unset', () => {
  it('removes a nested property', () => {
    const obj = { a: { b: 2, c: 3 } }
    const result = unset(obj, 'a.b')
    expect(result).toEqual({ a: { c: 3 } })
  })

  it('does not mutate the original object', () => {
    const obj = { a: { b: 2, c: 3 } }
    unset(obj, 'a.b')
    expect(obj).toEqual({ a: { b: 2, c: 3 } })
  })

  it('returns copy of object when path does not exist', () => {
    const obj = { a: { b: 2 } }
    const result = unset(obj, 'x.y')
    expect(result).toEqual({ a: { b: 2 } })
    expect(result).not.toBe(obj)
  })

  it('removes top-level property', () => {
    const obj = { a: 1, b: 2 }
    expect(unset(obj, 'a')).toEqual({ b: 2 })
  })

  it('protects against proto-pollution in path', () => {
    const obj = { a: 1 }
    const result = unset(obj, '__proto__.polluted')
    expect(result).toEqual({ a: 1 })
    expect(Object.keys(result)).not.toContain('__proto__')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('handles deeply nested path', () => {
    const obj = { a: { b: { c: 1, d: 2 } } }
    const result = unset(obj, 'a.b.c')
    expect(result).toEqual({ a: { b: { d: 2 } } })
  })
})

// ─── mergeWith ────────────────────────────────────────────

describe('mergeWith', () => {
  it('merges objects with custom array merge strategy', () => {
    const target = { a: [1], b: 2 }
    const source = { a: [2], c: 3 }
    const result = mergeWith(
      target as Record<string, unknown>,
      source,
      (t, s) => (Array.isArray(t) ? [...t, ...(s as unknown[])] : s)
    )
    expect(result).toEqual({ a: [1, 2], b: 2, c: 3 })
  })

  it('uses custom function for conflicting keys', () => {
    const target = { a: 5, b: 10 }
    const source = { a: 3, c: 7 }
    const result = mergeWith(
      target as Record<string, unknown>,
      source,
      (t, s) => (t as number) + (s as number)
    )
    expect(result).toEqual({ a: 8, b: 10, c: 7 })
  })

  it('protects against proto-pollution', () => {
    const target = { a: 1 }
    const source = { __proto__: { polluted: true } } as Record<string, unknown>
    const result = mergeWith(target, source, () => 'x')
    expect((result as Record<string, unknown>).a).toBe(1)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('does not mutate the original target', () => {
    const target = { a: 1 }
    const source = { b: 2 }
    mergeWith(target, source, (t, s) => s)
    expect(target).toEqual({ a: 1 })
  })
})

// ─── defaults ─────────────────────────────────────────────

describe('defaults', () => {
  it('fills undefined values from source', () => {
    const target = { a: 1, b: undefined }
    const source = { a: 99, b: 2, c: 3 }
    expect(defaults(target, source)).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('does not overwrite defined values', () => {
    const target = { a: 1, b: 2 }
    const source = { a: 99, b: 100 }
    expect(defaults(target, source)).toEqual({ a: 1, b: 2 })
  })

  it('accepts multiple sources (left-to-right)', () => {
    const target = { a: undefined, b: undefined }
    const source1 = { a: 1 }
    const source2 = { a: 99, b: 2 }
    expect(defaults(target, source1, source2)).toEqual({ a: 1, b: 2 })
  })

  it('protects against proto-pollution in sources', () => {
    const target = { a: 1 } as Record<string, unknown>
    const source = { __proto__: { polluted: true } } as Record<string, unknown>
    const result = defaults(target, source)
    expect(Object.keys(result)).not.toContain('__proto__')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('does not mutate the original target', () => {
    const target = { a: undefined }
    defaults(target, { a: 42 })
    expect(target).toEqual({ a: undefined })
  })
})

// ─── defaultsDeep ─────────────────────────────────────────

describe('defaultsDeep', () => {
  it('recursively fills undefined values', () => {
    const target = { a: { x: 1 } }
    const source = { a: { x: 99, y: 2 }, b: 3 }
    const result = defaultsDeep(target, source)
    expect(result).toEqual({ a: { x: 1, y: 2 }, b: 3 })
  })

  it('overwrites entire non-object values', () => {
    const target = { a: { b: 1, c: 2 } }
    const source = { a: { b: 99, d: 3 }, e: 4 }
    const result = defaultsDeep(target, source)
    expect(result).toEqual({ a: { b: 1, c: 2, d: 3 }, e: 4 })
  })

  it('does not merge arrays', () => {
    const target = { a: [1, 2] }
    const source = { a: [3, 4] }
    const result = defaultsDeep(target, source)
    expect(result).toEqual({ a: [1, 2] })
  })

  it('handles null values in target', () => {
    const target = { a: null }
    const source = { a: { b: 1 } }
    const result = defaultsDeep(target, source)
    expect(result).toEqual({ a: null })
  })

  it('protects against proto-pollution', () => {
    const target = { a: 1 } as Record<string, unknown>
    const source = { __proto__: { polluted: true } } as Record<string, unknown>
    const result = defaultsDeep(target, source)
    expect(Object.keys(result)).not.toContain('__proto__')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('does not mutate the original object', () => {
    const target = { a: { x: 1 } }
    defaultsDeep(target, { a: { y: 2 } })
    expect(target).toEqual({ a: { x: 1 } })
  })
})

// ─── deepFreeze ───────────────────────────────────────────

describe('deepFreeze', () => {
  it('freezes the top-level object', () => {
    const obj = { a: 1, b: 2 }
    const frozen = deepFreeze(obj)
    expect(Object.isFrozen(frozen)).toBe(true)
  })

  it('recursively freezes nested objects', () => {
    const obj = { a: { b: { c: 42 } } }
    const frozen = deepFreeze(obj)
    expect(Object.isFrozen(frozen)).toBe(true)
    expect(Object.isFrozen(frozen.a)).toBe(true)
    expect(Object.isFrozen((frozen.a as Record<string, unknown>).b)).toBe(true)
  })

  it('does not freeze non-object values', () => {
    expect(deepFreeze(42)).toBe(42)
    expect(deepFreeze('hello')).toBe('hello')
    expect(deepFreeze(null)).toBe(null)
    expect(deepFreeze(undefined)).toBe(undefined)
  })

  it('freezes arrays', () => {
    const arr = [1, [2, 3]]
    const frozen = deepFreeze(arr)
    expect(Object.isFrozen(frozen)).toBe(true)
    expect(Object.isFrozen(frozen[1] as unknown[])).toBe(true)
  })

  it('prevents property mutation (strict mode)', () => {
    const obj = deepFreeze({ a: 1 })
    expect(() => {
      'use strict'
      ;(obj as Record<string, unknown>).a = 99
    }).toThrow()
  })
})

// ─── at ───────────────────────────────────────────────────

describe('at', () => {
  it('gets values at multiple dot-separated paths', () => {
    const obj = { a: { b: 1, c: 2 } }
    expect(at(obj, ['a.b', 'a.c'])).toEqual([1, 2])
  })

  it('returns undefined for non-existent paths', () => {
    const obj = { a: 1 }
    expect(at(obj, ['b', 'c.d'])).toEqual([undefined, undefined])
  })

  it('returns empty array for empty paths input', () => {
    const obj = { a: 1 }
    expect(at(obj, [])).toEqual([])
  })

  it('handles mixed existing and non-existing paths', () => {
    const obj = { a: 1, b: { c: 2 } }
    expect(at(obj, ['a', 'b.c', 'x'])).toEqual([1, 2, undefined])
  })
})

// ─── renameKeys ───────────────────────────────────────────

describe('renameKeys', () => {
  it('renames keys according to the provided map', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = renameKeys(obj, { a: 'x', b: 'y' })
    expect(result).toEqual({ x: 1, y: 2, c: 3 })
  })

  it('preserves keys not in the key map', () => {
    const obj = { a: 1, b: 2 }
    const result = renameKeys(obj, {})
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('protects against proto-polluting target key names', () => {
    const obj = { a: 1 }
    const result = renameKeys(obj, { a: '__proto__' })
    expect(result).toEqual({})
  })

  it('does not mutate the original object', () => {
    const obj = { a: 1, b: 2 }
    renameKeys(obj, { a: 'x' })
    expect(obj).toEqual({ a: 1, b: 2 })
  })

  it('handles remapping multiple keys to the same new key (last wins)', () => {
    const obj = { a: 1, b: 2 }
    const result = renameKeys(obj, { a: 'x', b: 'x' })
    expect(result).toEqual({ x: 2 })
  })
})

// ─── diff ─────────────────────────────────────────────────

describe('diff', () => {
  it('returns keys with differing values', () => {
    const a = { a: 1, b: 2, c: 3 }
    const b = { a: 1, b: 99, d: 4 }
    const result = diff(a, b)
    expect(result).toEqual({ b: 99, c: undefined })
  })

  it('returns empty object for identical objects', () => {
    const a = { a: 1, b: { c: 2 } }
    const b = { a: 1, b: { c: 2 } }
    expect(diff(a, b)).toEqual({})
  })

  it('deep diffs nested objects', () => {
    const a = { a: { x: 1, y: 2 } }
    const b = { a: { x: 1, y: 99 } }
    const result = diff(a, b)
    expect(result).toEqual({ a: { y: 99 } })
  })

  it('marks keys only in first object as undefined', () => {
    const a = { a: 1, b: 2 }
    const b = { a: 1 }
    expect(diff(a, b)).toEqual({ b: undefined })
  })

  it('excludes keys only in second object', () => {
    const a = { a: 1 }
    const b = { a: 1, b: 2 }
    expect(diff(a, b)).toEqual({})
  })

  it('treats arrays as atomic values', () => {
    const a = { items: [1, 2, 3] }
    const b = { items: [1, 2, 3] }
    expect(diff(a, b)).toEqual({})

    const c = { items: [1, 2, 4] }
    expect(diff(a, c)).toEqual({ items: [1, 2, 4] })
  })
})

// ─── fromKeys ─────────────────────────────────────────────

describe('fromKeys', () => {
  it('creates object from keys with a static value', () => {
    const result = fromKeys(['a', 'b', 'c'], 0)
    expect(result).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('creates object from keys with a value function', () => {
    const result = fromKeys(['x', 'y', 'z'], (k, i) => `${k}${i}`)
    expect(result).toEqual({ x: 'x0', y: 'y1', z: 'z2' })
  })

  it('skips proto-polluting keys', () => {
    const result = fromKeys(['__proto__', 'a'], 1)
    expect(result).toEqual({ a: 1 })
    expect(Object.keys(result)).not.toContain('__proto__')
  })

  it('returns empty object for empty keys array', () => {
    expect(fromKeys([], 0)).toEqual({})
  })

  it('handles value function returning different types', () => {
    const result = fromKeys(['a', 'b'], (k, i) => (i === 0 ? 'string' : 42))
    expect(result).toEqual({ a: 'string', b: 42 })
  })
})
