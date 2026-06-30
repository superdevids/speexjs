# Getting Started with SpeexJS

**Version:** 1.6.1 | **License:** MIT | **Runtime:** Node.js 18+ / Bun

## What is SpeexJS?

SpeexJS is a **zero-dependency fullstack TypeScript framework** that provides everything you need to build production web applications — from database access and authentication to CLI scaffolding and AI agent generation. Unlike Express, Fastify, or Hono, SpeexJS ships with 500+ built-in features in a single package with zero runtime dependencies.

**Core philosophy:** one import, one framework, zero `npm install` chasing.

```typescript
import { speexjs } from 'speexjs'

const app = speexjs()

app.get('/api/health', (ctx) => {
  ctx.response.json({ status: 'ok' })
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## Installation

### Option A: Create a new project (recommended)

```bash
npx speexjs init my-app
cd my-app
npm run dev
```

This scaffolds a fullstack project with TypeScript, routes directory, database config, and optional frontend (React, Vue, or SpeexJS's native TSX view engine).

Available templates:

| Template | Description |
|---|---|
| `blank` | Minimal TypeScript project with bootstrap file |
| `fullstack` (default) | Server, routes, views, database, auth scaffold |
| `api-only` | JSON API server with database support |

```bash
npx speexjs init my-api --template api-only
cd my-api && npm run dev
```

### Option B: Install into existing project

```bash
npm install speexjs
```

Then create `bootstrap.ts`:

```typescript
// bootstrap.ts
import { speexjs, loadConfig } from 'speexjs'

async function main() {
  const config = await loadConfig()
  const app = speexjs({
    // optionally pass a custom DI container
  })

  app.get('/api/health', (ctx) => {
    ctx.response.json({
      status: 'ok',
      timestamp: Date.now(),
    })
  })

  app.listen(config.app.port, () => {
    console.log(`✓ App running on http://localhost:${config.app.port}`)
  })
}

main()
```

Run with:

```bash
npx tsx bootstrap.ts
```

## Project Structure

A typical SpeexJS project (created via `init`):

```
my-app/
├── src/
│   ├── routes/          # Route definitions
│   │   └── api.ts
│   ├── controllers/     # Controller classes
│   │   └── UserController.ts
│   ├── models/          # Active Record models
│   │   └── User.ts
│   ├── middleware/      # Custom middleware
│   ├── schema/          # Validation schemas
│   ├── views/           # TSX page components
│   │   └── home.tsx
│   └── bootstrap.ts     # Entry point
├── migrations/          # Database migrations
├── public/              # Static assets
├── speexjs.config.ts    # Framework configuration
├── .env                 # Environment variables
├── tsconfig.json
└── package.json
```

## Your First API Endpoint

Create `src/routes/api.ts`:

```typescript
import type { SuperApp } from 'speexjs'

export function registerApiRoutes(app: SuperApp): void {
  app.get('/api/health', (ctx) => {
    ctx.response.json({
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
    })
  })

  app.get('/api/users', async (ctx) => {
    const users = await User.all()
    ctx.response.json({ data: users })
  })

  app.post('/api/users', async (ctx) => {
    const body = await ctx.request.json()
    const user = await User.create(body)
    ctx.response.status(201).json({ data: user })
  })
}
```

Import in `bootstrap.ts`:

```typescript
import { speexjs } from 'speexjs'
import { registerApiRoutes } from './routes/api'

const app = speexjs()
registerApiRoutes(app)
app.listen(3000)
```

## Route Parameters & Query Strings

```typescript
app.get('/api/users/:id', (ctx) => {
  const { id } = ctx.params
  const { include } = ctx.query
  // GET /api/users/42?include=posts
  ctx.response.json({ userId: id, include })
})
```

## Route Groups

Group related routes with shared prefix and middleware:

```typescript
app.group('/api', (router) => {
  router.get('/users', listUsers)
  router.post('/users', createUser)
  router.get('/users/:id', showUser)
  router.put('/users/:id', updateUser)
  router.delete('/users/:id', deleteUser)
})
```

## Named Routes

```typescript
app.get('/users/:id', showUser).name('users.show')
// Later:
const url = app.router.route('users.show', { id: '42' })
// → '/users/42'
```

## Resource Routes

```typescript
import { UserController } from './controllers/UserController'

// Full RESTful resource (7 routes)
app.resource('users', UserController)

// API-only resource (5 routes, omits create/edit)
app.apiResource('users', UserController)
```

Generated routes for `app.resource('users', UserController)`:

| Method | Path | Handler |
|---|---|---|
| GET | /users | index |
| GET | /users/create | create |
| POST | /users | store |
| GET | /users/:user | show |
| GET | /users/:user/edit | edit |
| PUT/PATCH | /users/:user | update |
| DELETE | /users/:user | destroy |

## Using Controllers

```typescript
import { Controller, get, post, put, del, controller } from 'speexjs'

@controller('/api/users')
export class UserController extends Controller {
  @get('/')
  async index({ response }) {
    const users = await User.all()
    response.json({ data: users })
  }

