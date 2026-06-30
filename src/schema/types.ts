import { msg } from './messages.js'

// ─── SchemaError ────────────────────────────────────────────

export class SchemaError extends Error {
  override readonly name: string = 'SchemaError'
  readonly path: string
  readonly received: unknown

  constructor(message: string, options?: { path?: string; received?: unknown }) {
    super(message)
    this.name = 'SchemaError'
    this.path = options?.path ?? ''
    this.received = options?.received
    // Ensure instanceof works even with different realm/context
    Object.setPrototypeOf(this, SchemaError.prototype)
  }

  toJSON(): { name: string; message: string; path: string; received: unknown } {
    return { name: this.name, message: this.message, path: this.path, received: this.received }
  }
}

// ─── Schema base class ──────────────────────────────────────

export abstract class Schema<T> {
  abstract _parse(value: unknown): T

  parse(value: unknown): T {
    return this._parse(value)
  }

  safeParse(value: unknown): { success: boolean; data?: T; error?: string } {
    try {
      const result = this._parse(value)
      // Handle async schemas (PromiseSchema, async refine, etc.)
      if (result instanceof Promise) {
        // For synchronous callers, we need to handle this carefully
        // Return a sync result; async callers should use safeParseAsync
        return { success: false, error: 'Use safeParseAsync for async schemas' }
      }
      return { success: true, data: result as T }
    } catch (e) {
      if (e instanceof SchemaError) return { success: false, error: e.message }
      if (e instanceof Error) return { success: false, error: e.message }
      return { success: false, error: 'Validation failed' }
    }
  }

  async safeParseAsync(value: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const result = this._parse(value)
      const data = result instanceof Promise ? await result : result
      return { success: true, data: data as T }
    } catch (e) {
      if (e instanceof SchemaError) return { success: false, error: e.message }
      if (e instanceof Error) return { success: false, error: e.message }
      return { success: false, error: 'Validation failed' }
    }
  }

  optional(): Schema<T | undefined> {
    return new OptionalSchema(this)
  }
  nullable(): Schema<T | null> {
    return new NullableSchema(this)
  }
  default(defaultValue: T): Schema<T> {
    return new DefaultSchema(this, defaultValue)
  }
  describe(_description: string): this {
    return this
  }
  refine(fn: (val: T) => boolean, message: string): Schema<T> {
    return new RefineSchema(this, fn, message)
  }
  brand<B extends string>(_brand?: B): Schema<T & { __brand: B }> {
    return this as any
  }
  transform<U>(fn: (val: T) => U): Schema<U> {
    return new TransformSchema(this, fn)
  }
  catch<U>(fallback: U): Schema<T | U> {
    return new CatchSchema(this, fallback)
  }
  readonly(): Schema<T> {
    return this
  }

  get _internal(): this {
    return this
  }
}

// ─── Wrapper schemas ────────────────────────────────────────

class OptionalSchema<T> extends Schema<T | undefined> {
  constructor(private readonly inner: Schema<T>) {
    super()
  }

  _parse(value: unknown): T | undefined {
    if (value === undefined) return undefined
    return this.inner._parse(value)
  }
}

class NullableSchema<T> extends Schema<T | null> {
  constructor(private readonly inner: Schema<T>) {
    super()
  }

  _parse(value: unknown): T | null {
    if (value === null) return null
    return this.inner._parse(value)
  }
}

class DefaultSchema<T> extends Schema<T> {
  constructor(
    private readonly inner: Schema<T>,
    private readonly defaultValue: T,
  ) {
    super()
  }

  _parse(value: unknown): T {
    if (value === undefined) return this.defaultValue
    return this.inner._parse(value)
  }
}

class RefineSchema<T> extends Schema<T> {
  constructor(
    private readonly inner: Schema<T>,
    private readonly fn: (val: T) => boolean,
    private readonly errorMsg: string,
  ) {
    super()
  }

  _parse(value: unknown): T {
    const result = this.inner._parse(value)
    if (!this.fn(result)) {
      throw new SchemaError(msg('refine_fail', { message: this.errorMsg }))
    }
    return result
  }
}

class TransformSchema<T, U> extends Schema<U> {
  constructor(
    private readonly inner: Schema<T>,
    private readonly fn: (val: T) => U,
  ) {
    super()
  }

  _parse(value: unknown): U {
    const result = this.inner._parse(value)
    return this.fn(result)
  }
}

class CatchSchema<T, U> extends Schema<T | U> {
  constructor(
    private readonly inner: Schema<T>,
    private readonly fallback: U,
  ) {
    super()
  }

  _parse(value: unknown): T | U {
    try {
      return this.inner._parse(value)
    } catch {
      return this.fallback
    }
  }
}

export class LazySchema<T> extends Schema<T> {
  private inner: Schema<T> | null = null
  private readonly factory: () => Schema<T>

  constructor(factory: () => Schema<T>) {
    super()
    this.factory = factory
  }

  _parse(value: unknown): T {
    if (!this.inner) {
      this.inner = this.factory()
    }
    return this.inner!._parse(value)
  }
}

export function lazy<T>(factory: () => Schema<T>): Schema<T> {
  return new LazySchema(factory)
}

export type Brand<T, B> = T & { __brand: B }

// ─── Infer type helper ──────────────────────────────────────

export type Infer<S extends Schema<unknown>> = S extends Schema<infer T> ? T : never

// ─── Re-export wrappers for use by other files ──────────────

export { OptionalSchema, NullableSchema, DefaultSchema, RefineSchema, TransformSchema }
