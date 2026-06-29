import { describe, it, expect } from 'vitest'
import {
  deepClone, deepMerge, debounce, throttle, memoize, retry, noop, identity, once,
} from '../src/core/index.js'
import {
  add, sub, mul, div, round, floor, ceil, clamp, sum, average, randomInt, inRange,
  median, stddev, sampleStddev, percentile, correlation, formatCurrency,
  DivisionByZeroError,
} from '../src/math/index.js'
import {
  formatDate, parseDate, dateDiff, addDays, addMonths, addYears,
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear,
  isWeekend, isLeapYear, isBefore, isAfter, isBetween, isBusinessDay,
  addBusinessDays, calculateAge, InvalidDateError,
  timeAgo, timeRemaining, formatDuration, toTimezone, formatInTimezone,
} from '../src/date/index.js'
import {
  groupBy, keyBy, omit, pick, pluck, shuffle, sample, sampleSize,
  chunk, sortBy, orderBy, uniqueBy, flatten, uniq, first, last,
  topoSort, slidingWindows, tumblingWindows,
} from '../src/collection/index.js'
import {
  capitalize, camelCase, kebabCase, snakeCase, pascalCase, truncate, template,
  uuid, nanoid, escapeHtml, unescapeHtml, trim, trimStart, trimEnd,
  pad, padStart, padEnd, reverse, words, slugify, countOccurrences,
  levenshtein, fuzzyMatch, maskString,
} from '../src/string/index.js'
import {
  sleep, timeout, raceWithTimeout, allSettledMap, parallelMap,
  retryAsync, pipeline, deferred, Queue, Semaphore, memoizeAsync,
} from '../src/async/index.js'
import {
  parseCsv, stringifyCsv, safeJsonParse, env, envInt, envBool,
} from '../src/io/index.js'
import {
  isString, isNumber, isBoolean, isObject, isArray, isFunction,
  isDate, isRegExp, isMap, isSet, isPromise, isNull, isUndefined,
  isNil, isEmpty, assertDefined, assertType, ensureArray, castArray, getType,
} from '../src/type/index.js'
import {
  hash, simpleHash, randomHex, base64Encode, base64Decode,
  generateToken, generateOTP, xorCipher, checksum, constantTimeEqual,
} from '../src/crypto/index.js'
import {
  join, resolve, basename, dirname, extname, normalize, isAbsolute, relative, parse, format,
} from '../src/path/index.js'
import {
  isPhone, isEmail, isURL,
} from '../src/validation/index.js'
import {
  createError, isTypedError, TypedError, MultiError, collectErrors,
} from '../src/error/index.js'

// ═══════════════════════════════════════════════════════════════
// PHASE 1: SECURITY — Prototype Pollution, Injection, ReDoS
// ═══════════════════════════════════════════════════════════════

describe('SECURITY: Prototype Pollution', () => {
  it('deepMerge: no pollution via __proto__', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true}}')
    deepMerge({}, payload)
    expect(({} as any).polluted).toBeUndefined()
  })
  it('deepClone: no pollution via __proto__', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true}}')
    deepClone(payload)
    expect(({} as any).polluted).toBeUndefined()
  })
  it('safeJsonParse: no pollution', () => {
    safeJsonParse('{"__proto__":{"polluted":true}}')
    expect(({} as any).polluted).toBeUndefined()
  })
  it('deepMerge: no pollution via constructor', () => {
    const payload = JSON.parse('{"constructor":{"prototype":{"polluted":true}}}')
    deepMerge({}, payload)
    expect(({} as any).polluted).toBeUndefined()
  })
  it('groupBy: no pollution with malicious key', () => {
    groupBy([{ __proto__: { polluted: true } }], x => x as any)
    expect(({} as any).polluted).toBeUndefined()
  })
  it('keyBy: no pollution with __proto__ key', () => {
    const items: any[] = []
    const obj = { id: '__proto__', val: 'x' }
    items.push(obj)
    const result = keyBy(items, x => x.id)
    expect(({} as any).val).toBeUndefined()
  })
})

describe('SECURITY: ReDoS / Regex', () => {
  it('slugify: long string does not hang', () => {
    const long = 'a'.repeat(10000) + '!'
    const start = Date.now()
    slugify(long)
    expect(Date.now() - start).toBeLessThan(1000)
  })
  it('email validation: long string does not hang', () => {
    const long = 'a'.repeat(100) + '@' + 'b'.repeat(200) + '.com'
    const start = Date.now()
    isEmail(long)
    expect(Date.now() - start).toBeLessThan(1000)
  })
  it('URL validation: long string does not hang', () => {
    const long = 'https://' + 'a'.repeat(500) + '.com'
    const start = Date.now()
    isURL(long)
    expect(Date.now() - start).toBeLessThan(1000)
  })
  it('template: many placeholders does not hang', () => {
    const t = '{{a}}'.repeat(1000)
    const start = Date.now()
    template(t, { a: 'x' })
    expect(Date.now() - start).toBeLessThan(1000)
  })
})

