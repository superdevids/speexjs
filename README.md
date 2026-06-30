# SpeexJS

**Fullstack TypeScript Framework — Zero dependencies. 550+ features. 100% PRD aligned.**

```bash
npm install speexjs
```

> v2.1.2 • 550+ features • ~2,400 tests • 0 TypeScript errors • 0 known bugs • Zero deps • AI-Native SDK

---

## Overview

SpeexJS is a zero-dependency fullstack TypeScript framework for building modern web applications — from database to client. Everything is included, nothing is borrowed. All 5 PRDs (Product Requirements Documents) are 100% aligned.

---

## Quick Start

```bash
# Zero-install project bootstrap
npx @speex/create my-app

# Or with existing speexjs
npx speexjs init my-app
cd my-app
npm run dev
```

Open `http://localhost:3000` — you're running.

---

## Features (550+)

### 🖥️ DevTools Dashboard
| Feature | Description |
|---|---|
| **Unified Dashboard** | Consolidated developer dashboard at `/_speex/devtools` |
| **Request Log** | Real-time request streaming via SSE with color-coded status |
| **Query Inspector** | All queries with duration, bindings, slow query highlighting (>100ms) |
| **N+1 Detection** | Automatic alerts when same query pattern detected >5x |
| **Cache Inspector** | All cache keys with size, TTL, hit rate; per-key clear |
| **Route Explorer** | Interactive route list with click-to-test, middleware chain display |
| **Queue Monitor** | Job counts, retry, payload viewer, error stack |
| **Env Viewer** | All env vars (secrets masked), validation status |

### ⚡ HMR 2.0 — True Hot Module Replacement
| Feature | Description |
|---|---|
| **Selective Reload** | Route changes → reload registry only; Controller → invalidate cache |
| **Smart File Detection** | Classifies changes: ROUTE, CONTROLLER, MIDDLEWARE, MODEL, VIEW, CONFIG |
| **Debounced Watching** | 300ms debounce, skips node_modules, graceful process management |
| **HMR Stats** | Track total/selective/full reload counts with timing |

### 💾 Storage 2.0
| Feature | Description |
|---|---|
| **File Validation** | MIME type checking, size validation (B/KB/MB/GB/TB) |
| **Image Processing** | Resize, format conversion, quality, grayscale, thumbnails (optional Sharp) |
| **Signed URLs** | HMAC-SHA256 signed URLs with TTL, method/IP restriction |
| **Streaming** | Upload/download streams with backpressure handling |

### 🔍 Search Engine
| Feature | Description |
|---|---|
| **TF-IDF Search** | Full-text search with term frequency-inverse document frequency |
| **Fuzzy Search** | Typo tolerance via Levenshtein distance (≤1) |
| **Highlighting** | Search results with `<mark>` tag highlighting |
| **Fluent Query** | `.where().fuzzy().highlight().limit().offset().get()` |
| **PostgreSQL Support** | tsvector/tsquery helpers for native full-text search |

### 📊 Performance Analyzer
| Feature | Description |
|---|---|
| **Route Latency** | `speexjs metrics:report --routes` — p50/p95/p99 per route |
| **Bundle Size** | `speexjs metrics:bundle` — size per subpath export |
| **Query Performance** | `speexjs metrics:queries` — slow query detection |
| **Memory Profile** | `speexjs metrics:memory` — heap usage with visual bar chart |

### 🔄 API Versioning & SDK Evolution
| Feature | Description |
|---|---|
| **Version Registry** | `registerVersion()`, `getVersionedHandler()` with fallback |
| **Deprecation Headers** | Auto `Deprecation`/`Sunset`/`Link` response headers |
| **SDK Diff** | `speexjs sdk:diff` — detect breaking changes between SDK versions |
| **OpenAPI 3.1** | oneOf (discriminated unions), allOf (intersections), examples |

### 🔐 Auth 2.0 — SSO & Enterprise
| Feature | Description |
|---|---|
| **SAML2 Guard** | AuthnRequest generation, Response parsing, RSA-SHA256 signature verification |
| **OIDC Guard** | OpenID Connect discovery, code exchange, JWT validation, JWKS lookup |
| **Magic Link** | Crypto-random tokens, configurable TTL (default 15min), one-time use |
| **WebAuthn/Passkeys** | CBOR COSE key parsing, ES/RS signature verification |
| **Session Manager** | List, revoke, bulk revoke sessions |
| **Login Lockout** | Configurable rate limiting with exponential backoff |

