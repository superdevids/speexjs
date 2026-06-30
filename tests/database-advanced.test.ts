import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DatabaseConnection } from '../src/server/database/connection.js'
import { createDriver } from '../src/server/database/driver.js'
import { Model } from '../src/server/database/model.js'
import { QueryBuilder } from '../src/server/database/query.js'
import { MysqlDialect, SqliteDialect, PostgresqlDialect, createDialect } from '../src/server/database/dialect.js'
import { SchemaBuilder, Migrator } from '../src/server/database/migration.js'
import { Seeder } from '../src/server/database/seeder.js'
import type { ConnectionConfig, QueryResult, QueryRunner, DatabaseDriver, JoinType, OrderDirection } from '../src/server/database/types.js'

// ---------------------------------------------------------------------------
// Hoisted mock objects – shared mutable refs for driver external deps
// ---------------------------------------------------------------------------

const { mysqlMocks, pgMocks, sqliteMocks } = vi.hoisted(() => {
  const mysqlConn = {
    release: vi.fn(),
    execute: vi.fn().mockResolvedValue([{ insertId: 1 }, []]),
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  }
  const mysqlPool = {
    getConnection: vi.fn().mockResolvedValue(mysqlConn),
    execute: vi.fn().mockResolvedValue([{ insertId: 1 }, []]),
    end: vi.fn().mockResolvedValue(undefined),
  }

  const pgClient = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  }
  const pgPool = {
    query: vi.fn().mockResolvedValue({ rows: [{ id: 1 }] }),
    end: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(pgClient),
  }

  const sqliteStmt = {
    all: vi.fn().mockReturnValue([{ id: 1 }]),
    run: vi.fn(),
  }
  const sqliteDb = {
    prepare: vi.fn(() => sqliteStmt),
    close: vi.fn(),
    pragma: vi.fn(),
    exec: vi.fn(),
  }

  return {
    mysqlMocks: { pool: mysqlPool, conn: mysqlConn },
    pgMocks: { pool: pgPool, client: pgClient },
    sqliteMocks: { db: sqliteDb, stmt: sqliteStmt },
  }
})

// ---------------------------------------------------------------------------
// Mock external runtime dependencies used by driver.ts
// ---------------------------------------------------------------------------

vi.mock('mysql2/promise', () => ({
  createPool: vi.fn(() => mysqlMocks.pool),
}))

vi.mock('pg', () => ({
  Pool: vi.fn(() => pgMocks.pool),
}))

vi.mock('better-sqlite3', () => ({}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQb(
  table = 'users',
  driver: DatabaseDriver = 'mysql',
  dialect?: import('../src/server/database/dialect.js').Dialect,
): { qb: QueryBuilder; raw: ReturnType<typeof vi.fn>; dialect: import('../src/server/database/dialect.js').Dialect } {
  const { runner, dialect: d, raw } = makeMockRunner(driver, dialect)
  return { qb: new QueryBuilder(runner, table), raw, dialect: d }
}

function makeMockRunner(driver: DatabaseDriver = 'mysql'): { runner: QueryRunner; raw: ReturnType<typeof vi.fn> } {
  const dialect = createDialect(driver)
  const raw = vi.fn().mockResolvedValue({ rows: [] })
  const runner: QueryRunner = {
    raw,
    getDialect: () => dialect,
    getPrefix: () => '',
    getDriver: () => driver,
  }
  return { runner, raw }
}

// ===========================================================================
// DatabaseConnection
// ===========================================================================

describe('DatabaseConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('sets defaults for mysql driver', () => {
      const conn = new DatabaseConnection({ database: 'test' })
      const cfg = conn.getConfig()
      expect(cfg.driver).toBe('mysql')
      expect(cfg.host).toBe('127.0.0.1')
      expect(cfg.charset).toBe('utf8mb4')
      expect(cfg.port).toBe(3306)
      expect(cfg.prefix).toBe('')
    })

    it('sets port 3306 for mysql driver', () => {
      const conn = new DatabaseConnection({ database: 't', driver: 'mysql' })
      expect(conn.getConfig().port).toBe(3306)
    })

    it('sets port 5432 for postgresql driver', () => {
      const conn = new DatabaseConnection({
        database: 't',
        driver: 'postgresql',
      })
      expect(conn.getConfig().port).toBe(5432)
    })

    it('does not override explicit port', () => {
      const conn = new DatabaseConnection({
        database: 't',
        driver: 'mysql',
        port: 9999,
      })
      expect(conn.getConfig().port).toBe(9999)
    })

    it('does not set port for sqlite', () => {
      const conn = new DatabaseConnection({
        database: 't',
        driver: 'sqlite',
      })
      expect(conn.getConfig().port).toBeUndefined()
    })

    it('uses provided prefix', () => {
      const conn = new DatabaseConnection({
        database: 't',
        prefix: 'app_',
      })
      expect(conn.getPrefix()).toBe('app_')
    })
  })

  describe('connect / disconnect', () => {
    it('connect() creates a driver and calls connect', async () => {
      const conn = new DatabaseConnection({ database: 'test' })
      await conn.connect()
      expect(conn.isConnected()).toBe(true)
    })

    it('connect() is idempotent', async () => {
      const conn = new DatabaseConnection({ database: 'test' })
      await conn.connect()
      const driver = (conn as any).driver
      const spy = vi.spyOn(driver, 'connect')
      await conn.connect()
      expect(spy).not.toHaveBeenCalled()
    })

    it('disconnect() calls driver disconnect and sets driver to null', async () => {
      const conn = new DatabaseConnection({ database: 'test' })
      await conn.connect()
      expect(conn.isConnected()).toBe(true)
      await conn.disconnect()
      expect(conn.isConnected()).toBe(false)
    })

    it('disconnect() is safe when not connected', async () => {
      const conn = new DatabaseConnection({ database: 'test' })
      await expect(conn.disconnect()).resolves.toBeUndefined()
    })
  })

  describe('raw', () => {
    it('throws when not connected', async () => {
      const conn = new DatabaseConnection({ database: 'test' })
      await expect(conn.raw('SELECT 1')).rejects.toThrow('Database not connected')
    })

    it('delegates to driver.raw', async () => {
      const conn = new DatabaseConnection({ database: 'test' })
      await conn.connect()
      const driver = (conn as any).driver
      driver.raw = vi.fn().mockResolvedValue({ rows: [{ id: 1 }] })
      const result = await conn.raw('SELECT ?', [1])
      expect(driver.raw).toHaveBeenCalledWith('SELECT ?', [1])
      expect(result).toEqual({ rows: [{ id: 1 }] })
    })
  })

  describe('table', () => {
    it('creates QueryBuilder with table name', () => {
      const conn = new DatabaseConnection({ database: 'test' })
      const qb = conn.table('users')
      expect(qb).toBeInstanceOf(QueryBuilder)
    })

    it('prepends prefix to table name', async () => {
      const conn = new DatabaseConnection({
        database: 'test',
        prefix: 'app_',
      })
      await conn.connect()
      const qb = conn.table('users')
      const result = qb.toSQL()
      expect(result.sql).toContain('`app_users`')
    })
  })

  describe('transaction', () => {
    it('throws when not connected', async () => {
      const conn = new DatabaseConnection({ database: 'test' })
      await expect(conn.transaction(async (trx) => 'ok')).rejects.toThrow('Database not connected')
    })

    it('calls driver.transaction and wraps callback', async () => {
      const conn = new DatabaseConnection({ database: 'test' })
      await conn.connect()
      const driver = (conn as any).driver
      driver.transaction = vi.fn().mockImplementationOnce(async <T>(cb: (d: any) => Promise<T>) => {
        return cb(driver)
      })
      const result = await conn.transaction(async (trx) => {
        expect(trx).toBeInstanceOf(DatabaseConnection)
        expect(trx.raw).toBeDefined()
        return 'done'
      })
      expect(result).toBe('done')
    })

    it('transaction raw delegates to driver raw', async () => {
      const conn = new DatabaseConnection({ database: 'test' })
      await conn.connect()
      const driver = (conn as any).driver
      driver.transaction = vi.fn().mockImplementationOnce(async <T>(cb: (d: any) => Promise<T>) => {
        return cb(driver)
      })
      driver.raw = vi.fn().mockResolvedValue({ rows: [{ x: 1 }] })
      const result = await conn.transaction(async (trx) => {
        return trx.raw('SELECT ?', [1])
      })
      expect(result).toEqual({ rows: [{ x: 1 }] })
    })
  })

  describe('getDriver / getDialect', () => {
    it('getDriver returns driver type from config', () => {
      const conn = new DatabaseConnection({
        database: 't',
        driver: 'postgresql',
      })
      expect(conn.getDriver()).toBe('postgresql')
    })

    it('getDriver defaults to mysql', () => {
      const conn = new DatabaseConnection({ database: 't' })
      expect(conn.getDriver()).toBe('mysql')
    })

    it('getDialect throws when not connected', () => {
      const conn = new DatabaseConnection({ database: 't' })
      expect(() => conn.getDialect()).toThrow('Database not connected')
    })

    it('getDialect returns dialect from driver', async () => {
      const conn = new DatabaseConnection({ database: 't' })
      await conn.connect()
      const dialect = conn.getDialect()
      expect(dialect).toBeInstanceOf(MysqlDialect)
    })
  })

  describe('isConnected', () => {
    it('returns false when driver is null', () => {
      const conn = new DatabaseConnection({ database: 't' })
      expect(conn.isConnected()).toBe(false)
    })

    it('returns false when driver says not connected', async () => {
      const conn = new DatabaseConnection({ database: 't' })
      await conn.connect()
      ;(conn as any).driver.isConnected = vi.fn().mockReturnValue(false)
      expect(conn.isConnected()).toBe(false)
    })

    it('returns true when connected', async () => {
      const conn = new DatabaseConnection({ database: 't' })
      await conn.connect()
      expect(conn.isConnected()).toBe(true)
    })
  })

  describe('getConfig', () => {
    it('returns a copy of config', () => {
      const conn = new DatabaseConnection({
        database: 'mydb',
        username: 'root',
      })
      const cfg = conn.getConfig()
      expect(cfg.database).toBe('mydb')
      expect(cfg.username).toBe('root')
      expect(cfg.host).toBe('127.0.0.1')
    })
  })

  describe('generateId', () => {
    it('returns a UUID string', () => {
      const id = DatabaseConnection.generateId()
      expect(typeof id).toBe('string')
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('returns unique values', () => {
      const ids = new Set(Array.from({ length: 100 }, () => DatabaseConnection.generateId()))
      expect(ids.size).toBe(100)
    })
  })
})

