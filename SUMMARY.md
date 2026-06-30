# Summary

SpeexJS — Fullstack TypeScript framework. v2.0.0 | 500+ features | 2,500+ tests | Zero deps

> 📋 **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Module map, request lifecycle, design decisions
> 📋 **[PRD.md](./PRD.md)** — Product roadmap & feature priorities (v1.x → v5.0)

| Subpath | Contents |
|---------|-----|
| `speexjs` | Main barrel (schema, server, client, rpc) |
| `speexjs/server` | SuperApp, Router, Middleware, Controller, Container, Engine |
| `speexjs/server/actions` | Server Actions |
| `speexjs/server/analytics` | Request analytics |
| `speexjs/server/http` | SuperRequest, SuperResponse, Headers, Cookies, Status |
| `speexjs/server/http/sse-handler` | SSE broadcast handler |
| `speexjs/server/http/cache-control` | Cache control headers |
| `speexjs/server/http/client` | HTTP client |
| `speexjs/server/http/resource` | API resource formatter |
| `speexjs/server/http/serializer` | Response serialization |
| `speexjs/server/http/upload` | File upload parsing |
| `speexjs/server/router` | Route groups, resource routes, named routes |
| `speexjs/server/router/signed-url` | Signed URL generation and verification |
| `speexjs/server/router/file-routing` | File-based route loading |
| `speexjs/server/router/versioning` | API versioning |
| `speexjs/server/middleware` | CORS, Auth, CSRF, Throttle, Session, Logger, etc |
| `speexjs/server/controller` | Base Controller + decorators |
| `speexjs/server/container` | DI container + resolver |
| `speexjs/server/auth` | SessionGuard, TokenGuard, AuthManager |
| `speexjs/server/auth/socialite` | Socialite OAuth (GitHub, Google) |
| `speexjs/server/auth/sanctum` | Sanctum SPA token authentication |
| `speexjs/server/auth/session-guard` | Session-based authentication |
| `speexjs/server/auth/token-guard` | Token-based authentication |
| `speexjs/server/auth/session-store` | Session storage |
| `speexjs/server/auth/oauth` | OAuth provider |
| `speexjs/server/auth/middleware` | Auth middleware |
| `speexjs/server/auth/password-reset` | Password reset flow |
| `speexjs/server/auth/password-confirm` | Password confirmation |
| `speexjs/server/auth/email-verification` | Email verification |
| `speexjs/server/auth/lockout` | Account lockout |
| `speexjs/server/auth/totp` | TOTP / 2FA |
| `speexjs/server/gate` | Gate authorization, policies |
| `speexjs/server/rbac` | RBAC roles, permissions, middleware, cache |
| `speexjs/server/rbac/core` | RBAC core logic |
| `speexjs/server/rbac/middleware` | RBAC middleware |
| `speexjs/server/rbac/cache` | RBAC permission caching |
| `speexjs/server/database` | QueryBuilder, Migrations, Pagination, Seeder |
| `speexjs/server/database/factory` | Model factories |
| `speexjs/server/database/model` | Active Record Model |
| `speexjs/server/database/model-cache` | Model caching |
| `speexjs/server/database/model-factory` | Model factory definitions |
| `speexjs/server/database/query` | Query builder |
| `speexjs/server/database/migration` | Migration builder |
| `speexjs/server/database/seeder` | Database seeder |
| `speexjs/server/database/pagination` | Offset pagination |
| `speexjs/server/database/cursor-pagination` | Cursor pagination |
| `speexjs/server/database/soft-deletes` | Soft deletes trait |
| `speexjs/server/database/accessors` | Accessors/Mutators |
| `speexjs/server/database/serialization` | Model serialization |
| `speexjs/server/database/scopes` | Global scopes |
| `speexjs/server/database/observer` | Model events/observers |
| `speexjs/server/database/cascade` | Cascade deletes |
| `speexjs/server/database/through` | Through resolver |
| `speexjs/server/database/uuid` | UUID support |
| `speexjs/server/database/tenant` | Tenant-aware queries |
| `speexjs/server/database/connection` | Connection pooling |
| `speexjs/server/database/driver` | DB driver interface |
| `speexjs/server/database/dialect` | SQL dialect abstraction |
| `speexjs/server/database/types` | Database type definitions |
| `speexjs/server/testing` | HTTP testing helpers |
| `speexjs/server/testing/auth` | actingAs mock auth |
| `speexjs/server/testing/clock` | Time travel |
| `speexjs/server/testing/database` | RefreshDatabase test helper |
| `speexjs/server/testing/bootstrap` | Test bootstrap utilities |
| `speexjs/server/cache` | Cache system (memory/file) |
| `speexjs/server/cache/redis-store` | Redis cache store |
| `speexjs/server/storage` | File storage multi-disk |
| `speexjs/server/storage/s3` | S3 storage adapter |
| `speexjs/server/events` | EventEmitter + wildcard |
| `speexjs/server/websocket` | WebSocket broadcasting with channels |
| `speexjs/server/websocket/broadcast` | Pusher/Ably broadcast drivers |
| `speexjs/server/queue` | Background job queue |
| `speexjs/server/queue/redis-driver` | Redis queue driver |
| `speexjs/server/queue/sqlite-driver` | SQLite queue driver |
| `speexjs/server/queue/monitor` | Queue job monitor |
| `speexjs/server/mail` | Mail system with transports |
| `speexjs/server/mail/templates` | Email templates |
| `speexjs/server/schedule` | Task scheduler (cron) |
| `speexjs/server/tasks/runner` | Task runner |
| `speexjs/server/notifications` | Database notification system |
| `speexjs/server/config` | Configuration manager |
| `speexjs/server/config/manager` | Config file manager |
| `speexjs/server/env` | Environment validation |
| `speexjs/server/search` | Full-text search |
| `speexjs/server/search/vector` | Vector search |
| `speexjs/server/search/rag` | RAG pipeline helpers |
| `speexjs/server/ai` | AI agent system |
| `speexjs/server/ai/agent` | AI agent definitions |
| `speexjs/server/ai/nlquery` | Natural language query |
| `speexjs/server/admin` | Admin panel generator |
| `speexjs/server/admin/panel` | Admin panel UI |
| `speexjs/server/admin/builder` | Admin builder |
| `speexjs/server/admin/database-gui` | Database GUI |
| `speexjs/server/audit` | Audit logging |
| `speexjs/server/webhook` | Webhook system |
| `speexjs/server/flags` | Feature flags |
| `speexjs/server/flags/dashboard` | Feature flags dashboard |
| `speexjs/server/isr` | Incremental Static Regeneration |
| `speexjs/server/experiments` | A/B testing |
| `speexjs/server/billing` | Cashier billing |
| `speexjs/server/graphql` | GraphQL support |
| `speexjs/server/graphql/subscriptions` | GraphQL subscriptions |
| `speexjs/server/openapi` | OpenAPI spec generator |
| `speexjs/server/openapi/ui` | Swagger UI |
| `speexjs/server/health` | Health check with DB ping |
| `speexjs/server/plugin` | Plugin system with lifecycle |
| `speexjs/server/plugin/presets` | Plugin presets |
| `speexjs/server/plugin/registry` | Plugin registry |
| `speexjs/server/cluster` | Multi-core clustering |
| `speexjs/server/i18n` | Internationalization |
| `speexjs/server/i18n/routing` | i18n routing |
| `speexjs/server/errors` | HTTP exception classes (12) |
| `speexjs/server/errors/handler` | Global error handler |
| `speexjs/server/view` | TSX View Engine |
| `speexjs/server/view/layout-engine` | Layout engine |
| `speexjs/server/debug/toolbar` | Debug toolbar |
| `speexjs/server/debug/dashboard` | Debug dashboard |
| `speexjs/server/edge` | Edge runtime support |
| `speexjs/client` | Signals, VDOM, JSX, SSR, ClientRouter |
| `speexjs/client/signals` | signal, computed, effect |
| `speexjs/client/vdom` | h, render, patch, hydrate, renderToString |
| `speexjs/client/vdom/jsx-runtime` | JSX runtime |
| `speexjs/rpc` | Type-safe RPC server & client |
| `speexjs/schema` | 25+ schema types for validation |
| `speexjs/schema/types` (Brand) | Branded type support |
| `speexjs/docs` | Documentation |
