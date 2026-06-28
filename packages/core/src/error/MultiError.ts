/**
 * Collects multiple errors into a single aggregate error.
 *
 * Useful for batch operations where independent steps may each fail and you
 * want to report all failures together rather than throwing on the first one.
 *
 * @example
 * ```ts
 * const err = new MultiError([
 *   new Error('First failure'),
 *   new Error('Second failure'),
 * ])
 * throw err
 * ```
 */
export class MultiError extends Error {
  readonly errors: Error[]

  constructor(errors: Error[], message?: string) {
    const joined = errors.map((e) => e.message).join('; ')
    super(message ?? joined)
    this.name = 'MultiError'
    this.errors = [...errors]

    Object.setPrototypeOf(this, new.target.prototype)
  }

  /** Number of collected errors. */
  get length(): number {
    return this.errors.length
  }

  /**
   * Check if any collected error satisfies `predicate`.
   *
   * @example
   * ```ts
   * if (err.some(e => e.message.includes('timeout'))) { … }
   * ```
   */
  some(predicate: (error: Error) => boolean): boolean {
    return this.errors.some(predicate)
  }

  /** Array of all error messages. */
  get messages(): string[] {
    return this.errors.map((e) => e.message)
  }

  /**
   * Serialize to a plain JSON-safe object.
   */
  toJSON(): {
    name: string
    message: string
    errors: Array<{ name: string; message: string; stack?: string }>
    stack?: string
  } {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors.map((e) => ({
        name: e.name,
        message: e.message,
        ...(e.stack ? { stack: e.stack } : {}),
      })),
      ...(this.stack ? { stack: this.stack } : {}),
    }
  }

  override toString(): string {
    return `${this.name}: ${this.message}`
  }
}

/**
 * Run `fn` and capture any thrown error.
 *
 * If `fn` returns successfully, `result` holds the return value and `errors`
 * is an empty array. If `fn` throws, `errors` contains the thrown value
 * (wrapped in an `Error` if it is not already one).
 *
 * @example
 * ```ts
 * const { result, errors } = collectErrors(() => {
 *   return riskyOperation()
 * })
 * if (errors.length > 0) {
 *   console.error('Operation failed', errors)
 * }
 * ```
 */
export function collectErrors<T>(
  fn: () => T,
): { result?: T; errors: Error[] } {
  try {
    return { result: fn(), errors: [] }
  } catch (err) {
    return {
      errors: [err instanceof Error ? err : new Error(String(err))],
    }
  }
}