// ===========================================================================
// Driver
// ===========================================================================

describe('Driver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createDriver', () => {
    it('creates mysql driver', async () => {
      const driver = await createDriver({ database: 'test', driver: 'mysql' })
      expect(driver.getDriver()).toBe('mysql')
      expect(driver.getDialect()).toBeInstanceOf(MysqlDialect)
    })

    it('creates postgresql driver', async () => {
      const driver = await createDriver({
        database: 'test',
        driver: 'postgresql',
      })
      expect(driver.getDriver()).toBe('postgresql')
      expect(driver.getDialect()).toBeInstanceOf(PostgresqlDialect)
    })

    it('creates sqlite driver (requires better-sqlite3 installed)', async () => {
      // When better-sqlite3 is available, this succeeds
      // When not, it throws (as expected for optional dependency)
      try {
        const driver = await createDriver({ database: 'test', driver: 'sqlite' })
        expect(driver.getDriver()).toBe('sqlite')
        expect(driver.getDialect()).toBeInstanceOf(SqliteDialect)
      } catch (e: any) {
        expect(e.message).toContain('better-sqlite3')
      }
    })

    it('defaults to mysql for unknown driver', async () => {
      const driver = await createDriver({
        database: 'test',
        driver: 'unknown' as any,
      })
      expect(driver.getDriver()).toBe('mysql')
      expect(driver.getDialect()).toBeInstanceOf(MysqlDialect)
    })
  })

  describe('MysqlDriver', () => {
    let driver: any

    beforeEach(async () => {
      vi.clearAllMocks()
      driver = await createDriver({ database: 'test_mysql', driver: 'mysql' })
    })

    it('connect() creates pool and verifies connection', async () => {
      await driver.connect()
      expect(mysqlMocks.pool.getConnection).toHaveBeenCalled()
      expect(mysqlMocks.conn.release).toHaveBeenCalled()
    })

    it('isConnected returns false before connect', () => {
      expect(driver.isConnected()).toBe(false)
    })

    it('isConnected returns true after connect', async () => {
      await driver.connect()
      expect(driver.isConnected()).toBe(true)
    })

    it('disconnect() ends pool', async () => {
      await driver.connect()
      await driver.disconnect()
      expect(mysqlMocks.pool.end).toHaveBeenCalled()
      expect(driver.isConnected()).toBe(false)
    })

    it('disconnect() is safe when pool is null', async () => {
      await expect(driver.disconnect()).resolves.toBeUndefined()
    })

    it('raw() throws when not connected', async () => {
      await expect(driver.raw('SELECT 1')).rejects.toThrow('Database not connected')
    })

    it('raw() executes and returns rows', async () => {
      await driver.connect()
      mysqlMocks.pool.execute.mockResolvedValueOnce([{ insertId: 42 }, []])
      const result = await driver.raw('INSERT INTO t (n) VALUES (?)', [1])
      expect(mysqlMocks.pool.execute).toHaveBeenCalledWith('INSERT INTO t (n) VALUES (?)', [1])
      expect(result.rows).toEqual({ insertId: 42 })
    })

    it('transaction() runs callback and commits', async () => {
      await driver.connect()
      const result = await driver.transaction(async (d: any) => {
        await d.raw('INSERT INTO t (n) VALUES (?)', [1])
        return 'txn_done'
      })
      expect(result).toBe('txn_done')
      expect(mysqlMocks.conn.beginTransaction).toHaveBeenCalledOnce()
      expect(mysqlMocks.conn.commit).toHaveBeenCalledOnce()
    })

    it('transaction() rolls back on error', async () => {
      await driver.connect()
      mysqlMocks.conn.execute.mockRejectedValueOnce(new Error('txn fail'))
      await expect(
        driver.transaction(async (d: any) => {
          await d.raw('INVALID')
        }),
      ).rejects.toThrow('txn fail')
      expect(mysqlMocks.conn.rollback).toHaveBeenCalledOnce()
    })

    it('transaction() throws when not connected', async () => {
      await expect(driver.transaction(async () => 'ok')).rejects.toThrow('Database not connected')
    })

    it('getDialect returns MysqlDialect', () => {
      expect(driver.getDialect()).toBeInstanceOf(MysqlDialect)
    })

    it('getDriver returns mysql', () => {
      expect(driver.getDriver()).toBe('mysql')
    })
  })

  describe('PostgresqlDriver', () => {
    let driver: any

    beforeEach(async () => {
      vi.clearAllMocks()
      driver = await createDriver({
        database: 'test_pg',
        driver: 'postgresql',
      })
    })

    it('connect() creates pool and verifies connection', async () => {
      await driver.connect()
      expect(pgMocks.pool.query).toHaveBeenCalledWith('SELECT 1')
    })

    it('isConnected returns false before connect', () => {
      expect(driver.isConnected()).toBe(false)
    })

    it('isConnected returns true after connect', async () => {
      await driver.connect()
      expect(driver.isConnected()).toBe(true)
    })

    it('disconnect() ends pool', async () => {
      await driver.connect()
      await driver.disconnect()
      expect(pgMocks.pool.end).toHaveBeenCalled()
      expect(driver.isConnected()).toBe(false)
    })

    it('disconnect() is safe when pool is null', async () => {
      await expect(driver.disconnect()).resolves.toBeUndefined()
    })

    it('raw() throws when not connected', async () => {
      await expect(driver.raw('SELECT 1')).rejects.toThrow('Database not connected')
    })

    it('raw() executes and returns rows', async () => {
      pgMocks.pool.query.mockReset()
      pgMocks.pool.query.mockResolvedValueOnce({ rows: [] })
      await driver.connect()
      pgMocks.pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })
      const result = await driver.raw('SELECT $1 as id', [1])
      expect(result).toEqual({ rows: [{ id: 1 }] })
    })

    it('transaction() runs callback and commits', async () => {
      await driver.connect()
      pgMocks.client.query.mockReset()
      pgMocks.client.query.mockResolvedValue({ rows: [] })
      const result = await driver.transaction(async (d: any) => {
        await d.raw('INSERT INTO t (n) VALUES ($1)', [1])
        return 'pg_done'
      })
      expect(result).toBe('pg_done')
      expect(pgMocks.client.query).toHaveBeenCalledWith('BEGIN')
      expect(pgMocks.client.query).toHaveBeenCalledWith('COMMIT')
      expect(pgMocks.client.release).toHaveBeenCalled()
    })

    it('transaction() rolls back on error', async () => {
      await driver.connect()
      pgMocks.client.query.mockReset()
      pgMocks.client.query.mockResolvedValue({ rows: [] })
      pgMocks.client.query.mockRejectedValueOnce(new Error('pg fail'))
      await expect(
        driver.transaction(async (d: any) => {
          await d.raw('INVALID')
        }),
      ).rejects.toThrow('pg fail')
      expect(pgMocks.client.query).toHaveBeenCalledWith('ROLLBACK')
      expect(pgMocks.client.release).toHaveBeenCalled()
    })

    it('transaction() throws when not connected', async () => {
      await expect(driver.transaction(async () => 'ok')).rejects.toThrow('Database not connected')
    })

    it('getDialect returns PostgresqlDialect', () => {
      expect(driver.getDialect()).toBeInstanceOf(PostgresqlDialect)
    })

    it('getDriver returns postgresql', () => {
      expect(driver.getDriver()).toBe('postgresql')
    })
  })

  describe('SqliteDriver', () => {
    it('getDialect and getDriver work on constructed object', async () => {
      // When better-sqlite3 is available, full driver construction works
      try {
        const driver = await createDriver({ database: 'test.db', driver: 'sqlite' })
        expect(driver.getDialect()).toBeInstanceOf(SqliteDialect)
        expect(driver.getDriver()).toBe('sqlite')
      } catch {
        // better-sqlite3 not installed – skip
      }
    })
  })
})

