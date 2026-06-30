// ─── Types ──────────────────────────────────────────────────

export { Schema, SchemaError, lazy, LazySchema } from './types.js'
export type { Infer } from './types.js'

// ─── Messages ───────────────────────────────────────────────

export { setLocale, getLocale } from './messages.js'

// ─── Primitives ─────────────────────────────────────────────

export {
  StringSchema,
  NumberSchema,
  BooleanSchema,
  BigIntSchema,
  SymbolSchema,
  UndefinedSchema,
  NullSchema,
  NaNSchema,
} from './primitives.js'

// ─── Complex ────────────────────────────────────────────────

export {
  ObjectSchema,
  ArraySchema,
  TupleSchema,
  EnumSchema,
  UnionSchema,
  DiscriminatedUnionSchema,
  IntersectionSchema,
  RecordSchema,
  MapSchema,
  SetSchema,
  DateSchema,
  LiteralSchema,
  AnySchema,
  UnknownSchema,
} from './complex.js'

// ─── Transform ──────────────────────────────────────────────

export { CoerceStringSchema, CoerceNumberSchema, CoerceBooleanSchema, CoerceDateSchema } from './transform.js'

// ─── Factory imports ────────────────────────────────────────

import { Schema as SchemaBase, lazy as lazyFn } from './types.js'
import type { Infer } from './types.js'
import {
  StringSchema,
  NumberSchema,
  BooleanSchema,
  BigIntSchema,
  SymbolSchema,
  UndefinedSchema,
  NullSchema,
  NaNSchema,
} from './primitives.js'
import {
  ObjectSchema,
  ArraySchema,
  TupleSchema,
  EnumSchema,
  UnionSchema,
  DiscriminatedUnionSchema,
  IntersectionSchema,
  RecordSchema,
  MapSchema,
  SetSchema,
  DateSchema,
  LiteralSchema,
  AnySchema,
  UnknownSchema,
} from './complex.js'
import { CoerceStringSchema, CoerceNumberSchema, CoerceBooleanSchema, CoerceDateSchema, StandaloneTransformSchema } from './transform.js'

// ─── schema factory namespace ────────────────────────────────
// Factory functions to create validation schemas.
// Usage: schema.string(), schema.object({...}), schema.array(schema.number())

export const schema = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  bigint: () => new BigIntSchema(),
  symbol: () => new SymbolSchema(),
  undefined: () => new UndefinedSchema(),
  null: () => new NullSchema(),
  nan: () => new NaNSchema(),
  object: <T extends Record<string, SchemaBase<unknown>>>(shape: T) => new ObjectSchema(shape),
  array: <T>(itemSchema: SchemaBase<T>) => new ArraySchema(itemSchema),
  tuple: <T extends SchemaBase<unknown>[]>(...schemas: T) => new TupleSchema(schemas as unknown as [...T]) as unknown as TupleSchema<T>,
  enum: <T extends string>(values: readonly T[]) => new EnumSchema(values),
  union: <T extends SchemaBase<unknown>[]>(...schemas: T) => new UnionSchema(schemas) as unknown as UnionSchema<Infer<T[number]>>,
  intersection: <A, B>(left: SchemaBase<A>, right: SchemaBase<B>) => new IntersectionSchema(left, right),
  record: <V>(valueSchema: SchemaBase<V>) => new RecordSchema(valueSchema),
  map: <K, V>(keySchema: SchemaBase<K>, valueSchema: SchemaBase<V>) => new MapSchema(keySchema, valueSchema),
  set: <T>(itemSchema: SchemaBase<T>) => new SetSchema(itemSchema),
  date: () => new DateSchema(),
  literal: <T extends string | number | boolean | null | undefined>(value: T) => new LiteralSchema(value),
  any: () => new AnySchema(),
  unknown: () => new UnknownSchema(),
  lazy: <T>(factory: () => SchemaBase<T>) => lazyFn(factory),
  discriminatedUnion: <K extends string, U extends Record<string, SchemaBase<unknown>>>(key: K, schemasMap: U) =>
    new DiscriminatedUnionSchema(key, schemasMap),

  coerce: {
    string: () => new CoerceStringSchema(),
    number: () => new CoerceNumberSchema(),
    boolean: () => new CoerceBooleanSchema(),
    date: () => new CoerceDateSchema(),
  },

  transform: <T>(fn: (value: unknown) => T) => new StandaloneTransformSchema(fn),
} as const

/** @deprecated Use `schema` instead. Will be removed in v1.0.0 */
export const s = schema
