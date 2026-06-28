# constx 🚀

**Fullstack JavaScript/TypeScript Framework — Server + Client + RPC + Schema + Database + Auth**
**🇮🇩 Indonesia First, Built for the World**

```bash
npm install constx
```

> Zero external dependencies. Only Node.js built-in modules.

---

## 📦 Kenapa constx?

| Masalah | Solusi constx |
|---------|---------------|
| Next.js terlalu berat & vendor lock-in | constx ringan, zero-dep, engine-swappable |
| Express terlalu minimalis | constx Laravel-like: routing, middleware, controller, DI, ORM |
| Laravel pakai PHP | constx TypeScript native, end-to-end type safe |
| Fetch API ribet | SuperRequest/SuperResponse wrapper sendiri — lebih mudah |
| Framework asing untuk Indonesia | 🇮🇩 NIK, NPWP, Phone, Rupiah, terbilang built-in |
| React/Vue dependency berat | Signal-based VDOM sendiri — ringan, cepat |

---

## ✨ Fitur Lengkap

### 🔴 Server (Laravel-like, TypeScript Native)

| Modul | Fitur |
|-------|-------|
| **Routing** | `get()`, `post()`, `put()`, `patch()`, `delete()`, `resource()`, `group()`, named routes |
| **Middleware** | CORS, CSRF, Auth, Throttle, Session, Helmet, Logger, Body Parser, Compress, Static Files |
| **Controller** | Base class + `@controller`/`@get`/`@post` decorators |
| **Container (DI)** | `bind()`, `singleton()`, `instance()`, `resolve()` |
| **HTTP** | SuperRequest + SuperResponse **(BUKAN Fetch API)** — `.json()`, `.html()`, `.redirect()`, `.stream()`, `.file()` |
| **Engine** | Node.js default, bisa ganti ke Bun/Deno via `app.setEngine()` |
| **Validation** | 25+ schema types + 🇮🇩 NIK, NPWP, Phone, Kodepos, Rekening |
| **Error Handling** | `TypedError`, HTTP status codes, exception handler |
| **Logging** | Structured logger — WIB/WITA/WIT timezone |

### 🟡 Auth & Security

| Modul | Fitur |
|-------|-------|
| **Session Guard** | Login/logout via encrypted cookies (AES-256-GCM) |
| **Token Guard** | Bearer token authentication, abilities/permissions |
| **Gate** | Authorization policies — `Gate.define()`, `Gate.allows()` |
| **Middleware** | `authMiddleware()`, `guestMiddleware()`, `authorize()` |
| **Encryption** | AES-256-GCM encrypt/decrypt — Node.js `crypto` native |
| **Hashing** | scrypt (OWASP recommended) + PBKDF2 |

### 🟡 Database

| Modul | Fitur |
|-------|-------|
| **Query Builder** | Laravel-like chain: `.select()`, `.where()`, `.join()`, `.orderBy()` |
| **Pagination** | `.paginate(perPage)` — built-in di Query Builder |
| **Migrations** | `SchemaBuilder`, `TableBlueprint` (30+ column types) |
| **Seeding** | `Seeder` class — insert/truncate data awal |
| **Drivers** | MySQL (default), SQLite, PostgreSQL — runtime dynamic import |

### 🎨 Client (Signal-Based VDOM)

| Modul | Fitur |
|-------|-------|
| **Signals** | `signal()`, `computed()`, `effect()`, `batch()`, `untracked()` |
| **VDOM** | `h()`, `render()`, `patch()`, `hydrate()` — Virtual DOM sendiri |
| **SSR** | `renderToString()`, `renderToStream()`, `ServerRenderer` |
| **JSX** | Full JSX support via `jsxImportSource: \"@ConstX/vdom\"` |
| **Router** | File-based routing, guards, reactive current/params/query |
| **Adapters** | `FrameworkAdapter` interface — React/Vue integration |

### 🔗 RPC (Type-Safe)

| Modul | Fitur |
|-------|-------|
| **Server** | `rpc.create()` — definisi procedure + schema validation |
| **Client** | `createClient()` — auto-typed queries & mutations |
| **Batch** | Multiple procedures in one request |

### 🛠️ CLI (Zero Dependencies)

