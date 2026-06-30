# Architecture — SpeexJS Web Framework

> **Package:** speexjs · **Version:** 2.1.1 · **Zero Dependencies**
> **Last Updated:** 2026-06-30

---

## Table of Contents

1. [Overview](#1-overview)
2. [Source Layout](#2-source-layout)
3. [Request Lifecycle](#3-request-lifecycle)
4. [Server Engine](#4-server-engine)
5. [Routing System](#5-routing-system)
6. [Middleware Pipeline](#6-middleware-pipeline)
7. [Database & ORM](#7-database--orm)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Schema & Validation](#9-schema--validation)
10. [Client-Side (Signals & VDOM)](#10-client-side-signals--vdom)
11. [CLI Architecture](#11-cli-architecture)
12. [Build Configuration](#12-build-configuration)
13. [Testing Strategy](#13-testing-strategy)
14. [Key Design Decisions](#14-key-design-decisions)

---

## 1. Overview

SpeexJS is a **zero-dependency fullstack TypeScript web framework** that provides everything needed to build and ship modern web applications — HTTP server, router, middleware pipeline, database ORM, authentication, validation, CLI, queues, mail, WebSocket, and client-side rendering.

The framework is designed with a **Laravel-inspired architecture** adapted for TypeScript: a powerful CLI for scaffolding, an expressive ORM with Active Record, a chainable query builder, and convention-over-configuration patterns.

---

## 2. Source Layout

```
speexjs/
├── src/
│   ├── index.ts              # Barrel — re-exports all modules
│   ├── cli/                  # CLI commands
│   │   ├── index.ts          #   Command registry
│   │   └── commands/         #   Individual command implementations
│   │       ├── serve.ts      #     Dev server (hot-reload via tsx)
│   │       ├── init.ts       #     Project scaffolding
│   │       └── make-*.ts     #     Code generators
│   │
│   ├── server/               # Server-side framework (bulk of code)
│   │   ├── index.ts          #   SuperApp (main application class)
│   │   ├── engine/           #   HTTP engine (Node, HTTPS, Edge)
│   │   ├── http/             #   Request/Response/Cookies/Headers
│   │   ├── router/           #   URL matching, groups, resources
│   │   ├── middleware/       #   Built-in middleware (15+)
│   │   ├── controller/       #   Base controller + decorators
│   │   ├── container/        #   DI Container / Service Provider
│   │   ├── database/         #   QueryBuilder, ORM, Migrations
│   │   ├── auth/             #   Authentication guards
│   │   ├── gate/             #   Authorization / Policies
│   │   ├── cache/            #   Cache stores (Memory, File, Redis)
│   │   ├── storage/          #   File storage (Local, S3)
│   │   ├── queue/            #   Job queue (Memory, Redis, SQLite)
│   │   ├── mail/             #   Mail transports (Console, SMTP)
│   │   ├── websocket/        #   WebSocket + broadcasting
│   │   ├── view/             #   TSX View Engine
│   │   ├── schedule/         #   Cron-style task scheduler
│   │   ├── events/           #   Event system
│   │   ├── notifications/    #   Notification system
│   │   ├── graphql/          #   GraphQL support
│   │   ├── openapi/          #   OpenAPI spec generation
│   │   ├── billing/          #   Cashier billing
│   │   ├── flags/            #   Feature flags
│   │   ├── testing/          #   HTTP test helpers
│   │   ├── i18n/             #   Internationalization
│   │   ├── search/           #   Full-text search
│   │   ├── observability/    #   Metrics, Tracing, N+1 Detection
│   │   ├── profiler/         #   Route performance profiling
│   │   ├── audit/            #   Audit logging
│   │   ├── webhook/          #   Webhook system
│   │   ├── devtools/          #   DevTools Dashboard (SSE, query inspect, cache, routes, queue, env)
│   │   ├── isr/              #   Incremental Static Regeneration
│   │   ├── actions/          #   Form action handling
│   │   ├── tasks/            #   Task runner
│   │   ├── database-mesh/    #   SQL/CSV/REST data sources
│   │   ├── experiments/      #   A/B experiments
│   │   ├── cluster/          #   Multi-core clustering
│   │   ├── edge/             #   Edge runtime support
│   │   ├── health/           #   Health check endpoint
│   │   └── ...               #   ~40+ server submodules
│   │
│   ├── client/               # Client-side framework
│   │   ├── signals/          #   Reactive signals (signal/computed/effect)
│   │   ├── vdom/             #   Virtual DOM (h/render/patch/hydrate)
│   │   ├── render/           #   SSR + Server Components
│   │   └── router.ts         #   Client-side router
│   │
│   ├── schema/               # Validation system
│   │   ├── types.ts          #   Base Schema class
│   │   ├── primitives.ts     #   String, Number, Boolean, etc.
│   │   ├── complex.ts        #   Object, Array, Union, Intersection
│   │   └── transform.ts      #   Coerce, Transform, Refine
│   │
│   ├── rpc/                  # Type-safe RPC
│   │   ├── server.ts         #   RPC server (HTTP + WebSocket)
│   │   └── client.ts         #   RPC client with type inference
│   │
│   ├── native/               # Zero-dep core helpers
│   │   ├── colors.ts         #   Terminal colors
│   │   ├── logger.ts         #   Logger
│   │   └── crypto.ts         #   Encryption, hashing
│   │
│   └── [deprecated]          # Removed in v1.5.x: templates/pages/
│
├── tests/                    # Test files
│   ├── server.test.ts        #   Server integration (221 tests)
│   ├── client.test.ts        #   Client VDOM/Signals (193 tests)
│   ├── schema.test.ts        #   Validation (63 tests)
│   ├── database.test.ts      #   QueryBuilder/ORM (182 tests)
│   ├── database-advanced.test.ts  #   Advanced DB features (176 tests)
│   ├── auth.test.ts          #   Auth guards (103 tests)
│   ├── http-advanced.test.ts #   HTTP edge cases (49 tests)
│   ├── rpc.test.ts           #   RPC (51 tests)
│   ├── cli.test.ts           #   CLI commands (79 tests)
│   ├── native.test.ts        #   Native helpers (316 tests)
│   └── coverage-gaps.test.ts #   Coverage boost (554 tests)
│
├── benchmarks/
│   └── index.bench.ts        # Performance benchmarks (mitata)
│
├── dist/                     # Build output (gitignored)
├── tsup.config.ts            # Build config
├── vitest.config.ts          # Test config
└── package.json              # Package manifest
```

---

## 3. Request Lifecycle

Every HTTP request follows this pipeline through the framework:

```
INCOMING HTTP REQUEST
        │
        ▼
┌────────────────────────────────┐
│  Engine (NodeEngine)           │
│  • Parses raw HTTP             │
│  • Creates SuperRequest/Response│
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  SuperApp.handleRequest()      │
│  • Entry point for all requests│
│  • try/catch wraps entire flow │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  Global Middleware Pipeline    │
│  (runs in order of registration)│
│                                │
│  1. CORS                       │
│  2. Helmet (security headers)  │
│  3. Maintenance Mode Check     │
│  4. Session (cookie decrypt)   │
│  5. CSRF Protection            │
│  6. Auth Guard (if global)     │
│  7. Throttle / Rate Limiter    │
│  8. Logger                     │
│  9. Body Parser (JSON/URL/RAW) │
│  10. Signed URL Verification   │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  Router.match(HTTP method, URL)│
│  • Path-to-regex matching      │
│  • Route groups prefix         │
│  • Named routes                │
│  • Middleware chain per-route   │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  Route Middleware Pipeline     │
│  (specific to matched route)   │
│  • Auth (if per-route)         │
│  • Validation (body/query)     │
│  • Custom middlewares          │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  Controller Action / Handler   │
│  • Receives context (req, res) │
│  • Business logic executes     │
│  • Returns response            │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  Response Sent                 │
│  • JSON / HTML / Stream        │
│  • Redirect / File             │
│  • Headers flushed             │
└────────────────────────────────┘
```

### Error Handling Flow

```
Any throw in pipeline
        │
        ▼
┌──────────────────────────────┐
│  onErrorHandler (if set)     │
│  • HTTP Exception → status   │
│  • Generic Error → 500       │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Fallback (if no handler)    │
│  • Throws unhandled rejection│
│  • Global process.on('...')  │
└──────────────────────────────┘
```

---

## 4. Server Engine

The engine layer abstracts the underlying HTTP server:

```
Engine (abstract)
├── NodeEngine        # http.createServer() - default
├── HttpsEngine       # https.createServer() - SSL
└── EdgeEngine        # Web standard Request/Response (future)
```

**Responsibilities:**
- Accept raw HTTP connections
- Create `SuperRequest` from `IncomingMessage`
- Create `SuperResponse` wrapper around `ServerResponse`
- Delegate to `SuperApp.handleRequest()`
- Graceful shutdown on `SIGTERM`/`SIGINT`

---

## 5. Routing System

### Route Registration

```typescript
// Route groups with prefix
app.group('/api', (router) => {
  router.get('/users', [UserController, 'index'])
  router.post('/users', [UserController, 'store'])
  router.resource('posts', PostController)  // RESTful resource
})

// Named routes
router.get('/users/:id', handler).name('users.show')

// File-based routing (future)
// pages/users/[id].tsx → /users/:id
```

### Matching Algorithm

1. **Compile** route patterns to regex (`path-to-regexp` style)
2. **Cache** compiled regex in `Map<pattern, RegExp>`
3. **Linear scan** registered routes (optimized for < 500 routes)
4. **Extract** named parameters from path
5. **Resolve** middleware chain for matched route

The resolver uses an **LRU cache** (max 1000 entries) to skip re-matching for frequently accessed routes.

---

## 6. Middleware Pipeline

### Architecture

```typescript
class Pipeline {
  middlewares: Middleware[]

  async run(ctx, final: () => Promise<void>): Promise<void> {
    let index = 0
    const next = async () => {
      if (index >= this.middlewares.length) return final()
      const middleware = this.middlewares[index++]
      await middleware(ctx, next)
    }
    await next()
  }
}
```

### Built-in Middleware (15+)

| Middleware | Purpose |
|-----------|---------|
| `cors()` | Cross-Origin Resource Sharing |
| `helmet()` | Security headers (CSP, HSTS, X-Frame-Options) |
| `csrf()` | CSRF token generation & validation |
| `session()` | Cookie-based session management (AES-256-GCM) |
| `auth()` | Authentication guard integration |
| `throttle()` | Rate limiting (memory + database store) |
| `logger()` | Request/response logging |
| `validate()` | Request body validation against schema |
| `validateQuery()` | Query parameter validation |
| `signedUrl()` | Signed URL verification |
| `maintenance()` | Maintenance mode check |
| `compress()` | Response compression |
| `staticFiles()` | Serve static assets |

---

## 7. Database & ORM

### Architecture Layers

```
┌──────────────────────────────────────────┐
│  Model (Active Record)                   │
│  • find(), all(), create(), update()     │
│  • Relations: hasOne, hasMany, belongsTo │
│  • Eager loading, soft deletes           │
│  • Accessors, mutators, scopes           │
├──────────────────────────────────────────┤
│  QueryBuilder (Fluent API)               │
│  • 30+ methods: where, join, groupBy     │
│  • Subqueries, CTE/WITH, UNION/INTERSECT │
│  • Pagination (offset + cursor)          │
│  • LOCKING (FOR UPDATE/SHARE)            │
│  • SQL result caching                     │
├──────────────────────────────────────────┤
│  Query Runner                            │
│  • Compiles QueryBuilder to SQL string   │
│  • Manages parameter bindings            │
│  • Dialect-aware identifier wrapping     │
├──────────────────────────────────────────┤
│  Connection & Driver                     │
│  • Connection pooling (MySQL/PostgreSQL) │
│  • Transaction management                │
│  • Migration runner                       │
├──────────────────────────────────────────┤
│  Dialects                                │
│  • MySQL (mysql2/promise)                │
│  • PostgreSQL (pg)                       │
│  • SQLite (better-sqlite3)               │
└──────────────────────────────────────────┘
```

### Query Builder Example

```typescript
const users = await db
  .from('users')
  .join('posts', 'users.id', '=', 'posts.user_id')
  .where('users.active', true)
  .whereIn('users.role', ['admin', 'editor'])
  .groupBy('users.id')
  .having('posts.count', '>', 5)
  .orderBy('users.name', 'asc')
  .limit(10)
  .offset(0)
  .get()
```

### Supported Relations

| Relation | Description |
|----------|-------------|
| `hasOne` | Parent has one child |
| `hasMany` | Parent has many children |
| `belongsTo` | Child belongs to parent |
| `belongsToMany` | Many-to-many (pivot table) |
| `morphOne` | Polymorphic one-to-one |
| `morphMany` | Polymorphic one-to-many |

### Query Builder 2.0

Introduced in v2.1.1, the Query Builder 2.0 layer adds advanced query capabilities:

- **Typed raw queries** — Execute raw SQL with type-safe parameter binding and result typing
- **Streaming** — Stream large result sets row-by-row without loading into memory (Node.js async iteration)
- **Query analysis** — `EXPLAIN` support to analyze query plans, identify missing indexes, and optimize slow queries
- **Batch insert/update** — Efficient bulk operations with chunked execution and transactional safety

---

## 8. Authentication & Authorization

### Guard Architecture

```
AuthManager
├── SessionGuard       # Cookie-based, AES-256-GCM encrypted
│   ├── login()        #   Creates session + cookie
│   ├── logout()       #   Destroys session
│   └── user()         #   Returns authenticated user
│
├── TokenGuard         # Bearer token, HMAC-SHA256 hashed
│   ├── login()        #   Generates API token
│   └── user()         #   Validates token → returns user
│
├── SanctumGuard       # SPA token auth (Laravel Sanctum-style)
│   ├── generateToken()
│   └── validateToken()
│
└── Socialite          # OAuth2 providers
    ├── GitHub
    └── Google
│
├── SamlGuard          # SAML2 SSO — AuthnRequest, Response parsing, RSA-SHA256
├── OidcGuard          # OpenID Connect — discovery, code exchange, JWT validation
├── MagicLinkAuth      # Passwordless — crypto tokens, configurable TTL
├── WebAuthn           # Passkeys — CBOR COSE, ES/RS verification
└── SessionManager     # Session management — list, revoke, bulk revoke
```

### Authorization (Gate)

```
Gate
├── define(name, callback)     # Define policy
├── allows(name, resource)     # Check permission
├── denies(name, resource)     # Check denial
└── before(callback)           # Global override
```

---

## 9. Schema & Validation

### Type Hierarchy

```
Schema<T> (abstract)
├── StringSchema       # .email(), .url(), .min(), .max(), .regex()
├── NumberSchema       # .min(), .max(), .integer(), .positive()
├── BooleanSchema      # .true(), .false()
├── DateSchema         # .min(), .max()
├── ArraySchema<T>     # .of(), .minLength(), .maxLength(), .unique()
├── ObjectSchema<T>    # .shape(), .partial(), .strict(), .passthrough()
├── TupleSchema<T>     # Fixed-length array with typed positions
├── UnionSchema<T>     # this.or(that) — discriminated union
├── IntersectionSchema # this.and(that)
├── LiteralSchema<T>   # Exact value match
├── EnumSchema<T>      # One of enum values
├── LazySchema<T>      # Recursive/circular types
├── PromiseSchema<T>   # Wraps async validation
├── RecordSchema<T>    # Key-value map validation
├── OptionalSchema<T>  # null/undefined allowed
├── NullableSchema<T>  # null allowed
├── Coerce*Schema      # Type coercion (string→number, etc.)
├── TransformSchema    # .transform(fn)
├── RefineSchema       # .refine(fn, message)
└── BrandSchema        # Branded types (Brand<T, B>)
```

### Validation Flow

```typescript
schema
  .safeParse(value)     // → { success, data?, error? }
  .parse(value)         // → T | throws SchemaError
  .validate(value)      // → ValidationResult (array of errors)
```

---

## 10. Client-Side (Signals & VDOM)

### Reactive System (Signals)

```typescript
import { signal, computed, effect } from 'speexjs/client/signals'

const count = signal(0)
const doubled = computed(() => count() * 2)

effect(() => console.log(`Count: ${count()}`))
// Auto-runs on every dependency change
```

### Virtual DOM

```typescript
import { h, render, hydrate } from 'speexjs/client/vdom'

// JSX (via TSX View Engine)
const vnode = <div class="container"><h1>Hello {name}!</h1></div>

// Server-side render
const html = renderToString(vnode)

// Client-side hydration
hydrate(vnode, document.getElementById('app'))
```

### Server Components

```typescript
const renderer = new ServerRenderer(baseDir)
await renderer.renderServerComponent('./pages/home', { user })
```

---

## 11. CLI Architecture

```
speexjs (bin)
├── init              # Scaffold new project (4 templates)
├── serve             # Start dev server with hot-reload
├── make:controller   # Generate controller file
├── make:model        # Generate model file
├── make:migration    # Generate migration file
├── make:middleware   # Generate middleware file
├── make:event        # Generate event class
├── make:job          # Generate job class
├── make:listener     # Generate event listener
├── make:notification # Generate notification class
├── make:policy       # Generate authorization policy
├── make:rule         # Generate validation rule
├── make:schema       # Generate schema file
├── make:resource     # Generate API resource
├── make:scope        # Generate query scope
├── make:test         # Generate test file
├── make:admin        # Generate admin pages
├── list-routes       # Display all registered routes
├── tinker            # Interactive TypeScript REPL
├── deploy            # Deploy to 5 platforms
├── generate:app      # Generate app from description
├── generate:sdk      # Generate TypeScript SDK
├── openapi:generate  # Generate OpenAPI spec
├── env:generate      # Generate typed env
├── env:check         # Validate env variables
├── schema:diff       # Compare models vs DB
├── schema:migrate    # Generate migration from diff
├── profile           # Profile route performance
├── cache:clear       # Clear all cache stores
├── cache:forget      # Remove specific cache key
├── db:seed           # Seed the database
├── db:wipe           # Drop all tables
├── key:generate      # Generate app encryption key
├── migrate:fresh     # Drop all tables and re-run migrations
├── migrate:refresh   # Rollback and re-run migrations
├── migrate:rollback  # Rollback the last migration batch
├── migrate:status    # Show migration status
├── queue:failed      # List failed queue jobs
├── queue:flush       # Delete all failed jobs
├── queue:listen      # Listen for queue jobs
├── queue:retry       # Retry a failed queue job
├── queue:work        # Process the next job on the queue
├── route:cache       # Cache registered routes
├── route:clear       # Clear cached routes
├── schedule:run      # Run scheduled tasks
├── storage:link      # Create storage symlink
├── plugin:install    # Install a plugin
├── plugin:list       # List installed plugins
├── plugin:search     # Search plugin marketplace
├── build:function    # Build serverless function
└── notifications:table  # Create notifications table migration
```

---

## 12. Build Configuration

| Setting | Value |
|---------|-------|
| **Bundler** | tsup (esbuild-based) |
| **Format** | ESM only (`"type": "module"`) |
| **Entry points** | 40+ (barrel + deep imports) |
| **Code splitting** | Enabled (per-module chunks) |
| **Target** | ES2022 |
| **TypeScript** | Strict (`strict: true`, `noUncheckedIndexedAccess`) |
| **Source maps** | Yes (declarationMap + sourceMap) |
| **DTS** | Generated (external declarations resolved) |
| **Minification** | None (consumer's bundler handles this) |
| **Bundle size** | ~218 KB total (69 KB gzipped) |

### Entry Points

```
speexjs                   → dist/index.js
speexjs/server            → dist/server/index.js
speexjs/server/http       → dist/server/http/index.js
speexjs/server/router     → dist/server/router/index.js
speexjs/server/database   → dist/server/database/index.js
speexjs/server/auth       → dist/server/auth/index.js
speexjs/server/middleware → dist/server/middleware/index.js
speexjs/server/cache      → dist/server/cache/index.js
speexjs/server/queue      → dist/server/queue/index.js
speexjs/server/mail       → dist/server/mail/index.js
speexjs/client            → dist/client/index.js
speexjs/client/signals    → dist/client/signals/index.js
speexjs/client/vdom       → dist/client/vdom/index.js
speexjs/schema            → dist/schema/index.js
speexjs/rpc               → dist/rpc/index.js
speexjs/server/observability  → dist/server/observability/index.js
speexjs/server/profiler       → dist/server/profiler/index.js
speexjs/server/audit          → dist/server/audit/index.js
speexjs/server/webhook        → dist/server/webhook/index.js
speexjs/server/isr            → dist/server/isr/index.js
speexjs/server/edge           → dist/server/edge/index.js
speexjs/server/bun            → dist/server/bun/index.js
speexjs/server/env            → dist/server/env/index.js
... (48+ total)
```

---

## 13. Testing Strategy

| Layer | Tool | Scope | File |
|-------|------|-------|------|
| **Unit** | Vitest | Individual functions & classes | Per-module test files |
| **Integration** | Vitest | Module interactions (auth+session, DB+model) | `database.test.ts` |
| **HTTP** | TestRequest | Full request → middleware → response cycle | `server.test.ts` |
| **Coverage** | @vitest/coverage-v8 | Minimum 85%, target >90% | `coverage-gaps.test.ts` |

### Test Count: 3,000+ (97.1% coverage)
### TypeScript: 0 errors (`tsc --noEmit`)

---

## 14. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Zero runtime dependencies** | Eliminates supply chain risk, fastest `npm install`, no version conflicts |
| **Laravel-inspired patterns** | Proven developer experience: CLI generators, Active Record, pipeline middleware |
| **Code splitting per module** | Users import only what they need: `import { Router } from 'speexjs/server'` |
| **ESM-only** | Future-proof, better tree-shaking, aligned with Node.js direction |
| **TSX View Engine over React** | Zero-dependency JSX rendering, no React runtime needed |
| **Schema-first validation** | Single source of truth for types, validation, and documentation |
| **Fluent QueryBuilder** | Type-safe SQL construction without raw strings |
| **Encrypted sessions** | AES-256-GCM — server can read but client cannot tamper |
| **CLI scaffolding** | `make:*` commands generate boilerplate, enforce conventions |
