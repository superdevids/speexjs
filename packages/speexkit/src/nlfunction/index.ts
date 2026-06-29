/**
 * speexjs-core — Functional Programming Utilities (Ramda/lodash-fp style)
 *
 * Re-exports matching functions from core and adds FP-flavored utilities.
 */

import {
  debounce as _debounceCore,
  throttle as _throttleCore,
  once as _onceCore,
  identity as _identityCore,
} from '../core/index.js'

// ─── Re-exports from core ──────────────────────────────────

/**
 * Creates a debounced function that delays invoking `fn` until after `wait`
 * milliseconds have elapsed since the last invocation.
 *
 * @param fn - The function to debounce.
 * @param wait - Milliseconds to delay.
 * @param leading - Whether to invoke on the leading edge (default: false).
 * @returns A debounced function.
 *
 * @example const f = debounce(() => save(), 300)
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  leading?: boolean
): (...args: Parameters<T>) => void {
  return _debounceCore(fn as (...args: unknown[]) => unknown, wait, { leading, trailing: true }) as (...args: Parameters<T>) => void
}

/**
 * Creates a throttled function that only invokes `fn` at most once per
 * `wait` milliseconds.
 *
 * @param fn - The function to throttle.
 * @param wait - Milliseconds to throttle invocations to.
 * @returns A throttled function.
 *
 * @example const f = throttle(() => handleScroll(), 100)
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  return _throttleCore(fn as (...args: unknown[]) => unknown, wait) as (...args: Parameters<T>) => void
}

/**
 * Creates a function that invokes `fn` only once. Subsequent calls return
 * the result of the first invocation.
 *
 * @param fn - The function to wrap.
 * @returns A function that runs only once.
 *
 * @example const initialize = once(() => createConnection())
 */
export function once<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  return _onceCore(fn as (...args: unknown[]) => unknown) as (...args: Parameters<T>) => ReturnType<T>
}

/**
 * Identity function. Returns the given value unchanged.
 *
 * @param value - The value to return.
 * @returns The same value.
 *
 * @example id(42) // 42
 */
export function id<T>(value: T): T {
  return _identityCore(value)
}

// ─── Curry & Partial Application ───────────────────────────

/**
 * Curries a function (like lodash curry).
 * Transforms a function of N arguments into N nested unary functions.
 * Passes remaining arguments if fewer than expected arity.
 *
 * @param fn - The function to curry.
 * @param arity - Optional arity (defaults to fn.length).
 * @returns A curried function.
 *
 * @example const add = curry((a: number, b: number) => a + b)
 *          add(1)(2) // 3
 *          add(1, 2) // 3
 */
export function curry<T extends (...args: any[]) => any>(
  fn: T,
  arity?: number
): (...args: any[]) => any {
  const expectedArity = arity ?? fn.length

  function curried(this: unknown, ...args: any[]): any {
    if (args.length >= expectedArity) {
      return fn.apply(this, args)
    }
    return function (this: unknown, ...moreArgs: any[]) {
      return curried.apply(this, [...args, ...moreArgs])
    }
  }

  return curried
}

/**
 * Partial application from the left. Presets the first N arguments.
 *
 * @param fn - The function to partially apply.
 * @param presetArgs - Arguments to preset.
 * @returns A function with arguments partially applied from the left.
 *
 * @example const add = (a: number, b: number) => a + b
 *          const add5 = partial(add, 5)
 *          add5(3) // 8
 */
export function partial<T extends (...args: any[]) => any>(
  fn: T,
  ...presetArgs: any[]
): (...args: any[]) => any {
  return function (this: unknown, ...moreArgs: any[]) {
    return fn.apply(this, [...presetArgs, ...moreArgs])
  }
}

/**
 * Partial application from the right. Presets the last N arguments.
 *
 * @param fn - The function to partially apply.
 * @param presetArgs - Arguments to preset (applied from the right).
 * @returns A function with arguments partially applied from the right.
 *
 * @example const divide = (a: number, b: number) => a / b
 *          const divideBy2 = partialRight(divide, 2)
 *          divideBy2(10) // 5  — same as divide(10, 2)
 */
export function partialRight<T extends (...args: any[]) => any>(
  fn: T,
  ...presetArgs: any[]
): (...args: any[]) => any {
  return function (this: unknown, ...moreArgs: any[]) {
    return fn.apply(this, [...moreArgs, ...presetArgs])
  }
}

// ─── Pipeline Helpers ──────────────────────────────────────

