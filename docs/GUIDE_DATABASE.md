# Database & ORM Guide

SpeexJS ships with a full-featured database layer supporting **MySQL**, **PostgreSQL**, and **SQLite** — all with zero additional dependencies. The stack includes a Query Builder, Active Record Model, Migration system, Schema Builder, Pagination, and more.

---

## Connection Setup

### Creating a Connection

```typescript
import { DatabaseConnection } from 'speexjs/server/database'

const db = new DatabaseConnection({
  driver: 'mysql',         // 'mysql' | 'postgresql' | 'sqlite'
  host: '127.0.0.1',
  port: 3306,
  database: 'myapp',
  username: 'root',
  password: 'secret',
  charset: 'utf8mb4',
  prefix: '',              // Optional table prefix
})

await db.connect()
```

### SQLite

```typescript
const db = new DatabaseConnection({
  driver: 'sqlite',
  database: './storage/app.sqlite', // Path to database file
})
```

### PostgreSQL

```typescript
const db = new DatabaseConnection({
  driver: 'postgresql',
  host: '127.0.0.1',
  port: 5432,
  database: 'myapp',
  username: 'postgres',
  password: 'secret',
})
```

### Transactions

```typescript
const result = await db.transaction(async (trx) => {
  const userId = await trx.table('users').insert({ name: 'Alice' })
  await trx.table('profiles').insert({ user_id: userId, bio: 'Hello' })
  return userId
})
```

### Raw SQL

```typescript
const result = await db.raw('SELECT * FROM users WHERE active = ?', [true])
```

---

## QueryBuilder

All queries start with `db.table('table_name')`:

```typescript
const qb = db.table('users')
```

### SELECT

```typescript
db.table('users').select('id', 'name', 'email').get()
db.table('users').addSelect('created_at').get()
db.table('users').distinct().get()
db.table('users').from('active_users').get()
```

### WHERE Clauses

| Method | Example |
|---|---|
| `.where(column, value)` | `.where('status', 'active')` |
| `.where(column, operator, value)` | `.where('age', '>=', 18)` |
| `.orWhere(column, op, value)` | `.orWhere('role', 'admin')` |
| `.whereIn(column, values)` | `.whereIn('id', [1, 2, 3])` |
| `.whereNotIn(column, values)` | `.whereNotIn('status', ['deleted'])` |
| `.whereNull(column)` | `.whereNull('deleted_at')` |
| `.whereNotNull(column)` | `.whereNotNull('email_verified_at')` |
| `.whereBetween(column, [a, b])` | `.whereBetween('age', [18, 65])` |
| `.whereNotBetween(column, [a, b])` | `.whereNotBetween('level', [1, 3])` |
| `.whereLike(column, pattern)` | `.whereLike('name', '%john%')` |
| `.orWhereLike(column, pattern)` | `.orWhereLike('email', '%@test.com')` |
| `.whereGroup(callback)` | Nested WHERE groups |
| `.whereRaw(sql, bindings?)` | Raw SQL WHERE (⚠️ use bindings) |
| `.whereColumn(a, op, b)` | `.whereColumn('updated_at', '>', 'created_at')` |
| `.whereExists(callback)` | `.whereExists(qb => qb.select(1).from('orders').whereRaw('user_id = users.id'))` |

```typescript
db.table('users')
  .where('active', true)
  .whereBetween('age', [18, 65])
  .whereGroup((q) => {
    q.where('role', 'admin')
    q.orWhere('role', 'moderator')
  })
  .get()
```

### JOINs

```typescript
db.table('users')
  .join('profiles', 'users.id', '=', 'profiles.user_id')
  .get()

db.table('orders')
  .leftJoin('users', 'orders.user_id', '=', 'users.id')
  .rightJoin('payments', 'orders.id', '=', 'payments.order_id')
  .crossJoin('shipping', 'orders.id', '=', 'shipping.order_id')
  .get()
```

**Subquery joins:**

```typescript
db.table('users')
  .joinSub((qb) => {
    qb.select('user_id').from('orders').where('total', '>', 100)
  }, 'big_spenders', 'users.id', '=', 'big_spenders.user_id')
  .get()
```

