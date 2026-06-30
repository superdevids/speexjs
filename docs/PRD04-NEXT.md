# Product Requirements Document — SpeexJS v2.x
## Volume 3 — Production Hardening & Ecosystem

> **Version:** 1.0
> **Status:** Draft — Next Development Phase
> **Last Updated:** 2026-06-29
> **Scope:** Features for v2.1+ — "Production-Ready Zero-Effort Framework"

---

## 1. Executive Summary

PRD01-03 telah membangun fondasi SpeexJS dari framework fullstack menjadi "no effort framework". Fase selanjutnya adalah **production hardening** — membuat framework ini tidak hanya mudah digunakan, tapi juga siap untuk production dengan skala besar.

**Tiga pilar utama PRD ini:**
1. **Quality & Reliability** — Testing rigour, type safety, error handling
2. **Performance** — Runtime optimization, bundle size, cold start
3. **Ecosystem** — Package distribution, documentation, community tools

---

## 2. Gap Analysis — Current State (v1.6.1)

| Area | Current State | Target | Priority |
|------|--------------|--------|----------|
| **Test Coverage** | 96.3% (2158 tests) | 98%+ (3000+ tests) | P0 |
| **Bundle Size** | 218 KB gzip | <150 KB gzip | P1 |
| **TypeScript Errors** | 0 (strict) | Maintain 0 | P0 |
| **Zero Dependencies** | ✅ | ✅ Maintain | P0 |
| **CLI Commands** | 27+ | 35+ | P1 |
| **Documentation** | Minimal | Comprehensive | P0 |
| **Benchmarks** | Existing (mitata) | Published suite vs Hono/Fastify | P1 |
| **Package Distribution** | speexjs only | speexjs + @speex/create + speexkit | P1 |

---

## 3. Feature Proposals — Next Phase

### N1 — Complete Test Coverage for All CLI Commands

**Current:** 19 test files, but many CLI commands lack tests.

**Target:** Every CLI command has at minimum:
- Happy path test (generates correct file)
- Error case test (missing args, invalid input)
- Edge case test (empty strings, special chars)

**Commands needing tests:**
- `make:auth`
- `make:crud`
- `make:admin`
- `make:agent`
- `make:flag`
- `deploy`
- `generate:app`
- `generate:sdk`
- `openapi:generate`
- `plugin:*`
- `env:generate` ✅ (baru)
- `schema:diff` ✅ (baru)

**Acceptance Criteria:**
- [ ] 25+ CLI command test files
- [ ] Each command has 3+ test cases
- [ ] Coverage stays above 96%

---

### N2 — Production Build Optimization

**Current:** tsup builds with minification and treeshaking, no code splitting for different runtimes.

**Target:**
- Entry point for Node.js (current)
- Entry point for Bun (optimized)
- Edge runtime entry (reduced Node APIs)
- Sub-150 KB gzip total

**Strategy:**
```typescript
// tsup.config.ts — multi-entry optimized
export default defineConfig([
  {
    entry: { /* Node.js full build */ },
    format: ['esm'],
    target: 'node18',
  },
  {
    entry: { /* Edge runtime build */ },
    format: ['esm'],
    target: 'es2022',
    external: ['fs', 'net', 'crypto', 'child_process'],
  },
])
```

**Acceptance Criteria:**
- [ ] Node.js build size < 150 KB gzip
- [ ] Edge build size < 80 KB gzip
- [ ] All existing tests pass on Node 18/20/22
- [ ] Basic test pass on Bun 1.2+

---

### N3 — @speex/create Package

**Current:** `speexjs init` requires speexjs installed globally or npx.

**Target:** Separate `@speex/create` package published to npm for `npx @speex/create my-app`.

**Package structure:**
```
packages/create-speexjs/
├── package.json      # @speex/create
├── index.ts          # Entry point
├── templates/        # Starter templates
│   ├── blank/
│   ├── fullstack/
│   ├── api-only/
│   └── saas/
└── README.md
```

**Acceptance Criteria:**
- [ ] `npx @speex/create my-app` works without install
- [ ] Supports `--template`, `--db`, `--auth` flags
- [ ] Selesai < 30 detik
- [ ] Published to npm

---

### N4 — Interactive Conversational Init (F1)

**Current:** `speexjs init` has basic template selection.

**Target:** Interactive wizard with progressive questions:
1. Project name
2. Use case (SaaS, API, Blog, Realtime)
3. Features (Auth, DB, Queue, WebSocket, Email)
4. Database dialect (MySQL, PostgreSQL, SQLite)
5. Deployment target (Node, Docker, Vercel)

**Files to create/modify:**
- `src/cli/commands/init.ts` — Enhanced with inquirer-like prompts

**Acceptance Criteria:**
- [ ] 5+ template choices with descriptions
- [ ] Feature selection with dependencies (e.g., selecting Auth auto-selects DB)
- [ ] Generated `.env.example` with only needed variables
- [ ] Non-interactive mode via flags

---

### N5 — Schema Migration Safety Guard (F28)

**Current:** No safety checks before migrations. `DROP TABLE` can be executed without warning.

**Target:** Migration safety guard that:
- Scans codebase for column references before DROP
- Detects data loss risk
- Requires confirmation for destructive operations
- Supports `--dry-run` flag

**Files to create:**
- `src/server/database/migration-safety.ts`
- Enhanced migration runner

**Acceptance Criteria:**
- [ ] Auto-detect code references to columns about to be dropped
- [ ] Warn about data loss for destructive migrations
- [ ] `--dry-run` shows SQL without executing
- [ ] Requires `--force` for destructive operations
- [ ] Color-coded terminal output

---

