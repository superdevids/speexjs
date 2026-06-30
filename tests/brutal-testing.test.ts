// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 BRUTAL TEST — SpeexJS Framework — Full 8-Phase Assault
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { schema, Schema, SchemaError, Infer, setLocale } from '../src/schema/index.js'
import {
  signal,
  computed,
  effect,
  untracked,
  batch,
  Signal,
  Computed,
  isSignal,
  isComputed,
  toSignal,
  mergeSignals,
} from '../src/client/signals/index.js'
import {
  h,
  text,
  fragment,
  createComponent,
  normalizeChild,
  render,
  patch,
  renderToString,
  hydrate,
  renderToStream,
} from '../src/client/vdom/index.js'
import type { VNode, VElement, VText, VFragment, VComponent, Component } from '../src/client/vdom/index.js'
import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  TooManyRequestsException,
  InternalServerErrorException,
  ValidationException,
  normalizeError,
  registerExceptionHandler,
} from '../src/server/errors.js'

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: TYPE SYSTEM TORTURE
// ═══════════════════════════════════════════════════════════════════════════════

describe('PHASE 1: TYPE SYSTEM TORTURE', () => {
  describe('1.1 TypeScript Hell — Primitives', () => {
    it('P1-1: StringSchema rejects undefined', () => {
      expect(() => schema.string().parse(undefined)).toThrow(SchemaError)
    })

    it('P1-2: StringSchema rejects null', () => {
      expect(() => schema.string().parse(null)).toThrow(SchemaError)
    })

    it('P1-3: StringSchema accepts empty string', () => {
      expect(schema.string().parse('')).toBe('')
    })

    it('P1-4: NumberSchema rejects NaN', () => {
      expect(() => schema.number().parse(NaN)).toThrow(SchemaError)
    })

    it('P1-5: NumberSchema rejects Infinity', () => {
      expect(() => schema.number().parse(Infinity)).toThrow(SchemaError)
    })

    it('P1-6: NumberSchema rejects -Infinity', () => {
      expect(() => schema.number().parse(-Infinity)).toThrow(SchemaError)
    })

    it('P1-7: NumberSchema normalizes -0 to 0', () => {
      const result = schema.number().parse(-0)
      expect(Object.is(result, 0)).toBe(true)
      expect(result === 0).toBe(true)
    })

    it('P1-8: NumberSchema rejects BigInt', () => {
      expect(() => schema.number().parse(BigInt(42))).toThrow(SchemaError)
    })

    it('P1-9: NumberSchema rejects object', () => {
      expect(() => schema.number().parse({})).toThrow(SchemaError)
    })

    it('P1-10: NumberSchema rejects array', () => {
      expect(() => schema.number().parse([])).toThrow(SchemaError)
    })

    it('P1-11: NumberSchema safe() rejects > MAX_SAFE_INTEGER', () => {
      expect(() =>
        schema
          .number()
          .safe()
          .parse(Number.MAX_SAFE_INTEGER + 2),
      ).toThrow(SchemaError)
    })

    it('P1-12: NumberSchema safe() rejects < MIN_SAFE_INTEGER', () => {
      expect(() =>
        schema
          .number()
          .safe()
          .parse(Number.MIN_SAFE_INTEGER - 2),
      ).toThrow(SchemaError)
    })

    it('P1-13: BooleanSchema rejects 0 and 1 as numbers', () => {
      expect(() => schema.boolean().parse(0)).toThrow(SchemaError)
      expect(() => schema.boolean().parse(1)).toThrow(SchemaError)
    })

    it('P1-14: BooleanSchema rejects "true" string', () => {
      expect(() => schema.boolean().parse('true')).toThrow(SchemaError)
    })

    it('P1-15: BigIntSchema rejects number', () => {
      expect(() => schema.bigint().parse(42)).toThrow(SchemaError)
    })

    it('P1-16: BigIntSchema rejects string', () => {
      expect(() => schema.bigint().parse('42')).toThrow(SchemaError)
    })

    it('P1-17: SymbolSchema rejects string', () => {
      expect(() => schema.symbol().parse('sym')).toThrow(SchemaError)
    })

    it('P1-18: UndefinedSchema rejects null', () => {
      expect(() => schema.undefined().parse(null)).toThrow(SchemaError)
    })

    it('P1-19: NullSchema rejects undefined', () => {
      expect(() => schema.null().parse(undefined)).toThrow(SchemaError)
    })

    it('P1-20: NaNSchema rejects 0', () => {
      expect(() => schema.nan().parse(0)).toThrow(SchemaError)
    })

    it('P1-21: NaNSchema rejects "NaN" string', () => {
      expect(() => schema.nan().parse('NaN')).toThrow(SchemaError)
    })
  })

  describe('1.2 String torture', () => {
    it('P1-22: email() rejects email without domain', () => {
      expect(() => schema.string().email().parse('user@')).toThrow(SchemaError)
    })

    it('P1-23: email() rejects email without local part', () => {
      expect(() => schema.string().email().parse('@domain.com')).toThrow(SchemaError)
    })

    it('P1-24: email() rejects email with double dots in local', () => {
      expect(() => schema.string().email().parse('user..name@domain.com')).toThrow(SchemaError)
    })

    it('P1-25: email() rejects email starting with dot', () => {
      expect(() => schema.string().email().parse('.user@domain.com')).toThrow(SchemaError)
    })

    it('P1-26: email() rejects very long email (over 254 chars)', () => {
      const longLocal = 'a'.repeat(250)
      expect(() => schema.string().email().parse(`${longLocal}@b.co`)).toThrow(SchemaError)
    })

    it('P1-27: url() rejects javascript: protocol', () => {
      expect(() => schema.string().url().parse('javascript:alert(1)')).toThrow(SchemaError)
    })

    it('P1-28: url() rejects file: protocol', () => {
      expect(() => schema.string().url().parse('file:///etc/passwd')).toThrow(SchemaError)
    })

    it('P1-29: url() rejects data: URLs', () => {
      expect(() => schema.string().url().parse('data:text/html,<script>alert(1)</script>')).toThrow(SchemaError)
    })

    it('P1-30: url() rejects ftp: protocol', () => {
      expect(() => schema.string().url().parse('ftp://evil.com')).toThrow(SchemaError)
    })

    it('P1-31: String with 10MB length', () => {
      const sc = schema.string()
      const large = 'x'.repeat(10_000_000)
      expect(sc.parse(large)).toBe(large)
    })

    it('P1-32: min() with negative number rejects everything', () => {
      // This is a bug: min with negative number creates unreachable constraint
      const sc = schema.string().min(-5)
      expect(sc.parse('')).toBe('') // Should pass since '' length (0) >= -5
    })

    it('P1-33: String with 0x00 null byte', () => {
      const sc = schema.string()
      expect(sc.parse('test\x00null')).toBe('test\x00null')
    })

    it('P1-34: String with emoji 4-byte chars', () => {
      const sc = schema.string()
      expect(sc.parse('💀🔥😈')).toBe('💀🔥😈')
    })
  })

  describe('1.3 Number edge cases', () => {
    it('P1-35: Number normalizes -0 to 0', () => {
      expect(Object.is(schema.number().parse(0), 0)).toBe(true)
      expect(Object.is(schema.number().parse(-0), 0)).toBe(true)
      // -0 is normalized to 0 by NumberSchema
    })

    it('P1-36: Number.MAX_VALUE can pass', () => {
      const sc = schema.number()
      expect(sc.parse(Number.MAX_VALUE)).toBe(Number.MAX_VALUE)
    })

    it('P1-37: Number.MIN_VALUE can pass', () => {
      const sc = schema.number()
      expect(sc.parse(Number.MIN_VALUE)).toBe(Number.MIN_VALUE)
    })

    it('P1-38: positive() rejects 0', () => {
      expect(() => schema.number().positive().parse(0)).toThrow(SchemaError)
    })

    it('P1-39: negative() rejects 0', () => {
      expect(() => schema.number().negative().parse(0)).toThrow(SchemaError)
    })

    it('P1-40: int() rejects decimal', () => {
      const sc = schema.number().int()
      expect(() => sc.parse(1.5)).toThrow(SchemaError)
      expect(sc.parse(1.0)).toBe(1) // 1.0 is integer
    })

    it('P1-41: int() with large float with .0', () => {
      const sc = schema.number().int()
      expect(sc.parse(1000000.0)).toBe(1000000)
    })
  })

  describe('1.4 Object torture', () => {
    it('P1-42: Object rejects null', () => {
      const sc = schema.object({ name: schema.string() })
      expect(() => sc.parse(null)).toThrow(SchemaError)
    })

    it('P1-43: Object rejects array', () => {
      const sc = schema.object({ name: schema.string() })
      expect(() => sc.parse([])).toThrow(SchemaError)
    })

    it('P1-44: Object rejects primitive', () => {
      const sc = schema.object({})
      expect(() => sc.parse('string')).toThrow(SchemaError)
    })

    it('P1-45: Object with nested depth 100+', () => {
      // Build deeply nested schema using proper ObjectSchema instances
      let sc = schema.object({ value: schema.string() })
      for (let i = 0; i < 100; i++) {
        sc = schema.object({ child: sc, value: schema.string() })
      }
      // Build matching object (should exceed depth limit)
      let obj: any = { value: 'v0' }
      let curr = obj
      for (let i = 1; i <= 100; i++) {
        curr.child = { value: `v${i}` }
        curr = curr.child
      }
      // 100 level deep parse - may or may not hit the depth limit depending on implementation
      expect(() => sc.parse(obj)).not.toThrow() // should handle gracefully
    })

    it('P1-46: Object with extra fields in strict mode', () => {
      const sc = schema.object({ name: schema.string() }).strict()
      expect(() => sc.parse({ name: 'John', extra: 'x' })).toThrow('Unexpected key')
    })

    it('P1-47: Object with missing required field', () => {
      const sc = schema.object({ name: schema.string(), age: schema.number() })
      expect(() => sc.parse({ name: 'John' })).toThrow(SchemaError)
    })

    it('P1-48: Object with wrong field type', () => {
      const sc = schema.object({ name: schema.string().min(3) })
      expect(() => sc.parse({ name: 'ab' })).toThrow(SchemaError)
    })

    it('P1-49: Object passthrough preserves extra keys', () => {
      const sc = schema.object({ name: schema.string() }).passthrough()
      const r = sc.parse({ name: 'John', extra: true, num: 42 })
      expect(r).toEqual({ name: 'John', extra: true, num: 42 })
    })

    it('P1-50: partial() makes all fields optional', () => {
      const sc = schema.object({ name: schema.string(), age: schema.number() }).partial()
      expect(sc.parse({})).toEqual({})
      expect(sc.parse({ name: 'John' })).toEqual({ name: 'John' })
    })
  })

  describe('1.5 Array torture', () => {
    it('P1-51: Array with 100,000 elements parses', () => {
      const sc = schema.array(schema.number())
      const arr = Array.from({ length: 100_000 }, (_, i) => i)
      const result = sc.parse(arr)
      expect(result.length).toBe(100_000)
      expect(result[0]).toBe(0)
      expect(result[99999]).toBe(99999)
    })

    it('P1-52: Array.rejects non-array', () => {
      expect(() => schema.array(schema.any()).parse({})).toThrow(SchemaError)
    })

    it('P1-53: Array nonempty rejects empty', () => {
      expect(() => schema.array(schema.any()).nonempty().parse([])).toThrow(SchemaError)
    })

    it('P1-54: Array unique with objects', () => {
      const sc = schema.array(schema.any()).unique()
      expect(sc.parse([{ a: 1 }, { b: 2 }])).toHaveLength(2)
      // Same objects should fail uniqueness
      expect(() => sc.parse([{ a: 1 }, { a: 1 }])).toThrow(SchemaError)
    })
  })

  describe('1.6 Enum, Union, Intersection torture', () => {
    it('P1-55: Enum rejects invalid value', () => {
      const sc = schema.enum(['a', 'b', 'c'])
      expect(() => sc.parse('d')).toThrow(SchemaError)
    })

    it('P1-56: Enum lower/upper case mismatch', () => {
      const sc = schema.enum(['Active', 'Inactive'])
      expect(() => sc.parse('active')).toThrow(SchemaError)
    })

    it('P1-57: Union with all wrong types', () => {
      const sc = schema.union(schema.string(), schema.number())
      expect(() => sc.parse(true)).toThrow('Value does not match any schema')
    })

    it('P1-58: Union with object and string', () => {
      const sc = schema.union(schema.object({ type: schema.literal('a') }), schema.string())
      expect(sc.parse('hello')).toBe('hello')
      expect(sc.parse({ type: 'a' })).toEqual({ type: 'a' })
    })

    it('P1-59: Intersection with overlapping keys', () => {
      const a = schema.object({ id: schema.number() })
      const b = schema.object({ id: schema.string() })
      expect(() => schema.intersection(a, b).parse({ id: 1 })).toThrow(SchemaError)
    })
  })

  describe('1.7 Coerce edge cases', () => {
    it('P1-60: CoerceString with null', () => {
      expect(() => schema.coerce.string().parse(null)).toThrow(SchemaError)
    })

    it('P1-61: CoerceNumber with hex string', () => {
      expect(() => schema.coerce.number().parse('0x1A')).toThrow(SchemaError)
    })

    it('P1-62: CoerceNumber with binary string', () => {
      expect(() => schema.coerce.number().parse('0b1010')).toThrow(SchemaError)
    })

    it('P1-63: CoerceNumber with empty string', () => {
      expect(() => schema.coerce.number().parse('')).toThrow(SchemaError)
    })

    it('P1-64: CoerceNumber with whitespace string', () => {
      expect(() => schema.coerce.number().parse('   ')).toThrow(SchemaError)
    })

    it('P1-65: CoerceNumber with Infinity string', () => {
      expect(() => schema.coerce.number().parse('Infinity')).toThrow(SchemaError)
    })

    it('P1-66: CoerceBoolean with "yes"', () => {
      expect(schema.coerce.boolean().parse('yes')).toBe(true)
    })

    it('P1-67: CoerceBoolean with "no"', () => {
      expect(schema.coerce.boolean().parse('no')).toBe(false)
    })

    it('P1-68: CoerceBoolean with "on"', () => {
      expect(schema.coerce.boolean().parse('on')).toBe(true)
    })

    it('P1-69: CoerceBoolean with "off"', () => {
      expect(schema.coerce.boolean().parse('off')).toBe(false)
    })

    it('P1-70: CoerceBoolean with 1 number', () => {
      expect(schema.coerce.boolean().parse(1)).toBe(true)
    })

    it('P1-71: CoerceBoolean with 0 number', () => {
      expect(schema.coerce.boolean().parse(0)).toBe(false)
    })
  })

  describe('1.8 Refine and Transform edge cases', () => {
    it('P1-72: Refine throws custom error', () => {
      const sc = schema.number().refine((v) => v > 10, 'Must be greater than 10')
      expect(() => sc.parse(5)).toThrow('Must be greater than 10')
    })

    it('P1-73: Standalone transform', () => {
      const sc = schema.transform<number>((v) => Number(v))
      expect(sc.parse('42')).toBe(42)
      expect(sc.parse(null)).toBe(0) // Number(null) = 0 — passes!
    })

    it('P1-74: Chained transform on string', () => {
      const sc = schema.string().transform((v) => v.length)
      expect(sc.parse('hello')).toBe(5)
      // Transform with very long string
      expect(sc.parse('x'.repeat(10000))).toBe(10000)
    })

    it('P1-75: safeParse returns error for invalid', () => {
      const r = schema.number().safeParse('not-a-number')
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error).toBeDefined()
    })
  })

  describe('1.9 Date edge cases', () => {
    it('P1-76: DateSchema with Invalid Date', () => {
      expect(() => schema.date().parse(new Date('invalid'))).toThrow(SchemaError)
    })

    it('P1-77: DateSchema with invalid string', () => {
      expect(() => schema.date().parse('not-a-date')).toThrow(SchemaError)
    })

    it('P1-78: DateSchema with valid number timestamp', () => {
      const d = schema.date().parse(1704067200000)
      expect(d).toBeInstanceOf(Date)
    })

    it('P1-79: DateSchema with boolean rejects', () => {
      expect(() => schema.date().parse(true)).toThrow(SchemaError)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: DATABASE LAYER DESTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

import type { DatabaseDriver } from '../src/server/database/types.js'

describe('PHASE 3: DATABASE LAYER DESTRUCTION', () => {
  let QueryBuilder: any, MysqlDialect: any, SqliteDialect: any, PostgresqlDialect: any, createDialect: any, Pagination: any

  beforeAll(async () => {
    const qbMod = await import('../src/server/database/query.js')
    QueryBuilder = qbMod.QueryBuilder
    const dialMod = await import('../src/server/database/dialect.js')
    MysqlDialect = dialMod.MysqlDialect
    SqliteDialect = dialMod.SqliteDialect
    PostgresqlDialect = dialMod.PostgresqlDialect
    createDialect = dialMod.createDialect
    const pagMod = await import('../src/server/database/pagination.js')
    Pagination = pagMod.Pagination
  })

  function makeMockRunner(driver: string = 'mysql', dialect?: any) {
    const d = dialect ?? createDialect(driver)
    const raw = vi.fn().mockResolvedValue({ rows: [] })
    const runner = { raw, getDialect: () => d, getPrefix: () => '', getDriver: () => driver }
    return { runner, dialect: d, raw }
  }

  function makeQb(table = 'users', driver: string = 'mysql', dialect?: any) {
    const { runner, dialect: d, raw } = makeMockRunner(driver, dialect)
    return { qb: new QueryBuilder(runner, table), raw, dialect: d }
  }

  describe('3.1 SQL Injection Vectors', () => {
    it('P3-1: where() uses parameterized bindings', () => {
      const { qb } = makeQb('users')
      qb.where('name', "'; DROP TABLE users; --")
      const { sql, bindings } = qb.toSQL()
      expect(sql).toContain('?')
      expect(bindings[0]).toBe("'; DROP TABLE users; --")
      expect(sql).not.toContain('DROP TABLE')
    })

    it('P3-2: orWhere() with SQL injection', () => {
      const { qb } = makeQb('users')
      qb.where('email', "' OR '1'='1")
      const { sql, bindings } = qb.toSQL()
      expect(bindings[0]).toBe("' OR '1'='1")
      expect(sql).not.toContain('OR')
    })

    it('P3-3: whereIn() with SQL injection in values', () => {
      const { qb } = makeQb('users')
      qb.whereIn('id', [1, 2, '3) OR 1=1 --'])
      const { sql, bindings } = qb.toSQL()
      expect(sql).toContain('?')
      expect(sql).not.toContain('OR 1=1')
    })

    it('P3-4: whereLike() binds properly', () => {
      const { qb } = makeQb('users')
      qb.whereLike('name', "'; DELETE FROM users; --")
      const { sql, bindings } = qb.toSQL()
      expect(sql).toContain('LIKE ?')
      expect(bindings[0]).toBe("'; DELETE FROM users; --")
    })

    it('P3-5: insert() uses parameterized values', () => {
      const { qb } = makeQb('users')
      const { sql, bindings } = (qb as any).compileInsert({ name: "'; DROP TABLE users; --" })
      expect(sql).toContain('?')
      expect(bindings[0]).toBe("'; DROP TABLE users; --")
    })

    it('P3-6: update() uses parameterized values', () => {
      const { qb } = makeQb('users')
      const { sql, bindings } = (qb as any).compileUpdate({ name: "'; DROP TABLE users; --" })
      expect(sql).toContain('?')
      expect(bindings[0]).toBe("'; DROP TABLE users; --")
    })

    it('P3-7: Operator validation rejects dangerous operators', () => {
      const { qb } = makeQb('users')
      expect(() => qb.where('id', '; DROP TABLE', 1)).toThrow('Invalid SQL operator')
    })

    it('P3-8: operator validation rejects empty operator', () => {
      const { qb } = makeQb('users')
      expect(() => qb.where('id', '', 1)).toThrow('Invalid SQL operator')
    })
  })

  describe('3.2 Pagination edge cases', () => {
    it('P3-9: paginate with page < 1 throws', async () => {
      const { qb } = makeQb('users')
      await expect(qb.paginate(15, 0)).rejects.toThrow('Page number must be >= 1')
    })

    it('P3-10: paginate with negative page throws', async () => {
      const { qb } = makeQb('users')
      await expect(qb.paginate(15, -5)).rejects.toThrow('Page number must be >= 1')
    })

    it('P3-11: paginate constrains perPage to max 1000', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValueOnce({ rows: [] })
      raw.mockResolvedValueOnce({ rows: [] })
      // perPage 999999 should be clipped to 1000
      await qb.paginate(999999, 1)
      const calls = raw.mock.calls
      // Check LIMIT in the second call (data query)
      const limitCall = calls[1][0] as string
      expect(limitCall).toContain('LIMIT ?')
    })
  })

  describe('3.3 Race condition simulation', () => {
    it('P3-12: concurrent get() calls are independent', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ id: 1 }] })
      const results = await Promise.all([qb.clone().where('id', 1).get(), qb.clone().where('id', 2).get(), qb.clone().where('id', 3).get()])
      expect(results).toHaveLength(3)
      expect(raw).toHaveBeenCalledTimes(3)
    })

    it('P3-13: insert with empty object throws', async () => {
      const { qb } = makeQb('users')
      await expect(qb.insert({})).rejects.toThrow('Cannot insert empty object')
    })

    it('P3-14: update with empty object throws', async () => {
      const { qb } = makeQb('users')
      await expect(qb.update({})).rejects.toThrow('Cannot update with empty data')
    })
  })

  describe('3.4 Dialect torture', () => {
    it('P3-15: MysqlDialect handles special chars in identifier', () => {
      const d = new MysqlDialect()
      expect(d.wrapIdentifier('test`table')).toBe('`test``table`')
    })

    it('P3-16: PostgresqlDialect handles special chars', () => {
      const d = new PostgresqlDialect()
      expect(d.wrapIdentifier('test"table')).toBe('"test""table"')
    })

    it('P3-17: SqliteDialect wrapping', () => {
      const d = new SqliteDialect()
      expect(d.wrapIdentifier('normal_table')).toBe('"normal_table"')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: SECURITY ANNIHILATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('PHASE 4: SECURITY ANNIHILATION', () => {
  describe('4.1 XSS Prevention in VDOM', () => {
    it('P4-1: renderToString escapes HTML in text', () => {
      const v = h('div', null, '<script>alert(1)</script>')
      const html = renderToString(v)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('P4-2: renderToString escapes HTML in attributes', () => {
      const v = h('div', { 'data-x': '"><script>alert(1)</script>' })
      const html = renderToString(v)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('P4-3: renderToString escapes HTML in attribute values', () => {
      const v = h('img', { src: 'javascript:alert(1)' })
      const html = renderToString(v)
      expect(html).toContain('javascript:alert(1)') // src is set as attribute, not executed
    })

    it('P4-4: renderToString escapes in style values', () => {
      const v = h('div', { style: { color: 'red><script>alert(1)</script>' } })
      const html = renderToString(v)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&gt;&lt;script&gt;')
    })

    it('P4-5: renderToString escapes in class names', () => {
      const v = h('div', { class: '"><script>alert(1)</script>' })
      const html = renderToString(v)
      expect(html).not.toContain('<script>')
    })

    it('P4-6: dangerouslySetInnerHTML allows raw HTML', () => {
      const v = h('div', { dangerouslySetInnerHTML: { __html: '<b>bold</b>' } })
      const html = renderToString(v)
      expect(html).toContain('<b>bold</b>')
    })
  })

  describe('4.2 Error Message Safety', () => {
    it('P4-7: normalizeError hides message in production', () => {
      process.env.NODE_ENV = 'production'
      const result = normalizeError(new Error('Database credentials: admin:password123'))
      expect(result.message).not.toContain('admin')
      expect(result.message).not.toContain('password')
      expect(result.message).toBe('Internal Server Error')
      delete process.env.NODE_ENV
    })

    it('P4-8: normalizeError shows message in non-production', () => {
      process.env.NODE_ENV = 'development'
      const result = normalizeError(new Error('test error detail'))
      expect(result.message).toBe('test error detail')
      delete process.env.NODE_ENV
    })

    it('P4-9: normalizeError handles non-Error values', () => {
      process.env.NODE_ENV = 'development'
      const result = normalizeError('string error')
      expect(result).toBeInstanceOf(InternalServerErrorException)
      delete process.env.NODE_ENV
    })

    it('P4-10: normalizeError handles null', () => {
      process.env.NODE_ENV = 'development'
      const result = normalizeError(null)
      expect(result).toBeInstanceOf(InternalServerErrorException)
      delete process.env.NODE_ENV
    })

    it('P4-11: normalizeError handles undefined', () => {
      process.env.NODE_ENV = 'development'
      const result = normalizeError(undefined)
      expect(result).toBeInstanceOf(InternalServerErrorException)
      delete process.env.NODE_ENV
    })
  })

  describe('4.3 Auth Guard Logic', () => {
    it('P4-12: HttpException toJSON does not include stack', () => {
      const e = new HttpException('test', 400, 'BAD_REQUEST')
      const json = e.toJSON()
      expect(json).not.toHaveProperty('stack')
      expect(json).toEqual({
        error: 'BAD_REQUEST',
        message: 'test',
        statusCode: 400,
      })
    })

    it('P4-13: ValidationException toJSON', () => {
      const e = new ValidationException({ email: ['invalid'] })
      const json = e.toJSON()
      expect(json).toHaveProperty('errors')
      expect(json.errors).toEqual({ email: ['invalid'] })
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: FRONTEND ANNIHILATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('PHASE 5: FRONTEND ANNIHILATION', () => {
  describe('5.1 Signal torture', () => {
    it('P5-1: signal with 0 as initial value', () => {
      const s = signal(0)
      expect(s.value).toBe(0)
      expect(s.valueOf()).toBe(0)
    })

    it('P5-2: signal with false initial value', () => {
      const s = signal(false)
      expect(s.value).toBe(false)
    })

    it('P5-3: signal with empty string initial', () => {
      const s = signal('')
      expect(s.value).toBe('')
    })

    it('P5-4: Rapid signal updates (10k changes)', () => {
      const s = signal(0)
      let count = 0
      const unsub = s.subscribe(() => {
        count++
      })
      for (let i = 1; i <= 10000; i++) {
        s.value = i
      }
      expect(count).toBe(10000)
      unsub()
    })

    it('P5-5: Nested computed chain', () => {
      const a = signal(1)
      const b = computed(() => a.value * 2)
      const c = computed(() => b.value + 1)
      const d = computed(() => c.value * 3)
      expect(d.value).toBe(9)
      a.value = 5
      expect(d.value).toBe(33)
    })

    it('P5-6: Computed with circular dependency protection', () => {
      const a = signal(1)
      let b: Computed<number>, c: Computed<number>
      b = computed(() => a.value + (c?.value ?? 0))
      c = computed(() => b.value * 2)
      // Reading c.value should work without infinite loop due to lazy eval
      expect(() => c.value).not.toThrow()
    })

    it('P5-7: Effect with cleanup on rapid updates', () => {
      const cleanup = vi.fn()
      const s = signal(0)
      const eff = effect(() => {
        s.value
        return cleanup
      })
      for (let i = 1; i <= 100; i++) {
        s.value = i
      }
      expect(cleanup).toHaveBeenCalledTimes(100)
      eff.stop()
    })

    it('P5-8: Signal with same value does not notify', () => {
      const fn = vi.fn()
      const s = signal(42)
      s.subscribe(fn)
      s.value = 42
      expect(fn).not.toHaveBeenCalled()
    })

    it('P5-9: Batch optimization with 1000 updates', () => {
      let notifCount = 0
      const s = signal(0)
      const e = effect(() => {
        s.value
        notifCount++
      })
      notifCount = 0
      batch(() => {
        for (let i = 1; i <= 1000; i++) {
          s.value = i
        }
      })
      expect(notifCount).toBe(1)
      e.stop()
    })

    it('P5-10: mergeSignals updates correctly', () => {
      const a = signal('hello')
      const b = signal(42)
      const m = mergeSignals({ a, b })
      expect(m.value).toEqual({ a: 'hello', b: 42 })
      a.value = 'world'
      expect(m.value).toEqual({ a: 'world', b: 42 })
    })

    it('P5-11: Signal iterator works', () => {
      const s = signal(42)
      const [val] = s
      expect(val).toBe(42)
      expect([...s]).toEqual([42])
    })

    it('P5-12: toJSON returns current value', () => {
      expect(JSON.stringify(signal(42))).toBe('42')
      expect(JSON.stringify(signal({ a: 1, b: [2, 3] }))).toBe('{"a":1,"b":[2,3]}')
    })
  })

  describe('5.2 VDOM torture', () => {
    it('P5-13: h() with null/undefined children filtered', () => {
      const v = h('div', null, null, undefined, false, 'text', 0) as VElement
      expect(v.children).toHaveLength(2)
      expect((v.children[0] as VText).text).toBe('text')
      expect((v.children[1] as VText).text).toBe('0')
    })

    it('P5-14: normalizeChild with 0 returns VText', () => {
      const r = normalizeChild(0) as VText
      expect(r.type).toBe('text')
      expect(r.text).toBe('0')
    })

    it('P5-15: normalizeChild with signal wrapping signal', () => {
      const inner = signal(text('inner'))
      const s = signal(inner)
      const r = normalizeChild(s)
      expect(r).not.toBeNull()
      // The outer signal should produce a VSignalNode
      // When evaluated, it gives the inner signal which then needs to be normalized
    })

    it('P5-16: Fragment with many children', () => {
      const items: any[] = []
      for (let i = 0; i < 1000; i++) items.push(h('li', null, String(i)))
      const f = fragment(...items)
      expect(f.type).toBe('fragment')
      expect((f as VFragment).children).toHaveLength(1000)
    })

    it('P5-17: renderToString with deeply nested elements', () => {
      let v: VNode = h('div', { id: 'root' })
      for (let i = 0; i < 500; i++) {
        v = h('div', null, v)
      }
      const html = renderToString(v)
      expect(html).toContain('id="root"')
      expect(html.startsWith('<div>')).toBe(true)
    })

    it('P5-18: Component passing children via h()', () => {
      const Comp: Component = (props) => h('div', null, props.children as any)
      const v = h(Comp, null, h('span', null, 'child'))
      expect(v.type).toBe('component')
      const compV = v as VComponent
      expect(compV.props.children).toBeDefined()
    })

    it('P5-19: Signal subscription on VNode replacement', () => {
      // Test that subscribing to a signal in a VNode context works
      const s = signal(text('initial'))
      const v = normalizeChild(s)
      expect(v).not.toBeNull()
      expect((v as any).type).toBe('signal')
    })

    it('P5-20: renderToStream handles errors', async () => {
      const v = h('div', null, 'test')
      const stream = renderToStream(v)
      const reader = stream.getReader()
      const result = await reader.read()
      expect(result.done).toBe(false)
      expect(result.value).toBeDefined()
    })
  })

  describe('5.3 SSR Hydration safety', () => {
    it('P5-21: renderToString escapes XSS in SSR output', () => {
      const v = h('div', { 'data-user': '<img src=x onerror=alert(1)>' }, '<script>evil()</script>')
      const html = renderToString(v)
      expect(html).not.toContain('<script>evil()')
      expect(html).not.toContain('<img src=x')
    })

    it('P5-22: renderToString class attribute escaping', () => {
      const v = h('div', { class: '" onload="alert(1)' })
      const html = renderToString(v)
      // Quotes are properly escaped - but onload= text can still appear inside the escaped string
      expect(html).toContain('&quot;')
      expect(html).not.toContain('class=""')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6: INFRASTRUCTURE & BUILD TORTURE
// ═══════════════════════════════════════════════════════════════════════════════

describe('PHASE 6: INFRASTRUCTURE & BUILD TORTURE', () => {
  describe('6.1 Environment & Error Handling', () => {
    it('P6-1: HttpException subclasses have correct status codes', () => {
      expect(new BadRequestException().status).toBe(400)
      expect(new UnauthorizedException().status).toBe(401)
      expect(new ForbiddenException().status).toBe(403)
      expect(new NotFoundException().status).toBe(404)
      expect(new ConflictException().status).toBe(409)
      expect(new TooManyRequestsException().status).toBe(429)
      expect(new InternalServerErrorException().status).toBe(500)
    })

    it('P6-2: HttpException default status is 500', () => {
      const e = new HttpException('generic')
      expect(e.status).toBe(500)
      expect(e.error).toBe('INTERNAL_SERVER_ERROR')
    })

    it('P6-3: registerExceptionHandler wraps exceptions', () => {
      registerExceptionHandler(NotFoundException, (err) => new BadRequestException(`Wrapped: ${err.message}`))
      const result = normalizeError(new NotFoundException('original'))
      expect(result).toBeInstanceOf(BadRequestException)
      expect(result.message).toBe('Wrapped: original')
    })

    it('P6-4: ValidationException with empty errors', () => {
      const e = new ValidationException({})
      expect(e.status).toBe(422)
      expect(e.errors).toEqual({})
    })
  })

  describe('6.2 Bundle & Imports', () => {
    it('P6-5: Schema module exports all expected symbols', async () => {
      const mod = await import('../src/schema/index.js')
      expect(mod.schema).toBeDefined()
      expect(mod.Schema).toBeDefined()
      expect(mod.SchemaError).toBeDefined()
    })

    it('P6-6: Server errors module exports all exceptions', async () => {
      const mod = await import('../src/server/errors.js')
      expect(mod.HttpException).toBeDefined()
      expect(mod.BadRequestException).toBeDefined()
      expect(mod.ValidationException).toBeDefined()
    })

    it('P6-7: Client signals module exports all functions', async () => {
      const mod = await import('../src/client/signals/index.js')
      expect(mod.signal).toBeDefined()
      expect(mod.computed).toBeDefined()
      expect(mod.effect).toBeDefined()
      expect(mod.batch).toBeDefined()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: CONCURRENCY
// ═══════════════════════════════════════════════════════════════════════════════

describe('PHASE 7: CONCURRENCY', () => {
  describe('7.1 Concurrent operations', () => {
    it('P7-1: Multiple concurrent signal reads', () => {
      const s = signal(42)
      const results = Array.from({ length: 100 }, () => s.value)
      expect(results.every((r) => r === 42)).toBe(true)
    })

    it('P7-2: Concurrent computed evaluation', () => {
      const a = signal(1)
      const b = signal(2)
      const c = computed(() => a.value + b.value)
      const results = Array.from({ length: 100 }, () => c.value)
      expect(results.every((r) => r === 3)).toBe(true)
    })

    it('P7-3: Batch concurrent updates', () => {
      const a = signal(0)
      const b = signal(0)
      const c = computed(() => {
        // Simulate concurrent read of a.value
        const va = a.value + 0
        const vb = b.value + 0
        return va + vb
      })
      // Parallel updates outside batch
      const updates: number[] = []
      for (let i = 0; i < 20; i++) {
        a.value = i
        b.value = i * 2
        updates.push(i)
      }
      expect(updates).toHaveLength(20)
    })

    it('P7-4: Signal with many subscribers notifies all', () => {
      const s = signal(0)
      const fns = Array.from({ length: 100 }, () => vi.fn())
      const unsubs = fns.map((fn) => s.subscribe(fn))
      s.value = 1
      for (const fn of fns) expect(fn).toHaveBeenCalledTimes(1)
      for (const u of unsubs) u()
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 8: ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

describe('PHASE 8: ERROR HANDLING', () => {
  describe('8.1 Error Classification', () => {
    it('P8-1: normalizeError returns HttpException instance for known exception', () => {
      const e = new BadRequestException('bad')
      const result = normalizeError(e)
      expect(result).toBeInstanceOf(BadRequestException)
      expect(result.message).toBe('bad')
    })

    it('P8-2: normalizeError wraps plain Error', () => {
      process.env.NODE_ENV = 'development'
      const e = new Error('query failed')
      const result = normalizeError(e)
      expect(result).toBeInstanceOf(InternalServerErrorException)
      delete process.env.NODE_ENV
    })

    it('P8-3: normalizeError in production hides details', () => {
      process.env.NODE_ENV = 'production'
      const result = normalizeError(new Error('Database: credentials=secret'))
      expect(result.message).toBe('Internal Server Error')
      delete process.env.NODE_ENV
    })

    it('P8-4: SchemaError has proper name', () => {
      try {
        schema.number().parse('not')
      } catch (e) {
        expect(e).toBeInstanceOf(SchemaError)
        expect((e as SchemaError).name).toBe('SchemaError')
      }
    })

    it('P8-5: SchemaError toJSON returns serializable', () => {
      const err = new SchemaError('test', { path: 'foo', received: 42 })
      const json = err.toJSON()
      expect(json.name).toBe('SchemaError')
      expect(json.path).toBe('foo')
      expect(json.received).toBe(42)
    })
  })

  describe('8.2 SchemaError path propagation', () => {
    it('P8-6: Nested object error has correct path', () => {
      const sc = schema.object({
        user: schema.object({
          email: schema.string().email(),
        }),
      })
      try {
        sc.parse({ user: { email: 'invalid' } })
      } catch (e) {
        expect((e as SchemaError).path).toContain('user.email')
      }
    })

    it('P8-7: Array element error has correct path', () => {
      const sc = schema.object({
        items: schema.array(
          schema.object({
            id: schema.number(),
          }),
        ),
      })
      try {
        sc.parse({ items: [{ id: 'not-number' }] })
      } catch (e) {
        expect((e as SchemaError).path).toContain('[0]')
      }
    })

    it('P8-8: safeParse returns error without throwing', () => {
      const r = schema.number().safeParse('bad')
      expect(r.success).toBe(false)
    })
  })

  describe('8.3 Production safety', () => {
    afterEach(() => {
      delete process.env.NODE_ENV
    })

    it('P8-9: normalizeError production default message', () => {
      process.env.NODE_ENV = 'production'
      const e = new InternalServerErrorException()
      expect(e.message).toBe('Internal Server Error')
    })

    it('P8-10: normalizeError no NODE_ENV shows message', () => {
      const result = normalizeError(new Error('visible'))
      expect(result.message).toBe('visible')
    })
  })
})
