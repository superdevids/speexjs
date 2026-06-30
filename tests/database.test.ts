import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryBuilder } from '../src/server/database/query.js'
import { MysqlDialect, SqliteDialect, PostgresqlDialect, createDialect } from '../src/server/database/dialect.js'
import { SchemaBuilder, TableBlueprint, ColumnDefinition, ForeignKeyDefinition, Migrator } from '../src/server/database/migration.js'
import { Seeder } from '../src/server/database/seeder.js'
import { Pagination } from '../src/server/database/pagination.js'
import type { QueryRunner, DatabaseDriver } from '../src/server/database/types.js'
import type { Dialect } from '../src/server/database/dialect.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockRunner(
  driver: DatabaseDriver = 'mysql',
  dialect?: Dialect,
): { runner: QueryRunner; dialect: Dialect; raw: ReturnType<typeof vi.fn> } {
  const d = dialect ?? createDialect(driver)
  const raw = vi.fn().mockResolvedValue({ rows: [] })
  const runner: QueryRunner = {
    raw,
    getDialect: () => d,
    getPrefix: () => '',
    getDriver: () => driver,
  }
  return { runner, dialect: d, raw }
}

function makeQb(
  table = 'users',
  driver: DatabaseDriver = 'mysql',
  dialect?: Dialect,
): { qb: QueryBuilder; raw: ReturnType<typeof vi.fn>; dialect: Dialect } {
  const { runner, dialect: d, raw } = makeMockRunner(driver, dialect)
  return { qb: new QueryBuilder(runner, table), raw, dialect: d }
}

// ---------------------------------------------------------------------------
// QueryBuilder
// ---------------------------------------------------------------------------