### N6 — VS Code Extension (F25)

**Current:** No IDE integration.

**Target:** Basic VS Code extension with:
- Route explorer sidebar
- Command palette shortcuts for `speexjs make:*`
- Syntax highlighting for speexjs templates

**Files to create:**
- `extensions/vscode/package.json`
- `extensions/vscode/src/extension.ts`

**Acceptance Criteria:**
- [ ] Route explorer reads `speexjs.config.ts` and shows all routes
- [ ] "SpeexJS: Generate Controller" etc. in command palette
- [ ] Published to VS Code Marketplace

---

### N7 — Cloud Functions Mode (F30)

**Current:** Only standard Node.js server mode.

**Target:** SpeexJS handlers that export as serverless functions for:
- AWS Lambda
- Google Cloud Functions
- Vercel Serverless Functions

**Files to create:**
- `src/server/edge/cloud-functions.ts`
- `src/cli/commands/build-function.ts`

**Acceptance Criteria:**
- [ ] `speexjs build:function` generates a single bundled handler file
- [ ] Handler compatible with AWS Lambda + API Gateway
- [ ] Handler compatible with Vercel
- [ ] Minimal cold start (< 10ms)

---

### N8 — Plugin Marketplace Search (F24)

**Current:** `speexjs plugin:install <name>` requires exact npm package name.

**Target:** `speexjs plugin:search <term>` searches an official plugin registry.

**Acceptance Criteria:**
- [ ] Search by keyword, category, or author
- [ ] Shows version, downloads, compatibility
- [ ] Install from search results
- [ ] Registry at `plugins.speexjs.dev`

---

### N9 — Automated Performance Profiler (F27)

**Current:** Manual benchmarks via `speexjs bench`. No auto-profiling.

**Target:** `speexjs profile` command that:
- Profiles route handlers and reports slow endpoints
- Detects memory leaks via heap snapshots
- Generates flame graph data

**Acceptance Criteria:**
- [ ] Profile each route 100x and report p50/p95/p99
- [ ] Detect routes with > 500ms latency
- [ ] Memory usage report per route
- [ ] Save profile data to `speexjs-profile/`

---

### N10 — Comprehensive Documentation Site

**Current:** Only README, ARCHITECTURE.md, inline code comments.

**Target:** Full documentation site at `speexjs.dev` with:
- Getting started guide
- Complete API reference
- Tutorials for each feature
- Migration guides
- Video tutorials

**Acceptance Criteria:**
- [ ] API reference auto-generated from TypeScript types
- [ ] Interactive playground
- [ ] Search functionality
- [ ] Dark/light mode

---

## 4. Priority Matrix

| Feature | Priority | Effort | Value | Version |
|---------|----------|--------|-------|---------|
| N1 — Test Coverage | **P0** | XL | ⭐⭐⭐⭐⭐ | v2.1 |
| N5 — Migration Safety | **P0** | M | ⭐⭐⭐⭐⭐ | v2.1 |
| N10 — Documentation | **P0** | XL | ⭐⭐⭐⭐⭐ | v2.1 |
| N3 — @speex/create | **P1** | M | ⭐⭐⭐⭐⭐ | v2.1 |
| N4 — Interactive Init | **P1** | M | ⭐⭐⭐⭐⭐ | v2.1 |
| N2 — Build Optimization | **P1** | M | ⭐⭐⭐⭐ | v2.2 |
| N7 — Cloud Functions | **P1** | L | ⭐⭐⭐⭐ | v2.2 |
| N6 — VS Code Extension | **P2** | L | ⭐⭐⭐ | v2.2 |
| N8 — Plugin Marketplace | **P2** | M | ⭐⭐⭐ | v2.2 |
| N9 — Performance Profiler | **P2** | M | ⭐⭐⭐ | v2.2 |

---

## 5. Roadmap

```
v2.0 (Current: 1.6.1)      v2.1 (Next)              v2.2 (Future)
─────────────────────       ──────────────────       ─────────────────
✅ All F1-F15 done         ● N1: Test Coverage      ● N2: Build Opt
✅ F16: Observability       ● N3: @speex/create      ● N6: VS Code Ext
✅ F19: Schema CLI          ● N4: Interactive Init   ● N7: Cloud Fn
✅ F3: Env Generate         ● N5: Migration Safety   ● N8: Plugin Mkt
✅ Critical Bug Fixes       ● N10: Documentation     ● N9: Profiler
```

---

## 6. Success Metrics

| Metric | Current | Target v2.1 | Target v2.2 |
|--------|---------|-------------|-------------|
| Test Count | 2,158 | 3,000+ | 4,000+ |
| Coverage | 96.3% | 98%+ | 98%+ |
| TypeScript Errors | 0 | 0 | 0 |
| Bundle Size | 218 KB | <150 KB | <120 KB |
| CLI Commands | 27 | 35+ | 40+ |
| npm Downloads | — | +300% | +500% |

---

## 7. Appendix — Quick Wins

These small improvements can be done alongside larger features:

| Improvement | Effort | Impact |
|-------------|--------|--------|
| Add `speexjs --version` with proper version | S | Medium |
| Add `speexjs config:validate` command | S | High |
| Add `speexjs config:show` command | S | Medium |
| Add colors to `speexjs list-routes` output | XS | Low |
| Add `--json` flag to `list-routes` | XS | Medium |
| Add `speexjs doctor` command (system check) | M | High |
| Add OpenAPI schema to Swagger UI | S | Medium |
| Make debug dashboard require no env flag | S | High |
| Add progress bars to `speexjs deploy` | M | Medium |
| Add `speexjs env:pull` (pull from .env.example) | S | Medium |
