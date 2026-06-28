import { Schema, SchemaError, Infer, OptionalSchema } from './types.js'
import { msg } from './messages.js'

// ─── ObjectSchema ───────────────────────────────────────────

type Shape = Record<string, Schema<unknown>>

export class ObjectSchema<T extends Shape> extends Schema<{ [K in keyof T]: Infer<T[K]> }> {
  readonly shape: T
  private isStrictMode = false
  private isPassthroughMode = false

  constructor(shape: T) {
    super()
    this.shape = shape
  }

  strict(): this {
    this.isStrictMode = true
    this.isPassthroughMode = false
    return this
  }

  passthrough(): this {
    this.isPassthroughMode = true
    this.isStrictMode = false
    return this
  }

  partial(): ObjectSchema<{ [K in keyof T]: Schema<Infer<T[K]> | undefined> }> {
    const newShape = {} as Record<string, Schema<unknown>>
    for (const key in this.shape) {
      if (Object.prototype.hasOwnProperty.call(this.shape, key)) {
        newShape[key] = new OptionalSchema(this.shape[key]!)
      }
    }
    return new ObjectSchema(newShape) as ObjectSchema<{ [K in keyof T]: Schema<Infer<T[K]> | undefined> }>
  }

  pick<K extends keyof T>(keys: K[]): ObjectSchema<Pick<T, K>> {
    const newShape = {} as Record<string, Schema<unknown>>
    for (const key of keys) {
      const strKey = key as string
      if (Object.prototype.hasOwnProperty.call(this.shape, strKey)) {
        newShape[strKey] = this.shape[strKey]!
      }
    }
    return new ObjectSchema(newShape) as ObjectSchema<Pick<T, K>>
  }

  omit<K extends keyof T>(keys: K[]): ObjectSchema<Omit<T, K>> {
    const newShape = {} as Record<string, Schema<unknown>>
    for (const key in this.shape) {
      if (Object.prototype.hasOwnProperty.call(this.shape, key) && !(keys as string[]).includes(key)) {
        newShape[key] = this.shape[key]!
      }
    }
    return new ObjectSchema(newShape) as ObjectSchema<Omit<T, K>>
  }

  extend<U extends Shape>(shape: U): ObjectSchema<T & U> {
    return new ObjectSchema({ ...this.shape, ...shape } as T & U)
  }

  merge<U extends Shape>(other: ObjectSchema<U>): ObjectSchema<T & U> {
    return new ObjectSchema({ ...this.shape, ...other.shape } as T & U)
  }

  _parse(value: unknown): { [K in keyof T]: Infer<T[K]> } {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new SchemaError(msg('type_object'))
    }
    const obj = value as Record<string, unknown>
    const result: Record<string, unknown> = {}

    for (const key in this.shape) {
      if (Object.prototype.hasOwnProperty.call(this.shape, key)) {
        const schema = this.shape[key]!
        try {
          result[key] = schema._parse(obj[key])
        } catch (e) {
          if (e instanceof SchemaError) {
            throw new SchemaError(e.message, {
              path: e.path ? `${key}.${e.path}` : key,
              received: obj[key],
            })
          }
          throw e
        }
      }
    }

    if (this.isStrictMode) {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && !(key in this.shape)) {
          throw new SchemaError(msg('object_strict', { key }))
        }
      }
    }

    if (this.isPassthroughMode) {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && !(key in this.shape)) {
          result[key] = obj[key]
        }
      }
    }

    return result as { [K in keyof T]: Infer<T[K]> }
  }
}

// ─── ArraySchema ────────────────────────────────────────────

export class ArraySchema<T> extends Schema<T[]> {
  private checks: Array<(val: T[]) => void> = []

  constructor(private readonly itemSchema: Schema<T>) {
    super()
  }

  min(n: number): this {
    this.checks.push(val => {
      if (val.length < n) throw new SchemaError(msg('array_min', { min: n }))
    })
    return this
  }

  max(n: number): this {
    this.checks.push(val => {
      if (val.length > n) throw new SchemaError(msg('array_max', { max: n }))
    })
    return this
  }

  length(n: number): this {
    this.checks.push(val => {
      if (val.length !== n) throw new SchemaError(msg('array_length', { length: n }))
    })
    return this
  }

  nonempty(): this {
    this.checks.push(val => {
      if (val.length === 0) throw new SchemaError(msg('array_nonempty'))
    })
    return this
  }

  unique(): this {
    this.checks.push(val => {
      const seen = new Set<T>()
      for (const item of val) {
        if (seen.has(item)) throw new SchemaError(msg('array_unique'))
        seen.add(item)
      }
    })
    return this
  }

  _parse(value: unknown): T[] {
    if (!Array.isArray(value)) throw new SchemaError(msg('type_array'))
    const result: T[] = []
    for (let i = 0; i < value.length; i++) {
      try {
        result.push(this.itemSchema._parse(value[i]))
      } catch (e) {
        if (e instanceof SchemaError) {
          throw new SchemaError(e.message, {
            path: e.path ? `[${i}].${e.path}` : `[${i}]`,
            received: value[i],
          })
        }
        throw e
      }
    }
    for (const check of this.checks) check(result)
    return result
  }
}

// ─── TupleSchema ────────────────────────────────────────────