/**
 * Wraps a function so it receives the value and returns it unchanged.
 * Useful for side-effects in pipeline composition.
 *
 * @param fn - A side-effect function.
 * @returns A function that calls `fn` with the value and returns it.
 *
 * @example pipe(
 *   tap(x => console.log(x)),
 *   double
 * )(5)
 */
export function tap<T>(fn: (value: T) => void): (value: T) => T {
  return (value: T): T => {
    fn(value)
    return value
  }
}

/**
 * Logs a value and passes it through. Useful for debugging pipelines.
 *
 * @param message - Optional prefix message.
 * @returns A function that logs the value and returns it.
 *
 * @example pipe(double, trace('after double'), triple)(5)
 */
export function trace<T>(message?: string): (value: T) => T {
  return (value: T): T => {
    console.log(message ? `${message}: ${value}` : value)
    return value
  }
}

// ─── Memoization ───────────────────────────────────────────

/**
 * Memoizes a synchronous function with an LRU cache (up to `maxSize` entries).
 * Uses a resolver function for custom cache keys.
 *
 * @param fn - The function to memoize.
 * @param resolver - Optional function to determine the cache key (defaults to first argument).
 * @param maxSize - Maximum number of cache entries (default: 100).
 * @returns The memoized function with an exposed `.cache` Map property.
 *
 * @example const fib = memoizeSync((n: number): number => n <= 1 ? n : fib(n - 1) + fib(n - 2))
 *          fib(40) // 102334155 — computed efficiently
 */
export function memoizeSync<T extends (...args: any[]) => any>(
  fn: T,
  resolver?: (...args: Parameters<T>) => string,
  maxSize: number = 100
): T & { cache: Map<string, ReturnType<T>> } {
  const cache = new Map<string, ReturnType<T>>()

  const memoized = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = resolver ? resolver(...args) : String(args[0])
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>
    }
    const result = fn.apply(this, args) as ReturnType<T>
    cache.set(key, result)

    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) cache.delete(firstKey)
    }

    return result
  }

  memoized.cache = cache
  return memoized as unknown as T & { cache: Map<string, ReturnType<T>> }
}

// ─── Predicate Utilities ──────────────────────────────────

/**
 * Negates a predicate function.
 *
 * @param predicate - The predicate to negate.
 * @returns A function that returns the logical negation of `predicate`.
 *
 * @example const isEven = (n: number) => n % 2 === 0
 *          const isOdd = negate(isEven)
 *          isOdd(3) // true
 */
export function negate<T extends (...args: any[]) => boolean>(
  predicate: T
): (...args: Parameters<T>) => boolean {
  return function (this: unknown, ...args: Parameters<T>): boolean {
    return !predicate.apply(this, args)
  }
}

// ─── Call-Control Utilities ────────────────────────────────

/**
 * Creates a function that can only be called N times.
 * Subsequent calls return the result of the Nth call.
 *
 * @param n - Number of allowed calls.
 * @param fn - The function to wrap.
 * @returns A restricted function.
 *
 * @example const canCallTwice = before(2, () => 'hello')
 *          canCallTwice() // 'hello'
 *          canCallTwice() // 'hello'
 *          canCallTwice() // undefined
 */
export function before<T extends (...args: any[]) => any>(
  n: number,
  fn: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let count = 0
  let result: ReturnType<T>

  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    if (count < n) {
      count++
      result = fn.apply(this, args)
      return result
    }
    return undefined
  }
}

// ─── Array / Value Wrapping ────────────────────────────────

/**
 * Wraps a value in an array if it's not already an array.
 *
 * @param value - The value to wrap.
 * @returns An array containing the value, or the value itself if already an array.
 *
 * @example wrapArray('a')    // ['a']
 * @example wrapArray([1, 2]) // [1, 2]
 */
export function wrapArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

/**
 * Returns a function that always returns the given value.
 *
 * @param value - The value to always return.
 * @returns A function that returns `value` no matter the arguments.
 *
 * @example const alwaysZero = constant(0)
 *          alwaysZero()    // 0
 *          alwaysZero(42)  // 0
 */
export function constant<T>(value: T): (...args: any[]) => T {
  return (..._args: any[]) => value
}

// ─── Combinators ──────────────────────────────────────────

/**
 * Creates a function that applies arguments to a list of functions
 * and returns an array of results.
 *
 * @param fns - Array of functions.
 * @returns A function that invokes each function with the given args and returns results.
 *
 * @example const fns = over([Math.min, Math.max])
 *          fns(1, 2, 3) // [1, 3]
 */