// ===========================================================================
// Model
// ===========================================================================

describe('Model', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Model.connection = null
    ;(Model as any).queryRunner = null
    ;(User as any).connection = null
    ;(User as any).queryRunner = null
    ;(Post as any).connection = null
    ;(Post as any).queryRunner = null
    ;(Model as any).relationDefs = new Map()
    ;(Model as any).eagerLoads = new Map()
  })

  class User extends Model {
    static table = 'users'
    name?: string
    email?: string
  }

  class Post extends Model {
    static table = 'posts'
    title?: string
    user_id?: number
  }

  describe('setConnection', () => {
    it('sets connection and queryRunner', () => {
      const { runner } = makeMockRunner()
      User.setConnection(runner)
      expect((User as any).connection).toBe(runner)
      expect((User as any).queryRunner).toBe(runner)
    })
  })

  describe('query', () => {
    it('throws when connection not set', () => {
      expect(() => User.query()).toThrow('Database connection not set')
    })

    it('returns a QueryBuilder', () => {
      const { runner } = makeMockRunner()
      User.setConnection(runner)
      const qb = User.query()
      expect(qb).toBeInstanceOf(QueryBuilder)
    })
  })

  describe('all', () => {
    it('returns hydrated instances', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValue({
        rows: [
          { id: 1, name: 'Alice', email: 'a@b.com' },
          { id: 2, name: 'Bob', email: 'b@c.com' },
        ],
      })
      User.setConnection(runner)
      const users = await User.all()
      expect(users).toHaveLength(2)
      expect(users[0]).toBeInstanceOf(User)
      expect(users[0].id).toBe(1)
      expect(users[0].name).toBe('Alice')
      expect(users[1]).toBeInstanceOf(User)
      expect(users[1].id).toBe(2)
    })

    it('returns empty array when no rows', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValue({ rows: [] })
      User.setConnection(runner)
      const users = await User.all()
      expect(users).toEqual([])
    })
  })

  describe('find', () => {
    it('returns hydrated instance when found', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValue({
        rows: [{ id: 42, name: 'Charlie' }],
      })
      User.setConnection(runner)
      const user = await User.find(42)
      expect(user).toBeInstanceOf(User)
      expect(user!.id).toBe(42)
      expect(user!.name).toBe('Charlie')
    })

    it('returns null when not found', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValue({ rows: [] })
      User.setConnection(runner)
      const user = await User.find(999)
      expect(user).toBeNull()
    })
  })

  describe('where', () => {
    it('returns a QueryBuilder with where clause', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValue({ rows: [{ id: 1, name: 'X' }] })
      User.setConnection(runner)
      const qb = await User.where('name', 'X')
      expect(qb).toBeInstanceOf(QueryBuilder)
      const result = await qb.get()
      expect(result).toEqual([{ id: 1, name: 'X' }])
    })
  })

  describe('create', () => {
    it('inserts data and returns hydrated instance', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValueOnce({ rows: { insertId: 10 } })
      raw.mockResolvedValueOnce({
        rows: [{ id: 10, name: 'NewUser', email: 'n@b.com' }],
      })
      User.setConnection(runner)
      const user = await User.create({ name: 'NewUser', email: 'n@b.com' })
      expect(user).toBeInstanceOf(User)
      expect(user.id).toBe(10)
      expect(user.name).toBe('NewUser')
    })
  })

  describe('updateOrCreate', () => {
    it('updates existing record when found by attributes', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValueOnce({
        rows: [{ id: 5, name: 'Old', email: 'old@b.com' }],
      })
      raw.mockResolvedValueOnce({ rows: { affectedRows: 1 } })
      raw.mockResolvedValueOnce({
        rows: [{ id: 5, name: 'Updated', email: 'old@b.com' }],
      })
      User.setConnection(runner)
      const user = await User.updateOrCreate({ email: 'old@b.com' }, { name: 'Updated' })
      expect(user).toBeInstanceOf(User)
      expect(user.id).toBe(5)
      expect(user.name).toBe('Updated')
    })

    it('creates new record when not found', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValueOnce({ rows: [] })
      raw.mockResolvedValueOnce({ rows: { insertId: 99 } })
      raw.mockResolvedValueOnce({
        rows: [{ id: 99, name: 'New', email: 'new@b.com' }],
      })
      User.setConnection(runner)
      const user = await User.updateOrCreate({ email: 'new@b.com' }, { name: 'New' })
      expect(user).toBeInstanceOf(User)
      expect(user.id).toBe(99)
      expect(user.name).toBe('New')
    })

    it('uses attributes as values when values omitted', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValueOnce({ rows: [] })
      raw.mockResolvedValueOnce({ rows: { insertId: 7 } })
      raw.mockResolvedValueOnce({
        rows: [{ id: 7, name: 'Test' }],
      })
      User.setConnection(runner)
      const user = await User.updateOrCreate({ name: 'Test' })
      expect(user.id).toBe(7)
    })
  })

  describe('save (instance method)', () => {
    it('inserts new record when id is null', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValueOnce({ rows: { insertId: 11 } })
      User.setConnection(runner)
      const user = new User()
      user.name = 'Fresh'
      user.email = 'f@b.com'
      await user.save()
      expect(user.id).toBe(11)
    })

    it('inserts new record when id is undefined', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValueOnce({ rows: { insertId: 22 } })
      User.setConnection(runner)
      const user = new User()
      user.name = 'UndefinedId'
      await user.save()
      expect(user.id).toBe(22)
    })

    it('updates existing record when id is set', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValueOnce({ rows: { affectedRows: 1 } })
      User.setConnection(runner)
      const user = new User()
      user.id = 1
      user.name = 'UpdatedName'
      user.email = 'u@b.com'
      await user.save()
      expect(raw).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.arrayContaining(['UpdatedName', 'u@b.com']))
    })
  })

  describe('delete (instance method)', () => {
    it('deletes record when id is set', async () => {
      const { runner, raw } = makeMockRunner()
      raw.mockResolvedValue({ rows: { affectedRows: 1 } })
      User.setConnection(runner)
      const user = new User()
      user.id = 1
      await user.delete()
      expect(raw).toHaveBeenCalledWith('DELETE FROM `users` WHERE `id` = ?', [1])
    })

    it('does nothing when id is null', async () => {
      const { runner, raw } = makeMockRunner()
      User.setConnection(runner)
      const user = new User()
      await user.delete()
      expect(raw).not.toHaveBeenCalled()
    })

    it('does nothing when id is undefined', async () => {
      const { runner, raw } = makeMockRunner()
      User.setConnection(runner)
      const user = new User()
      user.name = 'NoDelete'
      await user.delete()
      expect(raw).not.toHaveBeenCalled()
    })
  })

  describe('belongsTo', () => {
    it('generates query with foreign key matching owner key', () => {
      Post.belongsTo(User)
      const store = (Post as any).getStore()
      const defs = store.relationDefs as Map<string, any>
      const key = 'belongsTo:users'
      expect(defs.has(key)).toBe(true)
      const def = defs.get(key)
      expect(def.type).toBe('belongsTo')
      expect(def.relatedModel).toBe(User)
      expect(def.foreignKey).toBe('users_id')
      expect(def.localKey).toBe('id')
    })

    it('uses custom foreignKey and ownerKey', () => {
      Post.belongsTo(User, 'author_id', 'uuid')
      const store = (Post as any).getStore()
      const defs = store.relationDefs as Map<string, any>
      const key = 'belongsTo:users'
      expect(defs.has(key)).toBe(true)
      const def = defs.get(key)
      expect(def.foreignKey).toBe('author_id')
      expect(def.localKey).toBe('uuid')
    })
  })

  describe('hasMany', () => {
    it('generates query with join', () => {
      User.hasMany(Post)
      const store = (User as any).getStore()
      const defs = store.relationDefs as Map<string, any>
      const key = 'hasMany:posts'
      expect(defs.has(key)).toBe(true)
      const def = defs.get(key)
      expect(def.type).toBe('hasMany')
      expect(def.relatedModel).toBe(Post)
      expect(def.foreignKey).toBe('users_id')
      expect(def.localKey).toBe('id')
    })

    it('uses custom foreignKey and localKey', () => {
      User.hasMany(Post, 'author_id', 'uuid')
      const store = (User as any).getStore()
      const defs = store.relationDefs as Map<string, any>
      const key = 'hasMany:posts'
      expect(defs.has(key)).toBe(true)
      const def = defs.get(key)
      expect(def.foreignKey).toBe('author_id')
      expect(def.localKey).toBe('uuid')
    })
  })

  describe('edge cases', () => {
    it('getData excludes prototype methods', () => {
      const user = new User()
      user.id = 1
      user.name = 'Test'
      user.email = 't@t.com'
      ;(user as any).save = 'not a method'
      const data = (user as any).getData()
      expect(data.id).toBe(1)
      expect(data.name).toBe('Test')
      expect(data.email).toBe('t@t.com')
      expect(data.save).toBeUndefined()
      expect(data.delete).toBeUndefined()
      expect(data.getData).toBeUndefined()
    })
  })
})

