# SpeexJS CLI Reference

The `speexjs` CLI provides 30+ commands for project scaffolding, code generation, database management, deployment, and more.

```bash
speexjs --help
speexjs -v            # → v1.6.1
```

---

## Project Commands

### `speexjs init`

Create a new SpeexJS project.

```bash
speexjs init my-app
speexjs init my-app --template fullstack
speexjs init my-api --template api-only --frontend react
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `--template` | `blank \| fullstack \| api-only` | `fullstack` | Project template |
| `--frontend` | `super \| react \| vue` | `super` | Frontend framework |

**Output structure:**

```
my-app/
├── src/
│   ├── bootstrap.ts
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   └── views/
├── migrations/
├── public/
├── speexjs.config.ts
├── .env
├── tsconfig.json
└── package.json
```

### `speexjs serve` / `speexjs dev`

Start the development server with file watching.

```bash
speexjs serve
speexjs serve --port 8080
speexjs serve --host 0.0.0.0 --port 3000
speexjs dev           # Alias
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `--port` | `number` | `3000` | Server port |
| `--host` | `string` | `localhost` | Bind address |

### `speexjs build`

Build the project for production.

```bash
speexjs build
speexjs build --ssg              # Static Site Generation
speexjs build --isr              # Incremental Static Regeneration
speexjs build --outDir ./output  # Custom output directory
speexjs build --isr --revalidate 60  # ISR with 60s revalidation
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `--ssg` | `boolean` | `false` | Generate static HTML |
| `--isr` | `boolean` | `false` | Enable ISR |
| `--revalidate` | `number` | - | ISR revalidation interval (seconds) |
| `--outDir` | `string` | `dist` | Output directory |

### `speexjs bench` / `speexjs benchmark`

Run performance benchmarks.

```bash
speexjs bench
speexjs benchmark    # Alias
```

Runs benchmark files from `benchmarks/framework.bench.ts` or `benchmarks/index.bench.ts` using [mitata](https://github.com/evanwashere/mitata).

---

## Make Commands (Code Generators)

### `speexjs make:controller`

Generate a controller class.

```bash
speexjs make:controller UserController
speexjs make:controller Admin/UserController  # Namespaced
```

**Output:** `src/controllers/UserController.ts`

```typescript
import { Controller, get, post, put, del, controller } from 'speexjs'

@controller('/users')
export class UserController extends Controller {
  @get('/')
  async index({ response }) {
    response.json({ data: [] })
  }

  @get('/:id')
  async show({ params, response }) {
    response.json({ data: { id: params.id } })
  }

  @post('/')
  async store({ request, response }) {
    const data = await request.json()
    response.status(201).json({ data })
  }

  @put('/:id')
  async update({ params, request, response }) {
    const data = await request.json()
    response.json({ data })
  }

  @del('/:id')
  async destroy({ params, response }) {
    response.status(204)
  }
}
```

### `speexjs make:middleware`

Generate a middleware function.

```bash
speexjs make:middleware EnsureEmailVerified
speexjs make:middleware LogRequests
```

**Output:** `src/middleware/EnsureEmailVerified.ts`

```typescript
import type { RouteContext, Middleware } from 'speexjs'

export function EnsureEmailVerified(): Middleware {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const user = (ctx as any).user
    if (user && !user.email_verified_at) {
      ctx.response.status(403).json({
        error: 'Email not verified',
      })
      return
    }
    return next()
  }
}
```

### `speexjs make:migration`

Generate a migration file.

```bash
speexjs make:migration create_users_table
speexjs make:migration add_phone_to_users
speexjs make:migration create_orders_table
```

**Output:** `migrations/<timestamp>_create_users_table.ts`

```typescript
import type { MigrationDefinition, SchemaBuilder } from 'speexjs/server/database'

const migration: MigrationDefinition = {
  name: 'create_users_table',
  up: async (schema: SchemaBuilder) => {
    await schema.createTable('users', (table) => {
      table.id()
      table.string('name')
      table.string('email').unique()
      table.string('password')
      table.timestamps()
    })
  },
  down: async (schema: SchemaBuilder) => {
    await schema.dropTable('users')
  },
}
export default migration
```

### `speexjs make:model`

Generate an Active Record model.

```bash
speexjs make:model User
speexjs make:model Post
speexjs make:models/Order
```

**Output:** `src/models/User.ts`

```typescript
import { Model } from 'speexjs/server/database'

export class User extends Model {
  static table = 'users'