| Perintah | Fungsi |
|----------|--------|
| `constx init [name]` | Scaffold project baru (blank/fullstack/api-only) |
| `constx make:controller <name>` | Generate controller |
| `constx make:middleware <name>` | Generate middleware |
| `constx make:schema <name>` | Generate schema |
| `constx list-routes` | Lihat semua route yang terdaftar |
| `constx serve` | Jalankan development server |

---

## 🚀 Quickstart

### 1. Install

```bash
npm install constx
```

### 2. Buat File Server

```typescript
// src/index.ts
import { constx } from 'constx/server'

const app = constx()

app.get('/', async ({ response }) => {
  return response.html('<h1>constx 🚀</h1>')
})

app.get('/api/hello', async ({ response }) => {
  return response.json({ message: 'Halo Dunia!' })
})

app.listen(3000, () => console.log('constx running on http://localhost:3000'))
```

### 3. Jalankan

```bash
npx constx serve
# atau
node --loader ts-node src/index.ts
```

---

## 📖 Dokumentasi Lengkap

### Server Routing

```typescript
import { constx } from 'constx/server'

const app = constx()

// Basic routes
app.get('/users', handler)
app.post('/users', handler)
app.put('/users/:id', handler)
app.delete('/users/:id', handler)
app.patch('/users/:id', handler)

// Route groups
app.group('/api', (router) => {
  router.get('/users', [UserController, 'index'])
  router.post('/users', [UserController, 'store'])
}).middleware(['auth', 'throttle'])

// Resource routes
app.router.resource('/posts', PostController)
// GET    /posts       → index
// GET    /posts/create → create
// POST   /posts       → store
// GET    /posts/:id   → show
// GET    /posts/:id/edit → edit
// PUT    /posts/:id   → update
// DELETE /posts/:id   → destroy

// Named routes
app.get('/users/:id', handler).name('users.show')
// app.router.route('users.show', { id: 5 }) → '/users/5'
```

### Controller

```typescript
import { Controller, get, post, put, del } from 'constx/server'

@controller('/api/users')
export class UserController extends Controller {
  @get('/')
  async index({ response }) {
    const users = await UserService.all()
    return response.json(users)
  }

  @post('/')
  async store({ request, response }) {
    const data = await request.validate(CreateUserSchema)
    const user = await UserService.create(data)
    return response.json(user, 201)
  }

  @get('/:id')
  async show({ params, response }) {
    const user = await UserService.findOrFail(params.id)
    return response.json(user)
  }

  @put('/:id')
  async update({ params, request, response }) {
    const data = await request.validate(UpdateUserSchema)
    const user = await UserService.update(params.id, data)
    return response.json(user)
  }

  @del('/:id')
  async destroy({ params, response }) {
    await UserService.delete(params.id)
    return response.noContent()
  }
}
```

### Schema Validation

```typescript
import { s } from 'constx/schema'

// Buat schema
const UserSchema = s.object({
  id: s.number(),
  name: s.string().min(3).max(100),
  email: s.string().email(),
  age: s.number().min(17).max(120).optional(),
  phone: s.phone(),              // 🇮🇩 Nomor Indonesia
  nik: s.nik().optional(),        // 🇮🇩 NIK 16 digit
  npwp: s.npwp().optional(),      // 🇮🇩 NPWP
})

// Type inference
type User = s.Infer<typeof UserSchema>

// Parse & validate
const result = UserSchema.safeParse(input)
if (!result.success) {
  console.log(result.error)  // Pesan error Bahasa Indonesia
}
```

### Database Query Builder

```typescript
import { DatabaseConnection } from 'constx/server/database'

const db = new DatabaseConnection({
  driver: 'mysql',        // mysql | sqlite | postgresql
  host: 'localhost',
  database: 'myapp',
  username: 'root',
  password: 'secret',
})

await db.connect()

// Query dengan chaining
const users = await db.table('users')
  .select('id', 'name', 'email')
  .where('age', '>', 18)
  .whereLike('name', '%john%')
  .orderByDesc('created_at')
  .limit(10)
  .get()

// Pagination
const result = await db.table('posts')
  .where('published', true)
  .paginate(15, 1)
// result.data, result.total, result.lastPage, ...

// Insert
const id = await db.table('users').insert({
  name: 'John',
  email: 'john@test.com',
})

// Update
await db.table('users')
  .where('id', 1)
  .update({ name: 'John Doe' })

// Raw SQL
const result = await db.raw('SELECT * FROM users WHERE age > ?', [18])
```

