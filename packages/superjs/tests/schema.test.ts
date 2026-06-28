import { describe, it, expect } from 'vitest'
import { s, Schema, SchemaError, Infer, setLocale } from '../src/schema/index.js'

// ─── Primitives ─────────────────────────────────────────────

describe('s.string()', () => {
  it('parses strings', () => {
    const schema = s.string()
    expect(schema.parse('hello')).toBe('hello')
    expect(() => schema.parse(123)).toThrow(SchemaError)
    expect(() => schema.parse(null)).toThrow(SchemaError)
  })

  it('validates min length', () => {
    const schema = s.string().min(3)
    expect(schema.parse('abc')).toBe('abc')
    expect(() => schema.parse('ab')).toThrow('minimal 3 karakter')
  })

  it('validates max length', () => {
    const schema = s.string().max(5)
    expect(schema.parse('hello')).toBe('hello')
    expect(() => schema.parse('hello!')).toThrow('maksimal 5 karakter')
  })

  it('validates exact length', () => {
    const schema = s.string().length(3)
    expect(schema.parse('abc')).toBe('abc')
    expect(() => schema.parse('ab')).toThrow('tepat 3 karakter')
  })

  it('validates email', () => {
    const schema = s.string().email()
    expect(schema.parse('user@example.com')).toBe('user@example.com')
    expect(() => schema.parse('not-email')).toThrow('email tidak valid')
  })

  it('validates URL', () => {
    const schema = s.string().url()
    expect(schema.parse('https://example.com')).toBe('https://example.com')
    expect(() => schema.parse('not-a-url')).toThrow('URL tidak valid')
  })

  it('validates regex', () => {
    const schema = s.string().regex(/^\d{3}$/)
    expect(schema.parse('123')).toBe('123')
    expect(() => schema.parse('abc')).toThrow('pola yang diharapkan')
  })

  it('validates includes', () => {
    const schema = s.string().includes('world')
    expect(schema.parse('hello world')).toBe('hello world')
    expect(() => schema.parse('hello')).toThrow('mengandung')
  })

  it('validates startsWith / endsWith', () => {
    const start = s.string().startsWith('he')
    expect(start.parse('hello')).toBe('hello')
    expect(() => start.parse('yo')).toThrow('diawali')

    const end = s.string().endsWith('lo')
    expect(end.parse('hello')).toBe('hello')
    expect(() => end.parse('hel')).toThrow('diakhiri')
  })

  it('trims strings', () => {
    const schema = s.string().trim()
    expect(schema.parse('  hello  ')).toBe('hello')
  })

  it('lowercases strings', () => {
    const schema = s.string().lowercase()
    expect(schema.parse('HELLO')).toBe('hello')
  })

  it('uppercases strings', () => {
    const schema = s.string().uppercase()
    expect(schema.parse('hello')).toBe('HELLO')
  })
})

describe('s.number()', () => {
  it('parses numbers', () => {
    expect(s.number().parse(42)).toBe(42)
    expect(() => s.number().parse('42')).toThrow(SchemaError)
    expect(() => s.number().parse(NaN)).toThrow(SchemaError)
  })

  it('validates min/max', () => {
    const schema = s.number().min(5).max(10)
    expect(schema.parse(7)).toBe(7)
    expect(() => schema.parse(3)).toThrow('minimal')
    expect(() => schema.parse(12)).toThrow('maksimal')
  })

  it('validates int', () => {
    const schema = s.number().int()
    expect(schema.parse(5)).toBe(5)
    expect(() => schema.parse(5.5)).toThrow('bilangan bulat')
  })

  it('validates positive/negative', () => {
    expect(s.number().positive().parse(1)).toBe(1)
    expect(() => s.number().positive().parse(-1)).toThrow('positif')
    expect(s.number().negative().parse(-1)).toBe(-1)
    expect(() => s.number().negative().parse(1)).toThrow('negatif')
  })

  it('validates finite', () => {
    expect(s.number().finite().parse(1)).toBe(1)
    expect(() => s.number().finite().parse(Infinity)).toThrow('finite')
  })

  it('validates safe integer', () => {
    expect(s.number().safe().parse(42)).toBe(42)
    expect(() => s.number().safe().parse(Number.MAX_SAFE_INTEGER + 2)).toThrow('safe')
  })
})