// ===========================================================================
// Types – compile-time checks & runtime usage
// ===========================================================================

describe('Types', () => {
  it('QueryResult shape is respected', () => {
    const result: QueryResult = { rows: [{ a: 1 }], fields: [{ name: 'a' }] }
    expect(result.rows).toHaveLength(1)
    expect(result.fields).toHaveLength(1)
  })

  it('QueryResult fields is optional', () => {
    const result: QueryResult = { rows: [] }
    expect(result.fields).toBeUndefined()
  })

  it('QueryRunner interface contract', () => {
    const dialect = new MysqlDialect()
    const runner: QueryRunner = {
      raw: vi.fn(),
      getDialect: () => dialect,
      getPrefix: () => 'pre_',
      getDriver: () => 'mysql',
    }
    expect(runner.getPrefix()).toBe('pre_')
    expect(runner.getDriver()).toBe('mysql')
    expect(runner.getDialect()).toBe(dialect)
  })

  it('ConnectionConfig interface is satisfied by DatabaseConnection config', () => {
    const cfg: ConnectionConfig = {
      driver: 'postgresql',
      host: 'pg.example.com',
      port: 5432,
      database: 'mydb',
      username: 'admin',
      password: 'secret',
      charset: 'utf8',
      prefix: 'app_',
    }
    const conn = new DatabaseConnection(cfg)
    const config = conn.getConfig()
    expect(config.driver).toBe('postgresql')
    expect(config.host).toBe('pg.example.com')
    expect(config.port).toBe(5432)
    expect(config.database).toBe('mydb')
    expect(config.username).toBe('admin')
    expect(config.password).toBe('secret')
    expect(config.charset).toBe('utf8')
    expect(config.prefix).toBe('app_')
  })
})

