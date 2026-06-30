import { describe, it, expect } from 'vitest'
import { schema, Schema, SchemaError, Infer, setLocale } from '../src/schema/index.js'

// ─── Primitives ─────────────────────────────────────────────

describe('schema.string()', () => {
  it('parses strings', () => {
    const sc = schema.string()
    expect(sc.parse('hello')).toBe('hello')
    expect(() => sc.parse(123)).toThrow(SchemaError)
    expect(() => sc.parse(null)).toThrow(SchemaError)
  })

  it('validates min length', () => {
    const sc = schema.string().min(3)
    expect(sc.parse('abc')).toBe('abc')
    expect(() => sc.parse('ab')).toThrow('Minimum 3 characters')
  })

  it('validates max length', () => {
    const sc = schema.string().max(5)
    expect(sc.parse('hello')).toBe('hello')
    expect(() => sc.parse('hello!')).toThrow('Maximum 5 characters')
  })

  it('validates exact length', () => {
    const sc = schema.string().length(3)
    expect(sc.parse('abc')).toBe('abc')
    expect(() => sc.parse('ab')).toThrow('Exactly 3 characters required')
  })

  it('validates email', () => {
    const sc = schema.string().email()
    expect(sc.parse('user@example.com')).toBe('user@example.com')
    expect(() => sc.parse('not-email')).toThrow('Invalid email format')
  })

  it('validates URL', () => {
    const sc = schema.string().url()
    expect(sc.parse('https://example.com')).toBe('https://example.com')
    expect(() => sc.parse('not-a-url')).toThrow('Invalid URL format')
  })

  it('validates regex', () => {
    const sc = schema.string().regex(/^\d{3}$/)
    expect(sc.parse('123')).toBe('123')
    expect(() => sc.parse('abc')).toThrow('Format does not match expected pattern')
  })

  it('validates includes', () => {
    const sc = schema.string().includes('world')
    expect(sc.parse('hello world')).toBe('hello world')
    expect(() => sc.parse('hello')).toThrow('Must contain "world"')
  })

  it('validates startsWith / endsWith', () => {
    const start = schema.string().startsWith('he')
    expect(start.parse('hello')).toBe('hello')
    expect(() => start.parse('yo')).toThrow('Must start with "he"')

    const end = schema.string().endsWith('lo')
    expect(end.parse('hello')).toBe('hello')
    expect(() => end.parse('hel')).toThrow('Must end with "lo"')
  })

  it('trims strings', () => {
    const sc = schema.string().trim()
    expect(sc.parse('  hello  ')).toBe('hello')
  })

  it('lowercases strings', () => {
    const sc = schema.string().lowercase()
    expect(sc.parse('HELLO')).toBe('hello')
  })

  it('uppercases strings', () => {
    const sc = schema.string().uppercase()
    expect(sc.parse('hello')).toBe('HELLO')
  })
})

describe('schema.number()', () => {
  it('parses numbers', () => {
    expect(schema.number().parse(42)).toBe(42)
    expect(() => schema.number().parse('42')).toThrow(SchemaError)
    expect(() => schema.number().parse(NaN)).toThrow(SchemaError)
  })

  it('validates min/max', () => {
    const sc = schema.number().min(5).max(10)
    expect(sc.parse(7)).toBe(7)
    expect(() => sc.parse(3)).toThrow('Minimum value is 5')
    expect(() => sc.parse(12)).toThrow('Maximum value is 10')
  })

  it('validates int', () => {
    const sc = schema.number().int()
    expect(sc.parse(5)).toBe(5)
    expect(() => sc.parse(5.5)).toThrow('Expected an integer')
  })

  it('validates positive/negative', () => {
    expect(schema.number().positive().parse(1)).toBe(1)
    expect(() => schema.number().positive().parse(-1)).toThrow('Expected a positive number')
    expect(schema.number().negative().parse(-1)).toBe(-1)
    expect(() => schema.number().negative().parse(1)).toThrow('Expected a negative number')
  })

  it('validates finite', () => {
    expect(schema.number().finite().parse(1)).toBe(1)
    expect(() => schema.number().finite().parse(Infinity)).toThrow()
  })

  it('validates safe integer', () => {
    expect(schema.number().safe().parse(42)).toBe(42)
    expect(() => schema.number().safe().parse(Number.MAX_SAFE_INTEGER + 2)).toThrow('safe')
  })
})