### ORDER BY & LIMIT

```typescript
db.table('users')
  .orderBy('name', 'asc')
  .orderByDesc('created_at')
  .latest()      // orderBy('created_at', 'desc')
  .oldest()      // orderBy('created_at', 'asc')
  .inRandomOrder()
  .limit(10)
  .offset(20)
  .skip(20)      // alias for offset
  .take(10)      // alias for limit
  .get()
```

### GROUP BY & HAVING

```typescript
db.table('orders')
  .select('user_id')
  .groupBy('user_id')
  .having('total', '>', 1000)
  .get()
```

### Aggregates

```typescript
await db.table('users').count()             // number
await db.table('users').count('id')         // COUNT(id)
await db.table('users').max('age')          // number | null
await db.table('users').min('age')          // number | null
await db.table('users').sum('balance')      // number
await db.table('users').avg('balance')      // number
await db.table('users').exists()            // boolean
await db.table('users').doesntExist()       // boolean
await db.table('users').pluck('email')      // string[]
```

### Pagination

**Offset-based pagination:**

```typescript
const result = await db.table('users')
  .where('active', true)
  .orderBy('name', 'asc')
  .paginate(perPage = 15, page = 1)

// result: {
//   data: [...],
//   currentPage: 1,
//   perPage: 15,
//   total: 142,
//   lastPage: 10,
//   from: 1,
//   to: 15,
//   hasMore: true,
//   hasPrev: false,
//   isEmpty: false,
// }
```

```typescript
import { Pagination } from 'speexjs/server/database'

const paginated = Pagination.from(result)
paginated.hasNext  // boolean
paginated.hasPrev  // boolean
paginated.nextPage() // { page: 2, perPage: 15, url: null }
paginated.prevPage() // { page: 1, perPage: 15, url: null }
paginated.toJSON()
paginated.map(item => transform(item))
```

**Cursor-based pagination (for large datasets):**

```typescript
interface CursorPaginatedResult<T> {
  data: T[]
  cursors: { next: string | null; previous: string | null }
  hasMore: boolean
}
```

### INSERT

```typescript
const newId = await db.table('users').insert({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
})

// PostgreSQL returns the ID directly
// MySQL returns insertId
// SQLite uses last_insert_rowid()
```

```typescript
const user = await db.table('users').insertReturning({
  name: 'Bob',
  email: 'bob@example.com',
})
// Returns the full inserted row (PostgreSQL)
```

```typescript
await db.table('users').upsert(
  { email: 'alice@test.com', name: 'Alice', age: 31 },
  ['email'] // conflict columns
)
// MySQL: ON DUPLICATE KEY UPDATE
// PostgreSQL: ON CONFLICT (email) DO UPDATE SET ...
```

### UPDATE

```typescript
const affected = await db.table('users')
  .where('id', 1)
  .update({ name: 'Alice Smith', age: 31 })
```

### DELETE

```typescript
const affected = await db.table('users')
  .where('active', false)
  .delete()

// Delete all rows
await db.table('logs').truncate()
```

### CTEs (WITH clauses)

```typescript
db.table('users')
  .with('recent_users', (qb) => {
    qb.select('*').from('users').where('created_at', '>', '2025-01-01')
  })
  .select('*')
  .from('recent_users')
  .get()
```

### UNION / INTERSECT / EXCEPT

```typescript
db.table('users')
  .where('role', 'admin')
  .union((qb) => {
    qb.select('*').from('users').where('role', 'moderator')
  })
  .get()
```

### Locking

```typescript
await db.table('users').where('id', 1).lockForUpdate().first()  // FOR UPDATE
await db.table('users').where('id', 1).sharedLock().first()     // FOR SHARE
```

### Chunking (Processing Large Results)

```typescript
await db.table('users').chunk(100, async (rows) => {
  for (const user of rows) {
    await sendEmail(user)
  }
})
```

### Raw WHERE (⚠️ Use with caution)

```typescript
db.table('users')
  .whereRaw('JSON_EXTRACT(metadata, "$.score") > ?', [50])
  .get()
```

### Debugging