### Authentication

```typescript
import { constx } from 'constx/server'
import { AuthManager, SessionGuard } from 'constx/server/auth'

const app = constx()

// Setup auth
const auth = new AuthManager()
auth.guard('session', new SessionGuard({
  table: 'users',
  cookieName: 'constx_session',
}))

// Login route
app.post('/login', async ({ request, response }) => {
  const { email, password } = await request.json()
  const authenticated = await auth.guard('session').attempt({ email, password })
  
  if (!authenticated) {
    return response.json({ error: 'Login gagal' }, 401)
  }
  return response.json({ message: 'Login berhasil' })
})

// Protected route
app.get('/profile', async ({ response }, next) => {
  const user = await auth.guard('session').user()
  return response.json(user)
}).middleware(['auth'])

// Authorization Gate
import { Gate } from 'constx/server/gate'

const gate = new Gate()
gate.define('update-post', (user, post) => user.id === post.user_id)

app.put('/posts/:id', async ({ params, response }) => {
  const post = await Post.find(params.id)
  await gate.authorize('update-post', currentUser, post)
  // ...
})
```

### Client — Signals + VDOM

```typescript
import { signal, computed, effect, h, render } from 'constx/client'

function Counter() {
  const count = signal(0)
  const doubled = computed(() => count.value * 2)

  effect(() => console.log('Count:', count.value))

  return h('div', { class: 'counter' },
    h('p', {}, `Count: ${count.value}`),
    h('p', {}, `Doubled: ${doubled.value}`),
    h('button', { onClick: () => count.value++ }, '+'),
    h('button', { onClick: () => count.value-- }, '-'),
  )
}

// Mount ke DOM
render(h(Counter), document.getElementById('root')!)
```

Dengan JSX (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@ConstX/vdom"
  }
}
```

```tsx
function Counter() {
  const count = signal(0)
  return (
    <div class="counter">
      <p>Count: {count}</p>
      <button onClick={() => count.value++}>+</button>
    </div>
  )
}
```

### Cache

```typescript
import { Cache } from 'constx/server/cache'

const cache = new Cache({ store: 'memory', ttl: 3600 })

// Set & Get
await cache.set('user:1', { name: 'John' })
const user = await cache.get('user:1')  // { name: 'John' }

// Remember (get or set)
const data = await cache.remember('expensive:data', 300, async () => {
  return await fetchExpensiveData()
})

// Increment/Decrement
await cache.increment('visits')
```

### File Storage

```typescript
import { createStorage } from 'constx/server/storage'

const storage = createStorage({
  defaultDisk: 'local',
  disks: {
    local: { driver: 'local', root: './storage' },
    public: { driver: 'local', root: './public/uploads', url: '/uploads' },
  },
})

// Upload file
await storage.disk('public').put('images/photo.jpg', buffer)

// Get file URL
const url = storage.disk('public').url('images/photo.jpg')

// Check exists
const exists = await storage.exists('images/photo.jpg')
```

### Events

```typescript
import { event } from 'constx/server/events'

// Listen
event.on('user.registered', async (user) => {
  await sendWelcomeEmail(user)
})

// Wildcard pattern
event.onPattern('user.*', async (eventName, data) => {
  console.log(`User event: ${eventName}`, data)
})

// Emit
await event.emit('user.registered', { id: 1, email: 'john@test.com' })
```

### RPC (Type-Safe)

```typescript
// === SERVER ===
import { constx } from 'constx/server'
import { rpc } from 'constx/rpc'
import { s } from 'constx/schema'

const api = rpc.create({
  procedures: {
    'users.list': {
      input: s.object({ page: s.number().default(1) }),
      output: s.array(s.object({ id: s.number(), name: s.string() })),
      handler: async ({ page }, ctx) => {
        return await db.table('users').paginate(10, page).data
      },
    },
    'echo': {
      input: s.object({ message: s.string() }),
      output: s.object({ reply: s.string() }),
      handler: async ({ message }) => ({ reply: `You said: ${message}` }),
    },
  },
})

const app = constx()
app.post('/api/rpc', api.toHandler())
app.listen(3000)

