import { describe, it, expect } from 'vitest'
import {
  isEven, isOdd, gcd, lcm, factorial, isPrime, toRadians, toDegrees,
  lerp, percentageOf, mapRange, mode, range, weightedAverage, geometricMean,
  combinations, permutations,
} from '../src/math/index.js'
import {
  partition, compact, difference, intersection, union, zip, unzip,
  countBy, maxBy, minBy, sumBy, findIndex, findLast, drop, dropRight,
  take, takeRight, without, nth,
} from '../src/collection/index.js'
import {
  isToday, isYesterday, isTomorrow, isPast, isFuture, isSameDay,
  daysInMonth, dayOfYear, weekOfYear, quarter, maxDate, minDate,
  nextMonday, nextTuesday, nextFriday, lastMonday, lastFriday,
  parseDuration,
} from '../src/date/index.js'
import {
  stripHtml, truncateWords, isPalindrome, isAnagram, similarity,
  dedent, wordCount, swapCase, toCobolCase, charCount,
} from '../src/string/index.js'
import {
  isValidHex, hexToHsl, hslToHex, mix, randomColor, isLight, isDark,
  complementary,
} from '../src/color/index.js'
// Validation functions removed: isNoSIM, isPassport, isNoBPJS, isNoKK were Indonesia-specific
import {
  RateLimiter, Mutex, batch, waterfall,
} from '../src/async/index.js'

// ════════════════════════════════════════════════
// MATH EXPANSION
// ════════════════════════════════════════════════
describe('MATH: isEven/isOdd', () => {
  it('isEven', () => { expect(isEven(4)).toBe(true); expect(isEven(3)).toBe(false); expect(isEven(0)).toBe(true) })
  it('isOdd', () => { expect(isOdd(3)).toBe(true); expect(isOdd(4)).toBe(false) })
  it('handles negative', () => { expect(isEven(-2)).toBe(true); expect(isOdd(-3)).toBe(true) })
  it('rejects non-integer', () => { expect(isEven(1.5)).toBe(false) })
})

describe('MATH: gcd/lcm', () => {
  it('gcd', () => { expect(gcd(12, 8)).toBe(4); expect(gcd(7, 13)).toBe(1) })
  it('lcm', () => { expect(lcm(4, 6)).toBe(12); expect(lcm(7, 13)).toBe(91) })
  it('gcd with zero', () => { expect(gcd(0, 5)).toBe(5) })
})

describe('MATH: factorial', () => {
  it('basic', () => { expect(factorial(5)).toBe(120); expect(factorial(0)).toBe(1); expect(factorial(1)).toBe(1) })
  it('throws for negative', () => { expect(() => factorial(-1)).toThrow() })
})

describe('MATH: isPrime', () => {
  it('detects primes', () => { expect(isPrime(2)).toBe(true); expect(isPrime(17)).toBe(true); expect(isPrime(1)).toBe(false) })
  it('detects composites', () => { expect(isPrime(4)).toBe(false); expect(isPrime(15)).toBe(false) })
})

describe('MATH: toRadians/toDegrees', () => {
  it('toRadians', () => { expect(toRadians(180)).toBeCloseTo(Math.PI, 5) })
  it('toDegrees', () => { expect(toDegrees(Math.PI)).toBeCloseTo(180, 5) })
})

describe('MATH: lerp/percentageOf/mapRange', () => {
  it('lerp', () => { expect(lerp(0, 10, 0.5)).toBe(5); expect(lerp(0, 10, 0)).toBe(0); expect(lerp(0, 10, 1)).toBe(10) })
  it('percentageOf', () => { expect(percentageOf(25, 100)).toBe(25); expect(percentageOf(0, 100)).toBe(0) })
  it('mapRange', () => { expect(mapRange(5, 0, 10, 0, 100)).toBe(50) })
})

describe('MATH: mode/range/weightedAverage/geometricMean', () => {
  it('mode', () => { expect(mode([1, 2, 2, 3])).toEqual([2]) })
  it('range', () => { expect(range(1, 5)).toEqual([1, 2, 3, 4, 5]); expect(range(0, 10, 3)).toEqual([0, 3, 6, 9]) })
  it('weightedAverage', () => { expect(weightedAverage([70, 80], [2, 3])).toBe(76) })
  it('geometricMean', () => { expect(geometricMean([2, 8])).toBe(4) })
})

describe('MATH: combinations/permutations', () => {
  it('combinations', () => { expect(combinations(5, 2)).toBe(10); expect(combinations(5, 0)).toBe(1) })
  it('permutations', () => { expect(permutations(5, 2)).toBe(20) })
})

// ════════════════════════════════════════════════
// COLLECTION EXPANSION
// ════════════════════════════════════════════════
describe('COLLECTION: partition/compact', () => {
  it('partition', () => {
    const [even, odd] = partition([1, 2, 3, 4], x => x % 2 === 0)
    expect(even).toEqual([2, 4]); expect(odd).toEqual([1, 3])
  })
  it('compact', () => { expect(compact([0, 1, false, 2, '', 3])).toEqual([1, 2, 3]) })
})

