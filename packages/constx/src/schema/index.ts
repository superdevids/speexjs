// ─── Types ──────────────────────────────────────────────────

export { Schema, SchemaError } from './types.js'
export type { Infer } from './types.js'

// ─── Messages ───────────────────────────────────────────────

export { setLocale, getLocale } from './messages.js'

// ─── Primitives ─────────────────────────────────────────────

export { StringSchema, NumberSchema, BooleanSchema, BigIntSchema, SymbolSchema, UndefinedSchema, NullSchema, NaNSchema } from './primitives.js'

// ─── Complex ────────────────────────────────────────────────

export { ObjectSchema, ArraySchema, TupleSchema, EnumSchema, UnionSchema, IntersectionSchema, RecordSchema, MapSchema, SetSchema, DateSchema, LiteralSchema, AnySchema, UnknownSchema } from './complex.js'

// ─── Indonesia ──────────────────────────────────────────────

export { NIKSchema, NPWPSchema, PhoneSchema, AlamatSchema, KodeposSchema, RekeningSchema } from './indonesia.js'

// ─── Transform ──────────────────────────────────────────────

export { CoerceStringSchema, CoerceNumberSchema, CoerceBooleanSchema, CoerceDateSchema } from './transform.js'

// ─── Factory imports ────────────────────────────────────────

import { Schema as SchemaBase } from './types.js'
import { StringSchema, NumberSchema, BooleanSchema, BigIntSchema, SymbolSchema, UndefinedSchema, NullSchema, NaNSchema } from './primitives.js'
import { ObjectSchema, ArraySchema, TupleSchema, EnumSchema, UnionSchema, IntersectionSchema, RecordSchema, MapSchema, SetSchema, DateSchema, LiteralSchema, AnySchema, UnknownSchema } from './complex.js'
import { NIKSchema, NPWPSchema, PhoneSchema, AlamatSchema, KodeposSchema, RekeningSchema } from './indonesia.js'
import { CoerceStringSchema, CoerceNumberSchema, CoerceBooleanSchema, CoerceDateSchema, StandaloneTransformSchema } from './transform.js'

// ─── s namespace ────────────────────────────────────────────

export const s = {
  string(): StringSchema {
    return new StringSchema()
  },

  number(): NumberSchema {
    return new NumberSchema()
  },

  boolean(): BooleanSchema {
    return new BooleanSchema()
  },

  bigint(): BigIntSchema {
    return new BigIntSchema()
  },

  symbol(): SymbolSchema {
    return new SymbolSchema()
  },

  undefined(): UndefinedSchema {
    return new UndefinedSchema()
  },

  null(): NullSchema {
    return new NullSchema()
  },

  nan(): NaNSchema {
    return new NaNSchema()
  },

  object<T extends Record<string, SchemaBase<unknown>>>(shape: T): ObjectSchema<T> {
    return new ObjectSchema(shape)
  },

  array<T>(itemSchema: SchemaBase<T>): ArraySchema<T> {
    return new ArraySchema(itemSchema)
  },

  tuple<T extends SchemaBase<unknown>[]>(...schemas: T): TupleSchema<T> {
    return new TupleSchema(schemas as any) as TupleSchema<T>
  },

  enum<T extends string>(values: readonly T[]): EnumSchema<T> {
    return new EnumSchema(values)
  },

  union<T extends SchemaBase<unknown>[]>(...schemas: T): UnionSchema<T[number] extends SchemaBase<infer U> ? U : never> {
    return new UnionSchema(schemas) as any
  },

  intersection<A, B>(left: SchemaBase<A>, right: SchemaBase<B>): IntersectionSchema<A, B> {
    return new IntersectionSchema(left, right)
  },

  record<V>(valueSchema: SchemaBase<V>): RecordSchema<V> {
    return new RecordSchema(valueSchema)
  },

  map<K, V>(keySchema: SchemaBase<K>, valueSchema: SchemaBase<V>): MapSchema<K, V> {
    return new MapSchema(keySchema, valueSchema)
  },

  set<T>(itemSchema: SchemaBase<T>): SetSchema<T> {
    return new SetSchema(itemSchema)
  },

  date(): DateSchema {
    return new DateSchema()
  },

  literal<T extends string | number | boolean | null | undefined>(value: T): LiteralSchema<T> {
    return new LiteralSchema(value)
  },

  any(): AnySchema {
    return new AnySchema()
  },

  unknown(): UnknownSchema {
    return new UnknownSchema()
  },

  // ─── Indonesia ──────────────────────────────────────────

  nik(): NIKSchema {
    return new NIKSchema()
  },

  npwp(): NPWPSchema {
    return new NPWPSchema()
  },

  phone(): PhoneSchema {
    return new PhoneSchema()
  },

  alamat(): AlamatSchema {
    return new AlamatSchema()
  },

  kodepos(): KodeposSchema {
    return new KodeposSchema()
  },

  rekening(): RekeningSchema {
    return new RekeningSchema()
  },

  // ─── Coerce ─────────────────────────────────────────────

  coerce: {
    string(): CoerceStringSchema {
      return new CoerceStringSchema()
    },

    number(): CoerceNumberSchema {
      return new CoerceNumberSchema()
    },

    boolean(): CoerceBooleanSchema {
      return new CoerceBooleanSchema()
    },

    date(): CoerceDateSchema {
      return new CoerceDateSchema()
    },
  },

  // ─── Transform ──────────────────────────────────────────

  transform<T>(fn: (value: unknown) => T): StandaloneTransformSchema<T> {
    return new StandaloneTransformSchema(fn)
  },
} as const