// === CLIENT ===
import { createClient } from 'constx/rpc'

const client = createClient({ baseUrl: 'http://localhost:3000/api' })
const users = await client.call('users.list', { page: 1 })
// users typed as { id: number, name: string }[]
```

---

## 🇮🇩 Fitur Indonesia

| Fitur | Keterangan |
|-------|-----------|
| `s.nik()` | Validasi NIK 16 digit + tanggal lahir |
| `s.npwp()` | Validasi NPWP + checksum |
| `s.phone()` | Validasi nomor telepon Indonesia (+62, 08xx) |
| `s.kodepos()` | Validasi kode pos 5 digit |
| `s.rekening()` | Validasi nomor rekening bank |
| `s.alamat()` | Validasi alamat Indonesia |
| `Number.formatRupiah()` | Format mata uang Rupiah |
| `Number.terbilang()` | Angka ke kata Bahasa Indonesia |
| **Logger** | Timezone WIB/WITA/WIT |
| **Error messages** | Bahasa Indonesia default |
| **CLI** | Output dengan Bahasa Indonesia |

---

## 🏗️ Arsitektur

```
constx/
├── src/
│   ├── index.ts              # Barrel export
│   ├── native/               # Zero-dep utilities
│   ├── schema/               # Validation (25+ types)
│   ├── server/
│   │   ├── http/             # SuperRequest/SuperResponse
│   │   ├── router/           # Routing engine
│   │   ├── middleware/        # 10 built-in middleware
│   │   ├── controller/       # Base controller
│   │   ├── container/        # Dependency injection
│   │   ├── engine/           # Swappable engine
│   │   ├── auth/             # Session + Token guards
│   │   ├── gate/             # Authorization
│   │   ├── cache/            # Caching system
│   │   ├── storage/          # File storage
│   │   ├── events/           # Event system
│   │   └── database/         # Query Builder + Migrations
│   ├── client/               # Signals + VDOM + SSR
│   ├── rpc/                  # Type-safe RPC
│   └── cli/                  # Native CLI (zero dep)
└── tests/
```

---

## 📋 Perbandingan dengan Framework Lain

| Fitur | constx | Next.js | Express | AdonisJS | Laravel |
|-------|---------|---------|---------|----------|---------|
| Bahasa | TS/JS | TS/JS | JS | TS/JS | PHP |
| Dependencies | **0** | Ratusan | Puluhan | Puluhan | Ratusan |
| File size | ~175KB | >50MB | ~500KB | >10MB | >20MB |
| Routing | ✅ Laravel-like | ✅ File-based | ❌ Manual | ✅ Programmatic | ✅ Laravel |
| Database | ✅ Query Builder | ❌ Prisma | ❌ None | ✅ Lucid ORM | ✅ Eloquent |
| Auth | ✅ Session+Token | ✅ NextAuth | ❌ Manual | ✅ Built-in | ✅ Built-in |
| Validation | ✅ Schema (25+) | ✅ Zod | ❌ Manual | ✅ Vine | ✅ Form Request |
| VDOM/Signals | ✅ Built-in | ✅ React | ❌ | ❌ Edge | ❌ Blade |
| RPC | ✅ Type-safe | ❌ Server Actions | ❌ | ✅ Tuyau | ❌ |
| 🇮🇩 Indonesia | ✅ Built-in | ❌ | ❌ | ❌ | ❌ |

---

## 🗺️ Roadmap

| Version | Fitur |
|---------|-------|
| **v0.1.0** | ✅ Schema, Server (HTTP+Router+Middleware+Controller), Client (Signals+VDOM), RPC, CLI (commander) |
| **v0.2.0** | ✅ Zero dependencies, Native CLI, Auth (Session+Token), Gate, Database (Query Builder+Migrations+Pagination), Cache, Storage, Events, Encryption, Hashing, Helpers |
| **v0.3.0** | 🔜 File-based routing, Server Components, ORM, Queues |
| **v1.0.0** | 🔜 Adapter React/Vue, Dokumentasi lengkap, Publikasi global |

---

## ⚖️ License

MIT — bebas digunakan, dimodifikasi, dan didistribusikan.

---

**constx — Fullstack JavaScript/TypeScript Framework**
**🇮🇩 Dibuat oleh developer Indonesia, untuk developer dunia.**