type TupleSchemaTypes<T extends Schema<unknown>[]> = {
  [K in keyof T]: Infer<T[K]>
}

export class TupleSchema<T extends Schema<unknown>[]> extends Schema<TupleSchemaTypes<T>> {
  constructor(private readonly schemas: [...T]) {
    super()
  }

  _parse(value: unknown): TupleSchemaTypes<T> {
    if (!Array.isArray(value)) throw new SchemaError(msg('type_array'))
    if (value.length !== this.schemas.length) {
      throw new SchemaError(msg('tuple_length', { length: this.schemas.length }))
    }
    const result: unknown[] = []
    for (let i = 0; i < this.schemas.length; i++) {
      try {
        result.push(this.schemas[i]!._parse(value[i]))
      } catch (e) {
        if (e instanceof SchemaError) {
          throw new SchemaError(e.message, {
            path: e.path ? `[${i}].${e.path}` : `[${i}]`,
            received: value[i],
          })
        }
        throw e
      }
    }
    return result as TupleSchemaTypes<T>
  }
}

// ─── EnumSchema ─────────────────────────────────────────────

export class EnumSchema<T extends string> extends Schema<T> {
  constructor(private readonly values: readonly T[]) {
    super()
  }

  _parse(value: unknown): T {
    if (typeof value !== 'string') throw new SchemaError(msg('type_string'))
    for (const v of this.values) {
      if (v === value) return value as T
    }
    throw new SchemaError(msg('enum_invalid', { values: this.values.join(', ') }))
  }

  get enum(): readonly T[] {
    return this.values
  }
}

// ─── UnionSchema ────────────────────────────────────────────

export class UnionSchema<T> extends Schema<T> {
  constructor(private readonly schemas: readonly Schema<unknown>[]) {
    super()
  }

  _parse(value: unknown): T {
    const errors: string[] = []
    for (const schema of this.schemas) {
      try {
        return schema._parse(value) as T
      } catch (e) {
        errors.push(e instanceof SchemaError ? e.message : String(e))
      }
    }
    throw new SchemaError(msg('union_fail'))
  }
}

// ─── IntersectionSchema ─────────────────────────────────────

export class IntersectionSchema<A, B> extends Schema<A & B> {
  constructor(
    private readonly left: Schema<A>,
    private readonly right: Schema<B>,
  ) {
    super()
  }

  _parse(value: unknown): A & B {
    const a = this.left._parse(value)
    const b = this.right._parse(value)
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
      return { ...a, ...b } as A & B
    }
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
      if (a === (b as unknown)) return a as unknown as A & B
    }
    throw new SchemaError(msg('intersection_fail'))
  }
}

// ─── RecordSchema ───────────────────────────────────────────

export class RecordSchema<V> extends Schema<Record<string, V>> {
  constructor(private readonly valueSchema: Schema<V>) {
    super()
  }

  _parse(value: unknown): Record<string, V> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new SchemaError(msg('type_object'))
    }
    const result: Record<string, V> = {}
    const obj = value as Record<string, unknown>
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.valueSchema._parse(obj[key])
      }
    }
    return result
  }
}

// ─── MapSchema ──────────────────────────────────────────────

export class MapSchema<K, V> extends Schema<Map<K, V>> {
  constructor(
    private readonly keySchema: Schema<K>,
    private readonly valueSchema: Schema<V>,
  ) {
    super()
  }

  _parse(value: unknown): Map<K, V> {
    if (!(value instanceof Map)) throw new SchemaError(msg('map_not_map'))
    const result = new Map<K, V>()
    for (const [k, v] of value) {
      result.set(this.keySchema._parse(k), this.valueSchema._parse(v))
    }
    return result
  }
}

// ─── SetSchema ──────────────────────────────────────────────

export class SetSchema<T> extends Schema<Set<T>> {
  constructor(private readonly itemSchema: Schema<T>) {
    super()
  }

  _parse(value: unknown): Set<T> {
    if (!(value instanceof Set)) throw new SchemaError(msg('set_not_set'))
    const result = new Set<T>()
    for (const item of value) {
      result.add(this.itemSchema._parse(item))
    }
    return result
  }
}

// ─── DateSchema ─────────────────────────────────────────────

export class DateSchema extends Schema<Date> {
  _parse(value: unknown): Date {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) throw new SchemaError(msg('date_invalid'))
      return value
    }
    if (typeof value === 'number' || typeof value === 'string') {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) throw new SchemaError(msg('date_invalid'))
      return date
    }
    throw new SchemaError(msg('type_date'))
  }
}

// ─── LiteralSchema ──────────────────────────────────────────

type LiteralValue = string | number | boolean | null | undefined

export class LiteralSchema<T extends LiteralValue> extends Schema<T> {
  constructor(private readonly expected: T) {
    super()
  }

  _parse(value: unknown): T {
    if (value !== this.expected) {
      throw new SchemaError(msg('literal_fail', { expected: String(this.expected) }))
    }
    return value as T
  }
}

// ─── AnySchema ──────────────────────────────────────────────

export class AnySchema extends Schema<any> {
  _parse(value: unknown): any {
    return value
  }
}

// ─── UnknownSchema ──────────────────────────────────────────

export class UnknownSchema extends Schema<unknown> {
  _parse(value: unknown): unknown {
    return value
  }
}
