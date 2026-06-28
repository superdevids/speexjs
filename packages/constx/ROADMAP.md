# ConstX Roadmap 🗺️

> **Current version:** v0.2.0 (Zero dependencies, Native modules)
> **Status:** Active Development

---

## ✅ v0.1.0 — Foundation (Complete)

- [x] Schema validation (25+ types, 🇮🇩 Indonesia support)
- [x] Server HTTP (SuperRequest, SuperResponse — NOT Fetch API)
- [x] Router (get/post/put/patch/delete, groups, resource, named routes)
- [x] Middleware (10 built-in: CORS, CSRF, Auth, Throttle, Helmet, Session, Logger, Body Parser, Compress, Static Files)
- [x] Controller (Base class + decorators: `@controller`, `@get`, `@post`)
- [x] Container / Dependency Injection
- [x] Engine abstraction (Node.js default, swappable to Bun/Deno)
- [x] Client Signals (`signal`, `computed`, `effect`, `batch`)
- [x] Client VDOM (`h`, `render`, `patch`, `hydrate`, `renderToString`)
- [x] Client JSX support (`jsxImportSource: \"@ConstX/vdom\"`)
- [x] Client Router (file-based routing, guards)
- [x] RPC (Type-safe server/client, HTTP + WebSocket transport)
- [x] CLI (init, make:controller/middleware/schema, list-routes, serve)

## ✅ v0.2.0 — Zero Dependencies & Enterprise (Complete)

### Native Foundation
- [x] CLI argument parser (replaced `commander`)
- [x] ANSI colors (replaced `picocolors`)
- [x] Structured Logger (WIB/WITA/WIT timezone)
- [x] String helpers (`Str.camelCase`, `Str.uuid`, `Str.slug`)
- [x] Array helpers (`Arr.groupBy`, `Arr.pluck`, `Arr.sortBy`)
- [x] Number helpers (`Number.terbilang`, `Number.formatRupiah`)
- [x] AES-256-GCM Encryption
- [x] scrypt + PBKDF2 Password Hashing

### Auth & Security
- [x] Session Guard (encrypted cookie-based auth)
- [x] Token Guard (bearer token with abilities)
- [x] Auth Middleware (`authMiddleware`, `guestMiddleware`)
- [x] Gate Authorization (policies, before/after hooks)
- [x] Encrypt/Decrypt helpers

### Database
- [x] Query Builder (Laravel-like chaining API)
- [x] Pagination built-in
- [x] MySQL driver (default)
- [x] SQLite driver
- [x] PostgreSQL driver
- [x] Migration System (SchemaBuilder, TableBlueprint)
- [x] Seeder

### Features
- [x] Cache (in-memory + file store, TTL, remember)
- [x] File Storage (multi-disk, local driver)
- [x] Events (EventEmitter + wildcard patterns)
- [x] URL Builder (named routes, assets, secure URLs)
- [x] Response Macros (success, error, paginated)

### Infrastructure
- [x] Zero external dependencies
- [x] 67 source files, 9.887 lines of code
- [x] 20 build entry points
- [x] TypeScript strict (0 errors)

---

## 🔜 v0.3.0 — Developer Experience (Next)

### Routing & Server
- [ ] **File-based Routing** — auto-scan `routes/` directory
- [ ] **Server Components** — async components render di server, streaming ke client
- [ ] **Form Request Validation** — dedicated validation classes
- [ ] **Exception Handler** — customizable error pages
- [ ] **Maintenance Mode** — 503 during updates

### Database & ORM
- [ ] **ORM - Like Eloquent/Sequelize/Prima** — Active Record pattern
- [ ] **Model Relationships** — hasMany, belongsTo, morphMany
- [ ] **Model Factories** — for testing
- [ ] **Soft Deletes** — `deleted_at` pattern
- [ ] **Query Scopes** — reusable query constraints