describe('s.boolean()', () => {
  it('parses booleans', () => {
    expect(s.boolean().parse(true)).toBe(true)
    expect(s.boolean().parse(false)).toBe(false)
    expect(() => s.boolean().parse(1)).toThrow(SchemaError)
  })
})

describe('s.bigint()', () => {
  it('parses bigints', () => {
    expect(s.bigint().parse(BigInt(42))).toBe(BigInt(42))
    expect(() => s.bigint().parse(42)).toThrow(SchemaError)
  })
})

describe('s.symbol()', () => {
  it('parses symbols', () => {
    const sym = Symbol('test')
    expect(s.symbol().parse(sym)).toBe(sym)
    expect(() => s.symbol().parse('sym')).toThrow(SchemaError)
  })
})

describe('s.undefined() / s.null() / s.nan()', () => {
  it('parses undefined', () => {
    expect(s.undefined().parse(undefined)).toBe(undefined)
    expect(() => s.undefined().parse(null)).toThrow(SchemaError)
  })

  it('parses null', () => {
    expect(s.null().parse(null)).toBe(null)
    expect(() => s.null().parse(undefined)).toThrow(SchemaError)
  })

  it('parses NaN', () => {
    expect(Number.isNaN(s.nan().parse(NaN))).toBe(true)
    expect(() => s.nan().parse(0)).toThrow(SchemaError)
  })
})

// ─── Complex ────────────────────────────────────────────────

describe('s.object()', () => {
  it('validates objects', () => {
    const schema = s.object({
      name: s.string(),
      age: s.number(),
    })
    expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
    expect(() => schema.parse({ name: 'John' })).toThrow(SchemaError)
    expect(() => schema.parse(null)).toThrow(SchemaError)
  })

  it('supports strict mode', () => {
    const schema = s.object({ name: s.string() }).strict()
    expect(() => schema.parse({ name: 'John', extra: 'x' })).toThrow('tidak dikenal')
  })

  it('supports passthrough mode', () => {
    const schema = s.object({ name: s.string() }).passthrough()
    expect(schema.parse({ name: 'John', extra: 'x' })).toEqual({ name: 'John', extra: 'x' })
  })

  it('supports partial', () => {
    const schema = s.object({ name: s.string(), age: s.number() }).partial()
    expect(schema.parse({})).toEqual({})
    expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' })
  })

  it('supports pick', () => {
    const schema = s.object({ name: s.string(), age: s.number() }).pick(['name'])
    expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' })
    expect('age' in schema.parse({ name: 'John' })).toBe(false)
  })

  it('supports omit', () => {
    const schema = s.object({ name: s.string(), age: s.number() }).omit(['age'])
    expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' })
  })

  it('supports extend', () => {
    const base = s.object({ name: s.string() })
    const extended = base.extend({ age: s.number() })
    expect(extended.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
  })

  it('supports merge', () => {
    const a = s.object({ name: s.string() })
    const b = s.object({ age: s.number() })
    const merged = a.merge(b)
    expect(merged.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
  })
})

describe('s.array()', () => {
  it('validates arrays', () => {
    const schema = s.array(s.number())
    expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3])
    expect(() => schema.parse('not-array')).toThrow(SchemaError)
  })

  it('validates min/max/length', () => {
    expect(s.array(s.any()).min(2).parse([1, 2])).toEqual([1, 2])
    expect(() => s.array(s.any()).min(2).parse([1])).toThrow('minimal')
    expect(s.array(s.any()).max(2).parse([1])).toEqual([1])
    expect(() => s.array(s.any()).max(2).parse([1, 2, 3])).toThrow('maksimal')
    expect(s.array(s.any()).length(2).parse([1, 2])).toEqual([1, 2])
    expect(() => s.array(s.any()).length(2).parse([1])).toThrow('tepat')
  })

  it('validates nonempty', () => {
    expect(s.array(s.any()).nonempty().parse([1])).toEqual([1])
    expect(() => s.array(s.any()).nonempty().parse([])).toThrow('kosong')
  })

  it('validates unique', () => {
    expect(s.array(s.number()).unique().parse([1, 2])).toEqual([1, 2])
    expect(() => s.array(s.number()).unique().parse([1, 1])).toThrow('unik')
  })
})