  static initRelations(): void {
    this.hasMany(Post)
  }
}
```

### `speexjs make:auth`

Generate the full authentication scaffold.

```bash
speexjs make:auth                      # Session guard with views
speexjs make:auth --guard token        # Token guard
speexjs make:auth --guard sanctum      # Sanctum SPA auth
speexjs make:auth --no-views           # API-only auth
speexjs make:auth --api                # API routes only
```

**Generates:** User model, auth routes (login, register, logout, forgot-password, reset-password), auth controllers, auth middleware, login/register view pages.

### `speexjs make:resource`

Generate a complete RESTful resource (controller + model + migration).

```bash
speexjs make:resouce Product
speexjs make:resouce Category
```

**Generates:**
- `src/controllers/ProductController.ts` — CRUD controller
- `src/models/Product.ts` — Active Record model
- `migrations/<timestamp>_create_products_table.ts` — Migration

### `speexjs make:schema`

Generate a validation schema.

```bash
speexjs make:schema CreateUser
speexjs make:schema UpdateProduct
```

**Output:** `src/schema/CreateUser.ts`

```typescript
import { schema } from 'speexjs/schema'

export const CreateUserSchema = schema.object({
  name: schema.string().min(2).max(255),
  email: schema.string().email(),
  age: schema.number().min(18).max(120),
})
```

### `speexjs make:crud`

Interactive CRUD generator. Walks you through creating a full CRUD resource step by step.

```bash
speexjs make:crud
# Prompts for:
# - Resource name
# - Fields (name, type, validation)
# - Whether to generate views
# - Whether to add auth protection
```

### `speexjs make:admin`

Generate an admin panel configuration.

```bash
speexjs make:admin Product name:string price:number description:text
speexjs make:admin User name:string email:string role:string
```

**Output:** `src/admin/Product.ts`

```typescript
import { AdminPanel } from 'speexjs'

export const ProductAdmin = AdminPanel.resource({
  model: Product,
  fields: [
    { key: 'name', type: 'string' },
    { key: 'price', type: 'number' },
    { key: 'description', type: 'text' },
  ],
})
```

### `speexjs make:agent`

Generate an AI agent with tool definitions.

```bash
speexjs make:agent SupportBot
speexjs make:agent DataAnalyzer
```

**Output:** `src/agents/SupportBot.ts` — AI agent scaffold with tool definitions, prompts, and handler stubs.

### `speexjs make:flag`

Generate a feature flag.

```bash
speexjs make:flag new-checkout
speexjs make:flag dark-mode
```

**Output:** Feature flag with toggle, rollout percentage, and admin dashboard integration.

### `speexjs make:test`

Generate a test file.

```bash
speexjs make:test UserController
speexjs make:test AuthLogin
```

**Output:** `tests/UserController.test.ts`

### `speexjs make:webhook`

Generate an incoming/outgoing webhook handler.

```bash
speexjs make:webhook stripe-payment
speexjs make:webhook github-push
```

---

## Database Commands

### `speexjs migrate`

Run pending database migrations.

```bash
speexjs migrate
```

Executes all migration files from the `migrations/` directory that haven't been run yet.

### `speexjs migrate:status`

Show migration status.

```bash
speexjs migrate:status
```

Displays a table of all migrations with their run status and batch number.

### `speexjs db:seed`

Run database seeders.

```bash
speexjs db:seed
```

Executes seeder classes to populate the database with test data.

---

## API Commands

### `speexjs openapi:generate`

Generate an OpenAPI 3.1 specification from your route definitions.

```bash
speexjs openapi:generate
speexjs openapi:generate --output ./docs/openapi.json
speexjs openapi:generate --pretty false
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `--output` | `string` | `openapi.json` | Output file path |
| `--pretty` | `boolean` | `true` | Pretty-print JSON |

Serves the spec via Swagger UI at `/docs` when the server is running.

### `speexjs generate:sdk`

Generate a typed TypeScript SDK from an OpenAPI spec.

```bash
speexjs generate:sdk
speexjs generate:sdk --output ./sdk --name MyApiClient
speexjs generate:sdk --format fetch    # or axios
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `--output` | `string` | `./sdk` | Output directory |
| `--name` | `string` | `ApiClient` | Client class name |
| `--format` | `string` | `fetch` | HTTP client format |

### `speexjs list-routes` / `speexjs routes` / `speexjs lr`

List all registered routes with methods, paths, and middleware.

```bash
speexjs list-routes
speexjs routes       # Alias
speexjs lr           # Alias
```

**Output:**

```
┌──────────┬──────────────────────┬─────────────────────┐
│ Method   │ Path                 │ Middleware          │
├──────────┼──────────────────────┼─────────────────────┤
│ GET      │ /api/health          │                     │
│ GET      │ /api/users           │ auth, throttle      │
│ POST     │ /api/users           │ auth, validate      │
│ GET      │ /api/users/:id       │ auth                │
│ PUT      │ /api/users/:id       │ auth, validate      │
│ DELETE   │ /api/users/:id       │ auth                │
│ GET      │ /dashboard           │ auth, admin         │
└──────────┴──────────────────────┴─────────────────────┘
```

---

## Environment Commands

### `speexjs env:generate`

Generate a typed `src/env.ts` from `.env`.

```bash
speexjs env:generate
speexjs env:generate --overwrite    # Overwrite existing file
```

**Output:** `src/env.ts` with typed exports for every variable in `.env`:

```typescript
// Auto-generated from .env
export const PORT = Number(process.env.PORT ?? 3000)
export const APP_KEY = process.env.APP_KEY ?? ''
export const DB_HOST = process.env.DB_HOST ?? '127.0.0.1'
export const DB_PORT = Number(process.env.DB_PORT ?? 3306)
```

### `speexjs env:check`

Validate environment variables against the config schema.

```bash
speexjs env:check
```

Checks all required variables are set and valid.

---

## Schema Commands

### `speexjs schema:diff`

Compare model definitions against the actual database schema.

```bash
speexjs schema:diff
speexjs schema:diff --verbose
```

Reports columns that exist in models but not in the database, and vice versa.

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `--verbose` | `boolean` | `false` | Show detailed diff |

### `speexjs schema:migrate`

Generate a migration from schema differences.

```bash
speexjs schema:migrate
speexjs schema:migrate --dry-run    # Preview without executing
speexjs schema:migrate --force      # Skip confirmation
speexjs schema:migrate --backup     # Back up database first
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `--dry-run` | `boolean` | `false` | Show SQL without executing |
| `--force` | `boolean` | `false` | Skip confirmation prompt |
| `--backup` | `boolean` | `false` | Backup DB before migration |