describe('QueryBuilder', () => {
  describe('toSQL() – SELECT', () => {
    it('generates basic SELECT * FROM table', () => {
      const { qb } = makeQb('users')
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users`')
      expect(bindings).toEqual([])
    })

    it('generates SELECT with specific columns', () => {
      const { qb } = makeQb('users')
      qb.select('name', 'email')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT `name`, `email` FROM `users`')
    })

    it('addSelect appends columns', () => {
      const { qb } = makeQb('users')
      qb.select('name').addSelect('email', 'age')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT `name`, `email`, `age` FROM `users`')
    })

    it('addSelect replaces * when no explicit select called', () => {
      const { qb } = makeQb('users')
      qb.addSelect('name')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT `name` FROM `users`')
    })

    it('distinct prepends DISTINCT', () => {
      const { qb } = makeQb('users')
      qb.distinct()
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT DISTINCT * FROM `users`')
    })

    it('from() overrides table name', () => {
      const { qb } = makeQb('users')
      qb.from('admins')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM admins')
    })

    it('passes through raw expressions in select', () => {
      const { qb } = makeQb('users')
      qb.select('COUNT(*) as cnt')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT COUNT(*) as cnt FROM `users`')
    })
  })

  describe('WHERE clauses', () => {
    it('where() with 2 args (column = value)', () => {
      const { qb } = makeQb('users')
      qb.where('name', 'John')
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `name` = ?')
      expect(bindings).toEqual(['John'])
    })

    it('where() with 3 args (column, operator, value)', () => {
      const { qb } = makeQb('users')
      qb.where('age', '>', 18)
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `age` > ?')
      expect(bindings).toEqual([18])
    })

    it('multiple where() are AND-ed', () => {
      const { qb } = makeQb('users')
      qb.where('name', 'John').where('age', 30)
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `name` = ? AND `age` = ?')
      expect(bindings).toEqual(['John', 30])
    })

    it('orWhere() adds OR condition', () => {
      const { qb } = makeQb('users')
      qb.where('name', 'John').orWhere('name', 'Jane')
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `name` = ? OR `name` = ?')
      expect(bindings).toEqual(['John', 'Jane'])
    })

    it('orWhere preserves boolean OR correctly with mixed AND/OR', () => {
      const { qb } = makeQb('users')
      qb.where('status', 'active').where('age', '>', 18).orWhere('name', 'admin')
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `status` = ? AND `age` > ? OR `name` = ?')
      expect(bindings).toEqual(['active', 18, 'admin'])
    })

    it('whereGroup wraps conditions in parentheses', () => {
      const { qb } = makeQb('users')
      qb.where('status', 'active').whereGroup((q) => {
        q.where('role', 'admin').orWhere('role', 'moderator')
      })
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `status` = ? AND (`role` = ? OR `role` = ?)')
      expect(bindings).toEqual(['active', 'admin', 'moderator'])
    })

    it('whereGroup with complex nested boolean logic', () => {
      const { qb } = makeQb('posts')
      qb.where('published', true).whereGroup((q) => {
        q.where('author_id', 1).orWhere('author_id', 2)
      })
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `posts` WHERE `published` = ? AND (`author_id` = ? OR `author_id` = ?)')
      expect(bindings).toEqual([true, 1, 2])
    })

    it('whereIn generates IN clause', () => {
      const { qb } = makeQb('users')
      qb.whereIn('id', [1, 2, 3])
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `id` IN (?, ?, ?)')
      expect(bindings).toEqual([1, 2, 3])
    })

    it('whereNotIn generates NOT IN clause', () => {
      const { qb } = makeQb('users')
      qb.whereNotIn('role', ['guest', 'banned'])
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `role` NOT IN (?, ?)')
      expect(bindings).toEqual(['guest', 'banned'])
    })

    it('whereNull generates IS NULL', () => {
      const { qb } = makeQb('users')
      qb.whereNull('deleted_at')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `deleted_at` IS NULL')
    })

    it('whereNotNull generates IS NOT NULL', () => {
      const { qb } = makeQb('users')
      qb.whereNotNull('email')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `email` IS NOT NULL')
    })

    it('whereBetween generates BETWEEN', () => {
      const { qb } = makeQb('users')
      qb.whereBetween('age', [18, 65])
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `age` BETWEEN ? AND ?')
      expect(bindings).toEqual([18, 65])
    })

    it('whereNotBetween generates NOT BETWEEN', () => {
      const { qb } = makeQb('users')
      qb.whereNotBetween('age', [0, 17])
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `age` NOT BETWEEN ? AND ?')
      expect(bindings).toEqual([0, 17])
    })

    it('whereLike generates LIKE clause', () => {
      const { qb } = makeQb('users')
      qb.whereLike('name', '%John%')
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `name` LIKE ?')
      expect(bindings).toEqual(['%John%'])
    })

    it('orWhereLike generates OR LIKE', () => {
      const { qb } = makeQb('users')
      qb.where('status', 'active').orWhereLike('name', '%test%')
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `status` = ? OR `name` LIKE ?')
      expect(bindings).toEqual(['active', '%test%'])
    })

    it('mixed WHERE types produce correct SQL', () => {
      const { qb } = makeQb('users')
      qb.where('status', 'active').whereIn('id', [1, 2]).whereNull('deleted_at').whereLike('name', 'foo%')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` WHERE `status` = ? AND `id` IN (?, ?) AND `deleted_at` IS NULL AND `name` LIKE ?')
    })

    it('critical bug test: OR where with AND should generate correct boolean', () => {
      const { qb } = makeQb('posts')
      qb.where('published', true).where('status', 'approved').orWhere('status', 'draft')
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `posts` WHERE `published` = ? AND `status` = ? OR `status` = ?')
      expect(bindings).toEqual([true, 'approved', 'draft'])
    })
  })

  describe('JOINs', () => {
    it('inner join', () => {
      const { qb } = makeQb('users')
      qb.join('posts', 'users.id', '=', 'posts.user_id')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` INNER JOIN `posts` ON `users.id` = `posts.user_id`')
    })

    it('left join', () => {
      const { qb } = makeQb('users')
      qb.leftJoin('posts', 'users.id', '=', 'posts.user_id')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` LEFT JOIN `posts` ON `users.id` = `posts.user_id`')
    })

    it('right join', () => {
      const { qb } = makeQb('users')
      qb.rightJoin('posts', 'users.id', '=', 'posts.user_id')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` RIGHT JOIN `posts` ON `users.id` = `posts.user_id`')
    })

    it('cross join', () => {
      const { qb } = makeQb('users')
      qb.crossJoin('posts', 'users.id', '=', 'posts.user_id')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` CROSS JOIN `posts` ON `users.id` = `posts.user_id`')
    })

    it('multiple joins', () => {
      const { qb } = makeQb('users')
      qb.join('posts', 'users.id', '=', 'posts.user_id').leftJoin('comments', 'posts.id', '=', 'comments.post_id')
      const { sql } = qb.toSQL()
      expect(sql).toBe(
        'SELECT * FROM `users` INNER JOIN `posts` ON `users.id` = `posts.user_id` LEFT JOIN `comments` ON `posts.id` = `comments.post_id`',
      )
    })
  })

  describe('ORDER BY', () => {
    it('orderBy asc default', () => {
      const { qb } = makeQb('users')
      qb.orderBy('name')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` ORDER BY `name` ASC')
    })

    it('orderBy desc', () => {
      const { qb } = makeQb('users')
      qb.orderBy('name', 'desc')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` ORDER BY `name` DESC')
    })

    it('orderByDesc', () => {
      const { qb } = makeQb('users')
      qb.orderByDesc('created_at')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` ORDER BY `created_at` DESC')
    })

    it('latest', () => {
      const { qb } = makeQb('users')
      qb.latest()
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` ORDER BY `created_at` DESC')
    })

    it('oldest', () => {
      const { qb } = makeQb('users')
      qb.oldest()
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` ORDER BY `created_at` ASC')
    })

    it('inRandomOrder', () => {
      const { qb } = makeQb('users')
      qb.inRandomOrder()
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` ORDER BY `RAND()` ASC')
    })

    it('multiple orderBy', () => {
      const { qb } = makeQb('users')
      qb.orderBy('name').orderByDesc('age')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` ORDER BY `name` ASC, `age` DESC')
    })
  })

  describe('LIMIT / OFFSET / SKIP / TAKE', () => {
    it('limit', () => {
      const { qb } = makeQb('users')
      qb.limit(10)
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` LIMIT ?')
      expect(bindings).toEqual([10])
    })

    it('offset', () => {
      const { qb } = makeQb('users')
      qb.offset(5)
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` LIMIT ? OFFSET ?')
      expect(bindings[0]).toBeGreaterThan(1000000)
      expect(bindings[1]).toBe(5)
    })

    it('limit + offset', () => {
      const { qb } = makeQb('users')
      qb.limit(10).offset(20)
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` LIMIT ? OFFSET ?')
      expect(bindings).toEqual([10, 20])
    })

    it('skip is alias for offset', () => {
      const { qb } = makeQb('users')
      qb.skip(15)
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` LIMIT ? OFFSET ?')
      expect(bindings[0]).toBeGreaterThan(1000000)
      expect(bindings[1]).toBe(15)
    })

    it('take is alias for limit', () => {
      const { qb } = makeQb('users')
      qb.take(5)
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` LIMIT ?')
      expect(bindings).toEqual([5])
    })
  })

  describe('GROUP BY / HAVING', () => {
    it('groupBy', () => {
      const { qb } = makeQb('users')
      qb.groupBy('role', 'status')
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` GROUP BY `role`, `status`')
    })

    it('having', () => {
      const { qb } = makeQb('users')
      qb.groupBy('role').having('COUNT(*)', '>', 1)
      const { sql, bindings } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `users` GROUP BY `role` HAVING `COUNT(*)` > ?')
      expect(bindings).toEqual([1])
    })

    it('multiple havings are AND-ed', () => {
      const { qb } = makeQb('orders')
      qb.groupBy('user_id').having('SUM(amount)', '>', 100).having('COUNT(*)', '>=', 5)
      const { sql } = qb.toSQL()
      expect(sql).toBe('SELECT * FROM `orders` GROUP BY `user_id` HAVING `SUM(amount)` > ? AND `COUNT(*)` >= ?')
    })
  })

  describe('Execution methods', () => {
    it('get() calls raw and returns rows', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({
        rows: [{ id: 1, name: 'Alice' }],
      })
      const result = await qb.where('id', 1).get()
      expect(result).toEqual([{ id: 1, name: 'Alice' }])
      expect(raw).toHaveBeenCalledTimes(1)
    })

    it('first() returns first row or null', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({
        rows: [{ id: 1, name: 'Alice' }],
      })
      const result = await qb.where('id', 1).first()
      expect(result).toEqual({ id: 1, name: 'Alice' })
    })

    it('first() returns null when no rows', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [] })
      const result = await qb.where('id', 999).first()
      expect(result).toBeNull()
    })

    it('find() calls where id', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({
        rows: [{ id: 42, name: 'Bob' }],
      })
      const result = await qb.find(42)
      expect(result).toEqual({ id: 42, name: 'Bob' })
    })

    it('pluck() returns single column values', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({
        rows: [{ name: 'Alice' }, { name: 'Bob' }],
      })
      const result = await qb.pluck('name')
      expect(result).toEqual(['Alice', 'Bob'])
    })

    it('count() returns number', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ aggregate: 42 }] })
      const result = await qb.count()
      expect(result).toBe(42)
    })

    it('count() returns 0 when no rows', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [] })
      const result = await qb.count()
      expect(result).toBe(0)
    })

    it('exists() returns true when count > 0', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ aggregate: 1 }] })
      const result = await qb.exists()
      expect(result).toBe(true)
    })

    it('doesntExist() returns true when count = 0', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ aggregate: 0 }] })
      const result = await qb.doesntExist()
      expect(result).toBe(true)
    })

    it('max() returns aggregate value', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ aggregate: 100 }] })
      const result = await qb.max('age')
      expect(result).toBe(100)
    })

    it('min() returns aggregate value', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ aggregate: 10 }] })
      const result = await qb.min('age')
      expect(result).toBe(10)
    })

    it('sum() returns aggregate value', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ aggregate: 500 }] })
      const result = await qb.sum('balance')
      expect(result).toBe(500)
    })

    it('avg() returns aggregate value', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ aggregate: 35.5 }] })
      const result = await qb.avg('age')
      expect(result).toBe(35.5)
    })

    it('aggregate fallback parses column-name key', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ 'MAX(age)': 99 }] })
      const result = await qb.max('age')
      expect(result).toBe(99)
    })
  })

  describe('INSERT', () => {
    it('compileInsert generates correct SQL for mysql', async () => {
      const { qb, raw } = makeQb('users', 'mysql')
      raw.mockResolvedValue({ rows: { insertId: 1 } })
      const id = await qb.insert({ name: 'Alice', email: 'a@b.com' })
      expect(id).toBe(1)
      expect(raw).toHaveBeenCalledWith('INSERT INTO `users` (`name`, `email`) VALUES (?, ?)', ['Alice', 'a@b.com'])
    })

    it('insertGetId returns id', async () => {
      const { qb, raw } = makeQb('users', 'mysql')
      raw.mockResolvedValue({ rows: { insertId: 42 } })
      const id = await qb.insertGetId({ name: 'Bob' })
      expect(id).toBe(42)
    })

    it('insertReturning returns first row', async () => {
      const { qb, raw } = makeQb('users', 'postgresql')
      raw.mockResolvedValue({ rows: [{ id: 1, name: 'Alice' }] })
      const result = await qb.insertReturning({ name: 'Alice' })
      expect(result).toEqual({ id: 1, name: 'Alice' })
    })

    it('insert with PostgreSQL uses RETURNING', async () => {
      const { qb, raw } = makeQb('users', 'postgresql')
      raw.mockResolvedValue({ rows: [{ id: 7 }] })
      const id = await qb.insert({ name: 'Test' })
      expect(id).toBe(7)
      expect(raw).toHaveBeenCalledWith('INSERT INTO "users" ("name") VALUES ($1) RETURNING "id"', ['Test'])
    })

    it('insert with SQLite uses last_insert_rowid', async () => {
      const { qb, raw } = makeQb('users', 'sqlite')
      raw.mockResolvedValueOnce({ rows: [] })
      raw.mockResolvedValueOnce({ rows: [{ id: 7 }] })
      const id = await qb.insert({ name: 'Test' })
      expect(id).toBe(7)
      expect(raw).toHaveBeenNthCalledWith(1, 'INSERT INTO "users" ("name") VALUES (?)', ['Test'])
      expect(raw).toHaveBeenNthCalledWith(2, 'SELECT last_insert_rowid() as id')
    })

    it('insert with mysql insertId from array fallback', async () => {
      const { qb, raw } = makeQb('users', 'mysql')
      raw.mockResolvedValue({ rows: [{ insertId: 99 }] })
      const id = await qb.insert({ name: 'X' })
      expect(id).toBe(99)
    })
  })

  describe('UPDATE', () => {
    it('update generates correct SQL and returns affected rows', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ affectedRows: 2 }] })
      const affected = await qb.where('id', 1).update({ name: 'Updated' })
      expect(affected).toBe(2)
      expect(raw).toHaveBeenCalledWith('UPDATE `users` SET `name` = ? WHERE `id` = ?', ['Updated', 1])
    })

    it('update with orderBy and limit', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ affectedRows: 1 }] })
      await qb.where('status', 'inactive').orderBy('id').limit(1).update({ status: 'active' })
      expect(raw).toHaveBeenCalledWith('UPDATE `users` SET `status` = ? WHERE `status` = ? ORDER BY `id` ASC LIMIT ?', [
        'active',
        'inactive',
        1,
      ])
    })
  })

  describe('DELETE', () => {
    it('delete generates correct SQL', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ affectedRows: 3 }] })
      const affected = await qb.where('status', 'trash').delete()
      expect(affected).toBe(3)
      expect(raw).toHaveBeenCalledWith('DELETE FROM `users` WHERE `status` = ?', ['trash'])
    })

    it('delete with orderBy and limit', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [{ affectedRows: 1 }] })
      await qb.where('status', 'spam').orderBy('id').limit(5).delete()
      expect(raw).toHaveBeenCalledWith('DELETE FROM `users` WHERE `status` = ? ORDER BY `id` ASC LIMIT ?', ['spam', 5])
    })
  })

  describe('TRUNCATE', () => {
    it('truncate calls compileTruncate', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValue({ rows: [] })
      await qb.truncate()
      expect(raw).toHaveBeenCalledWith('TRUNCATE TABLE `users`')
    })
  })

  describe('PAGINATE', () => {
    it('paginate returns correct page 1', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValueOnce({ rows: [{ aggregate: 25 }] }).mockResolvedValueOnce({
        rows: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `User${i + 1}`,
        })),
      })
      const result = await qb.paginate(10, 1)
      expect(result.total).toBe(25)
      expect(result.perPage).toBe(10)
      expect(result.currentPage).toBe(1)
      expect(result.lastPage).toBe(3)
      expect(result.from).toBe(1)
      expect(result.to).toBe(10)
      expect(result.hasMore).toBe(true)
      expect(result.hasPrev).toBe(false)
      expect(result.isEmpty).toBe(false)
      expect(result.data).toHaveLength(10)
    })

    it('paginate returns correct page 2', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValueOnce({ rows: [{ aggregate: 25 }] }).mockResolvedValueOnce({
        rows: Array.from({ length: 10 }, (_, i) => ({
          id: i + 11,
          name: `User${i + 11}`,
        })),
      })
      const result = await qb.paginate(10, 2)
      expect(result.currentPage).toBe(2)
      expect(result.from).toBe(11)
      expect(result.to).toBe(20)
      expect(result.hasMore).toBe(true)
      expect(result.hasPrev).toBe(true)
    })

    it('paginate empty result', async () => {
      const { qb, raw } = makeQb('users')
      raw.mockResolvedValueOnce({ rows: [{ aggregate: 0 }] })
      const result = await qb.paginate(15, 1)
      expect(result.total).toBe(0)
      expect(result.data).toEqual([])
      expect(result.isEmpty).toBe(true)
      expect(result.from).toBe(0)
      expect(result.to).toBe(0)
      expect(result.hasMore).toBe(false)
      expect(result.hasPrev).toBe(false)
    })
  })

  describe('CHUNK', () => {
    it('chunk iterates over pages', async () => {
      const { qb, raw } = makeQb('users')
      const page1 = Array.from({ length: 2 }, (_, i) => ({
        id: i + 1,
      }))
      const page2 = Array.from({ length: 1 }, (_, i) => ({
        id: i + 3,
      }))
      raw.mockResolvedValueOnce({ rows: page1 }).mockResolvedValueOnce({ rows: page2 }).mockResolvedValueOnce({ rows: [] })
      const cb = vi.fn().mockResolvedValue(undefined)
      await qb.chunk(2, cb)
      expect(cb).toHaveBeenCalledTimes(2)
      expect(cb).toHaveBeenNthCalledWith(1, page1)
      expect(cb).toHaveBeenNthCalledWith(2, page2)
    })
  })

  describe('CLONE', () => {
    it('clone returns independent copy', () => {
      const { qb } = makeQb('users')
      qb.where('status', 'active').limit(10)
      const cloned = qb.clone()
      cloned.where('name', 'test')
      const { sql: origSql } = qb.toSQL()
      const { sql: cloneSql } = cloned.toSQL()
      expect(origSql).not.toBe(cloneSql)
      expect(origSql).toBe('SELECT * FROM `users` WHERE `status` = ? LIMIT ?')
      expect(cloneSql).toBe('SELECT * FROM `users` WHERE `status` = ? AND `name` = ? LIMIT ?')
    })

    it('clone copies nested wheres deeply', () => {
      const { qb } = makeQb('users')
      qb.whereGroup((q) => q.where('a', 1).orWhere('b', 2))
      const cloned = qb.clone()
      cloned.where('c', 3)
      const { sql: origSql } = qb.toSQL()
      const { sql: cloneSql } = cloned.toSQL()
      expect(origSql).toBe('SELECT * FROM `users` WHERE (`a` = ? OR `b` = ?)')
      expect(cloneSql).toBe('SELECT * FROM `users` WHERE (`a` = ? OR `b` = ?) AND `c` = ?')
    })
  })

  describe('DD (debug dump)', () => {
    it('dd returns SQL string', () => {
      const { qb } = makeQb('users')
      qb.where('id', 1)
      const result = qb.dd()
      expect(result).toContain('SELECT * FROM')
      expect(result).toContain('Bindings:')
    })
  })
})

// ---------------------------------------------------------------------------
// SQL Dialects
// ---------------------------------------------------------------------------

describe('Dialects', () => {
  describe('MysqlDialect', () => {
    const d = new MysqlDialect()

    it('wrapIdentifier uses backticks', () => {
      expect(d.wrapIdentifier('users')).toBe('`users`')
      expect(d.wrapIdentifier('user name')).toBe('`user name`')
    })

    it('wrapIdentifier escapes backticks', () => {
      expect(d.wrapIdentifier('use`r')).toBe('`use``r`')
    })

    it('makeParameter returns ?', () => {
      expect(d.makeParameter(0)).toBe('?')
      expect(d.makeParameter(99)).toBe('?')
    })

    it('compileLimitOffset with limit only', () => {
      const b: any[] = []
      const r = d.compileLimitOffset(b, 10, null)
      expect(r).toBe(' LIMIT ?')
      expect(b).toEqual([10])
    })

    it('compileLimitOffset with limit and offset', () => {
      const b: any[] = []
      const r = d.compileLimitOffset(b, 10, 20)
      expect(r).toBe(' LIMIT ? OFFSET ?')
      expect(b).toEqual([10, 20])
    })

    it('compileLimitOffset with offset only defaults to max limit', () => {
      const b: any[] = []
      const r = d.compileLimitOffset(b, null, 5)
      expect(r).toBe(' LIMIT ? OFFSET ?')
      expect(b[0]).toBeGreaterThan(1000000)
      expect(b[1]).toBe(5)
    })

    it('compileLimitOffset returns empty when no limit or offset', () => {
      expect(d.compileLimitOffset([], null, null)).toBe('')
    })

    it('compileInsertReturning appends LAST_INSERT_ID', () => {
      const r = d.compileInsertReturning('INSERT INTO t (n) VALUES (?)', [])
      expect(r).toBe('INSERT INTO t (n) VALUES (?); SELECT LAST_INSERT_ID() as id')
    })

    it('compileTruncate', () => {
      expect(d.compileTruncate('users')).toBe('TRUNCATE TABLE `users`')
    })

    it('compileCreateMigrationsTable', () => {
      const sql = d.compileCreateMigrationsTable()
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS `migrations`')
      expect(sql).toContain('`id` INT AUTO_INCREMENT PRIMARY KEY')
      expect(sql).toContain('`name` VARCHAR(255) NOT NULL')
      expect(sql).toContain('`batch` INT NOT NULL')
    })

    it('compileColumn – string with default', () => {
      const sql = d.compileColumn({
        name: 'email',
        type: 'string',
        nullable: false,
        defaultValue: 'admin@test.com',
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
      expect(sql).toBe("`email` VARCHAR(255) DEFAULT 'admin@test.com'")
    })

    it('compileColumn – nullable column', () => {
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
      expect(sql).toBe('`bio` TEXT NULL')
    })

    it('compileColumn – increments id', () => {
      const sql = d.compileColumn({
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
      })
      expect(sql).toBe('`id` INT AUTO_INCREMENT PRIMARY KEY')
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
      const sql = d.compileCreateTable('users', columns, [])
      expect(sql).toContain('CREATE TABLE `users`')
      expect(sql).toContain('`id` INT AUTO_INCREMENT PRIMARY KEY')
      expect(sql).toContain('`name` VARCHAR(255) NOT NULL')
    })

    it('compileDropTable', () => {
      expect(d.compileDropTable('users')).toBe('DROP TABLE `users`')
    })

    it('compileDropTableIfExists', () => {
      expect(d.compileDropTableIfExists('users')).toBe('DROP TABLE IF EXISTS `users`')
    })

    it('compileRenameTable', () => {
      expect(d.compileRenameTable('old', 'new')).toBe('RENAME TABLE `old` TO `new`')
    })

    it('compileHasTable', () => {
      const sql = d.compileHasTable('users')
      expect(sql).toContain('information_schema')
    })

    it('compileHasColumn', () => {
      const sql = d.compileHasColumn('users', 'email')
      expect(sql).toContain('information_schema')
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
      expect(d.compileAddColumns('users', [col])).toBe('ADD `age` INT NULL')
    })

    it('compileDropColumns', () => {
      expect(d.compileDropColumns('users', ['age', 'bio'])).toBe('DROP COLUMN `age`, DROP COLUMN `bio`')
    })

    it('compileRenameColumn', () => {
      expect(d.compileRenameColumn('users', 'name', 'username')).toBe('RENAME COLUMN `name` TO `username`')
    })

    it('compileInsert passes through', () => {
      expect(d.compileInsert('SELECT 1')).toBe('SELECT 1')
    })
  })

  describe('PostgresqlDialect', () => {
    const d = new PostgresqlDialect()

    it('wrapIdentifier uses double quotes', () => {
      expect(d.wrapIdentifier('users')).toBe('"users"')
    })

    it('makeParameter uses $N syntax', () => {
      expect(d.makeParameter(0)).toBe('$1')
      expect(d.makeParameter(1)).toBe('$2')
      expect(d.makeParameter(5)).toBe('$6')
    })

    it('compileLimitOffset with limit only', () => {
      const b: any[] = []
      const r = d.compileLimitOffset(b, 10, null)
      expect(r).toBe(' LIMIT $1')
      expect(b).toEqual([10])
    })

    it('compileLimitOffset with limit + offset', () => {
      const b: any[] = []
      const r = d.compileLimitOffset(b, 5, 10)
      expect(r).toBe(' LIMIT $1 OFFSET $2')
      expect(b).toEqual([5, 10])
    })

    it('compileInsertReturning uses RETURNING', () => {
      const r = d.compileInsertReturning('INSERT INTO t (n) VALUES ($1)', [])
      expect(r).toBe('INSERT INTO t (n) VALUES ($1) RETURNING "id"')
    })

    it('compileTruncate', () => {
      expect(d.compileTruncate('users')).toBe('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE')
    })

    it('compileCreateMigrationsTable', () => {
      const sql = d.compileCreateMigrationsTable()
      expect(sql).toContain('"id" SERIAL PRIMARY KEY')
    })

    it('compileColumn – string nullable', () => {
      const sql = d.compileColumn({
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
      expect(sql).toBe('"email" VARCHAR(255) NULL')
    })

    it('compileColumn – boolean', () => {
      const sql = d.compileColumn({
        name: 'is_admin',
        type: 'boolean',
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
      expect(sql).toBe('"is_admin" BOOLEAN NOT NULL')
    })

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
  })

  describe('SqliteDialect', () => {
    const d = new SqliteDialect()

    it('wrapIdentifier uses double quotes', () => {
      expect(d.wrapIdentifier('users')).toBe('"users"')
    })

    it('makeParameter returns ?', () => {
      expect(d.makeParameter(0)).toBe('?')
    })

    it('compileLimitOffset with limit only', () => {
      const b: any[] = []
      const r = d.compileLimitOffset(b, 10, null)
      expect(r).toBe(' LIMIT ?')
      expect(b).toEqual([10])
    })

    it('compileLimitOffset with limit + offset', () => {
      const b: any[] = []
      const r = d.compileLimitOffset(b, 5, 10)
      expect(r).toBe(' LIMIT ? OFFSET ?')
      expect(b).toEqual([5, 10])
    })

    it('compileInsertReturning uses last_insert_rowid', () => {
      const r = d.compileInsertReturning('INSERT INTO t (n) VALUES (?)', [])
      expect(r).toBe('INSERT INTO t (n) VALUES (?); SELECT last_insert_rowid() as id')
    })

    it('compileTruncate uses DELETE FROM', () => {
      expect(d.compileTruncate('users')).toBe('DELETE FROM "users"')
    })

    it('compileCreateMigrationsTable', () => {
      const sql = d.compileCreateMigrationsTable()
      expect(sql).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT')
    })

    it('compileColumn – string NOT NULL', () => {
      const sql = d.compileColumn({
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
      })
      expect(sql).toBe('"name" VARCHAR(255) NOT NULL')
    })

    it('compileColumn – integer nullable with default', () => {
      const sql = d.compileColumn({
        name: 'score',
        type: 'integer',
        nullable: true,
        defaultValue: 0,
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
      expect(sql).toBe('"score" INTEGER NULL DEFAULT 0')
    })

    it('compileModifyColumn is same as compileColumn', () => {
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
  })

  describe('createDialect factory', () => {
    it('returns MysqlDialect for mysql', () => {
      expect(createDialect('mysql')).toBeInstanceOf(MysqlDialect)
    })
    it('returns SqliteDialect for sqlite', () => {
      expect(createDialect('sqlite')).toBeInstanceOf(SqliteDialect)
    })
    it('returns PostgresqlDialect for postgresql', () => {
      expect(createDialect('postgresql')).toBeInstanceOf(PostgresqlDialect)
    })
    it('defaults to MysqlDialect for unknown driver', () => {
      expect(createDialect('unknown' as any)).toBeInstanceOf(MysqlDialect)
    })
  })
})

// ---------------------------------------------------------------------------
// Migration – SchemaBuilder, TableBlueprint, ColumnDefinition, ForeignKey
// ---------------------------------------------------------------------------

describe('Migration', () => {
  describe('SchemaBuilder', () => {
    it('createTable compiles and executes CREATE TABLE', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      const schema = new SchemaBuilder(runner as any)

      await schema.createTable('users', (table) => {
        table.increments('id')
        table.string('name')
        table.text('bio').nullable()
      })

      expect(raw).toHaveBeenCalledTimes(1)
      const call = raw.mock.calls[0][0] as string
      expect(call).toContain('CREATE TABLE `users`')
      expect(call).toContain('`id` INT AUTO_INCREMENT PRIMARY KEY')
      expect(call).toContain('`name` VARCHAR(255) NOT NULL')
      expect(call).toContain('`bio` TEXT NULL')
    })

    it('dropTable executes DROP TABLE', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      const schema = new SchemaBuilder(runner as any)
      await schema.dropTable('users')
      expect(raw).toHaveBeenCalledWith('DROP TABLE `users`')
    })

    it('dropTableIfExists', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      const schema = new SchemaBuilder(runner as any)
      await schema.dropTableIfExists('users')
      expect(raw).toHaveBeenCalledWith('DROP TABLE IF EXISTS `users`')
    })

    it('renameTable', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      const schema = new SchemaBuilder(runner as any)
      await schema.renameTable('old', 'new')
      expect(raw).toHaveBeenCalledWith('RENAME TABLE `old` TO `new`')
    })

    it('alterTable adds columns', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      const schema = new SchemaBuilder(runner as any)
      raw.mockResolvedValue({ rows: [] })
      await schema.alterTable('users', (table) => {
        table.string('phone', 20).nullable()
        table.integer('age').default(0)
      })
      const calls = raw.mock.calls.map((c: any) => c[0] as string)
      expect(calls[0]).toContain('ALTER TABLE `users` ADD `phone` VARCHAR(20) NULL')
      expect(calls[1]).toContain('ALTER TABLE `users` ADD `age` INT DEFAULT 0')
    })

    it('alterTable drops columns', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      const schema = new SchemaBuilder(runner as any)
      raw.mockResolvedValue({ rows: [] })
      await schema.alterTable('users', (table) => {
        table.dropColumn('old_field')
      })
      expect(raw).toHaveBeenCalledWith('ALTER TABLE `users` DROP COLUMN `old_field`')
    })

    it('alterTable renames columns', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      const schema = new SchemaBuilder(runner as any)
      raw.mockResolvedValue({ rows: [] })
      await schema.alterTable('users', (table) => {
        table.renameColumn('name', 'username')
      })
      expect(raw).toHaveBeenCalledWith('ALTER TABLE `users` RENAME COLUMN `name` TO `username`')
    })

    it('hasTable returns true when count > 0', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      const schema = new SchemaBuilder(runner as any)
      raw.mockResolvedValue({ rows: [{ count: 1 }] })
      const result = await schema.hasTable('users')
      expect(result).toBe(true)
    })

    it('hasColumn returns true when column exists', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      const schema = new SchemaBuilder(runner as any)
      raw.mockResolvedValue({ rows: [{ count: 1 }] })
      const result = await schema.hasColumn('users', 'email')
      expect(result).toBe(true)
    })

    it('hasColumn for sqlite uses PRAGMA', async () => {
      const { runner, raw } = makeMockRunner('sqlite')
      const schema = new SchemaBuilder(runner as any)
      raw.mockResolvedValue({ rows: [{ name: 'email' }, { name: 'name' }] })
      const result = await schema.hasColumn('users', 'email')
      expect(result).toBe(true)
    })
  })

  describe('TableBlueprint', () => {
    it('creates all column types', () => {
      const conn = { getDialect: () => new MysqlDialect() } as any
      const bp = new TableBlueprint(conn, 'create')
      bp.id()
      bp.increments('custom_id')
      bp.bigIncrements('big_id')
      bp.string('name')
      bp.string('email', 100)
      bp.text('bio').nullable()
      bp.integer('age')
      bp.bigInteger('views')
      bp.tinyInteger('flag')
      bp.smallInteger('count')
      bp.boolean('is_active')
      bp.float('price')
      bp.double('score')
      bp.decimal('amount', 10, 2)
      bp.date('birth')
      bp.datetime('created')
      bp.timestamp('updated')
      bp.time('start')
      bp.year('founded')
      bp.json('metadata')
      bp.jsonb('data')
      bp.binary('avatar')
      bp.uuid('uuid')
      bp.enum('status', ['active', 'inactive'])
      bp.foreignId('user_id')
      bp.timestamps()
      bp.softDeletes()
      bp.rememberToken()

      const columns = bp.compileColumns()
      const types = columns.map((c) => `${c.name}:${c.type}`)
      expect(types).toContain('id:id')
      expect(types).toContain('custom_id:increments')
      expect(types).toContain('big_id:bigIncrements')
      expect(types).toContain('name:string')
      expect(types).toContain('email:string')
      expect(types).toContain('bio:text')
      expect(types).toContain('age:integer')
      expect(types).toContain('views:bigInteger')
      expect(types).toContain('flag:tinyInteger')
      expect(types).toContain('count:smallInteger')
      expect(types).toContain('is_active:boolean')
      expect(types).toContain('price:float')
      expect(types).toContain('score:double')
      expect(types).toContain('amount:decimal')
      expect(types).toContain('birth:date')
      expect(types).toContain('created:datetime')
      expect(types).toContain('updated:timestamp')
      expect(types).toContain('start:time')
      expect(types).toContain('founded:year')
      expect(types).toContain('metadata:json')
      expect(types).toContain('data:jsonb')
      expect(types).toContain('avatar:binary')
      expect(types).toContain('uuid:uuid')
      expect(types).toContain('status:enum')
      expect(types).toContain('user_id:foreignId')
      expect(types).toContain('created_at:timestamp')
      expect(types).toContain('updated_at:timestamp')
      expect(types).toContain('deleted_at:timestamp')
      expect(types).toContain('remember_token:string')

      expect(columns.find((c) => c.name === 'email')?.length).toBe(100)
      expect(columns.find((c) => c.name === 'amount')?.precision).toBe(10)
      expect(columns.find((c) => c.name === 'amount')?.scale).toBe(2)
      expect(columns.find((c) => c.name === 'bio')?.nullable).toBe(true)
      expect(columns.find((c) => c.name === 'remember_token')?.nullable).toBe(true)
      expect(columns.find((c) => c.name === 'created_at')?.nullable).toBe(true)
      expect(columns.find((c) => c.name === 'deleted_at')?.nullable).toBe(true)
      expect(columns.find((c) => c.name === 'id')?.autoIncrement).toBe(true)
      expect(columns.find((c) => c.name === 'custom_id')?.autoIncrement).toBe(true)
      expect(columns.find((c) => c.name === 'user_id')?.unsigned).toBe(true)
    })

    it('id() creates auto-incrementing unsigned id column', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.id()
      const cols = bp.compileColumns()
      const idCol = cols.find((c) => c.name === 'id')!
      expect(idCol.autoIncrement).toBe(true)
      expect(idCol.unsigned).toBe(true)
      expect(idCol.type).toBe('id')
    })

    it('creates primary key constraint', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.primary('id')
      const dialect = new MysqlDialect()
      const constraints = bp.compileConstraints(dialect)
      expect(constraints).toContain('PRIMARY KEY (`id`)')
    })

    it('creates composite primary key', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.primary('user_id', 'role_id')
      const dialect = new MysqlDialect()
      const constraints = bp.compileConstraints(dialect)
      expect(constraints).toContain('PRIMARY KEY (`user_id`)')
      expect(constraints).toContain('PRIMARY KEY (`role_id`)')
    })

    it('creates unique constraint', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.unique('email')
      const dialect = new MysqlDialect()
      const constraints = bp.compileConstraints(dialect)
      expect(constraints).toContain('UNIQUE (`email`)')
    })

    it('creates composite unique', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.unique('user_id', 'post_id')
      const dialect = new MysqlDialect()
      const constraints = bp.compileConstraints(dialect)
      expect(constraints).toContain('UNIQUE (`user_id`, `post_id`)')
    })

    it('creates index constraint', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.index('status')
      const dialect = new MysqlDialect()
      const constraints = bp.compileConstraints(dialect)
      expect(constraints).toContain('INDEX (`status`)')
    })

    it('creates foreign key constraint', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.foreign('user_id').references('id').on('users')
      const dialect = new MysqlDialect()
      const constraints = bp.compileConstraints(dialect)
      expect(constraints).toContain('FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)')
    })

    it('foreign key with onDelete and onUpdate', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.foreign('user_id').references('id').on('users').onDelete('CASCADE').onUpdate('CASCADE')
      const dialect = new MysqlDialect()
      const constraints = bp.compileConstraints(dialect)
      expect(constraints[0]).toContain('ON DELETE CASCADE')
      expect(constraints[0]).toContain('ON UPDATE CASCADE')
    })

    it('dropColumn marks column for dropping', () => {
      const bp = new TableBlueprint(null as any, 'alter')
      bp.dropColumn('old_field')
      expect(bp.droppedColumns).toContain('old_field')
    })

    it('renameColumn tracks rename', () => {
      const bp = new TableBlueprint(null as any, 'alter')
      bp.renameColumn('old', 'new')
      expect(bp.renamedColumns).toContainEqual({ from: 'old', to: 'new' })
    })

    it('compileColumnDefinitions returns ADD COLUMN statements for alter mode', () => {
      const dialect = new MysqlDialect()
      const bp = new TableBlueprint(null as any, 'alter')
      bp.string('name')
      bp.integer('age')
      const defs = bp.compileColumnDefinitions(dialect)
      expect(defs).toHaveLength(2)
      expect(defs[0]).toContain('ADD')
    })

    it('timestamps adds created_at and updated_at', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.timestamps()
      const cols = bp.compileColumns()
      expect(cols.find((c) => c.name === 'created_at')).toBeTruthy()
      expect(cols.find((c) => c.name === 'updated_at')).toBeTruthy()
    })

    it('softDeletes adds deleted_at', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.softDeletes()
      const cols = bp.compileColumns()
      expect(cols.find((c) => c.name === 'deleted_at')).toBeTruthy()
    })

    it('dropTimestamps marks columns for dropping', () => {
      const bp = new TableBlueprint(null as any, 'alter')
      bp.dropTimestamps()
      expect(bp.droppedColumns).toContain('created_at')
      expect(bp.droppedColumns).toContain('updated_at')
    })

    it('dropSoftDeletes marks deleted_at for dropping', () => {
      const bp = new TableBlueprint(null as any, 'alter')
      bp.dropSoftDeletes()
      expect(bp.droppedColumns).toContain('deleted_at')
    })

    it('dropPrimary clears primary keys', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.primary('id')
      expect(bp['primaryKeys']).toHaveLength(1)
      bp.dropPrimary()
      expect(bp['primaryKeys']).toHaveLength(0)
    })

    it('dropIndex clears index keys', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.index('status')
      bp.dropIndex()
      const dialect = new MysqlDialect()
      expect(bp.compileConstraints(dialect)).not.toContain('INDEX')
    })

    it('dropForeign clears foreign keys', () => {
      const bp = new TableBlueprint(null as any, 'create')
      bp.foreign('user_id').references('id').on('users')
      bp.dropForeign()
      const dialect = new MysqlDialect()
      expect(bp.compileConstraints(dialect)).toHaveLength(0)
    })
  })

  describe('ColumnDefinition', () => {
    it('sets modifiers via fluent API', () => {
      const col = new ColumnDefinition('string', 'email')
      col.nullable().default('none').unique().primary().index().comment('user email')
      const c = col.compile()
      expect(c.nullable).toBe(true)
      expect(c.defaultValue).toBe('none')
      expect(c.unique).toBe(true)
      expect(c.primary).toBe(true)
      expect(c.index).toBe(true)
      expect(c.comment).toBe('user email')
    })

    it('unsigned and autoIncrement', () => {
      const col = new ColumnDefinition('integer', 'views')
      col.unsigned().autoIncrement()
      const c = col.compile()
      expect(c.unsigned).toBe(true)
      expect(c.autoIncrement).toBe(true)
    })

    it('after and first modifiers', () => {
      const col = new ColumnDefinition('string', 'nickname')
      col.after('name').first()
      const c = col.compile()
      expect(c.after).toBe('name')
      expect(c.first).toBe(true)
    })

    it('setValues for enum', () => {
      const col = new ColumnDefinition('enum', 'status')
      col.setValues(['a', 'b', 'c'])
      expect(col.compile().values).toEqual(['a', 'b', 'c'])
    })
  })

  describe('ForeignKeyDefinition', () => {
    it('fluent foreign key builder', () => {
      const fk = new ForeignKeyDefinition({
        column: 'user_id',
        references: '',
        on: '',
        onDelete: null,
        onUpdate: null,
      })
      fk.references('id').on('users').onDelete('CASCADE').onUpdate('SET NULL')
      const def = (fk as any).def
      expect(def.references).toBe('id')
      expect(def.on).toBe('users')
      expect(def.onDelete).toBe('CASCADE')
      expect(def.onUpdate).toBe('SET NULL')
    })
  })

  describe('Migrator', () => {
    it('run() executes pending migrations', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      raw.mockResolvedValue({ rows: [] })

      const migrator = new Migrator(runner as any)
      const up = vi.fn().mockResolvedValue(undefined)
      const down = vi.fn().mockResolvedValue(undefined)
      migrator.setMigrations([{ name: 'create_users_table', up, down }])
      await migrator.run()
      expect(up).toHaveBeenCalledTimes(1)
    })

    it('rollback() executes down for last batch', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      raw
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ last_batch: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ name: 'test', batch: 1, executedAt: '2024-01-01' }],
        })
        .mockResolvedValueOnce({ rows: [] })

      const migrator = new Migrator(runner as any)
      const up = vi.fn().mockResolvedValue(undefined)
      const down = vi.fn().mockResolvedValue(undefined)
      migrator.setMigrations([{ name: 'test', up, down }])
      await migrator.rollback()
      expect(down).toHaveBeenCalledTimes(1)
    })

    it('run() logs nothing to migrate when all ran', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      raw.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
        rows: [{ name: 'already_done', batch: 1, executedAt: '' }],
      })
      const migrator = new Migrator(runner as any)
      migrator.setMigrations([{ name: 'already_done', up: vi.fn(), down: vi.fn() }])
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      await migrator.run()
      expect(logSpy).toHaveBeenCalledWith('Nothing to migrate.')
      logSpy.mockRestore()
    })

    it('run() propagates migration errors', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      raw.mockResolvedValue({ rows: [] })
      const migrator = new Migrator(runner as any)
      const up = vi.fn().mockRejectedValue(new Error('fail'))
      migrator.setMigrations([{ name: 'broken', up, down: vi.fn() }])
      await expect(migrator.run()).rejects.toThrow('fail')
    })

    it('reset() rolls back all migrations', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      raw
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { name: 'm1', batch: 1, executedAt: '' },
            { name: 'm2', batch: 1, executedAt: '' },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
      const down = vi.fn().mockResolvedValue(undefined)
      const migrator = new Migrator(runner as any)
      migrator.setMigrations([
        { name: 'm1', up: vi.fn(), down },
        { name: 'm2', up: vi.fn(), down },
      ])
      await migrator.reset()
      expect(down).toHaveBeenCalledTimes(2)
    })

    it('status() returns ran migrations', async () => {
      const { runner, raw } = makeMockRunner('mysql')
      raw.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
        rows: [{ name: 'm1', batch: 1, executedAt: '2024-01-01' }],
      })
      const migrator = new Migrator(runner as any)
      const status = await migrator.status()
      expect(status).toHaveLength(1)
      expect(status[0].name).toBe('m1')
    })
  })
})

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------