```typescript
db.table('users').where('id', 1).dd()
// Prints: SQL: SELECT * FROM "users" WHERE "id" = $1
//         Bindings: [1]

const { sql, bindings } = db.table('users').where('id', 1).toSQL()
```

---

## Model (Active Record)

```typescript
import { Model } from 'speexjs/server/database'
```

### Defining a Model

```typescript
class User extends Model {
  static table = 'users'
}

// Set connection (once, at bootstrap)
User.setConnection(db)
```

### Query Methods

```typescript
await User.all()                              // All records
await User.find(1)                            // By primary key
await User.create({ name: 'Alice', age: 30 }) // Create + return instance
await User.where('age', '>', 18).get()        // Query builder access

// updateOrCreate
const user = await User.updateOrCreate(
  { email: 'alice@test.com' },
  { name: 'Alice', age: 31 },
)
```

### Instance Methods

```typescript
const user = await User.find(1)

user.name = 'Alice Smith'
await user.save()       // Persist changes
await user.delete()     // Delete record

await user.load('posts', 'profile')   // Eager load relations
await user.loadMissing('comments')    // Load only if not already loaded
```

### Relations

Define relations as static method calls on the model class.

```typescript
class User extends Model {
  static table = 'users'

  // Relations (called at class definition time)
  static initRelations(): void {
    this.hasMany(Post)                          // foreignKey: 'user_id', localKey: 'id'
    this.hasOne(Profile)                        // foreignKey: 'user_id', localKey: 'id'
    this.belongsTo(Team)                        // foreignKey: 'team_id', localKey: 'id'
    this.belongsToMany(Role, 'role_user')       // pivot table: 'role_user'
    this.morphMany(Comment, 'commentable')      // polymorphic: commentable_id, commentable_type
    this.morphOne(Thumbnail, 'thumbnailable')
    this.morphToMany(Tag, 'taggable', 'taggable_taggables')
  }
}

class Post extends Model {
  static table = 'posts'

  static initRelations(): void {
    this.belongsTo(User)  // foreignKey: 'user_id'
  }
}
```

**Eager loading:**

```typescript
User.with('posts', 'profile') // Always load these relations

const user = await User.find(1)
// user._relations contains loaded relation data
```

### Model Events / Observers

```typescript
import { observe } from 'speexjs/server/database'

observe(User, 'created', async (user) => {
  await Log.create({ action: 'user_created', target_id: user.id })
})

// Available events: 'creating', 'created', 'updating', 'updated',
//                   'deleting', 'deleted', 'saving', 'saved'
```

### Global Scopes

```typescript
import { addGlobalScope } from 'speexjs/server/database'

addGlobalScope(User, (query) => {
  return query.where('tenant_id', TenantContext.getCurrentId())
})
```

### Soft Deletes

```typescript
// Include deleted_at timestamp in migration
// Models with soft deletes check deleted_at IS NULL automatically
```

### Model Caching

```typescript
import { ModelCache } from 'speexjs/server/database'

// Cache query results by model
```

### Serialization

```typescript
import { defineSerialization } from 'speexjs/server/database'

defineSerialization(User, {
  hidden: ['password', 'api_token'],
  visible: ['id', 'name', 'email'],
  casts: {
    is_admin: 'boolean',
    metadata: 'json',
  },
})
```

---

## Migrations

```typescript
import { SchemaBuilder, Migrator } from 'speexjs/server/database'
```

### Defining a Migration

Each migration has an `up` and `down` method:

```typescript
import { MigrationDefinition, SchemaBuilder } from 'speexjs/server/database'

const createUsersTable: MigrationDefinition = {
  name: 'create_users_table',
  up: async (schema: SchemaBuilder) => {
    await schema.createTable('users', (table) => {
      table.id()                          // Auto-increment primary key
      table.string('name')                // VARCHAR(255)
      table.string('email').unique()       // UNIQUE constraint
      table.string('password')
      table.string('remember_token', 100).nullable()
      table.boolean('is_admin').default(false)
      table.timestamps()                  // created_at, updated_at
      table.softDeletes()                 // deleted_at
    })
  },
  down: async (schema: SchemaBuilder) => {
    await schema.dropTable('users')
  },
}
```

