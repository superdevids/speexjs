# Summary

SpeexJS — Fullstack TypeScript framework.

| Subpath | Contents |
|---------|-----|
| `speexjs` | Main barrel (schema, server, client, rpc) |
| `speexjs/server` | SuperApp, Router, Middleware, Controller, Container, Engine |
| `speexjs/server/http` | SuperRequest, SuperResponse, Headers, Cookies, Status |
| `speexjs/server/router` | Route groups, resource routes, named routes |
| `speexjs/server/router/signed-url` | Signed URL generation and verification |
| `speexjs/server/router/file-routing` | File-based route loading |
| `speexjs/server/middleware` | CORS, Auth, CSRF, Throttle, Session, Logger, etc |
| `speexjs/server/controller` | Base Controller + decorators |
| `speexjs/server/auth` | SessionGuard, TokenGuard, AuthManager |
| `speexjs/server/auth/socialite` | Socialite OAuth (GitHub, Google) |
| `speexjs/server/auth/sanctum` | Sanctum SPA token authentication |
| `speexjs/server/gate` | Gate authorization, policies |
| `speexjs/server/database` | QueryBuilder, Migrations, Pagination, Seeder |
| `speexjs/server/database/factory` | Model factories |
| `speexjs/server/testing/database` | RefreshDatabase test helper |
| `speexjs/server/cache` | Cache system (memory/file) |
| `speexjs/server/storage` | File storage multi-disk |
| `speexjs/server/events` | EventEmitter + wildcard |
| `speexjs/server/websocket` | WebSocket broadcasting with channels |
| `speexjs/server/websocket/broadcast` | Pusher/Ably broadcast drivers |
| `speexjs/client` | Signals, VDOM, JSX, SSR, ClientRouter |
| `speexjs/client/signals` | signal, computed, effect |
| `speexjs/client/vdom` | h, render, patch, hydrate, renderToString |
| `speexjs/rpc` | Type-safe RPC server & client |
| `speexjs/schema` | 25+ schema types for validation |
| `speexjs/server/queue` | Background job queue |
| `speexjs/server/queue/redis-driver` | Redis queue driver |
| `speexjs/server/queue/monitor` | Queue job monitor |
| `speexjs/server/mail` | Mail system with transports |
| `speexjs/server/schedule` | Task scheduler (cron) |
| `speexjs/server/tasks/runner` | Task runner |
| `speexjs/server/notifications` | Database notification system |
| `speexjs/server/plugin` | Plugin system with lifecycle |
| `speexjs/server/testing` | HTTP testing helpers |
| `speexjs/server/cluster` | Multi-core clustering |
| `speexjs/server/i18n` | Internationalization |
| `speexjs/server/openapi` | OpenAPI spec generator |
| `speexjs/server/config` | Configuration manager |
| `speexjs/server/errors` | HTTP exception classes (12) |
| `speexjs/server/view` | TSX View Engine |
| `speexjs/server/debug/toolbar` | Debug toolbar |
| `speexjs/server/flags` | Feature flags |
| `speexjs/server/billing` | Cashier billing |
| `speexjs/server/graphql` | GraphQL support |
| `speexjs/server/edge` | Edge runtime support |
| `speexjs/server/http/cache-control` | Cache control headers |
| `speexjs/docs` | Documentation |