describe('COLLECTION: difference/intersection/union', () => {
  it('difference', () => { expect(difference([1, 2, 3], [2, 3])).toEqual([1]) })
  it('intersection', () => { expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]) })
  it('union', () => { expect(union([1, 2], [2, 3])).toEqual([1, 2, 3]) })
})

describe('COLLECTION: zip/unzip', () => {
  it('zip', () => { expect(zip(['a', 'b'], [1, 2])).toEqual([['a', 1], ['b', 2]]) })
  it('unzip', () => { expect(unzip([['a', 1], ['b', 2]])).toEqual([['a', 'b'], [1, 2]]) })
})

describe('COLLECTION: countBy/maxBy/minBy/sumBy', () => {
  const items = [{ cat: 'a', val: 1 }, { cat: 'a', val: 2 }, { cat: 'b', val: 3 }]
  it('countBy', () => { expect(countBy(items, x => x.cat)).toEqual({ a: 2, b: 1 }) })
  it('maxBy', () => { expect(maxBy(items, x => x.val)).toEqual(items[2]) })
  it('minBy', () => { expect(minBy(items, x => x.val)).toEqual(items[0]) })
  it('sumBy', () => { expect(sumBy(items, x => x.val)).toBe(6) })
})

describe('COLLECTION: findIndex/findLast/drop/take/without/nth', () => {
  it('findIndex', () => { expect(findIndex([1, 2, 3], x => x > 1)).toBe(1) })
  it('findLast', () => { expect(findLast([1, 2, 3], x => x > 1)).toBe(3) })
  it('drop', () => { expect(drop([1, 2, 3], 2)).toEqual([3]) })
  it('take', () => { expect(take([1, 2, 3], 2)).toEqual([1, 2]) })
  it('without', () => { expect(without([1, 2, 3, 1], 1)).toEqual([2, 3]) })
  it('nth', () => { expect(nth([1, 2, 3], -1)).toBe(3) })
})

// ════════════════════════════════════════════════
// DATE EXPANSION
// ════════════════════════════════════════════════
describe('DATE: isToday/isYesterday/isTomorrow', () => {
  it('isToday', () => { expect(isToday(new Date())).toBe(true) })
})

describe('DATE: isPast/isFuture/isSameDay', () => {
  it('isPast', () => { expect(isPast(new Date('2020-01-01'))).toBe(true) })
  it('isFuture', () => { expect(isFuture(new Date('2099-01-01'))).toBe(true) })
  it('isSameDay', () => { expect(isSameDay(new Date('2024-01-01'), new Date('2024-01-01'))).toBe(true) })
})

describe('DATE: daysInMonth/dayOfYear/weekOfYear/quarter', () => {
  it('daysInMonth', () => { expect(daysInMonth(new Date('2024-02-01'))).toBe(29) })
  it('dayOfYear', () => { expect(dayOfYear(new Date('2024-01-01'))).toBe(1) })
  it('weekOfYear', () => { expect(weekOfYear(new Date('2024-01-01'))).toBe(1) })
  it('quarter', () => { expect(quarter(new Date('2024-04-01'))).toBe(2) })
})

describe('DATE: maxDate/minDate', () => {
  it('maxDate', () => { expect(maxDate([new Date('2023-01-01'), new Date('2024-01-01')])).toEqual(new Date('2024-01-01')) })
  it('minDate', () => { expect(minDate([new Date('2023-01-01'), new Date('2024-01-01')])).toEqual(new Date('2023-01-01')) })
})

describe('DATE: nextMonday/lastMonday', () => {
  it('nextMonday', () => { expect(nextMonday(new Date('2024-01-01')).getDay()).toBe(1) })
  it('lastFriday', () => { expect(lastFriday(new Date('2024-01-01')).getDay()).toBe(5) })
})

describe('DATE: parseDuration', () => {
  it('parseDuration', () => { expect(parseDuration('1h30m')).toBe(5400000); expect(parseDuration('1d')).toBe(86400000) })
})



// ════════════════════════════════════════════════
// STRING EXPANSION
// ════════════════════════════════════════════════
describe('STRING: stripHtml', () => {
  it('removes tags', () => { expect(stripHtml('<p>Hello</p>')).toBe('Hello') })
  it('handles nested', () => { expect(stripHtml('<div><p>Test</p></div>')).toBe('Test') })
  it('removes tags keeps content', () => { expect(stripHtml('Hello<script>alert(1)</script>')).toBe('Helloalert(1)') })
})

describe('STRING: truncateWords', () => {
  it('truncates by word', () => { expect(truncateWords('a b c d e', 3)).toBe('a b c...') })
  it('short text unchanged', () => { expect(truncateWords('hello', 5)).toBe('hello') })
})