describe('schema.boolean()', () => {
  it('parses booleans', () => {
    expect(schema.boolean().parse(true)).toBe(true)
    expect(schema.boolean().parse(false)).toBe(false)
    expect(() => schema.boolean().parse(1)).toThrow(SchemaError)
  })
})

describe('schema.bigint()', () => {
  it('parses bigints', () => {
    expect(schema.bigint().parse(BigInt(42))).toBe(BigInt(42))
    expect(() => schema.bigint().parse(42)).toThrow(SchemaError)
  })
})

describe('schema.symbol()', () => {
  it('parses symbols', () => {
    const sym = Symbol('test')
    expect(schema.symbol().parse(sym)).toBe(sym)
    expect(() => schema.symbol().parse('sym')).toThrow(SchemaError)
  })
})

describe('schema.undefined() / schema.null() / schema.nan()', () => {
  it('parses undefined', () => {
    expect(schema.undefined().parse(undefined)).toBe(undefined)
    expect(() => schema.undefined().parse(null)).toThrow(SchemaError)
  })

  it('parses null', () => {
    expect(schema.null().parse(null)).toBe(null)
    expect(() => schema.null().parse(undefined)).toThrow(SchemaError)
  })

  it('parses NaN', () => {
    expect(Number.isNaN(schema.nan().parse(NaN))).toBe(true)
    expect(() => schema.nan().parse(0)).toThrow(SchemaError)
  })
})

// ─── Complex ────────────────────────────────────────────────

