# Changelog

## v0.9.0 (2026-06-29)
- **64+ features** — All 30 gaps from initial analysis now closed
- **1,990 tests** — All passing, 96.3% coverage
- **Zero TS errors** — `tsc --noEmit` clean
- New: Socialite OAuth, Sanctum SPA auth, Pusher/Ably broadcast
- New: GraphQL, Feature Flags, Cashier billing, Task runner
- New: Debug toolbar, Tinker REPL, Signed URLs, Admin generator
- New: SMTP mail, Redis queue, Queue monitor, File-based routing

## v0.6.0 (2026-06-29)
- **84% smaller bundle** — 433 KB → 67 KB (minified, split, tree-shaken)
- **Performance** — Build time -69%, QueryBuilder -37%, Dialect -55%, Schema -65%
- **Code refactor** — 2,500 → 1,300 lines across 5 core modules
- **1,849 tests** — all passing
- **npm package:** 67.2 kB gzipped

## [0.2.3] - 2026-06-28
- fix: lowercase speexjs in CLI templates
- fix: package name in dependencies

## [0.2.2] - 2026-06-28
- fix: replace all speedx/SpeedX references

## [0.2.0] - 2026-06-28
- Zero external dependencies — all native Node.js
- Native CLI parser, ANSI colors, Logger
- String/Array/Number helpers (Str, Arr, SuperNumber)
- AES-256-GCM Encryption, scrypt + PBKDF2 hashing
- SessionGuard & TokenGuard authentication
- Gate authorization with policies
- Database Query Builder, Migrations, Pagination, Seeder
- MySQL/SQLite/PostgreSQL drivers
- Cache system (memory + file)
- File Storage multi-disk
- EventEmitter + wildcard patterns
- URL Builder, Response Macros

## [0.1.0] - 2026-06-28
- Schema validation (25+ types)
- Server HTTP (SuperRequest, SuperResponse)
- Router, Middleware (10 built-in), Controller + decorators
- Container (DI), Engine abstraction
- Client Signals, VDOM, JSX, Client Router
- Type-safe RPC (HTTP + WebSocket)
- CLI: `speexjs init`, `speexjs serve`, generators