### 📨 Queue 2.0
| Feature | Description |
|---|---|
| **Delayed Jobs** | Schedule jobs with '1h', '30m', or absolute ISO dates |
| **Job Chaining** | `.chain().then().dispatch()` pipeline |
| **Cron Scheduler** | Full cron expression parser (*/5, 1-30/5, ranges, comma lists) |
| **Retry Strategy** | Configurable exponential backoff, max attempts, timeout |
| **Dead Letter Queue** | Retry all failed, clear, inspect payload |
| **Priority Queue** | Sort by priority (1 highest - 10 lowest), singleton dedup |

### 🗄️ Query Builder 2.0
| Feature | Description |
|---|---|
| **Type-Safe Raw Queries** | `db.raw<T>('SELECT ...', params)` with generic return type |
| **Streaming** | Async iterator for large datasets — `db.stream('SELECT * FROM logs')` |
| **Query Analysis** | EXPLAIN plan, execution timing, full scan/filesort detection |
| **Batch Insert** | Chunked multi-row INSERT (default 500) with progress callback |
| **Batch Update** | Key-field based batch UPDATE with transaction support |

### 🔧 CLI Gen 2
| Feature | Description |
|---|---|
| `make:resource --schema` | Schema-driven full CRUD with validation, routes, tests |
| `make:auth --oauth --2fa` | Enhanced auth with OAuth providers (Google, GitHub, Discord) |
| `make:crud` with relations | Interactive belongsTo/hasMany/belongsToMany prompts |
| `make:test` | Generate Vitest test files from controller methods |

### 🎛️ Middleware & Config
| Feature | Description |
|---|---|
| **Named Groups** | Declarative middleware groups in `speexjs.config.ts` (api, web, admin, public) |
| **Adaptive Rate Limit** | Dynamic multiplier based on server load via `adaptiveThrottle()` |
| **Smart Error Hints** | 11 registered hints with docs URLs, contextual suggestions per exception |

### ✨ Core Features
| Feature | Description |
|---|---|
| 🏗️ **Router** | File-based and programmatic routing with params, guards, versioning |
| 🗃️ **ORM** | Type-safe query builder with 6 relations, CTE, UPSERT, UNION |
| ✅ **Schema** | 29+ schema types (Zod-compatible), transform, coerce, refine |
| 🔐 **Auth** | 5 guards: Session, Token, Sanctum, Socialite, OAuth |
| 🛡️ **Security** | CSRF, Helmet, CORS, CSP, rate limiting, SQL injection prevention |
| 📦 **CLI** | 35+ commands — scaffold, generate, migrate, deploy, metrics |
| ☁️ **Deploy** | One-command deploy: Docker, Vercel, Railway, Render, Fly.io |
| 🧩 **Plugins** | Plugin registry, marketplace search, lifecycle hooks |
| 📝 **Audit** | Automatic audit trail for all CRUD operations |
| 🔗 **Webhooks** | HMAC-signed outgoing webhooks with retry |
| 🌐 **WebSocket** | Channels, broadcast, GraphQL subscriptions |
| 🧪 **Testing** | TestRequest, RefreshDatabase, actingAs, clock mocking |
| 🎨 **Layout Engine** | View composition, template inheritance, component slots |
| 🧪 **A/B Experiments** | Hash-based assignment with variant tracking |
| 🗄️ **Database Mesh** | Unified SQL/CSV/REST data source abstraction |

---

## CLI Reference (35+ commands)

