# SpeexJS

**Fullstack TypeScript Framework — zero dependencies.**

```bash
npm install speexjs
```

## Quick Start

```typescript
import { speexjs } from 'speexjs/server'

const app = speexjs()

app.get('/', async ({ response }) => {
  return response.html('<h1>SpeexJS 🚀</h1>')
})

app.listen(3000)
```

```bash
npx speexjs serve
```

## Feature Overview

| Category | Features |
|----------|----------|
| **Server** | Router, Middleware (10 built-in), Controller, DI Container, Laravel-like API |
| **Database** | Query Builder, Migrations, Pagination, MySQL/SQLite/PostgreSQL |
| **Auth** | Session Guard, Token Guard, Gate Authorization, Encryption, Hashing |
| **Validation** | 25+ schema types, NIK/NPWP/Phone/Kodepos/Rupiah |
| **Client** | Signals, VDOM, JSX, SSR — no React dependency |
| **RPC** | Type-safe server-client communication |
| **CLI** | `speexjs init`, `serve`, `make:*`, `list-routes` |
| **Zero Dep** | 100% native Node.js — zero external dependencies |

## Examples

### Routing

```typescript
import { speexjs, Controller, get, post, controller } from 'speexjs/server'

const app = speexjs()

// Route groups with middleware
app.group('/api', (router) => {
  router.get('/users', [UserController, 'index'])
  router.post('/users', [UserController, 'store'])
}).middleware(['auth', 'throttle'])

// Resource routes
app.router.resource('/posts', PostController)
// GET /posts, POST /posts, GET /posts/:id, PUT /posts/:id, DELETE /posts/:id
```

### Validation

```typescript
import { s } from 'speexjs/schema'

const UserSchema = s.object({
  name: s.string().min(3).max(100),
  email: s.string().email(),
  age: s.number().min(17).max(120).optional(),
  phone: s.phone(),      // Nomor Indonesia
  nik: s.nik().optional(), // NIK 16 digit
})

type User = s.Infer<typeof UserSchema>
```

### Database

```typescript
import { DatabaseConnection } from 'speexjs/server/database'

const db = new DatabaseConnection({ driver: 'mysql', database: 'myapp' })
await db.connect()

const users = await db.table('users')
  .select('id', 'name', 'email')
  .where('age', '>', 18)
  .orderByDesc('created_at')
  .paginate(10, 1)
```

### Auth

```typescript
import { AuthManager, SessionGuard } from 'speexjs/server/auth'

const auth = new AuthManager()
auth.guard('session', new SessionGuard({ table: 'users' }))

app.post('/login', async ({ request, response }) => {
  const { email, password } = await request.json()
  const ok = await auth.guard('session').attempt({ email, password })
  if (!ok) return response.json({ error: 'Login gagal' }, 401)
  return response.json({ message: 'Login berhasil' })
})
```

### CLI

```bash
speexjs init my-app        # Buat project baru
speexjs serve              # Jalankan dev server
speexjs make:controller User  # Generate controller
speexjs make:middleware Auth   # Generate middleware
speexjs list-routes           # Lihat semua route
```

## Architecture

```
speexjs/
├── server/     (HTTP, Router, Middleware, Auth, Database, Cache, Storage, Events)
├── client/     (Signals, VDOM, SSR, JSX)
├── schema/     (25+ validation types)
├── rpc/        (Type-safe RPC)
└── cli/        (speexjs init, serve, make:*)
```

## License

MIT
