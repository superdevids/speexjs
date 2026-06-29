# SpeexJS

**Fullstack TypeScript Framework — Build web apps fast. Zero dependencies in production.**

```bash
npm install speexjs
```

> v0.6.0 • 67 KB • 1,849 tests • 49 features • Zero deps

## Quick Start

```bash
npx speexjs init my-app
cd my-app
npm install
npm run dev
```

Or manually:

```typescript
import { speexjs } from 'speexjs/server'

const app = speexjs()
app.get('/', ({ response }) => response.html('<h1>SpeexJS 🚀</h1>'))
app.listen(3000)
```

## Why SpeexJS?

| | SpeexJS | AdonisJS | NestJS | Hono |
|---|---|---|---|---|
| **Package size** | **67 KB** | ~5 MB | ~10 MB | ~50 KB |
| **Dependencies** | **Zero** (tsx for dev) | Many | Many | Zero |
| **Test coverage** | **96.9%** | ~70% | ~80% | ~60% |
| **Features** | **49** all-in-one | 55+ | 40+ | 10+ |
| **Fullstack** | Server + Client | Server only | Server only | Server only |

## Features (49 total)

### 🖥️ Server
- HTTP Router with groups, resources, named routes, middleware
- **12 HTTP Exception classes** + global error handler
- Middleware pipeline: CORS, CSRF, Session, Auth, Throttle, Logger, Helmet, Compress, Static, Validate
- **Plugin system** with lifecycle hooks
- **Graceful shutdown** (SIGINT/SIGTERM)
- **Clustering** — multi-core support

### 🗄️ Database
- **Query Builder** — chainable, 30+ methods
- **Migrations** + **Seeders** + **Schema Builder**
- **3 dialects**: MySQL (pool), PostgreSQL (pool), SQLite
- **ORM Model** with Active Record pattern
- **6 relation types**: hasOne, hasMany, belongsTo, belongsToMany, morphMany, morphTo
- **Eager loading** — `.with()` relations
- **Pagination** — offset + cursor-based
- **Soft deletes**, **Model factories**

### 🔐 Auth
- **Session Guard** — cookie-based + database store
- **Token Guard** — API tokens with salted hashing
- **OAuth2** — pluggable provider pattern
- **Gate / Authorization** — policies, abilities
- **Rate limiting** — memory + database store

### ✅ Validation
- **25+ schema types** — Zod-compatible API
- Type inference with `Infer<typeof schema>`
- Transform, coerce, refine pipelines
- i18n error messages (English)

### 🔄 Real-time
- **WebSocket broadcasting** — channel-based pub/sub
- **RPC** — type-safe server-client communication

### 📧 Enterprise
- **Queue / Jobs** — in-memory with handler system
- **Mail** — pluggable transports + templates
- **Task Scheduling** — cron-style
- **Notifications** — database-backed
- **HTTP Client** — fetch wrapper with timeout

### 🛠️ CLI
| Command | Description |
|---|---|
| `speexjs init` | Create new project (4 templates) |
| `speexjs serve` | Development server |
| `speexjs make:controller` | Generate controller |
| `speexjs make:model` | Generate model |
| `speexjs make:migration` | Generate migration |
| `speexjs make:middleware` | Generate middleware |
| `speexjs make:schema` | Generate schema |
| `speexjs list-routes` | Display all routes |

### 📦 Bundle Optimized
- **67 KB** compressed (was 433 KB — **84% smaller**)
- Code splitting + tree shaking + minification
- Zero runtime dependencies

## Examples

### Validation
```typescript
import { schema } from 'speexjs/schema'

const UserSchema = schema.object({
  name: schema.string().min(3),
  email: schema.string().email(),
  age: schema.number().min(18).optional(),
})

const user = UserSchema.parse({ name: 'John', email: 'john@test.com', age: 25 })
```

### Controller with Decorators
```typescript
import { Controller, get, post } from 'speexjs/server'

export class UserController extends Controller {
  @get('/users')
  async index({ response }) {
    return response.json({ data: await User.all() })
  }

  @post('/users')
  async store({ request, response }) {
    const data = await request.json()
    const user = await User.create(data)
    return response.json({ data: user }, 201)
  }
}
```

### WebSocket Broadcasting
```typescript
import { WsBroadcaster } from 'speexjs/server/websocket'

const ws = new WsBroadcaster()
ws.attach(server)

// Broadcast to channel
ws.broadcast('chat:room1', 'message', { text: 'Hello!' })
```

### Queue
```typescript
import { Queue } from 'speexjs/server/queue'

const queue = new Queue()
queue.register('send-email', async (payload) => {
  console.log('Sending email to:', payload)
})
queue.push('send-email', { to: 'user@test.com' })
```

## Documentation

Full documentation: [docs.speexjs.dev](https://docs.speexjs.dev) (coming soon)

## Benchmarks

```bash
# Run benchmarks locally
npx mitata benchmarks/index.bench.ts
```

## License

MIT