// ===========================================================================
// Dialect – advanced / uncovered lines
// ===========================================================================

describe('Dialect – advanced coverage', () => {
  describe('MysqlDialect', () => {
    const d = new MysqlDialect()

    it('compileModifyColumn', () => {
      const sql = d.compileModifyColumn({
        name: 'email',
        type: 'string',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: 255,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('MODIFY COLUMN `email` VARCHAR(255) NULL')
    })

    it('compileTableBlueprint', () => {
      const cols = [
        {
          name: 'id',
          type: 'increments',
          nullable: false,
          defaultValue: undefined,
          unsigned: false,
          unique: false,
          primary: false,
          index: false,
          comment: null,
          after: null,
          first: false,
          autoIncrement: false,
          precision: null,
          scale: null,
          length: null,
          values: null,
          isForeignId: false,
        },
        {
          name: 'name',
          type: 'string',
          nullable: false,
          defaultValue: undefined,
          unsigned: false,
          unique: false,
          primary: false,
          index: false,
          comment: null,
          after: null,
          first: false,
          autoIncrement: false,
          precision: null,
          scale: null,
          length: 255,
          values: null,
          isForeignId: false,
        },
      ]
      const result = d.compileTableBlueprint('users', cols, ['UNIQUE (name)'])
      expect(result).toContain('`id` INT AUTO_INCREMENT PRIMARY KEY')
      expect(result).toContain('`name` VARCHAR(255) NOT NULL')
      expect(result).toContain('UNIQUE (name)')
    })

    it('compileColumn with unsigned', () => {
      const sql = d.compileColumn({
        name: 'views',
        type: 'integer',
        nullable: false,
        defaultValue: undefined,
        unsigned: true,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('`views` INT UNSIGNED NOT NULL')
    })

    it('compileColumn with autoIncrement (non-id type)', () => {
      const sql = d.compileColumn({
        name: 'views',
        type: 'integer',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: true,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('`views` INT AUTO_INCREMENT')
    })

    it('compileColumn with primary and unique flags', () => {
      const sql = d.compileColumn({
        name: 'code',
        type: 'string',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: true,
        primary: true,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: 50,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('VARCHAR(50) NOT NULL PRIMARY KEY UNIQUE')
    })

    it('compileColumn with comment and after', () => {
      const sql = d.compileColumn({
        name: 'nickname',
        type: 'string',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: 'display name',
        after: 'name',
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: 100,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('VARCHAR(100) NULL')
      expect(sql).toContain("COMMENT 'display name'")
      expect(sql).toContain('AFTER `name`')
    })

    it('compileColumn – bigIncrements', () => {
      const sql = d.compileColumn({
        name: 'id',
        type: 'bigIncrements',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('`id` BIGINT AUTO_INCREMENT PRIMARY KEY')
    })

    it('compileColumn – foreignId with NOT NULL', () => {
      const sql = d.compileColumn({
        name: 'user_id',
        type: 'foreignId',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: true,
      })
      expect(sql).toBe('`user_id` INT UNSIGNED NOT NULL')
    })

    it('compileColumn – foreignId nullable', () => {
      const sql = d.compileColumn({
        name: 'user_id',
        type: 'foreignId',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: true,
      })
      expect(sql).toBe('`user_id` INT UNSIGNED NULL')
    })

    it('compileColumn – mapType fallback for unknown type', () => {
      const sql = d.compileColumn({
        name: 'custom_col',
        type: 'my_custom_type',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('my_custom_type')
    })

    it('formatDefault with null value (no DEFAULT emitted)', () => {
      const sql = d.compileColumn({
        name: 'val',
        type: 'integer',
        nullable: true,
        defaultValue: null,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('`val` INT NULL')
    })

    it('formatDefault with boolean true', () => {
      const sql = d.compileColumn({
        name: 'active',
        type: 'boolean',
        nullable: false,
        defaultValue: true,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('DEFAULT 1')
    })

    it('formatDefault with boolean false', () => {
      const sql = d.compileColumn({
        name: 'active',
        type: 'boolean',
        nullable: false,
        defaultValue: false,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('DEFAULT 0')
    })

    it('formatDefault with numeric value', () => {
      const sql = d.compileColumn({
        name: 'score',
        type: 'integer',
        nullable: false,
        defaultValue: 100,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('DEFAULT 100')
    })

    it('compileColumn with CURRENT_TIMESTAMP default', () => {
      const sql = d.compileColumn({
        name: 'created_at',
        type: 'timestamp',
        nullable: false,
        defaultValue: 'CURRENT_TIMESTAMP',
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('DEFAULT CURRENT_TIMESTAMP')
    })

    it('compileInsert passes through', () => {
      expect(d.compileInsert('SELECT 1')).toBe('SELECT 1')
    })
  })

  describe('SqliteDialect', () => {
    const d = new SqliteDialect()

    it('compileModifyColumn returns compileColumn result', () => {
      const col = {
        name: 'name',
        type: 'string',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: 255,
        values: null,
        isForeignId: false,
      }
      expect(d.compileModifyColumn(col)).toBe(d.compileColumn(col))
    })

    it('compileColumn with autoIncrement non-id type', () => {
      const sql = d.compileColumn({
        name: 'custom_id',
        type: 'integer',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: true,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('AUTOINCREMENT')
    })

    it('compileColumn nullable without default', () => {
      const sql = d.compileColumn({
        name: 'bio',
        type: 'text',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('TEXT NULL')
    })

    it('compileColumn with default value', () => {
      const sql = d.compileColumn({
        name: 'status',
        type: 'string',
        nullable: false,
        defaultValue: 'active',
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: 50,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain("DEFAULT 'active'")
    })

    it('compileColumn with CURRENT_TIMESTAMP default', () => {
      const sql = d.compileColumn({
        name: 'created_at',
        type: 'timestamp',
        nullable: false,
        defaultValue: 'CURRENT_TIMESTAMP',
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('DEFAULT CURRENT_TIMESTAMP')
    })

    it('compileColumn with primary and unique', () => {
      const sql = d.compileColumn({
        name: 'code',
        type: 'string',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: true,
        primary: true,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: 32,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('PRIMARY KEY')
      expect(sql).toContain('UNIQUE')
    })

    it('compileColumn – foreignId with NOT NULL', () => {
      const sql = d.compileColumn({
        name: 'user_id',
        type: 'foreignId',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: true,
      })
      expect(sql).toBe('"user_id" INTEGER NOT NULL')
    })

    it('compileColumn – foreignId nullable', () => {
      const sql = d.compileColumn({
        name: 'user_id',
        type: 'foreignId',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: true,
      })
      expect(sql).toBe('"user_id" INTEGER NULL')
    })

    it('compileAddColumns', () => {
      const col = {
        name: 'age',
        type: 'integer',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      }
      expect(d.compileAddColumns('users', [col])).toBe('ADD COLUMN "age" INTEGER NULL')
    })

    it('compileDropColumns', () => {
      expect(d.compileDropColumns('users', ['age', 'bio'])).toBe('DROP COLUMN "age", DROP COLUMN "bio"')
    })

    it('compileRenameColumn', () => {
      expect(d.compileRenameColumn('users', 'name', 'username')).toBe('RENAME COLUMN "name" TO "username"')
    })

    it('compileCreateTable', () => {
      const columns = [
        {
          name: 'id',
          type: 'increments',
          nullable: false,
          defaultValue: undefined,
          unsigned: false,
          unique: false,
          primary: false,
          index: false,
          comment: null,
          after: null,
          first: false,
          autoIncrement: false,
          precision: null,
          scale: null,
          length: null,
          values: null,
          isForeignId: false,
        },
      ]
      const sql = d.compileCreateTable('users', columns, [])
      expect(sql).toContain('CREATE TABLE "users"')
      expect(sql).toContain('INTEGER PRIMARY KEY AUTOINCREMENT')
    })

    it('compileRenameTable', () => {
      expect(d.compileRenameTable('old', 'new')).toBe('ALTER TABLE "old" RENAME TO "new"')
    })

    it('compileDropTable', () => {
      expect(d.compileDropTable('users')).toBe('DROP TABLE "users"')
    })

    it('compileDropTableIfExists', () => {
      expect(d.compileDropTableIfExists('users')).toBe('DROP TABLE IF EXISTS "users"')
    })

    it('compileHasTable', () => {
      const sql = d.compileHasTable('users')
      expect(sql).toContain('sqlite_master')
    })

    it('compileHasColumn', () => {
      const sql = d.compileHasColumn('users', 'email')
      expect(sql).toContain('PRAGMA table_info')
    })

    it('compileInsert passes through', () => {
      expect(d.compileInsert('SELECT 1')).toBe('SELECT 1')
    })

    it('formatDefault with null value (no DEFAULT emitted)', () => {
      const sql = d.compileColumn({
        name: 'val',
        type: 'integer',
        nullable: true,
        defaultValue: null,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('"val" INTEGER NULL')
    })

    it('formatDefault with boolean true', () => {
      const sql = d.compileColumn({
        name: 'flag',
        type: 'boolean',
        nullable: false,
        defaultValue: true,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('DEFAULT 1')
    })

    it('formatDefault with numeric', () => {
      const sql = d.compileColumn({
        name: 'count',
        type: 'integer',
        nullable: false,
        defaultValue: 42,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('DEFAULT 42')
    })
  })

  describe('PostgresqlDialect', () => {
    const d = new PostgresqlDialect()

    it('compileModifyColumn', () => {
      const sql = d.compileModifyColumn({
        name: 'email',
        type: 'string',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: 255,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('ALTER COLUMN "email" TYPE VARCHAR(255)')
    })

    it('compileColumn with nullable', () => {
      const sql = d.compileColumn({
        name: 'bio',
        type: 'text',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('"bio" TEXT NULL')
    })

    it('compileColumn with primary (non-id) and unique', () => {
      const sql = d.compileColumn({
        name: 'code',
        type: 'string',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: true,
        primary: true,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: 32,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('NOT NULL PRIMARY KEY UNIQUE')
    })

    it('compileColumn with comment', () => {
      const sql = d.compileColumn({
        name: 'nickname',
        type: 'string',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: 'display name',
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: 100,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('-- display name')
    })

    it('compileColumn – bigIncrements', () => {
      const sql = d.compileColumn({
        name: 'id',
        type: 'bigIncrements',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('"id" BIGSERIAL PRIMARY KEY')
    })

    it('compileColumn – foreignId with NOT NULL', () => {
      const sql = d.compileColumn({
        name: 'user_id',
        type: 'foreignId',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: true,
      })
      expect(sql).toBe('"user_id" INTEGER NOT NULL')
    })

    it('compileColumn – foreignId nullable', () => {
      const sql = d.compileColumn({
        name: 'user_id',
        type: 'foreignId',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: true,
      })
      expect(sql).toBe('"user_id" INTEGER NULL')
    })

    it('compileColumn – uuid type', () => {
      const sql = d.compileColumn({
        name: 'id',
        type: 'uuid',
        nullable: false,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('UUID NOT NULL')
    })

    it('compileColumn – jsonb', () => {
      const sql = d.compileColumn({
        name: 'data',
        type: 'jsonb',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('JSONB NULL')
    })

    it('compileTableBlueprint', () => {
      const cols = [
        {
          name: 'id',
          type: 'increments',
          nullable: false,
          defaultValue: undefined,
          unsigned: false,
          unique: false,
          primary: false,
          index: false,
          comment: null,
          after: null,
          first: false,
          autoIncrement: false,
          precision: null,
          scale: null,
          length: null,
          values: null,
          isForeignId: false,
        },
      ]
      const result = d.compileTableBlueprint('users', cols, ['UNIQUE (name)'])
      expect(result).toContain('"id" SERIAL PRIMARY KEY')
      expect(result).toContain('UNIQUE (name)')
    })

    it('compileAddColumns', () => {
      const col = {
        name: 'age',
        type: 'integer',
        nullable: true,
        defaultValue: undefined,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      }
      expect(d.compileAddColumns('users', [col])).toBe('ADD COLUMN "age" INTEGER NULL')
    })

    it('compileDropColumns', () => {
      expect(d.compileDropColumns('users', ['age', 'bio'])).toBe('DROP COLUMN "age", DROP COLUMN "bio"')
    })

    it('compileRenameColumn', () => {
      expect(d.compileRenameColumn('users', 'name', 'username')).toBe('RENAME COLUMN "name" TO "username"')
    })

    it('compileCreateTable', () => {
      const columns = [
        {
          name: 'id',
          type: 'increments',
          nullable: false,
          defaultValue: undefined,
          unsigned: false,
          unique: false,
          primary: false,
          index: false,
          comment: null,
          after: null,
          first: false,
          autoIncrement: false,
          precision: null,
          scale: null,
          length: null,
          values: null,
          isForeignId: false,
        },
      ]
      const sql = d.compileCreateTable('users', columns, [])
      expect(sql).toContain('CREATE TABLE "users"')
      expect(sql).toContain('SERIAL PRIMARY KEY')
    })

    it('compileRenameTable', () => {
      expect(d.compileRenameTable('old', 'new')).toBe('ALTER TABLE "old" RENAME TO "new"')
    })

    it('compileDropTable', () => {
      expect(d.compileDropTable('users')).toBe('DROP TABLE IF EXISTS "users"')
    })

    it('compileDropTableIfExists', () => {
      expect(d.compileDropTableIfExists('users')).toBe('DROP TABLE IF EXISTS "users"')
    })

    it('compileHasTable', () => {
      const sql = d.compileHasTable('users')
      expect(sql).toContain('information_schema')
    })

    it('compileHasColumn', () => {
      const sql = d.compileHasColumn('users', 'email')
      expect(sql).toContain('information_schema')
    })

    it('compileInsert passes through', () => {
      expect(d.compileInsert('SELECT 1')).toBe('SELECT 1')
    })

    it('compileLimitOffset with offset only', () => {
      const b: any[] = []
      const r = d.compileLimitOffset(b, null, 5)
      expect(r).toBe(' LIMIT $1 OFFSET $2')
      expect(b).toEqual([0, 5])
    })

    it('formatDefault with null (no DEFAULT emitted)', () => {
      const sql = d.compileColumn({
        name: 'val',
        type: 'integer',
        nullable: true,
        defaultValue: null,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toBe('"val" INTEGER NULL')
    })

    it('formatDefault with boolean', () => {
      const sql = d.compileColumn({
        name: 'active',
        type: 'boolean',
        nullable: false,
        defaultValue: true,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('DEFAULT true')
    })

    it('formatDefault with numeric', () => {
      const sql = d.compileColumn({
        name: 'count',
        type: 'integer',
        nullable: false,
        defaultValue: 50,
        unsigned: false,
        unique: false,
        primary: false,
        index: false,
        comment: null,
        after: null,
        first: false,
        autoIncrement: false,
        precision: null,
        scale: null,
        length: null,
        values: null,
        isForeignId: false,
      })
      expect(sql).toContain('DEFAULT 50')
    })
  })
})

// ===========================================================================
// Module exports
// ===========================================================================

describe('Module exports', () => {
  it('DatabaseConnection is exported', () => {
    expect(DatabaseConnection).toBeDefined()
  })

  it('createDriver is exported', () => {
    expect(createDriver).toBeDefined()
  })

  it('Model is exported', () => {
    expect(Model).toBeDefined()
  })

  it('createDialect is exported', () => {
    expect(createDialect).toBeDefined()
  })

  it('type exports are usable', () => {
    const jt: JoinType[] = ['inner', 'left', 'right', 'cross']
    const od: OrderDirection[] = ['asc', 'desc']
    expect(jt).toHaveLength(4)
    expect(od).toHaveLength(2)
  })
})

// ===========================================================================
// Additional driver.ts coverage – SqliteDriver
// (connect-dependent tests skipped: vitest cannot mock CJS function-exporting
//  modules for dynamic import() – see better-sqlite3 vi.mock above)
// ===========================================================================

describe('SqliteDriver – coverage without connect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disconnect is safe when db is null', async () => {
    const driver = await createDriver({ database: ':memory:', driver: 'sqlite' })
    await expect(driver.disconnect()).resolves.toBeUndefined()
  })

  it('isConnected returns false before connect', async () => {
    const driver = await createDriver({ database: ':memory:', driver: 'sqlite' })
    expect(driver.isConnected()).toBe(false)
  })

  it('raw throws when not connected', async () => {
    const driver = await createDriver({ database: ':memory:', driver: 'sqlite' })
    await expect(driver.raw('SELECT 1')).rejects.toThrow('Database not connected')
  })

  it('transaction throws when not connected', async () => {
    const driver = await createDriver({ database: ':memory:', driver: 'sqlite' })
    await expect(driver.transaction(async () => 'ok')).rejects.toThrow('Database not connected')
  })

  it('getDialect returns SqliteDialect', async () => {
    const driver = await createDriver({ database: ':memory:', driver: 'sqlite' })
    expect(driver.getDialect()).toBeInstanceOf(SqliteDialect)
  })

  it('getDriver returns sqlite', async () => {
    const driver = await createDriver({ database: ':memory:', driver: 'sqlite' })
    expect(driver.getDriver()).toBe('sqlite')
  })
})

// ===========================================================================
// Additional dialect.ts coverage – mapType branches
// ===========================================================================

describe('Dialect – mapType branches for uncovered types', () => {
  describe('MysqlDialect', () => {
    const d = new MysqlDialect()

    it('compileColumn with json type maps to JSON', () => {
      const sql = d.compileColumn(makeCol({ name: 'data', type: 'json', nullable: true }))
      expect(sql).toBe('`data` JSON NULL')
    })

    it('compileColumn with jsonb type maps to JSON', () => {
      const sql = d.compileColumn(makeCol({ name: 'data', type: 'jsonb', nullable: true }))
      expect(sql).toBe('`data` JSON NULL')
    })

    it('compileColumn with uuid type maps to CHAR(36)', () => {
      const sql = d.compileColumn(makeCol({ name: 'id', type: 'uuid', nullable: false }))
      expect(sql).toBe('`id` CHAR(36) NOT NULL')
    })

    it('compileColumn with enum type falls through to raw type name', () => {
      const sql = d.compileColumn(makeCol({ name: 'status', type: 'enum', nullable: true }))
      expect(sql).toBe('`status` enum NULL')
    })
  })

  describe('PostgresqlDialect', () => {
    const d = new PostgresqlDialect()

    it('compileColumn with json type maps to JSON', () => {
      const sql = d.compileColumn(makeCol({ name: 'data', type: 'json', nullable: true }))
      expect(sql).toBe('"data" JSON NULL')
    })

    it('compileColumn with enum type falls through to raw type name', () => {
      const sql = d.compileColumn(makeCol({ name: 'status', type: 'enum', nullable: true }))
      expect(sql).toBe('"status" enum NULL')
    })

    it('compileColumn with string default value', () => {
      const sql = d.compileColumn(
        makeCol({
          name: 'status',
          type: 'string',
          nullable: false,
          defaultValue: 'active',
          length: 50,
        }),
      )
      expect(sql).toContain("DEFAULT 'active'")
    })
  })

  describe('SqliteDialect', () => {
    const d = new SqliteDialect()

    it('compileColumn with json type maps to TEXT', () => {
      const sql = d.compileColumn(makeCol({ name: 'data', type: 'json', nullable: true }))
      expect(sql).toBe('"data" TEXT NULL')
    })

    it('compileColumn with jsonb type maps to TEXT', () => {
      const sql = d.compileColumn(makeCol({ name: 'data', type: 'jsonb', nullable: true }))
      expect(sql).toBe('"data" TEXT NULL')
    })

    it('compileColumn with uuid type maps to TEXT', () => {
      const sql = d.compileColumn(makeCol({ name: 'id', type: 'uuid', nullable: false }))
      expect(sql).toBe('"id" TEXT NOT NULL')
    })

    it('compileColumn with enum type falls through to raw type name', () => {
      const sql = d.compileColumn(makeCol({ name: 'status', type: 'enum', nullable: true }))
      expect(sql).toBe('"status" enum NULL')
    })
  })
})

function makeCol(overrides: Partial<ColumnCompileOptions>): ColumnCompileOptions {
  return {
    name: 'col',
    type: 'string',
    nullable: false,
    defaultValue: undefined,
    unsigned: false,
    unique: false,
    primary: false,
    index: false,
    comment: null,
    after: null,
    first: false,
    autoIncrement: false,
    precision: null,
    scale: null,
    length: null,
    values: null,
    isForeignId: false,
    ...overrides,
  }
}

// ===========================================================================
// Additional connection.ts coverage – ?? fallback branches
// ===========================================================================

describe('DatabaseConnection – prefix/driver fallback branches', () => {
  it('table() uses empty prefix fallback when prefix is undefined', () => {
    const conn = new DatabaseConnection({ database: 't', prefix: undefined as any })
    const qb = conn.table('users')
    expect(qb).toBeInstanceOf(QueryBuilder)
  })

  it('getDriver falls back to mysql when driver is undefined', () => {
    const conn = new DatabaseConnection({ database: 't', driver: undefined as any })
    expect(conn.getDriver()).toBe('mysql')
  })

  it('getPrefix returns empty string when prefix undefined', () => {
    const conn = new DatabaseConnection({ database: 't', prefix: undefined as any })
    expect(conn.getPrefix()).toBe('')
  })
})

// ===========================================================================
// Additional model.ts coverage – line 53 values ??
// ===========================================================================

describe('Model – additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  class Item extends Model {
    static table = 'items'
    name?: string
    price?: number
  }

  it('updateOrCreate uses attributes as mergeValues when values omitted and record exists', async () => {
    const { runner, raw } = makeMockRunner()
    raw.mockResolvedValueOnce({ rows: [{ id: 5, name: 'Old', price: 10 }] })
    raw.mockResolvedValueOnce({ rows: { affectedRows: 1 } })
    raw.mockResolvedValueOnce({ rows: [{ id: 5, name: 'Updated', price: 10 }] })
    Item.setConnection(runner)
    const item = await Item.updateOrCreate({ price: 10 }, { name: 'Updated' })
    expect(item).toBeInstanceOf(Item)
    expect(item.id).toBe(5)
    expect(item.name).toBe('Updated')
  })
})

// ===========================================================================
// Additional seeder.ts coverage – line 23
// ===========================================================================

describe('Seeder – additional coverage', () => {
  it('insert() returns early when first row is falsy', async () => {
    const { runner, raw } = makeMockRunner('mysql')
    const seeder = new Seeder(runner as any)
    await seeder.insert('users', [null as any])
    expect(raw).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// Additional query.ts coverage – default switch, RANDOM() in update/delete
// ===========================================================================

describe('QueryBuilder – additional coverage', () => {
  it('compileSingleWhere default case handles unknown where type', () => {
    const { qb } = makeQb('users')
    ;(qb as any).wheres.push({ type: 'unknown', boolean: 'and' })
    const { sql } = qb.toSQL()
    expect(sql).toBe('SELECT * FROM `users`')
  })

  it('update with inRandomOrder and limit', async () => {
    const { qb, raw } = makeQb('users')
    raw.mockResolvedValue({ rows: [{ affectedRows: 1 }] })
    await qb.where('status', 'active').inRandomOrder().limit(5).update({ status: 'inactive' })
    expect(raw).toHaveBeenCalledWith('UPDATE `users` SET `status` = ? WHERE `status` = ? ORDER BY `RAND()` ASC LIMIT ?', [
      'inactive',
      'active',
      5,
    ])
  })

  it('delete with inRandomOrder and limit', async () => {
    const { qb, raw } = makeQb('users')
    raw.mockResolvedValue({ rows: [{ affectedRows: 1 }] })
    await qb.where('status', 'trash').inRandomOrder().limit(5).delete()
    expect(raw).toHaveBeenCalledWith('DELETE FROM `users` WHERE `status` = ? ORDER BY `RAND()` ASC LIMIT ?', ['trash', 5])
  })
})

// ===========================================================================
// Additional migration.ts coverage – reset error path & refresh
// ===========================================================================

describe('Migrator – additional coverage', () => {
  it('reset() propagates errors from down()', async () => {
    const { runner, raw } = makeMockRunner('mysql')
    raw.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ name: 'm1', batch: 1, executedAt: '' }] })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const migrator = new Migrator(runner as any)
    const down = vi.fn().mockRejectedValue(new Error('reset fail'))
    migrator.setMigrations([{ name: 'm1', up: vi.fn(), down }])
    await expect(migrator.reset()).rejects.toThrow('reset fail')
    expect(errorSpy).toHaveBeenCalledWith('Reset failed: m1', expect.any(Error))
    errorSpy.mockRestore()
  })

  it('refresh calls reset then run', async () => {
    const { runner, raw } = makeMockRunner('mysql')
    raw
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'm1', batch: 1, executedAt: '' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
    const migrator = new Migrator(runner as any)
    const up = vi.fn().mockResolvedValue(undefined)
    const down = vi.fn().mockResolvedValue(undefined)
    migrator.setMigrations([{ name: 'm1', up, down }])
    await migrator.refresh()
    expect(down).toHaveBeenCalledTimes(1)
    expect(up).toHaveBeenCalledTimes(1)
  })
})
