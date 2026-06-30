# REFACTOR LOG — FASE 2: Performance, Stability & Security

## 2.1 Performance Refactor

### toSQL caching (`src/server/database/query.ts`)
- Added `_sqlCache` field to `QueryBuilder`
- Added `dirty()` method that invalidates cache on mutation
- All mutating methods now call `dirty()`: select, addSelect, where*, join*, orderBy*, limit, offset, groupBy, having, with, union, lock*, etc.
- `toSQL()` returns cached result when available

### MIME_TYPES hoisted (`src/server/middleware/index.ts`)
- Moved `MIME_TYPES` object from inside `staticFiles()` to module-level constant
- Prevents re-creation on every request

### pathToRegexp cache (`src/server/router/index.ts`)
- Added `pathRegexCache` Map to cache compiled regex patterns
- Avoids re-compiling the same route pattern

### Router resolve LRU cache (`src/server/router/index.ts`)
- Added `resolveCache` Map with max 1000 entries
- Cache cleared when new routes are registered via `match()`
- Cached both hit (ResolvedRoute) and miss (null) results

### emitParallel already existed (`src/server/events/index.ts`)
- `emitParallel()` was already implemented
- Used `Promise.all()` for concurrent handler execution

## 2.2 Stability Refactor

### URIError safety (`src/server/http/request.ts`)
- Wrapped `parseUrlEncoded()` decodeURIComponent calls in try/catch
- Malformed URL encoding now safely continues parsing remaining pairs

### JSON.parse safety (`src/server/http/request.ts`)
- Already had try/catch around JSON.parse in readBodyFromStream()

### Global unhandledRejection handler (`src/server/engine/index.ts`)
- Added `process.on('unhandledRejection', ...)` with console.error logging
- Prevents silent crash on unhandled promise rejections

### `as any` audit
- **database/query.ts**: Raw WhereClause fields made optional; removed `as any` from 4 raw clause push operations
- **database/model.ts**: Replaced `as any` with `as InstanceType<T>[]`, `as InstanceType<T>`, and `as Record<string, unknown>`
- **database/model-factory.ts**: Replaced `as any` with `as unknown as Factory<...>`
- **schema/index.ts**: Replaced `as any` with `as unknown as TupleSchema<T>` and `as unknown as UnionSchema<Infer<T[number]>>`
- Remaining `as any` in query.ts (5) are for MySQL OkPacket driver differences — unavoidable without changing driver interface
- Remaining `as any` in engine/edge/index.ts, middleware/index.ts (compress), testing/index.ts — all necessary for monkey-patching or raw Node.js type gaps

## 2.3 Security Refactor

### console.log audit
- Removed 0 debug logs from production code — only `ConsoleMailTransport.send` logs intentionally, kept (it's a debug/log transport by design)
- Logger middleware, migration CLI, cluster lifecycle, and server startup/shutdown logs preserved as intentional structured logging

### Hardcoded secrets check
- `'speexjs-dev-secret'` in session middleware: development-only default, documented fallback
- `'speexjs-dev-token'` in token-guard: development-only fallback, guarded by production env check
- All auth tokens are properly hashed via HMAC-SHA256
- No real secrets or credentials found in code

## 2.4 Type Safety

### schema/index.ts
- Removed `as any` from `tuple()` and `union()` factory methods
- Added proper `Infer` type import for UnionSchema generic

### container/index.ts
- Added `satisfies Binding<T>` assertions on bind/singleton/instance methods
- Removed redundant `Factory<T>` casts in resolve()

### helpers.ts — macro system
- `responseMacros()` iterates `Object.entries(macroFns)` dynamically
- `registerMacro()` uses typed `this: SuperResponse` parameter

## 2.5 Code Quality

### response.ts — DRY stream piping
- Extracted `pipeStream()` private method from duplicate code in `stream()` and `file()`
- Both now delegate to `pipeStream()` for pipe/end/error handling

### model.ts
- Checked for unused imports: all imports (QueryBuilder, QueryRunner) are actively used

## 2.6 Validation

- `npx tsc --noEmit`: ✅ 0 errors
- `npx vitest run`: ✅ 1987 tests passed (11 test files)