### Auth & Security
- [ ] **OAuth2 / Social Login** — Google, GitHub, etc.
- [ ] **Email Verification** — verified email flow
- [ ] **Password Reset** — forgot password flow
- [ ] **Two Factor Auth** — TOTP-based

### CLI
- [ ] **`ConstX make:model`** — generate model
- [ ] **`ConstX make:migration`** — generate migration
- [ ] **`ConstX make:seeder`** — generate seeder
- [ ] **`ConstX migrate`** — run migrations
- [ ] **`ConstX db:seed`** — run seeders
- [ ] **`ConstX route:list`** — enhanced route listing

### Testing
- [ ] Unit tests untuk Server module
- [ ] Unit tests untuk Client module
- [ ] Unit tests untuk Database module
- [ ] Unit tests untuk Auth module
- [ ] Integration tests

---

## 🔜 v0.4.0 — Frontend Ecosystem

### Client
- [ ] **React Adapter** — use React components with ConstX server
- [ ] **Vue Adapter** — use Vue components with ConstX server
- [ ] **SSR Streaming** — progressive HTML streaming
- [ ] **Island Architecture** — partial hydration
- [ ] **Image Optimization** — built-in image processing
- [ ] **SEO Helpers** — meta tags, OG images, sitemap

### Client Components
- [ ] **`<Link>`** — client-side navigation
- [ ] **`<Image>`** — optimized images
- [ ] **`<Form>`** — form handling with validation
- [ ] **`<Transition>`** — page transitions

---

## 🔜 v1.0.0 — Global Launch

### Features
- [ ] **Queues** — background job processing
- [ ] **Mail** — email sending (SMTP, Resend, etc.)
- [ ] **Notifications** — multi-channel (database, email, push)
- [ ] **Broadcasting** — WebSocket realtime events
- [ ] **Task Scheduling** — cron job management
- [ ] **HTTP Client** — type-safe HTTP requests
- [ ] **Localization (i18n)** — multi-language support
- [ ] **Rate Limiter** — enhanced rate limiting with Redis

### Infrastructure
- [ ] **Dokumentasi Bahasa Indonesia** lengkap
- [ ] **Dokumentasi English** lengkap
- [ ] **Website** — ConstX.dev
- [ ] **Benchmark** vs Express, Fastify, Next.js
- [ ] **CLI Templates** — starter kits (blog, API, SaaS)
- [ ] **VS Code Extension** — syntax highlighting, snippets
- [ ] **npm publish** — public release
- [ ] **Co-maintainer onboarding**

---

## 📊 Priority Matrix

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| File-based routing | 🔥🔥🔥 | 🟡 Medium | P0 |
| Server Components | 🔥🔥🔥 | 🔴 Large | P0 |
| Unit tests | 🔥🔥🔥 | 🟡 Medium | P0 |
| ORM/Model Layer | 🔥🔥🔥 | 🔴 Large | P1 |
| React Adapter | 🔥🔥🔥 | 🔴 Large | P1 |
| Dokumentasi EN/ID | 🔥🔥🔥 | 🟢 Small | P1 |
| Queues | 🔥🔥 | 🔴 Large | P2 |
| Broadcasting | 🔥🔥 | 🔴 Large | P2 |
| Website ConstX.dev | 🔥🔥 | 🟡 Medium | P2 |
| Benchmark | 🔥 | 🟡 Medium | P3 |

---

## 💡 Ide untuk Masa Depan

- **ConstX SaaS Starter** — boilerplate untuk SaaS apps (auth, billing, team)
- **ConstX Admin Panel** — auto-generated admin from schema
- **ConstX AI SDK** — integrasi LLM/AI (OpenAI, Anthropic, Google)
- **ConstX Mobile** — React Native / Flutter integration
- **ConstX Desktop** — Electron/Tauri integration
- **Plugin Marketplace** — ecosystem plugin system

---

*Roadmap ini akan terus diperbarui sesuai feedback dari komunitas.*