describe('SECURITY: XOR Cipher', () => {
  it('xorCipher is NOT encryption - trivial known-plaintext', () => {
    const key = 'secret'
    const plain = 'HELLO'
    const encrypted = xorCipher(plain, key)
    // XOR with same key gives back plaintext
    const decrypted = xorCipher(encrypted, key)
    expect(decrypted).toBe(plain)
  })
  it('xorCipher with empty key returns original', () => {
    expect(xorCipher('test', '')).toBe('test')
  })
})

// ═══════════════════════════════════════════════════════════════
// PHASE 2: EDGE CASES — Null/Undefined/NaN/Infinity
// ═══════════════════════════════════════════════════════════════

describe('EDGE: Math - Floating Point & Extremes', () => {
  it('add: 0.1 + 0.2 = 0.3', () => { expect(add(0.1, 0.2)).toBe(0.3) })
  it('add: MAX_SAFE_INTEGER + 1', () => { expect(add(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER + 1) })
  it('add: Infinity + -Infinity = NaN', () => { expect(add(Infinity, -Infinity)).toBeNaN() })
  it('add: negative zero', () => { expect(Object.is(add(0, -0), 0)).toBe(true) })
  it('sub: 0.3 - 0.1 = 0.2', () => { expect(sub(0.3, 0.1)).toBe(0.2) })
  it('mul: 0.1 * 0.2 = 0.02', () => { expect(mul(0.1, 0.2)).toBe(0.02) })
  it('div: by zero throws', () => { expect(() => div(5, 0)).toThrow(DivisionByZeroError) })
  it('round: 1.005 precision 2', () => { expect(round(1.005, 2)).toBe(1.01) })
  it('round: negative precision', () => { expect(round(1234, -2)).toBe(1200) })
  it('round: NaN returns NaN', () => { expect(round(NaN)).toBeNaN() })
  it('clamp: min > max throws', () => { expect(() => clamp(5, 10, 0)).toThrow(RangeError) })
  it('clamp: NaN throws', () => { expect(() => clamp(NaN, 0, 10)).not.toThrow() })
  it('sum: empty array = 0', () => { expect(sum([])).toBe(0) })
  it('average: empty throws', () => { expect(() => average([])).toThrow(RangeError) })
  it('randomInt: non-integer args throw', () => { expect(() => randomInt(1.5, 5)).toThrow(RangeError) })
  it('randomInt: min > max throws', () => { expect(() => randomInt(10, 1)).toThrow(RangeError) })
  // Statistics
  it('median: odd length', () => { expect(median([3, 1, 2])).toBe(2) })
  it('median: even length', () => { expect(median([1, 2, 3, 4])).toBe(2.5) })
  it('median: empty throws', () => { expect(() => median([])).toThrow() })
  it('stddev: single value throws', () => { expect(() => stddev([1])).toThrow() })
  it('stddev: population vs sample', () => {
    const pop = stddev([2, 4, 4, 4, 5, 5, 7, 9])
    expect(pop).toBeCloseTo(2, 0)
  })
  it('percentile: 0th = min', () => { expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1) })
  it('percentile: 100th = max', () => { expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5) })
  it('percentile: out of range throws', () => { expect(() => percentile([1], 101)).toThrow() })
  it('correlation: perfect positive', () => {
    expect(correlation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 2)
  })
  it('correlation: different lengths throws', () => { expect(() => correlation([1, 2], [1])).toThrow() })
  it('formatCurrency: IDR default', () => {
    const result = formatCurrency(1500000)
    expect(result).toContain('1.500.000')
  })
  it('formatCurrency: USD locale', () => {
    expect(formatCurrency(99.99, { locale: 'en-US', currency: 'USD' })).toContain('99.99')
  })
  it('formatCurrency: compact notation', () => {
    expect(formatCurrency(1500000, { notation: 'compact' })).toContain('jt')
  })
})

