import { msg } from './messages.js'

// ─── SchemaError ────────────────────────────────────────────

export class SchemaError extends Error {
  readonly path: string
  readonly received: unknown

  constructor(message: string, options?: { path?: string; received?: unknown }) {
    super(message)
    this.name = 'SchemaError'
    this.path = options?.path ?? ''
    this.received = options?.received
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
      return { success: true, data: this._parse(value) }
    } catch (e) {
      return { success: false, error: e instanceof SchemaError ? e.message : String(e) }
    }
  }

  optional(): Schema<T | undefined> { return new OptionalSchema(this) }
  nullable(): Schema<T | null> { return new NullableSchema(this) }
  default(defaultValue: T): Schema<T> { return new DefaultSchema(this, defaultValue) }
  describe(_description: string): this { return this }
  refine(fn: (val: T) => boolean, message: string): Schema<T> { return new RefineSchema(this, fn, message) }
  brand<B extends string>(_brand?: B): Schema<T & { __brand: B }> { return this as any }
  transform<U>(fn: (val: T) => U): Schema<U> { return new TransformSchema(this, fn) }

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

export type Brand<T, B> = T & { __brand: B }

// ─── Infer type helper ──────────────────────────────────────

export type Infer<S extends Schema<unknown>> = S extends Schema<infer T> ? T : never

// ─── Re-export wrappers for use by other files ──────────────

export { OptionalSchema, NullableSchema, DefaultSchema, RefineSchema, TransformSchema }
