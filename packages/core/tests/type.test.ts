import { describe, it, expect } from 'vitest'
import {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  isDate,
  isRegExp,
  isMap,
  isSet,
  isPromise,
  isNull,
  isUndefined,
  isNil,
  isEmpty,
  assertDefined,
  assertType,
  ensureArray,
  castArray,
  getType,
} from '../src/type/index.js'

describe('isString', () => {
  it('returns true for strings', () => {
    expect(isString('hello')).toBe(true)
    expect(isString('')).toBe(true)
  })

  it('returns false for non-strings', () => {
    expect(isString(42)).toBe(false)
    expect(isString(null)).toBe(false)
    expect(isString(undefined)).toBe(false)
    expect(isString(true)).toBe(false)
    expect(isString({})).toBe(false)
  })
})

describe('isNumber', () => {
  it('returns true for finite numbers', () => {
    expect(isNumber(42)).toBe(true)
    expect(isNumber(0)).toBe(true)
    expect(isNumber(-3.14)).toBe(true)
  })

  it('returns false for NaN, Infinity, and non-numbers', () => {
    expect(isNumber(NaN)).toBe(false)
    expect(isNumber(Infinity)).toBe(false)
    expect(isNumber('42')).toBe(false)
    expect(isNumber(null)).toBe(false)
  })
})

describe('isBoolean', () => {
  it('returns true for booleans', () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
  })

  it('returns false for non-booleans', () => {
    expect(isBoolean(1)).toBe(false)
    expect(isBoolean('true')).toBe(false)
    expect(isBoolean(null)).toBe(false)
  })
})

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
  })

  it('returns false for null, arrays, and other types', () => {
    expect(isObject(null)).toBe(false)
    expect(isObject([1, 2])).toBe(false)
    expect(isObject('hello')).toBe(false)
    expect(isObject(new Date())).toBe(true)
    expect(isObject(new Map())).toBe(true)
  })
})

describe('isArray', () => {
  it('returns true for arrays', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 2])).toBe(true)
  })

  it('returns false for non-arrays', () => {
    expect(isArray({})).toBe(false)
    expect(isArray(null)).toBe(false)
    expect(isArray('string')).toBe(false)
  })
})

describe('isFunction', () => {
  it('returns true for functions', () => {
    expect(isFunction(() => {})).toBe(true)
    expect(isFunction(function () {})).toBe(true)
    expect(isFunction(async () => {})).toBe(true)
  })

  it('returns false for non-functions', () => {
    expect(isFunction({})).toBe(false)
    expect(isFunction(null)).toBe(false)
  })
})

describe('isDate', () => {
  it('returns true for valid Date objects', () => {
    expect(isDate(new Date())).toBe(true)
    expect(isDate(new Date('2024-01-15'))).toBe(true)
  })

  it('returns false for invalid Date and non-Date values', () => {
    expect(isDate(new Date('invalid'))).toBe(false)
    expect(isDate('2024-01-15')).toBe(false)
    expect(isDate(null)).toBe(false)
  })
})

describe('isRegExp', () => {
  it('returns true for RegExp', () => {
    expect(isRegExp(/test/)).toBe(true)
    expect(isRegExp(new RegExp('test'))).toBe(true)
  })

  it('returns false for non-RegExp', () => {
    expect(isRegExp('/test/')).toBe(false)
    expect(isRegExp(null)).toBe(false)
  })
})

describe('isMap', () => {
  it('returns true for Map', () => {
    expect(isMap(new Map())).toBe(true)
  })

  it('returns false for non-Map', () => {
    expect(isMap({})).toBe(false)
    expect(isMap(new Set())).toBe(false)
  })
})

describe('isSet', () => {
  it('returns true for Set', () => {
    expect(isSet(new Set())).toBe(true)
  })

  it('returns false for non-Set', () => {
    expect(isSet([])).toBe(false)
    expect(isSet(new Map())).toBe(false)
  })
})

describe('isPromise', () => {
  it('returns true for Promise', () => {
    expect(isPromise(Promise.resolve())).toBe(true)
  })

  it('returns false for non-Promise', () => {
    expect(isPromise({ then: () => {} })).toBe(false)
    expect(isPromise(null)).toBe(false)
  })
})

