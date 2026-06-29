# SpeexJS

**Fullstack TypeScript Framework — Zero dependencies. 68 KB. 250+ features.**

```bash
npm install speexjs
```

> v1.4.0 • 68 KB • 1,990 tests • 96.3% coverage • Zero deps

## Quick Start

```bash
npx speexjs init my-app
cd my-app
npm run dev
```

## Features (250+)

### Core
- HTTP Server, Router (groups, named, resource), Middleware Pipeline (13 built-in)
- DI Container, Config Manager, Plugin System, Graceful Shutdown
- Error Handling (12 HttpException classes, global handler, 404 handler)

### Database & ORM
- Query Builder (30+ methods), Migrations, Seeders, Pagination (offset + cursor)
- 3 dialects: MySQL (pool), PostgreSQL (pool), SQLite
- Active Record Model with 6 relations (hasOne, hasMany, belongsTo, belongsToMany, morphMany, morphOne)
- Eager loading, Soft deletes, Model factories, Accessors/Mutators
- CTE/WITH, UPSERT, UNION/INTERSECT, LOCKING (FOR UPDATE/SHARE)

### Auth & Security
- Session Guard (cookie + DB store), Token Guard (salted hash)
- OAuth2 + Socialite (GitHub, Google), Sanctum SPA Auth
- Gate/Authorization, Rate Limiting (memory + DB), CSRF, CORS, Helmet
- Signed URLs, Maintenance Mode

### Validation
- 25+ schema types (Zod-compatible), Transform, Coerce, Refine, Branded types
- Type inference with `Infer<T>`, Request validation middleware

### Enterprise
- WebSocket Broadcasting (native + Pusher/Ably)
- Queue/Jobs (in-memory + Redis + SQLite driver + Monitor)
- Mail (Console + SMTP + Nodemailer)
- Task Scheduling (cron), Notifications, HTTP Client
- Clustering, GraphQL, OpenAPI Generator
- SSE (Server-Sent Events), Configurable body limit, Signed cookies
- Redis cache store, S3 storage adapter

### Developer Experience
- CLI: init (4 templates), make:* (10 commands), serve, list-routes, tinker, migrate:status, env validation
- TSX View Engine (`.tsx` pages with JSX, no React needed)
- Debug Toolbar, Feature Flags, Task Runner, Cashier Billing
- Testing Helpers (TestRequest, RefreshDatabase)
- Benchmarks (mitata)

## Quick Examples

### Route with Controller
```typescript
import { Controller, get } from 'speexjs/server'

export class UserController extends Controller {
  @get('/users')
  async index({ response }) {
    return response.json({ data: await User.all() })
  }
}
```

### Validation
```typescript
import { schema } from 'speexjs/schema'

const UserSchema = schema.object({
  name: schema.string().min(3),
  email: schema.string().email(),
  age: schema.number().min(18),
})
```

### TSX Page
```typescript
import type { VNode } from 'speexjs/client/vdom'

export default function Home({ name }: { name?: string }): VNode {
  return <html><body><h1>Hello {name}!</h1></body></html>
}
```

## Benchmarks vs Competitors

| | SpeexJS | Hono | Fastify | Express |
|---|---|---|---|---|
| Bundle size | **68 KB** | 50 KB | 1 MB | 2 MB |
| Dependencies | **Zero** | Zero | 30+ | 40+ |
| Features | **250+** | 10+ | 15+ | 20+ |
| Tests | **1,990** | ~500 | ~800 | ~1,000 |
| Coverage | **96.3%** | ~75% | ~80% | ~70% |

## CLI

| Command | Description |
|---|---|
| `speexjs init` | Create new project (4 templates) |
| `speexjs serve` | Start dev server |
| `speexjs make:controller` | Generate controller |
| `speexjs make:model` | Generate model |
| `speexjs make:migration` | Generate migration |
| `speexjs make:middleware` | Generate middleware |
| `speexjs make:schema` | Generate schema |
| `speexjs make:resource` | Generate API resource |
| `speexjs make:admin` | Generate admin pages |
| `speexjs list-routes` | Display all routes |
| `speexjs tinker` | Interactive REPL |

## Production Ready

| Metric | Value |
|--------|-------|
| TypeScript errors | **0** (`tsc --noEmit`) |
| Gaps closed | **229+** |
| Test coverage | **96.3%** |

## License

MIT