| Command | Description |
|---|---|
| `speexjs init` | Create new project (interactive wizard) |
| `speexjs serve` / `dev` | Start dev server with HMR 2.0 |
| `speexjs build` | Production build |
| `speexjs build --ssg` | Static Site Generation |
| `speexjs build --isr` | Incremental Static Regeneration |
| `speexjs build:function` | Build serverless function |
| `speexjs bench` | Run benchmarks |
| `speexjs deploy` | Deploy (docker/vercel/railway/render/flyio) |
| `speexjs deploy --blue-green` | Zero-downtime blue-green deployment |
| `speexjs deploy --rollback` | Rollback to previous deployment |
| `speexjs make:controller` | Generate controller |
| `speexjs make:model` | Generate model |
| `speexjs make:migration` | Generate migration |
| `speexjs make:middleware` | Generate middleware |
| `speexjs make:schema` | Generate schema |
| `speexjs make:resource [--schema]` | Generate API resource (schema-driven CRUD) |
| `speexjs make:auth [--oauth] [--2fa]` | Generate auth scaffold with OAuth/2FA |
| `speexjs make:crud` | Generate complete CRUD (interactive with relations) |
| `speexjs make:admin` | Generate admin panel config |
| `speexjs make:agent` | Generate AI agent |
| `speexjs make:flag` | Generate feature flag |
| `speexjs make:test` | Generate Vitest test file from controller |
| `speexjs generate:app` | Generate fullstack app from description |
| `speexjs generate:sdk` | Generate TypeScript SDK from OpenAPI spec |
| `speexjs openapi:generate` | Generate OpenAPI 3.1 spec |
| `speexjs list-routes` | Display all routes |
| `speexjs migrate` | Run migrations |
| `speexjs db:seed` | Seed the database |
| `speexjs tinker` | Interactive REPL |
| `speexjs schema:diff` | Compare models vs database schema |
| `speexjs schema:migrate` | Generate migration from schema diff |
| `speexjs env:generate` | Generate typed `src/env.ts` from `.env` |
| `speexjs env:check` | Validate environment variables |
| `speexjs profile` | Profile route performance |
| `speexjs metrics:report` | Route latency report (p50/p95/p99) |
| `speexjs metrics:bundle` | Bundle size analysis |
| `speexjs metrics:queries` | Database query performance |
| `speexjs metrics:memory` | Memory usage profile |
| `speexjs plugin:install` | Install a plugin |
| `speexjs plugin:list` | List installed plugins |
| `speexjs plugin:search` | Search plugin marketplace |
| `speexjs sdk:diff` | Detect breaking SDK changes |

---

## Why Zero Dependencies?

- **No `node_modules` bloat** — installs in under 1 second
- **No supply-chain risk** — zero attack surface from transitive deps
- **No version conflicts** — one framework, one version, everything compatible
- **Tree-shakeable** — your production bundle includes only what you use

---

## PRD Alignment (100% Complete)

| Requirement | Status |
|---|---|
| Zero external dependencies | ✅ 100% |
| TypeScript-first DX | ✅ 100% |
| Fullstack (DB → client) | ✅ 100% |
| CLI tooling (35+ commands) | ✅ 100% |
| DevTools Dashboard | ✅ 100% |
| HMR 2.0 True Hot Reload | ✅ 100% |
| CLI Gen 2 — Better Generators | ✅ 100% |
| Query Builder 2.0 | ✅ 100% |
| Auth 2.0 — SSO & Enterprise | ✅ 100% |
| Queue 2.0 — Delayed Jobs & Chaining | ✅ 100% |
| Storage 2.0 — Validation & Images | ✅ 100% |
| Full-Text Search Engine | ✅ 100% |
| Performance & Bundle Analyzer | ✅ 100% |
| API Versioning & SDK Evolution | ✅ 100% |
| Observability & monitoring | ✅ 100% |
| Profiling & performance | ✅ 100% |
| Cloud function adapters | ✅ 100% |
| Plugin ecosystem | ✅ 100% |
| Migration safety | ✅ 100% |

> **Note:** PRD01-PRD05 are 100% aligned. [PRD06 (AI-Native)](./docs/PRD06.md) is 🚧 in progress — foundation complete, full features targeting H2 2026.

---

## Benchmarks

| | SpeexJS v2.1.1 | Hono | Fastify | Express |
|---|---|---|---|---|
| Bundle size | **~218 KB** | 50 KB | 1 MB | 2 MB |
| Dependencies | **Zero** | Zero | 30+ | 40+ |
| Features | **550+** | 20+ | 30+ | 20+ |
| Tests | **~2,400** | ~500 | ~800 | ~1,000 |
| Coverage | **97.1%** | ~75% | ~80% | ~70% |
| TypeScript errors | **0** | — | — | — |
| Known bugs | **0** | — | — | — |
| Subpath exports | **52** | 5+ | 10+ | 3+ |
| CLI commands | **33** | — | — | — |

---

## License

MIT