describe('isNull', () => {
  it('returns true for null', () => {
    expect(isNull(null)).toBe(true)
  })

  it('returns false for non-null', () => {
    expect(isNull(undefined)).toBe(false)
    expect(isNull(0)).toBe(false)
  })
})

describe('isUndefined', () => {
  it('returns true for undefined', () => {
    expect(isUndefined(undefined)).toBe(true)
  })

  it('returns false for non-undefined', () => {
    expect(isUndefined(null)).toBe(false)
    expect(isUndefined(0)).toBe(false)
  })
})

describe('isNil', () => {
  it('returns true for null and undefined', () => {
    expect(isNil(null)).toBe(true)
    expect(isNil(undefined)).toBe(true)
  })

  it('returns false for other values', () => {
    expect(isNil(0)).toBe(false)
    expect(isNil('')).toBe(false)
    expect(isNil(false)).toBe(false)
  })
})

describe('isEmpty', () => {
  it('returns true for null/undefined', () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
  })

  it('returns true for empty string', () => {
    expect(isEmpty('')).toBe(true)
  })

  it('returns false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false)
  })

  it('returns true for empty array', () => {
    expect(isEmpty([])).toBe(true)
  })

  it('returns false for non-empty array', () => {
    expect(isEmpty([1])).toBe(false)
  })

  it('returns true for empty object', () => {
    expect(isEmpty({})).toBe(true)
  })

  it('returns false for non-empty object', () => {
    expect(isEmpty({ a: 1 })).toBe(false)
  })

  it('returns true for empty Map/Set', () => {
    expect(isEmpty(new Map())).toBe(true)
    expect(isEmpty(new Set())).toBe(true)
  })

  it('returns false for number', () => {
    expect(isEmpty(0)).toBe(false)
    expect(isEmpty(42)).toBe(false)
  })
})

describe('assertDefined', () => {
  it('passes when value is defined', () => {
    expect(() => assertDefined(42)).not.toThrow()
    expect(() => assertDefined('hello')).not.toThrow()
    expect(() => assertDefined(false)).not.toThrow()
    expect(() => assertDefined(0)).not.toThrow()
    expect(() => assertDefined('')).not.toThrow()
  })

  it('throws when value is null or undefined', () => {
    expect(() => assertDefined(null)).toThrow('Expected value to be defined')
    expect(() => assertDefined(undefined)).toThrow('Expected value to be defined')
  })

  it('uses custom error message', () => {
    expect(() => assertDefined(null, 'Custom error')).toThrow('Custom error')
  })
})

describe('assertType', () => {
  it('passes when value matches guard', () => {
    expect(() => assertType('hello', isString)).not.toThrow()
  })

  it('throws when value does not match guard', () => {
    expect(() => assertType(42, isString)).toThrow('Value does not match expected type')
  })

  it('uses custom error message', () => {
    expect(() => assertType(42, isString, 'Must be string')).toThrow('Must be string')
  })
})

describe('ensureArray', () => {
  it('wraps non-array value in an array', () => {
    expect(ensureArray(42)).toEqual([42])
    expect(ensureArray('hello')).toEqual(['hello'])
  })

  it('returns array as-is', () => {
    const arr = [1, 2, 3]
    expect(ensureArray(arr)).toBe(arr)
  })

  it('handles null and undefined', () => {
    expect(ensureArray(null)).toEqual([null])
    expect(ensureArray(undefined)).toEqual([undefined])
  })
})

describe('castArray', () => {
  it('behaves like ensureArray', () => {
    expect(castArray(42)).toEqual([42])
    expect(castArray([1, 2])).toEqual([1, 2])
  })
})

describe('getType', () => {
  it('returns correct type strings', () => {
    expect(getType('hello')).toBe('string')
    expect(getType(42)).toBe('number')
    expect(getType(true)).toBe('boolean')
    expect(getType([])).toBe('array')
    expect(getType({})).toBe('object')
    expect(getType(() => {})).toBe('function')
    expect(getType(new Date())).toBe('date')
    expect(getType(/test/)).toBe('regexp')
    expect(getType(new Map())).toBe('map')
    expect(getType(new Set())).toBe('set')
    expect(getType(Promise.resolve())).toBe('promise')
    expect(getType(null)).toBe('null')
    expect(getType(undefined)).toBe('undefined')
    expect(getType(NaN)).toBe('nan')
    expect(getType(Infinity)).toBe('infinity')
  })
})