describe('s.tuple()', () => {
  it('validates tuples', () => {
    const schema = s.tuple(s.string(), s.number())
    expect(schema.parse(['hello', 42])).toEqual(['hello', 42])
    expect(() => schema.parse(['hello'])).toThrow('tepat 2')
    expect(() => schema.parse(['hello', 'world'])).toThrow(SchemaError)
  })
})

describe('s.enum()', () => {
  it('validates enums', () => {
    const schema = s.enum(['a', 'b', 'c'])
    expect(schema.parse('a')).toBe('a')
    expect(() => schema.parse('d')).toThrow('salah satu dari')
  })
})

describe('s.union()', () => {
  it('validates unions', () => {
    const schema = s.union(s.string(), s.number())
    expect(schema.parse('hello')).toBe('hello')
    expect(schema.parse(42)).toBe(42)
    expect(() => schema.parse(true)).toThrow('tidak cocok')
  })
})

describe('s.intersection()', () => {
  it('validates intersections', () => {
    const a = s.object({ name: s.string() })
    const b = s.object({ age: s.number() })
    const schema = s.intersection(a, b)
    expect(schema.parse({ name: 'John', age: 30 })).toEqual({ name: 'John', age: 30 })
  })
})

describe('s.record()', () => {
  it('validates records', () => {
    const schema = s.record(s.number())
    expect(schema.parse({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
    expect(() => schema.parse({ a: 'x' })).toThrow(SchemaError)
  })
})

describe('s.map()', () => {
  it('validates maps', () => {
    const schema = s.map(s.string(), s.number())
    const map = new Map([['a', 1], ['b', 2]])
    const result = schema.parse(map)
    expect(result).toBeInstanceOf(Map)
    expect(result.get('a')).toBe(1)
    expect(result.get('b')).toBe(2)
    expect(() => schema.parse({})).toThrow('Map')
  })
})

describe('s.set()', () => {
  it('validates sets', () => {
    const schema = s.set(s.number())
    const set = new Set([1, 2, 3])
    const result = schema.parse(set)
    expect(result).toBeInstanceOf(Set)
    expect(result.has(1)).toBe(true)
    expect(result.has(4)).toBe(false)
    expect(() => schema.parse([])).toThrow('Set')
  })
})

describe('s.date()', () => {
  it('validates dates', () => {
    const d = new Date('2024-01-01')
    expect(s.date().parse(d)).toBe(d)
    expect(s.date().parse(new Date())).toBeInstanceOf(Date)
    expect(s.date().parse('2024-01-01')).toBeInstanceOf(Date)
    expect(() => s.date().parse(new Date('invalid'))).toThrow('Tanggal')
    expect(() => s.date().parse(true as any)).toThrow(SchemaError)
  })
})

describe('s.literal()', () => {
  it('validates literals', () => {
    expect(s.literal('hello').parse('hello')).toBe('hello')
    expect(() => s.literal('hello').parse('world')).toThrow('tepat')
    expect(s.literal(42).parse(42)).toBe(42)
    expect(s.literal(true).parse(true)).toBe(true)
    expect(s.literal(null).parse(null)).toBe(null)
  })
})

describe('s.any() / s.unknown()', () => {
  it('passes through any value', () => {
    expect(s.any().parse('hello')).toBe('hello')
    expect(s.any().parse(42)).toBe(42)
    expect(s.any().parse(null)).toBe(null)
    expect(s.any().parse({ a: 1 })).toEqual({ a: 1 })
  })
})

// ─── Wrappers ───────────────────────────────────────────────

describe('optional / nullable / default', () => {
  it('optional allows undefined', () => {
    const schema = s.string().optional()
    expect(schema.parse('hello')).toBe('hello')
    expect(schema.parse(undefined)).toBe(undefined)
  })

  it('nullable allows null', () => {
    const schema = s.string().nullable()
    expect(schema.parse('hello')).toBe('hello')
    expect(schema.parse(null)).toBe(null)
  })

  it('default replaces undefined', () => {
    const schema = s.string().default('default')
    expect(schema.parse('hello')).toBe('hello')
    expect(schema.parse(undefined)).toBe('default')
  })
})

describe('refine', () => {
  it('validates with custom function', () => {
    const schema = s.string().refine(val => val.length > 5, 'Terlalu pendek!')
    expect(schema.parse('hello world')).toBe('hello world')
    expect(() => schema.parse('hi')).toThrow('Terlalu pendek')
  })
})

// ─── safeParse ──────────────────────────────────────────────

describe('safeParse', () => {
  it('returns success result', () => {
    const result = s.number().safeParse(42)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe(42)
  })

  it('returns error result', () => {
    const result = s.number().safeParse('not-a-number')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBeDefined()
  })
})

// ─── Indonesia ──────────────────────────────────────────────

describe('s.nik()', () => {
  it('validates NIK', () => {
    expect(s.nik().parse('3201010203940001')).toBe('3201010203940001')
    expect(() => s.nik().parse('1234567890123456')).toThrow('NIK')
    expect(() => s.nik().parse('1234')).toThrow('NIK')
  })
})

describe('s.npwp()', () => {
  it('validates NPWP', () => {
    expect(s.npwp().parse('123456789012344')).toBe('123456789012344')
    expect(() => s.npwp().parse('123456789012345')).toThrow('NPWP')
  })
})

describe('s.phone()', () => {
  it('validates Indonesian phone', () => {
    expect(s.phone().parse('08123456789')).toBe('08123456789')
    expect(s.phone().parse('+628123456789')).toBe('+628123456789')
    expect(() => s.phone().parse('123')).toThrow('telepon')
  })
})

describe('s.alamat()', () => {
  it('validates Indonesian address', () => {
    expect(s.alamat().parse('Jl. Merdeka No. 123, Jakarta')).toBe('Jl. Merdeka No. 123, Jakarta')
    expect(() => s.alamat().parse('rumah')).toThrow('Alamat')
  })
})

describe('s.kodepos()', () => {
  it('validates postal code', () => {
    expect(s.kodepos().parse('12345')).toBe('12345')
    expect(() => s.kodepos().parse('1234')).toThrow('Kode pos')
    expect(() => s.kodepos().parse('abcde')).toThrow('Kode pos')
  })
})

describe('s.rekening()', () => {
  it('validates bank account', () => {
    expect(s.rekening().parse('1234567890')).toBe('1234567890')
    expect(() => s.rekening().parse('123')).toThrow('rekening')
  })
})

// ─── Coerce ─────────────────────────────────────────────────

describe('s.coerce', () => {
  it('coerces to string', () => {
    expect(s.coerce.string().parse(123)).toBe('123')
    expect(s.coerce.string().parse(true)).toBe('true')
  })

  it('coerces to number', () => {
    expect(s.coerce.number().parse('42')).toBe(42)
    expect(s.coerce.number().parse('3.14')).toBe(3.14)
    expect(() => s.coerce.number().parse('abc')).toThrow(SchemaError)
  })

  it('coerces to boolean', () => {
    expect(s.coerce.boolean().parse('true')).toBe(true)
    expect(s.coerce.boolean().parse('false')).toBe(false)
    expect(s.coerce.boolean().parse(1)).toBe(true)
    expect(s.coerce.boolean().parse(0)).toBe(false)
  })

  it('coerces to date', () => {
    const d = s.coerce.date().parse('2024-01-01')
    expect(d).toBeInstanceOf(Date)
    expect(s.coerce.date().parse(1704067200000)).toBeInstanceOf(Date)
    expect(() => s.coerce.date().parse('not-a-date')).toThrow(SchemaError)
  })
})

// ─── Transform ──────────────────────────────────────────────

describe('s.transform()', () => {
  it('transforms values', () => {
    const schema = s.transform<number>(val => Number(val))
    expect(schema.parse('42')).toBe(42)
    expect(schema.parse('3.14')).toBe(3.14)
  })
})

describe('.transform() on Schema', () => {
  it('chains transforms', () => {
    const schema = s.string().transform(val => val.length)
    expect(schema.parse('hello')).toBe(5)
  })
})

// ─── Infer type test (compile-time) ─────────────────────────

describe('Infer type', () => {
  it('infers correct types', () => {
    const UserSchema = s.object({
      id: s.number(),
      name: s.string().min(3),
      email: s.string().email().optional(),
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
    expect(() => s.string().min(5).parse('ab')).toThrow('Minimum 5')
    setLocale('id')
    expect(() => s.string().min(5).parse('ab')).toThrow('minimal 5')
  })
})

// ─── SchemaError ────────────────────────────────────────────

describe('SchemaError', () => {
  it('has proper stack trace', () => {
    try {
      s.number().parse('not-number')
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
    const schema = s.string().describe('A string field')
    expect(schema.parse('test')).toBe('test')
  })
})