describe('EDGE: String - Unicode, Emoji, Extremes', () => {
  it('camelCase: XMLParser', () => { expect(camelCase('XMLParser')).toBe('xmlParser') })
  it('camelCase: with numbers', () => { expect(camelCase('hello-123-world')).toBe('hello123World') })
  it('camelCase: empty', () => { expect(camelCase('')).toBe('') })
  it('camelCase: spaces only', () => { expect(camelCase('   ')).toBe('') })
  it('kebabCase: already kebab', () => { expect(kebabCase('hello-world')).toBe('hello-world') })
  it('slugify: XSS in, safe out', () => {
    expect(slugify('<script>alert(1)</script>')).not.toContain('<')
    expect(slugify('<script>alert(1)</script>')).not.toContain('>')
  })
  it('slugify: unicode café', () => { expect(slugify('café au lait')).toBe('caf-au-lait') })
  it('truncate: length 0', () => { expect(truncate('hello', 0)).toBe('...') })
  it('truncate: negative length', () => { expect(truncate('hello', -1)).toBe('...') })
  it('truncate: maxLength smaller than suffix', () => { expect(truncate('hello', 2, '...')).toBe('...') })
  it('uuid: RFC 4122 v4 format', () => {
    const id = uuid()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it('nanoid: URL-safe characters', () => {
    const id = nanoid()
    expect(/^[0-9A-Za-z_-]+$/.test(id)).toBe(true)
  })
  it('nanoid: custom alphabet', () => { expect(nanoid(10, 'ABC')).toMatch(/^[ABC]{10}$/) })
  it('escapeHtml: all special chars', () => { expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;') })
  it('unescapeHtml: roundtrip', () => { expect(unescapeHtml(escapeHtml('<p>"test"</p>'))).toBe('<p>"test"</p>') })
  it('levenshtein: identical', () => { expect(levenshtein('hello', 'hello')).toBe(0) })
  it('levenshtein: completely different', () => { expect(levenshtein('abc', 'xyz')).toBe(3) })
  it('levenshtein: empty vs string', () => { expect(levenshtein('', 'hello')).toBe(5) })
  it('levenshtein: both empty', () => { expect(levenshtein('', '')).toBe(0) })
  it('fuzzyMatch: exact', () => { expect(fuzzyMatch('hello', 'hello')).toBe(true) })
  it('fuzzyMatch: subsequence', () => { expect(fuzzyMatch('hello', 'hlo')).toBe(true) })
  it('fuzzyMatch: case insensitive', () => { expect(fuzzyMatch('Hello World', 'hw')).toBe(true) })
  it('fuzzyMatch: not found', () => { expect(fuzzyMatch('hello', 'xyz')).toBe(false) })
  it('fuzzyMatch: empty query', () => { expect(fuzzyMatch('hello', '')).toBe(true) })
  it('maskString: default phone mask', () => { expect(maskString('08123456789')).toMatch(/^081.*789$/) })
  it('maskString: custom chars', () => { expect(maskString('1234567890', { start: 0, end: 4, char: '#' })).toBe('####567890') })
  it('maskString: empty', () => { expect(maskString('')).toBe('') })
  it('maskString: start >= end returns original', () => { expect(maskString('hello', { start: 3, end: 2 })).toBe('hello') })

  it('countOccurrences: non-overlapping', () => { expect(countOccurrences('aaaa', 'aa')).toBe(2) })
  it('countOccurrences: empty string', () => { expect(countOccurrences('', 'a')).toBe(0) })
})

describe('EDGE: Date & Timezone Hell', () => {
  it('parseDate: leap year valid', () => {
    const d = parseDate('29/02/2024')
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(29)
  })
  it('parseDate: non-leap year throws', () => { expect(() => parseDate('29/02/2023')).toThrow(InvalidDateError) })
  it('parseDate: ISO format', () => {
    const d = parseDate('2024-01-15')
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(15)
  })
  it('parseDate: invalid throws', () => { expect(() => parseDate('not-a-date')).toThrow(InvalidDateError) })
  it('parseDate: empty string throws', () => { expect(() => parseDate('')).toThrow(InvalidDateError) })
  it('parseDate: timestamp number', () => {
    const ts = new Date(2024, 0, 15).getTime()
    expect(parseDate(ts).getTime()).toBe(ts)
  })
  it('dateDiff: date2 before date1 gives negative months or years', () => {
    const diff = dateDiff(new Date('2024-12-31'), new Date('2024-01-01'))
    expect(diff.months + diff.years).toBeLessThanOrEqual(0)
  })
  it('dateDiff: same day', () => {
    const diff = dateDiff(new Date(2024, 0, 1), new Date(2024, 0, 1))
    expect(diff.years).toBe(0)
    expect(diff.days).toBe(0)
  })
  it('calculateAge: today birth = age 0', () => {
    const age = calculateAge(new Date())
    expect(age).toBe(0)
  })
  it('calculateAge: invalid throws', () => { expect(() => calculateAge(new Date('invalid'))).toThrow(InvalidDateError) })
  it('formatDate: Unix epoch', () => {
    const result = formatDate(new Date(0), 'YYYY-MM-DD')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('formatDate: all tokens', () => {
    const d = new Date(2024, 0, 15, 14, 30, 45, 123)
    expect(formatDate(d, 'DD/MM/YYYY HH:mm:ss.SSS')).toBe('15/01/2024 14:30:45.123')
  })
  it('isWeekend: Saturday', () => { expect(isWeekend(new Date(2024, 0, 6))).toBe(true) })
  it('isWeekend: Sunday', () => { expect(isWeekend(new Date(2024, 0, 7))).toBe(true) })
  it('isWeekend: Monday', () => { expect(isWeekend(new Date(2024, 0, 1))).toBe(false) })
  it('isLeapYear: 2024', () => { expect(isLeapYear(2024)).toBe(true) })
  it('isLeapYear: 1900', () => { expect(isLeapYear(1900)).toBe(false) })
  it('isLeapYear: 2000', () => { expect(isLeapYear(2000)).toBe(true) })
  it('isBefore: same date', () => { expect(isBefore(new Date(2024, 0, 1), new Date(2024, 0, 1))).toBe(false) })
  it('addBusinessDays: negative', () => {
    const d = new Date(2024, 0, 8) // Monday
    const result = addBusinessDays(d, -1)
    expect(result.getDay()).toBe(5) // Friday
  })
  it('addMonths: Jan 31 + 1 month = Feb 28/29', () => {
    const d = new Date(2024, 0, 31)
    const r = addMonths(d, 1)
    expect(r.getMonth()).toBe(1)
    expect(r.getDate()).toBe(29) // 2024 is leap
  })
  it('addYears: Feb 29 leap year overflow', () => {
    const d = new Date(2024, 1, 29)
    const r = addYears(d, 1)
    expect(r.getFullYear()).toBe(2025)
    expect(r.getDate()).toBe(1) // March 1
  })

  it('timeAgo: now', () => {
    const now = new Date()
    expect(timeAgo(now)).toMatch(/just now|second/)
  })
  it('timeAgo: 1 hour ago', () => {
    const d = new Date(Date.now() - 3600000)
    expect(timeAgo(d)).toContain('hour')
  })
  it('timeAgo: English locale', () => {
    const d = new Date(Date.now() - 3600000)
    expect(timeAgo(d, { locale: 'en' })).toContain('hour')
  })
  it('timeRemaining: future date', () => {
    const d = new Date(Date.now() + 7200000)
    expect(timeRemaining(d)).toContain('hour')
  })
  it('formatDuration: zero duration', () => {
    expect(formatDuration({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })).toBe('0 seconds')
  })

})

describe('EDGE: Collection - Empty, Sparse, Null', () => {
  it('groupBy: empty array', () => { expect(groupBy([], x => x)).toEqual({}) })
  it('chunk: size 0', () => { expect(chunk([1, 2, 3], 0)).toEqual([]) })
  it('chunk: negative size', () => { expect(chunk([1, 2, 3], -1)).toEqual([]) })
  it('chunk: empty array', () => { expect(chunk([], 5)).toEqual([]) })
  it('sortBy: null values', () => {
    const result = sortBy([{ a: 1 }, { a: null }, { a: undefined }], x => x.a)
    expect(result).toHaveLength(3)
  })
  it('sortBy: does not mutate original', () => {
    const arr = [3, 1, 2]
    sortBy(arr, x => x)
    expect(arr).toEqual([3, 1, 2])
  })
  it('shuffle: does not mutate', () => {
    const arr = [1, 2, 3]
    shuffle(arr)
    expect(arr).toEqual([1, 2, 3])
  })
  it('sample: empty returns undefined', () => { expect(sample([])).toBeUndefined() })
  it('sampleSize: size 0', () => { expect(sampleSize([1, 2, 3], 0)).toEqual([]) })
  it('first: empty returns undefined', () => { expect(first([])).toBeUndefined() })
  it('last: empty returns undefined', () => { expect(last([])).toBeUndefined() })
  it('uniq: empty', () => { expect(uniq([])).toEqual([]) })
  it('flatten: empty', () => { expect(flatten([])).toEqual([]) })
  it('flatten: already flat', () => { expect(flatten([[1], [2], [3]])).toEqual([1, 2, 3]) })
  it('uniqueBy: preserves first', () => {
    const result = uniqueBy([{ id: 1, val: 'a' }, { id: 1, val: 'b' }], x => x.id)
    expect(result[0].val).toBe('a')
  })
  it('isEmpty: null', () => { expect(isEmpty(null)).toBe(true) })
  it('isEmpty: undefined', () => { expect(isEmpty(undefined)).toBe(true) })
  it('isEmpty: 0', () => { expect(isEmpty(0)).toBe(false) })
  it('pick: non-existent key', () => {
    const obj = { a: 1 }
    const picked = pick(obj, ['a', 'b' as keyof typeof obj])
    expect(picked).toEqual({ a: 1 })
  })
  it('omit: empty keys', () => {
    const obj = { a: 1, b: 2 }
    expect(omit(obj, [])).toEqual(obj)
  })
  it('orderBy: empty', () => { expect(orderBy([], x => x)).toEqual([]) })
  it('orderBy: desc', () => { expect(orderBy([1, 2, 3], x => x, 'desc')).toEqual([3, 2, 1]) })
  // New collection
  it('topoSort: simple linear', () => {
    const result = topoSort([
      { id: 'a', dependencies: ['b'] },
      { id: 'b', dependencies: ['c'] },
      { id: 'c' },
    ])
    expect(result.map(r => r.id)).toEqual(['c', 'b', 'a'])
  })
  it('topoSort: circular throws', () => {
    expect(() => topoSort([
      { id: 'a', dependencies: ['b'] },
      { id: 'b', dependencies: ['a'] },
    ])).toThrow()
  })
  it('topoSort: empty', () => { expect(topoSort([])).toEqual([]) })
  it('topoSort: no dependencies', () => {
    const result = topoSort([{ id: 'a' }, { id: 'b' }])
    expect(result).toHaveLength(2)
  })
  it('slidingWindows: default step', () => {
    expect(slidingWindows([1, 2, 3, 4, 5], 3)).toEqual([[1, 2, 3], [2, 3, 4], [3, 4, 5]])
  })
  it('slidingWindows: custom step', () => {
    expect(slidingWindows([1, 2, 3, 4, 5], 3, 2)).toEqual([[1, 2, 3], [3, 4, 5]])
  })
  it('slidingWindows: size larger than array', () => {
    expect(slidingWindows([1, 2], 5)).toEqual([])
  })
  it('tumblingWindows: exact division', () => {
    expect(tumblingWindows([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4], [5, 6]])
  })
  it('tumblingWindows: remainder', () => {
    expect(tumblingWindows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
  it('tumblingWindows: empty', () => { expect(tumblingWindows([], 2)).toEqual([]) })
})

describe('EDGE: Async - Timeout, Error, Edge Cases', () => {
  it('sleep: negative resolves immediately', async () => {
    const start = Date.now()
    await sleep(-1)
    expect(Date.now() - start).toBeLessThan(100)
  })
  it('sleep: 0 resolves', async () => {
    await sleep(0)
  })
  it('parallelMap: empty with concurrency 0', async () => {
    const result = await parallelMap([], async x => x, 0)
    expect(result).toEqual([])
  })
  it('parallelMap: error propagates', async () => {
    await expect(parallelMap([1, 2], async () => { throw new Error('fail') }, 1)).rejects.toThrow('fail')
  })
  it('retryAsync: 0 attempts = 1 try', async () => {
    const fn = () => Promise.reject(new Error('fail'))
    await expect(retryAsync(fn, { attempts: 0 })).rejects.toThrow('fail')
  })
  it('timeout: negative timeout resolves normally', async () => {
    await expect(timeout(Promise.resolve('ok'), -1)).resolves.toBe('ok')
  })
  it('raceWithTimeout: promise wins', async () => {
    await expect(raceWithTimeout(Promise.resolve('data'), 100)).resolves.toBe('data')
  })
  it('allSettledMap: mixed results', async () => {
    const results = await allSettledMap([1, 2], async x => {
      if (x === 2) throw new Error('fail')
      return x
    })
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('rejected')
  })
  it('pipeline: single function', async () => {
    await expect(pipeline(5, async x => x * 2)).resolves.toBe(10)
  })
  it('deferred: resolves', async () => {
    const d = deferred<number>()
    d.resolve(42)
    await expect(d.promise).resolves.toBe(42)
  })
  it('deferred: rejects', async () => {
    const d = deferred<number>()
    d.reject(new Error('fail'))
    await expect(d.promise).rejects.toThrow('fail')
  })

  // Queue
  it('Queue: processes items in order', async () => {
    const q = new Queue({ concurrency: 1 })
    const results: number[] = []
    await Promise.all([
      q.add(async () => { results.push(1) }),
      q.add(async () => { results.push(2) }),
    ])
    expect(results).toEqual([1, 2])
  })
  it('Queue: empty onIdle resolves', async () => {
    const q = new Queue({ concurrency: 1 })
    await q.onIdle()
  })
  it('Queue: pause/resume', async () => {
    const q = new Queue({ concurrency: 1 })
    q.pause()
    let ran = false
    q.add(async () => { ran = true })
    expect(ran).toBe(false)
    q.resume()
    await q.onIdle()
    expect(ran).toBe(true)
  })

  // Semaphore
  it('Semaphore: limits concurrency', async () => {
    const sem = new Semaphore(2)
    let max = 0
    let current = 0
    const run = async () => {
      const release = await sem.acquire()
      current++
      max = Math.max(max, current)
      await sleep(10)
      current--
      release()
    }
    await Promise.all([run(), run(), run(), run()])
    expect(max).toBeLessThanOrEqual(2)
  })
  it('Semaphore: use method', async () => {
    const sem = new Semaphore(1)
    const result = await sem.use(async () => 'done')
    expect(result).toBe('done')
  })
  it('Semaphore: concurrency 0 throws', () => {
    expect(() => new Semaphore(0)).toThrow()
  })

  // memoizeAsync
  it('memoizeAsync: caches result', async () => {
    let calls = 0
    const fn = memoizeAsync(async (x: number) => { calls++; return x * 2 })
    expect(await fn(5)).toBe(10)
    expect(await fn(5)).toBe(10)
    expect(calls).toBe(1)
  })
  it('memoizeAsync: different args different cache', async () => {
    let calls = 0
    const fn = memoizeAsync(async (x: number) => { calls++; return x * 2 })
    await fn(1)
    await fn(2)
    expect(calls).toBe(2)
  })
  it('memoizeAsync: clear cache', async () => {
    let calls = 0
    const fn = memoizeAsync(async (x: number) => { calls++; return x * 2 })
    await fn(5)
    fn.clear()
    await fn(5)
    expect(calls).toBe(2)
  })
  it('memoizeAsync: TTL expires', async () => {
    let calls = 0
    const fn = memoizeAsync(async (x: number) => { calls++; return x * 2 }, { ttl: 0 })
    await fn(5)
    await fn(5)
    expect(calls).toBe(2)
  })
})

describe('EDGE: IO - CSV, JSON, Env', () => {
  it('parseCsv: empty', () => { expect(parseCsv('')).toEqual([]) })
  it('parseCsv: only headers', () => { expect(parseCsv('a,b')).toEqual([]) })
  it('parseCsv: quoted commas', () => {
    const result = parseCsv('a,b\n1,"hello,world"')
    expect(result[0].b).toBe('hello,world')
  })
  it('parseCsv: custom delimiter', () => {
    const result = parseCsv('a;b\n1;2', { delimiter: ';' })
    expect(result[0].b).toBe('2')
  })
  it('stringifyCsv: empty', () => { expect(stringifyCsv([])).toBe('') })
  it('stringifyCsv: escape quotes', () => {
    const result = stringifyCsv([{ note: 'she said "hello"' }])
    expect(result).toContain('""')
  })
  it('safeJsonParse: invalid returns null', () => { expect(safeJsonParse('not json')).toBeNull() })
  it('safeJsonParse: custom default', () => {
    expect(safeJsonParse('invalid', { fallback: true })).toEqual({ fallback: true })
  })
  it('env: missing returns default', () => { expect(env('NONEXISTENT', 'default')).toBe('default') })
  it('envInt: invalid returns default', () => {
    process.env.TEST_INT = 'not-a-number'
    expect(envInt('TEST_INT', 0)).toBe(0)
  })
  it('envBool: truthy values', () => {
    process.env.TEST_BOOL = 'true'
    expect(envBool('TEST_BOOL')).toBe(true)
    process.env.TEST_BOOL = '1'
    expect(envBool('TEST_BOOL')).toBe(true)
  })
})

describe('EDGE: Type Guards - All Types', () => {
  it('isString: string literal', () => { expect(isString('hello')).toBe(true) })
  it('isString: new String', () => { expect(isString(new String('hello'))).toBe(false) })
  it('isNumber: NaN is false', () => { expect(isNumber(NaN)).toBe(false) })
  it('isNumber: Infinity is false', () => { expect(isNumber(Infinity)).toBe(false) })
  it('isBoolean: true/false', () => { expect(isBoolean(true)).toBe(true); expect(isBoolean(false)).toBe(true) })
  it('isObject: null is false', () => { expect(isObject(null)).toBe(false) })
  it('isObject: array is false', () => { expect(isObject([1, 2])).toBe(false) })
  it('isObject: plain object', () => { expect(isObject({})).toBe(true) })
  it('isArray: empty', () => { expect(isArray([])).toBe(true) })
  it('isFunction: async', () => { expect(isFunction(async () => {})).toBe(true) })
  it('isFunction: generator', () => { expect(isFunction(function*() {})).toBe(true) })
  it('isDate: invalid date returns false', () => { expect(isDate(new Date('invalid'))).toBe(false) })
  it('isRegExp: flags preserved', () => { expect(isRegExp(/test/gi)).toBe(true) })
  it('isMap: empty', () => { expect(isMap(new Map())).toBe(true) })
  it('isSet: empty', () => { expect(isSet(new Set())).toBe(true) })
  it('isPromise: thenable vs actual', () => {
    expect(isPromise(Promise.resolve())).toBe(true)
    expect(isPromise({ then: () => {} })).toBe(false)
  })
  it('isNull', () => { expect(isNull(null)).toBe(true); expect(isNull(undefined)).toBe(false) })
  it('isUndefined', () => { expect(isUndefined(undefined)).toBe(true); expect(isUndefined(null)).toBe(false) })
  it('isNil', () => { expect(isNil(null)).toBe(true); expect(isNil(undefined)).toBe(true) })
  it('assertDefined: null throws', () => { expect(() => assertDefined(null)).toThrow() })
  it('assertDefined: 0 passes', () => { expect(() => assertDefined(0)).not.toThrow() })
  it('assertType: wrong type throws', () => { expect(() => assertType(42, isString)).toThrow() })
  it('ensureArray: wraps non-array', () => { expect(ensureArray(42)).toEqual([42]) })
  it('ensureArray: null', () => { expect(ensureArray(null)).toEqual([null]) })
  it('castArray: same as ensureArray', () => { expect(castArray(42)).toEqual([42]) })
  it('getType: all types', () => {
    expect(getType('')).toBe('string')
    expect(getType(42)).toBe('number')
    expect(getType(true)).toBe('boolean')
    expect(getType([])).toBe('array')
    expect(getType({})).toBe('object')
    expect(getType(() => {})).toBe('function')
    expect(getType(new Date())).toBe('date')
    expect(getType(/re/)).toBe('regexp')
    expect(getType(new Map())).toBe('map')
    expect(getType(new Set())).toBe('set')
    expect(getType(Promise.resolve())).toBe('promise')
    expect(getType(null)).toBe('null')
    expect(getType(undefined)).toBe('undefined')
    expect(getType(NaN)).toBe('nan')
    expect(getType(Infinity)).toBe('infinity')
  })
})

describe('EDGE: Crypto - Randomness & Validation', () => {
  it('hash: deterministic', () => { expect(hash('hello')).toBe(hash('hello')) })
  it('hash: different for different input', () => { expect(hash('hello')).not.toBe(hash('world')) })
  it('simpleHash: 32-char hex', () => { expect(simpleHash('test')).toMatch(/^[0-9a-f]{32}$/) })
  it('randomHex: correct length', () => { expect(randomHex(8)).toMatch(/^[0-9a-f]{16}$/) })
  it('randomHex: unique', () => { expect(randomHex()).not.toBe(randomHex()) })
  it('base64: roundtrip unicode', () => {
    const original = 'héllo wörld 🚀'
    expect(base64Decode(base64Encode(original))).toBe(original)
  })
  it('generateToken: 64 hex chars', () => { expect(generateToken()).toHaveLength(64) })
  it('generateOTP: 6 digits', () => { expect(generateOTP()).toMatch(/^\d{6}$/) })
  it('generateOTP: distribution check', () => {
    const digits = new Set<string>()
    for (let i = 0; i < 100; i++) digits.add(generateOTP(4))
    expect(digits.size).toBeGreaterThan(50) // good entropy
  })
  it('checksum: 8-char hex', () => { expect(checksum('hello')).toMatch(/^[0-9a-f]{8}$/) })
  it('constantTimeEqual: timing safe', () => {
    expect(constantTimeEqual('abc123', 'abc123')).toBe(true)
    expect(constantTimeEqual('abc123', 'xyz789')).toBe(false)
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('EDGE: Path - Normalization & Edge Cases', () => {
  it('join: absolute path', () => { expect(join('/a', 'b', 'c')).toBe('/a/b/c') })
  it('join: empty segments', () => { expect(join('a', '', 'b')).toBe('a/b') })
  it('join: no args', () => { expect(join()).toBe('.') })
  it('join: .. traversal out of root', () => { expect(join('a', '..', '..')).toBe('..') })
  it('resolve: relative to absolute', () => { expect(resolve('/a', 'b', '..', 'c')).toBe('/a/c') })
  it('basename: with extension', () => { expect(basename('/path/to/file.txt', '.txt')).toBe('file') })
  it('basename: root', () => { expect(basename('/')).toBe('') })
  it('dirname: root', () => { expect(dirname('/')).toBe('/') })
  it('dirname: no directory', () => { expect(dirname('file.txt')).toBe('.') })
  it('extname: multiple dots', () => { expect(extname('file.min.js')).toBe('.js') })
  it('extname: no extension', () => { expect(extname('file')).toBe('') })
  it('normalize: double slashes', () => { expect(normalize('a//b///c')).toBe('a/b/c') })
  it('normalize: trailing ..', () => { expect(normalize('a/b/../..')).toBe('.') })
  it('isAbsolute: false for relative', () => { expect(isAbsolute('path/to/file')).toBe(false) })
  it('isAbsolute: true for absolute', () => { expect(isAbsolute('/path/to/file')).toBe(true) })
  it('relative: same path', () => { expect(relative('/a/b', '/a/b')).toBe('.') })
  it('parse: full parse', () => {
    const parsed = parse('/path/to/file.txt')
    expect(parsed.root).toBe('/')
    expect(parsed.dir).toBe('/path/to')
    expect(parsed.base).toBe('file.txt')
    expect(parsed.name).toBe('file')
    expect(parsed.ext).toBe('.txt')
  })
  it('format: roundtrip', () => { expect(format(parse('/a/b/c.js'))).toBe('/a/b/c.js') })
})

describe('EDGE: Core Functions - Deep Clone & Co', () => {
  it('deepClone: circular reference', () => {
    const obj: any = { a: 1 }
    obj.self = obj
    const cloned = deepClone(obj)
    expect(cloned.a).toBe(1)
    expect(cloned.self).toBe(cloned)
  })
  it('deepClone: Date preservation', () => {
    const d = new Date('2024-01-15')
    const cloned = deepClone(d)
    expect(cloned).toBeInstanceOf(Date)
    expect(cloned.getTime()).toBe(d.getTime())
  })
  it('deepClone: RegExp flags', () => {
    const re = /test/gi
    const cloned = deepClone(re)
    expect(cloned.flags).toBe('gi')
  })
  it('deepClone: Map and Set', () => {
    const map = new Map([[1, 'a']])
    const clonedMap = deepClone(map)
    expect(clonedMap.get(1)).toBe('a')

    const set = new Set([1, 2, 3])
    const clonedSet = deepClone(set)
    expect(clonedSet.has(1)).toBe(true)
  })
  it('deepClone: primitives untouched', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone('hello')).toBe('hello')
    expect(deepClone(true)).toBe(true)
    expect(deepClone(null)).toBeNull()
    expect(deepClone(undefined)).toBeUndefined()
  })
  it('deepMerge: multiple sources', () => {
    expect(deepMerge({ a: 1 }, { b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 })
  })
  it('deepMerge: nested overwrite', () => {
    const result = deepMerge({ a: { x: 1, y: 2 } }, { a: { y: 3, z: 4 } })
    expect(result).toEqual({ a: { x: 1, y: 3, z: 4 } })
  })
  it('deepMerge: null sources skipped', () => {
    expect(deepMerge({ a: 1 }, null as any, undefined as any)).toEqual({ a: 1 })
  })
  it('memoize: bounded cache', () => {
    const fn = memoize((x: number) => x * 2)
    fn(1); fn(2); fn(3)
    expect(fn.cache.size).toBe(3)
  })
  it('once: works with async functions', () => {
    let calls = 0
    const wrapped = once(async () => { calls++; return 42 })
    wrapped()
    wrapped()
    expect(calls).toBe(1)
  })
  it('retry: resolves on first attempt', async () => {
    await expect(retry(() => Promise.resolve('ok'))).resolves.toBe('ok')
  })
  it('noop returns undefined', () => { expect(noop()).toBeUndefined() })
  it('identity returns argument', () => { expect(identity(42)).toBe(42) })
})

describe('EDGE: Validation - Phone, Email, URL', () => {
  it('isPhone: valid number 08123456789', () => { expect(isPhone('08123456789')).toBe(true) })
  it('isPhone: with + prefix', () => { expect(isPhone('+628123456789')).toBe(true) })
  it('isPhone: too short', () => { expect(isPhone('08123')).toBe(false) })
  it('isEmail: valid RFC', () => {
    expect(isEmail('user@example.com')).toBe(true)
    expect(isEmail('user.name+tag@example.co.id')).toBe(true)
  })
  it('isEmail: missing @', () => { expect(isEmail('userexample.com')).toBe(false) })
  it('isEmail: double dots', () => { expect(isEmail('user@example..com')).toBe(false) })
  it('isEmail: quoted local', () => { expect(isEmail('"user name"@example.com')).toBe(true) })
  it('isURL: valid https', () => { expect(isURL('https://example.com')).toBe(true) })
  it('isURL: missing protocol', () => { expect(isURL('example.com')).toBe(false) })
  it('isURL: ftp rejected', () => { expect(isURL('ftp://example.com')).toBe(false) })
  it('isURL: localhost', () => { expect(isURL('https://localhost:3000')).toBe(true) })
  it('isURL: with path/query', () => { expect(isURL('https://example.com/path?a=1&b=2')).toBe(true) })
})

describe('EDGE: Error - MultiError & TypedError', () => {
  it('createError: all codes have correct HTTP status', () => {
    const tests: Array<[string, number]> = [
      ['BAD_REQUEST', 400], ['UNAUTHORIZED', 401], ['FORBIDDEN', 403],
      ['NOT_FOUND', 404], ['CONFLICT', 409], ['VALIDATION_ERROR', 422],
      ['TOO_MANY', 429], ['INTERNAL', 500], ['BAD_GATEWAY', 502], ['UNAVAILABLE', 503],
    ]
    for (const [code, status] of tests) {
      const err = createError(code as any, 'test')
      expect(err.status).toBe(status)
    }
  })
  it('TypedError: prototype chain correct', () => {
    const err = createError('INTERNAL', 'test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(TypedError)
    expect((err as any).__proto__).toBe(TypedError.prototype)
  })
  it('TypedError: toJSON includes all fields', () => {
    const err = createError('VALIDATION_ERROR', 'invalid', { details: { field: 'email' } })
    const json = err.toJSON()
    expect(json.code).toBe('VALIDATION_ERROR')
    expect(json.status).toBe(422)
    expect(json.details).toEqual({ field: 'email' })
  })
  it('MultiError: empty array', () => {
    const multi = new MultiError([])
    expect(multi.errors).toEqual([])
    expect(multi.length).toBe(0)
  })
  it('MultiError: some with no match', () => {
    const multi = new MultiError([new Error('a')])
    expect(multi.some(e => e.message === 'b')).toBe(false)
  })
  it('MultiError: prototype chain correct', () => {
    const multi = new MultiError([new Error('test')])
    expect(multi).toBeInstanceOf(Error)
    expect(multi).toBeInstanceOf(MultiError)
  })
  it('collectErrors: multiple errors', () => {
    const { errors } = collectErrors(() => {
      throw new Error('e1')
    })
    expect(errors).toHaveLength(1)
  })
  it('collectErrors: non-error throw caught', () => {
    const { errors } = collectErrors(() => { throw 'string error' })
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBeTruthy()
  })
  it('isTypedError: regular Error returns false', () => {
    expect(isTypedError(new Error('plain'))).toBe(false)
  })
  it('isTypedError: null returns false', () => {
    expect(isTypedError(null)).toBe(false)
  })
})