### Table Blueprint Column Types

| Method | Description |
|---|---|
| `id(name = 'id')` | Auto-incrementing BIGINT primary key |
| `increments(name)` | Auto-incrementing INTEGER |
| `bigIncrements(name)` | Auto-incrementing BIGINT |
| `string(name, length = 255)` | VARCHAR |
| `text(name)` | TEXT |
| `integer(name)` | INTEGER |
| `bigInteger(name)` | BIGINT |
| `tinyInteger(name)` | TINYINT |
| `smallInteger(name)` | SMALLINT |
| `boolean(name)` | BOOLEAN / TINYINT(1) |
| `float(name, precision?)` | FLOAT |
| `double(name)` | DOUBLE |
| `decimal(name, precision = 10, scale = 0)` | DECIMAL |
| `date(name)` | DATE |
| `datetime(name)` | DATETIME |
| `timestamp(name)` | TIMESTAMP |
| `time(name)` | TIME |
| `year(name)` | YEAR |
| `json(name)` | JSON |
| `jsonb(name)` | JSONB |
| `binary(name)` | BLOB / BYTEA |
| `uuid(name)` | UUID |
| `enum(name, values)` | ENUM |
| `foreignId(name)` | UNSIGNED BIGINT foreign key |
| `ip(name)` | INET |
| `mac(name)` | MACADDR |
| `ulid(name)` | ULID |
| `point(name)` | Spatial POINT |
| `polygon(name)` | Spatial POLYGON |
| `geometry(name)` | Spatial GEOMETRY |
| `mediumText(name)` | MEDIUMTEXT |
| `longText(name)` | LONGTEXT |

### Column Modifiers

Chained after the column type:

```typescript
table.string('email').unique().nullable().default('@').comment('User email')
table.integer('age').unsigned().index().after('name')
table.decimal('price', 10, 2).default(0.00)
table.timestamp('paid_at').nullable().default(null)
```

| Modifier | Description |
|---|---|
| `.nullable()` | Allow NULL values |
| `.default(value)` | Default value |
| `.unsigned()` | UNSIGNED (for integers) |
| `.unique()` | UNIQUE constraint |
| `.primary()` | PRIMARY KEY |
| `.index()` | Add INDEX |
| `.comment(text)` | Column comment |
| `.after(column)` | Position after column (MySQL) |
| `.first()` | Position first (MySQL) |
| `.autoIncrement()` | AUTO_INCREMENT |

### Constraints

```typescript
table.primary('id')
table.unique('email')
table.index('status', 'created_at')

table.foreign('user_id')
  .references('id')
  .on('users')
  .onDelete('cascade')
  .onUpdate('cascade')
```

### Timestamps & Soft Deletes

```typescript
table.timestamps()       // created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL
table.softDeletes()      // deleted_at TIMESTAMP NULL
table.rememberToken()    // remember_token VARCHAR(100) NULL
```

### Altering Tables

```typescript
await schema.alterTable('users', (table) => {
  table.string('phone').nullable().after('email')
  table.dropColumn('legacy_field')
  table.renameColumn('old_name', 'new_name')
  table.dropTimestamps()
  table.dropSoftDeletes()
})
```

### Running Migrations

```typescript
import { Migrator, SchemaBuilder } from 'speexjs/server/database'

const migrator = new Migrator(db)
migrator.addMigrations([
  createUsersTable,
  createPostsTable,
])

await migrator.run()      // Run all pending migrations
await migrator.rollback() // Roll back last batch
await migrator.reset()    // Roll back all migrations
await migrator.refresh()  // Reset then re-run
await migrator.status()   // List executed migrations
```

### Checking Schema State

```typescript
await schema.hasTable('users')          // boolean
await schema.hasColumn('users', 'email') // boolean
```

---

## Seeder

```typescript
import { Seeder } from 'speexjs/server/database'

class UserSeeder extends Seeder {
  async run(): Promise<void> {
    await db.table('users').insert([
      { name: 'Admin', email: 'admin@test.com' },
      { name: 'User', email: 'user@test.com' },
    ])
  }
}

const seeder = new UserSeeder(db)
await seeder.run()
```