describe('schema.object()', () => {
  it('validates objects', () => {
    const sc = schema.object({
      name: schema.string(),
      age: schema.number(),
    })
    expect(sc.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
    expect(() => sc.parse({ name: 'John' })).toThrow(SchemaError)
    expect(() => sc.parse(null)).toThrow(SchemaError)
  })

  it('supports strict mode', () => {
    const sc = schema.object({ name: schema.string() }).strict()
    expect(() => sc.parse({ name: 'John', extra: 'x' })).toThrow('Unexpected key: "extra"')
  })

  it('supports passthrough mode', () => {
    const sc = schema.object({ name: schema.string() }).passthrough()
    expect(sc.parse({ name: 'John', extra: 'x' })).toEqual({ name: 'John', extra: 'x' })
  })

  it('supports partial', () => {
    const sc = schema.object({ name: schema.string(), age: schema.number() }).partial()
    expect(sc.parse({})).toEqual({})
    expect(sc.parse({ name: 'John' })).toEqual({ name: 'John' })
  })

  it('supports pick', () => {
    const sc = schema.object({ name: schema.string(), age: schema.number() }).pick(['name'])
    expect(sc.parse({ name: 'John' })).toEqual({ name: 'John' })
    expect('age' in sc.parse({ name: 'John' })).toBe(false)
  })

  it('supports omit', () => {
    const sc = schema.object({ name: schema.string(), age: schema.number() }).omit(['age'])
    expect(sc.parse({ name: 'John' })).toEqual({ name: 'John' })
  })

  it('supports extend', () => {
    const base = schema.object({ name: schema.string() })
    const extended = base.extend({ age: schema.number() })
    expect(extended.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
  })

  it('supports merge', () => {
    const a = schema.object({ name: schema.string() })
    const b = schema.object({ age: schema.number() })
    const merged = a.merge(b)
    expect(merged.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
  })
})

describe('schema.array()', () => {
  it('validates arrays', () => {
    const sc = schema.array(schema.number())
    expect(sc.parse([1, 2, 3])).toEqual([1, 2, 3])
    expect(() => sc.parse('not-array')).toThrow(SchemaError)
  })

  it('validates min/max/length', () => {
    expect(schema.array(schema.any()).min(2).parse([1, 2])).toEqual([1, 2])
    expect(() => schema.array(schema.any()).min(2).parse([1])).toThrow('Minimum 2 items')
    expect(schema.array(schema.any()).max(2).parse([1])).toEqual([1])
    expect(() => schema.array(schema.any()).max(2).parse([1, 2, 3])).toThrow('Maximum 2 items')
    expect(schema.array(schema.any()).length(2).parse([1, 2])).toEqual([1, 2])
    expect(() => schema.array(schema.any()).length(2).parse([1])).toThrow('Exactly 2 items required')
  })

  it('validates nonempty', () => {
    expect(schema.array(schema.any()).nonempty().parse([1])).toEqual([1])
    expect(() => schema.array(schema.any()).nonempty().parse([])).toThrow('Array must not be empty')
  })

  it('validates unique', () => {
    expect(schema.array(schema.number()).unique().parse([1, 2])).toEqual([1, 2])
    expect(() => schema.array(schema.number()).unique().parse([1, 1])).toThrow('All items must be unique')
  })
})

describe('schema.tuple()', () => {
  it('validates tuples', () => {
    const sc = schema.tuple(schema.string(), schema.number())
    expect(sc.parse(['hello', 42])).toEqual(['hello', 42])
    expect(() => sc.parse(['hello'])).toThrow('Tuple must have exactly 2 items')
    expect(() => sc.parse(['hello', 'world'])).toThrow(SchemaError)
  })
})

describe('schema.enum()', () => {
  it('validates enums', () => {
    const sc = schema.enum(['a', 'b', 'c'])
    expect(sc.parse('a')).toBe('a')
    expect(() => sc.parse('d')).toThrow('Value must be one of: a, b, c')
  })
})

describe('schema.union()', () => {
  it('validates unions', () => {
    const sc = schema.union(schema.string(), schema.number())
    expect(sc.parse('hello')).toBe('hello')
    expect(sc.parse(42)).toBe(42)
    expect(() => sc.parse(true)).toThrow('Value does not match any schema')
  })
})

describe('schema.intersection()', () => {
  it('validates intersections', () => {
    const a = schema.object({ name: schema.string() })
    const b = schema.object({ age: schema.number() })
    const sc = schema.intersection(a, b)
    expect(sc.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
  })
})

describe('schema.record()', () => {
  it('validates records', () => {
    const sc = schema.record(schema.number())
    expect(sc.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
    expect(() => sc.parse({ a: 'x' })).toThrow(SchemaError)
  })
})

describe('schema.map()', () => {
  it('validates maps', () => {
    const sc = schema.map(schema.string(), schema.number())
    const map = new Map([['a', 1], ['b', 2]])
    const result = sc.parse(map)
    expect(result).toBeInstanceOf(Map)
    expect(result.get('a')).toBe(1)
    expect(result.get('b')).toBe(2)
    expect(() => sc.parse({})).toThrow('Map')
  })
})

describe('schema.set()', () => {
  it('validates sets', () => {
    const sc = schema.set(schema.number())
    const set = new Set([1, 2, 3])
    const result = sc.parse(set)
    expect(result).toBeInstanceOf(Set)
    expect(result.has(1)).toBe(true)
    expect(result.has(4)).toBe(false)
    expect(() => sc.parse([])).toThrow('Set')
  })
})

describe('schema.date()', () => {
  it('validates dates', () => {
    const d = new Date('2024-01-01')
    expect(schema.date().parse(d)).toBe(d)
    expect(schema.date().parse(new Date())).toBeInstanceOf(Date)
    expect(schema.date().parse('2024-01-01')).toBeInstanceOf(Date)
    expect(() => schema.date().parse(new Date('invalid'))).toThrow('Invalid date')
    expect(() => schema.date().parse(true as any)).toThrow(SchemaError)
  })
})

describe('schema.literal()', () => {
  it('validates literals', () => {
    expect(schema.literal('hello').parse('hello')).toBe('hello')
    expect(() => schema.literal('hello').parse('world')).toThrow('Value must be hello')
    expect(schema.literal(42).parse(42)).toBe(42)
    expect(schema.literal(true).parse(true)).toBe(true)
    expect(schema.literal(null).parse(null)).toBe(null)
  })
})

describe('schema.any() / schema.unknown()', () => {
  it('passes through any value', () => {
    expect(schema.any().parse('hello')).toBe('hello')
    expect(schema.any().parse(42)).toBe(42)
    expect(schema.any().parse(null)).toBe(null)
    expect(schema.any().parse({ a: 1 })).toEqual({ a: 1 })
  })
})

// ─── Wrappers ───────────────────────────────────────────────

describe('optional / nullable / default', () => {
  it('optional allows undefined', () => {
    const sc = schema.string().optional()
    expect(sc.parse('hello')).toBe('hello')
    expect(sc.parse(undefined)).toBe(undefined)
  })

  it('nullable allows null', () => {
    const sc = schema.string().nullable()
    expect(sc.parse('hello')).toBe('hello')
    expect(sc.parse(null)).toBe(null)
  })

  it('default replaces undefined', () => {
    const sc = schema.string().default('default')
    expect(sc.parse('hello')).toBe('hello')
    expect(sc.parse(undefined)).toBe('default')
  })
})

describe('refine', () => {
  it('validates with custom function', () => {
    const sc = schema.string().refine(val => val.length > 5, 'Too short!')
    expect(sc.parse('hello world')).toBe('hello world')
    expect(() => sc.parse('hi')).toThrow('Too short')
  })
})

// ─── safeParse ──────────────────────────────────────────────

describe('safeParse', () => {
  it('returns success result', () => {
    const result = schema.number().safeParse(42)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe(42)
  })

  it('returns error result', () => {
    const result = schema.number().safeParse('not-a-number')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBeDefined()
  })
})

// ─── Coerce ─────────────────────────────────────────────────

describe('schema.coerce', () => {
  it('coerces to string', () => {
    expect(schema.coerce.string().parse(123)).toBe('123')
    expect(schema.coerce.string().parse(true)).toBe('true')
  })

  it('coerces to number', () => {
    expect(schema.coerce.number().parse('42')).toBe(42)
    expect(schema.coerce.number().parse('3.14')).toBe(3.14)
    expect(() => schema.coerce.number().parse('abc')).toThrow(SchemaError)
  })

  it('coerces to boolean', () => {
    expect(schema.coerce.boolean().parse('true')).toBe(true)
    expect(schema.coerce.boolean().parse('false')).toBe(false)
    expect(schema.coerce.boolean().parse(1)).toBe(true)
    expect(schema.coerce.boolean().parse(0)).toBe(false)
  })

  it('coerces to date', () => {
    const d = schema.coerce.date().parse('2024-01-01')
    expect(d).toBeInstanceOf(Date)
    expect(schema.coerce.date().parse(1704067200000)).toBeInstanceOf(Date)
    expect(() => schema.coerce.date().parse('not-a-date')).toThrow(SchemaError)
  })
})

// ─── Transform ──────────────────────────────────────────────

describe('schema.transform()', () => {
  it('transforms values', () => {
    const sc = schema.transform<number>(val => Number(val))
    expect(sc.parse('42')).toBe(42)
    expect(sc.parse('3.14')).toBe(3.14)
  })
})

describe('.transform() on Schema', () => {
  it('chains transforms', () => {
    const sc = schema.string().transform(val => val.length)
    expect(sc.parse('hello')).toBe(5)
  })
})

// ─── Infer type test (compile-time) ─────────────────────────

describe('Infer type', () => {
  it('infers correct types', () => {
    const UserSchema = schema.object({
      id: schema.number(),
      name: schema.string().min(3),
      email: schema.string().email().optional(),
    })

    const user = UserSchema.parse({ id: 1, name: 'John', email: 'john@test.com' })

    // Runtime assertions to verify the type works
    expect(typeof user.id).toBe('number')
    expect(typeof user.name).toBe('string')
    expect(user.email).toBe('john@test.com')
  })
})

// ─── setLocale ──────────────────────────────────────────────

describe('setLocale', () => {
  it('switches to English', () => {
    setLocale('en')
    expect(() => schema.string().min(5).parse('ab')).toThrow('Minimum 5 characters')
  })
})

// ─── SchemaError ────────────────────────────────────────────

describe('SchemaError', () => {
  it('has proper stack trace', () => {
    try {
      schema.number().parse('not-number')
    } catch (e) {
      expect(e).toBeInstanceOf(SchemaError)
      expect((e as SchemaError).name).toBe('SchemaError')
      expect((e as SchemaError).message).toBeDefined()
    }
  })

  it('supports toJSON', () => {
    const err = new SchemaError('test', { path: 'foo', received: 42 })
    const json = err.toJSON()
    expect(json.name).toBe('SchemaError')
    expect(json.message).toBe('test')
    expect(json.path).toBe('foo')
    expect(json.received).toBe(42)
  })
})

// ─── describe ───────────────────────────────────────────────

describe('.describe()', () => {
  it('returns the same schema', () => {
    const sc = schema.string().describe('A string field')
    expect(sc.parse('test')).toBe('test')
  })
})