  @post('/')
  async store({ request, response }) {
    const data = await request.json()
    const user = await User.create(data)
    response.status(201).json({ data: user })
  }

  @get('/:id')
  async show({ params, response }) {
    const user = await User.find(params.id)
    if (!user) return response.status(404).json({ error: 'Not found' })
    response.json({ data: user })
  }

  @put('/:id')
  async update({ params, request, response }) {
    const data = await request.json()
    const user = await User.find(params.id)
    if (!user) return response.status(404).json({ error: 'Not found' })
    Object.assign(user, data)
    await user.save()
    response.json({ data: user })
  }

  @del('/:id')
  async destroy({ params, response }) {
    const user = await User.find(params.id)
    if (!user) return response.status(404).json({ error: 'Not found' })
    await user.delete()
    response.status(204)
  }
}
```

Register the controller:

```typescript
app.controller(UserController)
```

## Adding Database Support

### 1. Configure the connection

```typescript
// speexjs.config.ts
import { defineConfig } from 'speexjs'

export default defineConfig({
  app: {
    name: 'My App',
    port: 3000,
    host: '0.0.0.0',
    env: 'development',
    debug: true,
  },
  database: {
    default: 'sqlite',
    connections: {
      sqlite: {
        driver: 'sqlite',
        database: 'storage/app.sqlite',
      },
      mysql: {
        driver: 'mysql',
        host: process.env.DB_HOST || '127.0.0.1',
        port: 3306,
        database: process.env.DB_NAME || 'myapp',
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
      },
    },
  },
})
```

### 2. Connect and use

```typescript
import { DatabaseConnection } from 'speexjs/server/database'

const db = new DatabaseConnection({
  driver: 'sqlite',
  database: 'storage/app.sqlite',
})
await db.connect()

// Query builder
const users = await db.table('users')
  .where('age', '>', 18)
  .orderBy('name', 'asc')
  .get()

// Raw SQL
const result = await db.raw('SELECT * FROM users WHERE id = ?', [1])
```

### 3. Register in the app container

```typescript
app.container.instance('db', db)
```

## Adding Auth

```bash
npx speexjs make:auth --guard session
```

This scaffolds login, register, password reset routes, views, and the User model.

Or configure manually:

```typescript
import { AuthManager, SessionGuard } from 'speexjs/server/auth'

const auth = new AuthManager()
const guard = new SessionGuard({
  cookieName: 'myapp_session',
  lifetime: 120, // minutes
  provider: {
    findById: async (id) => User.find(id),
    findByCredential: async (field, value) => {
      return db.table('users').where(field, value).first()
    },
  },
})

auth.guard('web', guard)
auth.defaultGuard('web')
app.container.instance('auth', auth)
```

Protect routes with the auth middleware:

```typescript
import { auth } from 'speexjs'

app.group('/admin', (router) => {
  router.use(auth()) // all routes in group require auth
  router.get('/dashboard', (ctx) => ctx.response.json({ secret: 'data' }))
})
```

## Environment Variables

```typescript
import { env, requireEnv } from 'speexjs'

const port = env.int('PORT', 3000)
const debug = env.bool('DEBUG', false)
const allowed = env.array('ALLOWED_ORIGINS', ['http://localhost:3000'])

// Fail fast if required vars are missing
requireEnv('APP_KEY', 'DATABASE_URL')
```

## Deployment

### Docker

```bash
speexjs deploy --docker
```

This generates a `Dockerfile` and `docker-compose.yml`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/bootstrap.js"]
```

### Vercel

```bash
speexjs deploy --vercel
```

### Railway / Render / Fly.io

```bash
speexjs deploy --railway
speexjs deploy --render
speexjs deploy --flyio
```

### Production Checklist

1. Set `NODE_ENV=production`
2. Generate a secure `APP_KEY`: `speexjs env:generate`
3. Configure a production database connection
4. Enable Helmet middleware: `app.use(helmet())`
5. Set up rate limiting: `app.use(throttle(100, 60))`
6. Configure CORS for your frontend origin
7. Run migrations: `speexjs migrate`

```typescript
// bootstrap.ts — production example
import { speexjs, helmet, cors, throttle, loadConfig } from 'speexjs'

async function main() {
  const config = await loadConfig()
  const app = speexjs()

  // Security middleware
  app.use(helmet())
  app.use(cors({
    origin: config.app.env === 'production'
      ? 'https://myapp.com'
      : '*',
    credentials: true,
  }))
  app.use(throttle(100, 60)) // 100 requests per 60s

  // Routes
  app.get('/api/health', (ctx) => {
    ctx.response.json({ status: 'ok' })
  })

  // Start
  app.listen(config.app.port, () => {
    console.log(`✓ Server running on port ${config.app.port}`)
  })
}

main()
```

## Next Steps

- Read **GUIDE_API_REFERENCE.md** for the complete API documentation
- Read **GUIDE_DATABASE.md** for QueryBuilder, Model, and Migrations
- Read **GUIDE_AUTH.md** for authentication, authorization, and RBAC
- Read **GUIDE_CLI.md** for all 30+ CLI commands

```bash
speexjs --help
```