---

## Plugin Commands

### `speexjs plugin:install`

Install a plugin from the registry, npm, or GitHub.

```bash
speexjs plugin:install speexjs-auth
speexjs plugin:install my-plugin --source npm:@scope/package
speexjs plugin:install my-plugin --source github:user/repo
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `--source` | `string` | `registry` (default), `npm:<pkg>`, or `github:<repo>` |

### `speexjs plugin:list`

List installed plugins.

```bash
speexjs plugin:list
```

---

## Generate Commands

### `speexjs generate:app`

Generate a full-stack application from a text description (uses AI code generation).

```bash
speexjs generate:app "create a blog with posts, comments, and categories"
speexjs generate:app "build a task management app with teams and kanban boards"
```

Generates models, controllers, routes, migrations, views, and configuration matching the description.

---

## Deploy Command

### `speexjs deploy`

Deploy the application to a hosting provider.

```bash
speexjs deploy                    # Interactive — choose from options
speexjs deploy --docker           # Build Docker image + docker-compose.yml
speexjs deploy --vercel           # Deploy to Vercel
speexjs deploy --railway          # Deploy to Railway
speexjs deploy --render           # Deploy to Render
speexjs deploy --flyio            # Deploy to Fly.io
speexjs deploy --init             # Initialize deployment config
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `--docker` | `boolean` | Generate Docker configuration |
| `--vercel` | `boolean` | Deploy to Vercel |
| `--railway` | `boolean` | Deploy to Railway |
| `--render` | `boolean` | Deploy to Render |
| `--flyio` | `boolean` | Deploy to Fly.io |
| `--init` | `boolean` | Generate deployment config only |

---

## Interactive REPL

### `speexjs tinker`

Start an interactive TypeScript REPL with all app context loaded.

```bash
speexjs tinker
```

Allows you to run database queries, test models, and interact with the app in real time.

```
SpeexJS Tinker v1.6.1
> await User.all()
> await db.table('users').where('active', true).count()
> const user = await User.find(1)
```

---

## Command Summary

| Command | Alias | Description |
|---|---|---|
| `init` | - | Create new project |
| `serve` | `dev` | Start dev server |
| `build` | - | Production build |
| `bench` | `benchmark` | Run benchmarks |
| `make:controller` | - | Generate controller |
| `make:middleware` | - | Generate middleware |
| `make:migration` | - | Generate migration |
| `make:model` | - | Generate model |
| `make:auth` | - | Generate auth scaffold |
| `make:resource` | - | Generate API resource |
| `make:schema` | - | Generate validation schema |
| `make:crud` | `crud` | Interactive CRUD generator |
| `make:agent` | - | Generate AI agent |
| `make:admin` | - | Generate admin config |
| `make:flag` | - | Generate feature flag |
| `make:test` | - | Generate test file |
| `make:webhook` | - | Generate webhook handler |
| `migrate` | - | Run migrations |
| `migrate:status` | - | Show migration status |
| `db:seed` | - | Seed database |
| `openapi:generate` | - | Generate OpenAPI spec |
| `generate:sdk` | - | Generate TypeScript SDK |
| `generate:app` | - | Generate app from description |
| `list-routes` | `routes`, `lr` | List all routes |
| `env:generate` | - | Generate typed env file |
| `env:check` | - | Validate environment |
| `schema:diff` | - | Compare models vs DB |
| `schema:migrate` | - | Generate migration from diff |
| `plugin:install` | - | Install a plugin |
| `plugin:list` | - | List installed plugins |
| `deploy` | - | Deploy application |
| `tinker` | - | Interactive REPL |
| `--version` | `-v` | Show version |
| `--help` | `-h` | Show help |