export function over<T, R>(
  fns: Array<(...args: T[]) => R>
): (...args: T[]) => R[] {
  return function (this: unknown, ...args: T[]): R[] {
    return fns.map(fn => fn.apply(this, args))
  }
}

/**
 * Apply a function to a value. Useful in pipelines for unary transformation.
 *
 * @param fn - The function to apply.
 * @returns A function that applies `fn` to its argument.
 *
 * @example pipe(apply((x: number) => x * 2))(5) // 10
 */
export function apply<T, R>(fn: (value: T) => R): (value: T) => R {
  return (value: T): R => fn(value)
}

/**
 * Creates a comparator function for use with `.sort()` from a transform function.
 *
 * @param fn - A function that extracts a comparable value.
 * @returns A comparator function suitable for Array.prototype.sort.
 *
 * @example const byAge = comparing((p: Person) => p.age)
 *          people.sort(byAge)
 */
export function comparing<T>(
  fn: (value: T) => number | string
): (a: T, b: T) => number {
  return (a: T, b: T): number => {
    const va = fn(a)
    const vb = fn(b)
    if (va < vb) return -1
    if (va > vb) return 1
    return 0
  }
}

/**
 * Returns a new function that caches only the last result.
 * Unlike `memoizeSync`, this only remembers one call.
 *
 * @param fn - The function to wrap.
 * @returns A function that caches its last result.
 *
 * @example const f = memoizeLast((x: number) => x * 2)
 *          f(2) // 4 — computed
 *          f(2) // 4 — cached
 *          f(3) // 6 — recomputed
 *          f(2) // 4 — recomputed (last was with 3)
 */
export function memoizeLast<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  let lastKey: string | null = null
  let lastResult: ReturnType<T>

  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = String(args[0])
    if (lastKey !== null && lastKey === key) {
      return lastResult
    }
    lastKey = key
    lastResult = fn.apply(this, args)
    return lastResult
  }
}

export function flow<T>(...fns:Array<(arg:T)=>T>):(initial:T)=>T{return(initial:T):T=>fns.reduce((acc,fn)=>fn(acc),initial)}
export function tryCatch<T extends(...args:any[])=>any,R>(fn:T,fallback:R):(...args:Parameters<T>)=>R{return function(this:any,...args:any[]){try{return fn.apply(this,args)}catch{return fallback}}}
export function attempt<T>(fn:()=>T):T|Error{try{return fn()}catch(e){return e instanceof Error?e:new Error(String(e))}}
export function property<T=unknown>(path:string):(obj:unknown)=>T|undefined{return(obj:unknown):T|undefined=>{if(obj==null)return undefined;const keys=path.split('.');let current:any=obj;for(const key of keys){if(current==null||typeof current!=='object')return undefined;current=current[key]}return current as T}}
export function converge<R>(converger:(...args:any[])=>R,branches:Array<(...args:any[])=>any>):(...args:any[])=>R{return function(this:any,...args:any[]){return converger.apply(this,branches.map(b=>b.apply(this,args)))}}
export function flip<T,U,R>(fn:(a:T,b:U)=>R):(b:U,a:T)=>R{return(b:U,a:T):R=>fn(a,b)}
export function after<T extends(...args:any[])=>any>(n:number,fn:T):(...args:Parameters<T>)=>ReturnType<T>|undefined{let c=0;return function(this:any,...args:any[]){c++;if(c>=n)return fn.apply(this,args);return undefined}}
export function ifElse<T,R>(predicate:(value:T)=>boolean,onTrue:(value:T)=>R,onFalse:(value:T)=>R):(value:T)=>R{return(v:T):R=>predicate(v)?onTrue(v):onFalse(v)}
export function when<T>(predicate:(value:T)=>boolean,fn:(value:T)=>T):(value:T)=>T{return(v:T):T=>predicate(v)?fn(v):v}
export function unless<T>(predicate:(value:T)=>boolean,fn:(value:T)=>T):(value:T)=>T{return(v:T):T=>predicate(v)?v:fn(v)}
export function curryRight<T extends(...args:any[])=>any>(fn:T,arity?:number):(...args:any[])=>any{const a=arity??fn.length;function c(this:any,...args:any[]):any{if(args.length>=a)return fn.apply(this,args);return function(this:any,...m:any[]){return c.apply(this,[...m,...args])}}return c}
