# Roadmap

> **Current:** v0.6.0 — Nearing Release

## ✅ v0.1.0 — Foundation
- Schema validation (25+ types)
- Server HTTP, Router, Middleware, Controller
- Container DI, Engine abstraction
- Client Signals, VDOM, JSX, Router
- Type-safe RPC, CLI

## ✅ v0.2.0 — Zero Dep + Enterprise
- Zero external dependencies
- Native: CLI parser, ANSI, Logger, Crypto, Hashing
- String/Array/Number helpers
- Auth: SessionGuard, TokenGuard
- Gate authorization
- Database: QueryBuilder, Migrations, Seeder
- MySQL, SQLite, PostgreSQL drivers
- Cache, Storage, Events

## ✅ v0.3.0 — v0.5.0 — Developer Experience & Enterprise
- File-based routing
- Server Components
- ORM (Active Record), Model Relationships
- OAuth2 / Social Login
- Unit tests for all modules
- CLI: `make:model`, `make:migration`, `migrate`, `db:seed`

## ✅ v0.6.0 — Bundle & Performance
- 84% smaller bundle (433 KB → 67 KB)
- Build time -69%, QueryBuilder -37%, Dialect -55%, Schema -65%
- 2,500 → 1,300 lines across 5 core modules
- 1,849 tests — all passing
- WebSocket broadcasting with channels
- Background job queue
- Mail system with transports
- Task scheduler (cron)
- Database notification system
- Plugin system with lifecycle
- HTTP testing helpers
- Multi-core clustering
- Internationalization
- OpenAPI spec generator
- Configuration manager
- HTTP exception classes (12)

## 🔜 v1.0.0 — Global Launch
- Complete documentation
- Website speexjs.dev
- Benchmark vs Express, Fastify, Next.js
- Starter kits (blog, API, SaaS)
- Ecosystem: plugins, community templates