describe('Seeder', () => {
  it('call() invokes the seeder class run()', async () => {
    const { runner } = makeMockRunner('mysql')
    const seeder = new Seeder(runner as any)
    const seederClass = { run: vi.fn().mockResolvedValue(undefined) }
    await seeder.call(seederClass)
    expect(seederClass.run).toHaveBeenCalledTimes(1)
  })

  it('insert() generates INSERT SQL', async () => {
    const { runner, raw } = makeMockRunner('mysql')
    raw.mockResolvedValue({ rows: [] })
    const seeder = new Seeder(runner as any)
    await seeder.insert('users', [
      { name: 'Alice', email: 'a@b.com' },
      { name: 'Bob', email: 'b@c.com' },
    ])
    expect(raw).toHaveBeenCalledWith('INSERT INTO `users` (`name`, `email`) VALUES (?, ?), (?, ?)', ['Alice', 'a@b.com', 'Bob', 'b@c.com'])
  })

  it('insert() does nothing with empty data', async () => {
    const { runner, raw } = makeMockRunner('mysql')
    const seeder = new Seeder(runner as any)
    await seeder.insert('users', [])
    expect(raw).not.toHaveBeenCalled()
  })

  it('truncate() with mysql disables FK checks', async () => {
    const { runner, raw } = makeMockRunner('mysql')
    raw.mockResolvedValue({ rows: [] })
    const seeder = new Seeder(runner as any)
    await seeder.truncate('users')
    expect(raw).toHaveBeenNthCalledWith(1, 'SET FOREIGN_KEY_CHECKS = 0')
    expect(raw).toHaveBeenNthCalledWith(2, 'TRUNCATE TABLE `users`')
    expect(raw).toHaveBeenNthCalledWith(3, 'SET FOREIGN_KEY_CHECKS = 1')
  })

  it('truncate() with sqlite uses DELETE FROM', async () => {
    const { runner, raw } = makeMockRunner('sqlite')
    raw.mockResolvedValue({ rows: [] })
    const seeder = new Seeder(runner as any)
    await seeder.truncate('users')
    expect(raw).toHaveBeenCalledWith('DELETE FROM "users"')
  })

  it('truncate() with postgresql uses TRUNCATE RESTART IDENTITY CASCADE', async () => {
    const { runner, raw } = makeMockRunner('postgresql')
    raw.mockResolvedValue({ rows: [] })
    const seeder = new Seeder(runner as any)
    await seeder.truncate('users')
    expect(raw).toHaveBeenCalledWith('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE')
  })

  it('run() throws if not overridden', async () => {
    const { runner } = makeMockRunner('mysql')
    const seeder = new Seeder(runner as any)
    await expect(seeder.run()).rejects.toThrow('Seeder.run() must be overridden by subclasses')
  })
})

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe('Pagination', () => {
  const result = {
    data: [{ id: 1 }, { id: 2 }],
    currentPage: 2,
    perPage: 10,
    total: 25,
    lastPage: 3,
    from: 11,
    to: 20,
    hasMore: true,
    hasPrev: true,
    isEmpty: false,
  }

  it('constructor sets properties', () => {
    const p = new Pagination(result)
    expect(p.data).toHaveLength(2)
    expect(p.currentPage).toBe(2)
    expect(p.total).toBe(25)
    expect(p.lastPage).toBe(3)
  })

  it('from() static factory', () => {
    const p = Pagination.from(result)
    expect(p).toBeInstanceOf(Pagination)
  })

  it('hasMore getter', () => {
    const p = new Pagination(result)
    expect(p.hasMore).toBe(true)
    expect(new Pagination({ ...result, currentPage: 3 }).hasMore).toBe(false)
  })

  it('hasPrev getter', () => {
    const p = new Pagination(result)
    expect(p.hasPrev).toBe(true)
    expect(new Pagination({ ...result, currentPage: 1 }).hasPrev).toBe(false)
  })

  it('isEmpty getter', () => {
    const p = new Pagination(result)
    expect(p.isEmpty).toBe(false)
    expect(new Pagination({ ...result, data: [] }).isEmpty).toBe(true)
  })

  it('nextPage returns next page info', () => {
    const p = new Pagination(result)
    const next = p.nextPage()
    expect(next).toEqual({ page: 3, perPage: 10, url: null })
  })

  it('nextPage returns null on last page', () => {
    const p = new Pagination({ ...result, currentPage: 3 })
    expect(p.nextPage()).toBeNull()
  })

  it('prevPage returns prev page info', () => {
    const p = new Pagination(result)
    const prev = p.prevPage()
    expect(prev).toEqual({ page: 1, perPage: 10, url: null })
  })

  it('prevPage returns null on first page', () => {
    const p = new Pagination({ ...result, currentPage: 1 })
    expect(p.prevPage()).toBeNull()
  })

  it('toJSON returns paginated envelope', () => {
    const p = new Pagination(result)
    const json = p.toJSON()
    expect(json.data).toHaveLength(2)
    expect(json.pagination.currentPage).toBe(2)
  })

  it('map transforms data', () => {
    const p = new Pagination(result)
    const mapped = p.map((item, i) => ({ ...item, index: i }))
    expect(mapped.data[0].index).toBe(0)
    expect(mapped.data[1].index).toBe(1)
  })

  it('items returns data array', () => {
    const p = new Pagination(result)
    expect(p.items()).toEqual([{ id: 1 }, { id: 2 }])
  })
})