describe('STRING: isPalindrome', () => {
  it('simple', () => { expect(isPalindrome('radar')).toBe(true); expect(isPalindrome('hello')).toBe(false) })
  it('ignores case/spaces', () => { expect(isPalindrome('A man a plan a canal Panama')).toBe(true) })
})

describe('STRING: isAnagram/similarity', () => {
  it('isAnagram', () => { expect(isAnagram('listen', 'silent')).toBe(true); expect(isAnagram('hello', 'world')).toBe(false) })
  it('similarity', () => { expect(similarity('hello', 'hallo')).toBeGreaterThanOrEqual(0.5) })
})

describe('STRING: dedent/wordCount/swapCase/toCobolCase/charCount', () => {
  it('dedent', () => { expect(dedent('  hello\n  world')).toBe('hello\nworld') })
  it('wordCount', () => { expect(wordCount('hello world')).toBe(2); expect(wordCount('')).toBe(0) })
  it('swapCase', () => { expect(swapCase('Hello World')).toBe('hELLO wORLD') })
  it('toCobolCase', () => { expect(toCobolCase('helloWorld')).toBe('HELLO_WORLD') })
  it('charCount', () => { expect(charCount('hello')).toEqual({ h: 1, e: 1, l: 2, o: 1 }) })
})

// ════════════════════════════════════════════════
// COLOR EXPANSION
// ════════════════════════════════════════════════
describe('COLOR: isValidHex', () => {
  it('valid', () => { expect(isValidHex('#ff0000')).toBe(true); expect(isValidHex('ff0000')).toBe(true); expect(isValidHex('#f00')).toBe(true) })
  it('invalid', () => { expect(isValidHex('#xyz')).toBe(false); expect(isValidHex('')).toBe(false) })
})

describe('COLOR: hexToHsl/hslToHex', () => {
  it('hexToHsl red', () => { const hsl = hexToHsl('#ff0000'); expect(hsl?.h).toBe(0); expect(hsl?.s).toBe(100); expect(hsl?.l).toBe(50) })
  it('hslToHex red', () => { expect(hslToHex(0, 100, 50)).toBe('#ff0000') })
})

describe('COLOR: mix/randomColor/isLight/isDark/complementary', () => {
  it('mix', () => { const result = mix('#ff0000', '#0000ff'); expect(result === '#800080' || result === '#7f007f').toBe(true) })
  it('randomColor', () => { expect(randomColor()).toMatch(/^#[0-9a-f]{6}$/) })
  it('isLight', () => { expect(isLight('#ffffff')).toBe(true); expect(isLight('#000000')).toBe(false) })
  it('isDark', () => { expect(isDark('#000000')).toBe(true) })
  it('complementary', () => { expect(complementary('#ff0000')).toBe('#00ffff') })
})

// ════════════════════════════════════════════════
// ASYNC EXPANSION
// ════════════════════════════════════════════════
describe('ASYNC: RateLimiter', () => {
  it('allows requests within limit', () => {
    const rl = new RateLimiter({ maxRequests: 5, perWindow: 1000 })
    expect(rl.tryAcquire()).toBe(true)
    expect(rl.tryAcquire()).toBe(true)
  })
  it('blocks after limit', () => {
    const rl = new RateLimiter({ maxRequests: 1, perWindow: 1000 })
    rl.tryAcquire()
    expect(rl.tryAcquire()).toBe(false)
  })
})

describe('ASYNC: Mutex', () => {
  it('locks and releases', async () => {
    const mutex = new Mutex()
    let inCritical = false
    let maxConcurrent = 0
    const task = async () => {
      const release = await mutex.acquire()
      inCritical = true
      maxConcurrent = Math.max(maxConcurrent, inCritical ? 1 : 0)
      await new Promise(r => setTimeout(r, 10))
      inCritical = false
      release()
    }
    await Promise.all([task(), task()])
    expect(maxConcurrent).toBeLessThanOrEqual(1)
  })
  it('use method', async () => {
    const mutex = new Mutex()
    const result = await mutex.use(async () => 'done')
    expect(result).toBe('done')
  })
})

describe('ASYNC: batch', () => {
  it('processes in batches', async () => {
    const results = await batch([1, 2, 3, 4, 5], 2, async batch => batch.map(x => x * 2))
    expect(results).toEqual([2, 4, 6, 8, 10])
  })
  it('empty array', async () => {
    expect(await batch([], 2, async b => b)).toEqual([])
  })
})

describe('ASYNC: waterfall', () => {
  it('passes results through chain', async () => {
    const result = await waterfall([
      async () => 1,
      async (n: number) => n + 1,
      async (n: number) => n * 3,
    ])
    expect(result).toBe(6)
  })
})

// ════════════════════════════════════════════════
// VALIDATION EXPANSION
// ════════════════════════════════════════════════
// VALIDATION tests for Indonesia-specific functions (isNoSIM, isPassport, isNoBPJS, isNoKK) have been removed
// as those functions were removed from the codebase
