import { describe, it, expect } from 'vitest'
import { deepEqual, pipe, compose } from '../src/core/index.js'
import { deepGet, deepSet } from '../src/collection/index.js'
import { formatBytes, randomString, randomBoolean, pluralize } from '../src/string/index.js'
import { hexToRgb, rgbToHex, lighten, darken, contrastRatio, meetsWCAG } from '../src/color/index.js'

describe('deepEqual', () => {
  it('primitives', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(true, true)).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(undefined, undefined)).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'b')).toBe(false)
    expect(deepEqual(1, '1')).toBe(false)
  })
  it('objects', () => {
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
  })
  it('nested objects', () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
  })
  it('arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
  })
  it('Date', () => {
    expect(deepEqual(new Date(2024, 0, 1), new Date(2024, 0, 1))).toBe(true)
    expect(deepEqual(new Date(2024, 0, 1), new Date(2024, 0, 2))).toBe(false)
  })
  it('RegExp', () => {
    expect(deepEqual(/test/gi, /test/gi)).toBe(true)
    expect(deepEqual(/test/g, /test/i)).toBe(false)
  })
  it('Map', () => {
    expect(deepEqual(new Map([['a', 1]]), new Map([['a', 1]]))).toBe(true)
    expect(deepEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false)
  })
  it('Set', () => {
    expect(deepEqual(new Set([1, 2]), new Set([1, 2]))).toBe(true)
    expect(deepEqual(new Set([1]), new Set([1, 2]))).toBe(false)
  })
  it('NaN and -0', () => {
    expect(deepEqual(NaN, NaN)).toBe(true) // Object.is handles this
    expect(deepEqual(0, -0)).toBe(false) // Object.is distinguishes
  })
})

describe('pipe / compose', () => {
  it('pipe: basic', () => {
    const add1 = (x: number) => x + 1
    const double = (x: number) => x * 2
    expect(pipe(3, add1, double)).toBe(8)
  })
  it('pipe: single function', () => {
    expect(pipe(5, (x: number) => x * 2)).toBe(10)
  })
  it('compose: basic', () => {
    const add1 = (x: number) => x + 1
    const double = (x: number) => x * 2
    const fn = compose(double, add1)
    expect(fn(3)).toBe(8) // (3+1)*2
  })
  it('compose: single function', () => {
    const fn = compose((x: number) => x * 2)
    expect(fn(5)).toBe(10)
  })
})

describe('deepGet', () => {
  it('gets nested value', () => expect(deepGet({ a: { b: 2 } }, 'a.b')).toBe(2))
  it('returns default for missing', () => expect(deepGet({ a: 1 }, 'b.c', 'def')).toBe('def'))
  it('handles null intermediate', () => expect(deepGet({ a: null }, 'a.b')).toBeUndefined())
  it('gets top-level key', () => expect(deepGet({ x: 10 }, 'x')).toBe(10))
})

describe('deepSet', () => {
  it('sets nested value', () => {
    expect(deepSet({ a: { b: 2 } }, 'a.b', 3)).toEqual({ a: { b: 3 } })
  })
  it('creates intermediate objects', () => {
    expect(deepSet({}, 'a.b.c', 1)).toEqual({ a: { b: { c: 1 } } })
  })
  it('does not mutate original', () => {
    const obj = { a: 1 }
    const result = deepSet(obj, 'b', 2)
    expect(obj).toEqual({ a: 1 })
    expect(result).toEqual({ a: 1, b: 2 })
  })
})

describe('formatBytes', () => {
  it('formats bytes', () => expect(formatBytes(0)).toBe('0 B'))
  it('formats KB', () => expect(formatBytes(1024)).toBe('1 KB'))
  it('formats MB', () => expect(formatBytes(1048576)).toBe('1 MB'))
  it('formats GB', () => expect(formatBytes(1073741824)).toBe('1 GB'))
  it('formats decimal', () => expect(formatBytes(1536)).toBe('1.5 KB'))
  it('handles negative', () => expect(formatBytes(-1)).toBe('0 B'))
  it('handles Infinity', () => expect(formatBytes(Infinity)).toBe('0 B'))
})

describe('randomString', () => {
  it('generates correct length', () => expect(randomString(10)).toHaveLength(10))
  it('default length is 16', () => expect(randomString()).toHaveLength(16))
  it('only alphanumeric', () => expect(randomString(100)).toMatch(/^[a-zA-Z0-9]+$/))
  it('generates different values', () => expect(randomString()).not.toBe(randomString()))
})

describe('randomBoolean', () => {
  it('returns boolean', () => expect(typeof randomBoolean()).toBe('boolean'))
  it('eventually returns both values', () => {
    const vals = new Set(Array.from({ length: 100 }, () => randomBoolean()))
    expect(vals.has(true) && vals.has(false)).toBe(true)
  })
})

describe('pluralize', () => {
  it('returns singular for count 1', () => expect(pluralize(1, 'apple')).toBe('apple'))
  it('adds s for plural', () => expect(pluralize(3, 'apple')).toBe('apples'))
  it('adds es for s/x/z/ch/sh', () => {
    expect(pluralize(2, 'box')).toBe('boxes')
    expect(pluralize(2, 'bus')).toBe('buses')
    expect(pluralize(2, 'buzz')).toBe('buzzes')
    expect(pluralize(2, 'church')).toBe('churches')
  })
  it('ies for consonant + y', () => expect(pluralize(2, 'berry')).toBe('berries'))
  it('s for vowel + y', () => expect(pluralize(2, 'boy')).toBe('boys'))
})

describe('color utilities', () => {
  it('hexToRgb: red', () => expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 }))
  it('hexToRgb: shorthand #f00', () => expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 }))
  it('hexToRgb: invalid returns null', () => expect(hexToRgb('#xyz')).toBeNull())
  it('hexToRgb: short returns null', () => expect(hexToRgb('#ff')).toBeNull())
  it('rgbToHex: red', () => expect(rgbToHex(255, 0, 0)).toBe('#ff0000'))
  it('rgbToHex: orange', () => expect(rgbToHex(255, 136, 0)).toBe('#ff8800'))
  it('rgbToHex: clamps values', () => expect(rgbToHex(300, -10, 128)).toBe('#ff0080'))
  it('lighten: 20%', () => expect(lighten('#ff0000', 20)).toBe('#ff3333'))
  it('lighten: 100% returns white', () => expect(lighten('#ff0000', 100)).toBe('#ffffff'))
  it('darken: 20%', () => expect(darken('#ff0000', 20)).toBe('#cc0000'))
  it('darken: 100% returns black', () => expect(darken('#ff0000', 100)).toBe('#000000'))
  it('contrastRatio: black on white', () => expect(contrastRatio('#000000', '#ffffff')).toBe(21))
  it('contrastRatio: same colors', () => expect(contrastRatio('#ff0000', '#ff0000')).toBe(1))
  it('meetsWCAG: AA threshold', () => {
    expect(meetsWCAG('#000000', '#ffffff')).toBe(true)
    expect(meetsWCAG('#999999', '#ffffff')).toBe(false)
  })
  it('meetsWCAG: AAA threshold', () => {
    expect(meetsWCAG('#000000', '#ffffff', 'AAA')).toBe(true)
  })
})
