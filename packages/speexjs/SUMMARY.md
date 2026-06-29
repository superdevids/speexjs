# Summary

SpeexJS — Fullstack TypeScript framework.

| Subpath | Contents |
|---------|-----|
| `speexjs` | Main barrel (schema, server, client, rpc) |
| `speexjs/server` | SuperApp, Router, Middleware, Controller, Container, Engine |
| `speexjs/server/http` | SuperRequest, SuperResponse, Headers, Cookies, Status |
| `speexjs/server/router` | Route groups, resource routes, named routes |
| `speexjs/server/middleware` | CORS, Auth, CSRF, Throttle, Session, Logger, etc |
| `speexjs/server/controller` | Base Controller + decorators |
| `speexjs/server/auth` | SessionGuard, TokenGuard, AuthManager |
| `speexjs/server/gate` | Gate authorization, policies |
| `speexjs/server/database` | QueryBuilder, Migrations, Pagination, Seeder |
| `speexjs/server/cache` | Cache system (memory/file) |
| `speexjs/server/storage` | File storage multi-disk |
| `speexjs/server/events` | EventEmitter + wildcard |
| `speexjs/client` | Signals, VDOM, JSX, SSR, ClientRouter |
| `speexjs/client/signals` | signal, computed, effect |
| `speexjs/client/vdom` | h, render, patch, hydrate, renderToString |
| `speexjs/rpc` | Type-safe RPC server & client |
| `speexjs/schema` | 25+ schema types for validation |
| `speexjs/server/websocket` | WebSocket broadcasting with channels |
| `speexjs/server/queue` | Background job queue |
| `speexjs/server/mail` | Mail system with transports |
| `speexjs/server/schedule` | Task scheduler (cron) |
| `speexjs/server/notifications` | Database notification system |
| `speexjs/server/plugin` | Plugin system with lifecycle |
| `speexjs/server/testing` | HTTP testing helpers |
| `speexjs/server/cluster` | Multi-core clustering |
| `speexjs/server/i18n` | Internationalization |
| `speexjs/server/openapi` | OpenAPI spec generator |
| `speexjs/server/config` | Configuration manager |
| `speexjs/server/errors` | HTTP exception classes (12) |
