# Changelog — SpeexJS

All notable changes to the SpeexJS framework will be documented in this file.

---

## [0.2.0] — 2026-06-28 — Zero Dependencies & Enterprise

### 🎉 Major Milestone
**Zero external dependencies!** SpeexJS sekarang 100% native Node.js.

### Added
- **Native Foundation** — CLI argument parser, ANSI colors, structured logger (WIB/WITA/WIT)
- **String Helpers** — `Str.camelCase`, `Str.slug`, `Str.uuid`, `Str.nanoid`, `Str.plural`
- **Array Helpers** — `Arr.groupBy`, `Arr.pluck`, `Arr.sortBy`, `Arr.chunk`, `Arr.shuffle`
- **Number Helpers** — `Number.terbilang`, `Number.formatRupiah`, `Number.median`
- **Encryption** — AES-256-GCM encrypt/decrypt via Node.js `crypto`
- **Password Hashing** — scrypt (OWASP recommended) + PBKDF2
- **Session Guard** — Cookie-based authentication dengan encrypted session
- **Token Guard** — Bearer token authentication dengan abilities
- **Auth Middleware** — `authMiddleware()`, `guestMiddleware()`
- **Gate Authorization** — Policies, before/after hooks, `authorize()` middleware
- **Database Query Builder** — Laravel-like chaining: `.select()`, `.where()`, `.join()`, `.orderBy()`
- **Database Pagination** — `.paginate(perPage)` built-in di Query Builder
- **Database Migrations** — `SchemaBuilder`, `TableBlueprint` (30+ column types)
- **Database Seeding** — `Seeder` class with batch insert
- **MySQL/SQLite/PostgreSQL drivers** — runtime dynamic import
- **Cache System** — in-memory + file store, TTL, remember, stats
- **File Storage** — multi-disk, local driver, path traversal protection
- **Events** — EventEmitter + wildcard pattern matching
- **URL Builder** — named routes, assets, secure URLs
- **Response Macros** — `success()`, `error()`, `paginated()`, etc.

### Changed
- **BREAKING**: Hapus `commander` — CLI sekarang native `process.argv`
- **BREAKING**: Hapus `SpeexJS-core` dependency — semua native
- **BREAKING**: Hapus `picocolors` — ANSI colors sendiri
- CLI commands sekarang langsung tersedia via `SpeexJS <command>`
- Package name tetap `SpeexJS`, tapi sekarang zero dependencies

### Removed
- `commander` — diganti native `parseArgs()`
- `picocolors` — diganti native ANSI
- `SpeexJS-core` — semua fungsi diimplementasikan native

### Stats
- 67 source files (+29 dari v0.1.0)
- 9.887 lines of code (+4.626 dari v0.1.0)
- 20 build entry points (+6 dari v0.1.0)
- Zero TypeScript errors
- Zero external dependencies

---

## [0.1.0] — 2026-06-28 — Initial Release

### Added
- **Schema Validation** — 25+ types: string, number, object, array, union, enum, date
- **🇮🇩 Indonesia Validation** — NIK, NPWP, Phone, Kodepos, Alamat, Rekening
- **Server HTTP** — SuperRequest + SuperResponse wrapper (NOT Fetch API)
- **Router** — `get()`, `post()`, `put()`, `patch()`, `delete()`, `group()`, `resource()`, named routes
- **Middleware** — CORS, CSRF, Auth, Throttle, Helmet, Session, Logger, Body Parser, Compress, Static Files
- **Controller** — Base class + decorators: `@controller`, `@get`, `@post`, `@put`, `@del`
- **Container** — Service Container / Dependency Injection
- **Engine** — Node.js default, swappable via `ServerEngine` interface
- **Client Signals** — `signal()`, `computed()`, `effect()`, `batch()`, `untracked()`
- **Client VDOM** — `h()`, `render()`, `patch()`, `hydrate()`, `renderToString()`
- **Client JSX** — Full JSX support (`jsxImportSource: \"@SpeexJS/vdom\"`)
- **Client Router** — File-based routing with guards
- **RPC** — Type-safe RPC server & client with schema validation
- **CLI** — `init`, `make:controller`, `make:middleware`, `make:schema`, `list-routes`, `serve`

### Stats
- 38 source files
- 5.261 lines of code
- 14 build entry points
- 69 unit tests (schema)
- Dependencies: `commander`, `SpeexJS-core`, `picocolors`
