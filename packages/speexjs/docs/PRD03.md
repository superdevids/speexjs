# Product Requirements Document — SpeexJS: No-Effort Framework Vision
## Volume 2 — Scale, Intelligence & Ecosystem

> **Version:** 2.0
> **Status:** Draft — Feature Proposal
> **Last Updated:** 2026-06-29
> **Predecessor:** PRD v1.0 (F1–F15, target v2.0)
> **Author:** Independent Analysis (based on speexjs v1.6.1 + PRD v1.0)
> **Scope:** Post-Foundation Features — "Framework yang Tumbuh Bersama Appmu"

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Context: Dari Mana Kita Sekarang](#2-context)
3. [Filosofi v2.0 — "No Effort at Scale"](#3-filosofi-v20)
4. [Gap Analysis — Post v2.0 Foundation](#4-gap-analysis)
5. [Feature Proposals](#5-feature-proposals)
   - [F16 — Observability Layer (Tracing + Metrics)](#f16--observability-layer)
   - [F17 — Multi-Tenant Architecture Built-In](#f17--multi-tenant-architecture-built-in)
   - [F18 — Background Job Scheduler UI](#f18--background-job-scheduler-ui)
   - [F19 — Database Schema Diff & Auto-Migration](#f19--database-schema-diff--auto-migration)
   - [F20 — Feature Flags Management UI](#f20--feature-flags-management-ui)
   - [F21 — AI-Assisted Code Generator](#f21--ai-assisted-code-generator)
   - [F22 — Real-Time Collaboration API Primitives](#f22--real-time-collaboration-api-primitives)
   - [F23 — Adaptive Rate Limiting](#f23--adaptive-rate-limiting)
   - [F24 — Plugin Marketplace CLI](#f24--plugin-marketplace-cli)
   - [F25 — SpeexJS Inspector (VS Code Extension)](#f25--speexjs-inspector-vs-code-extension)
   - [F26 — Zero-Downtime Deploy (Blue-Green)](#f26--zero-downtime-deploy-blue-green)
   - [F27 — Automated Performance Profiler](#f27--automated-performance-profiler)
   - [F28 — Schema Migration Safety Guard](#f28--schema-migration-safety-guard)
   - [F29 — Built-In Webhook System](#f29--built-in-webhook-system)
   - [F30 — SpeexJS Cloud Functions Mode](#f30--speexjs-cloud-functions-mode)
6. [Priority Matrix](#6-priority-matrix)
7. [Roadmap Placement](#7-roadmap-placement)
8. [Interdependency Graph](#8-interdependency-graph)
9. [Success Metrics](#9-success-metrics)
10. [Appendix — Architectural Decisions](#10-appendix)

---

## 1. Executive Summary

PRD v1.0 membangun **fondasi "no effort"** — mulai dari conversational CLI, zero-config auth, schema-driven CRUD, unified config, hingga one-command deploy. Jika v1.0 menjawab pertanyaan:

> *"Bagaimana developer bisa mulai secepat mungkin?"*

Maka PRD v2.0 ini menjawab pertanyaan yang berbeda:

> *"Bagaimana framework tetap terasa 'no effort' ketika app sudah production, sudah punya 10k users, sudah punya tim 10 orang, dan sudah punya 50 fitur?"*

**Dokumen ini mengusulkan 15 fitur baru (F16–F30)** yang membawa SpeexJS dari "no effort untuk mulai" ke "**no effort untuk scale**" — observability yang auto-setup, multi-tenancy yang deklaratif, AI-assisted generation, plugin ecosystem, zero-downtime deploy, dan lebih banyak lagi.

**Tagline untuk direction ini:**

> *"Start fast. Stay fast. Scale without rewriting."*

---

## 2. Context: Dari Mana Kita Sekarang

### Yang Sudah Ada (v1.x)

| Kategori | Status |
|---|---|
| 300+ framework features | ✅ v1.6.1 |
| Zero dependencies | ✅ v1.6.1 |
| 96.3% test coverage | ✅ v1.6.1 |
| TypeScript strict, 0 errors | ✅ v1.6.1 |

### Yang Dipropose di PRD v1.0 (target v2.0)

| Feature | Status |
|---|---|
| F1 — Conversational CLI | 📋 Proposed |
| F2 — File Structure Convention | 📋 Proposed |
| F3 — Typed Env Variables | 📋 Proposed |
| F4 — `@speex/create` | 📋 Proposed |
| F5 — Zero-Config Auth Scaffolding | 📋 Proposed |
| F6 — OpenAPI + SDK Client | 📋 Proposed |
| F7 — Server HMR | 📋 Proposed |
| F8 — Schema-Driven CRUD | 📋 Proposed |
| F9 — Dev Dashboard | 📋 Proposed |
| F10 — Plugin Presets | 📋 Proposed |
| F11 — Zero-Config Testing | 📋 Proposed |
| F12 — Middleware DSL | 📋 Proposed |
| F13 — Smart Error Hints | 📋 Proposed |
| F14 — Deploy Command | 📋 Proposed |
| F15 — speexjs.config.ts | 📋 Proposed |

### Gap yang Masih Ada Setelah v2.0

Setelah semua F1–F15 diimplementasikan, developer akan bisa **mulai dengan cepat** — tapi masih ada kebutuhan yang muncul **saat app tumbuh**:

```
Fase 1: Start      → dijawab PRD v1.0 (F1-F15)
Fase 2: Grow       → dijawab PRD v2.0 (F16-F30) ← dokumen ini
Fase 3: Enterprise → dijawab roadmap v3.0
```

---

## 3. Filosofi v2.0 — "No Effort at Scale"

### Masalah yang Muncul Saat App Tumbuh

```
App baru (1 developer, 100 users):
  ✅ Mudah dengan PRD v1.0

App yang tumbuh (5 developer, 10k users):
  ❌ Monitoring & alerting butuh setup Datadog/Sentry/Grafana terpisah
  ❌ Multi-tenancy butuh arsitektur ulang dari nol
  ❌ Job queue butuh dashboard terpisah (Bull Board, dst)
  ❌ DB migration butuh manual review untuk safety
  ❌ Deploy butuh downtime atau setup blue-green manual
  ❌ Plugin sharing antar project butuh npm package manual
  ❌ Performance profiling butuh tool terpisah
```

### Prinsip Desain PRD v2.0

| Prinsip | Artinya |
|---|---|
| **Additive, never breaking** | Semua fitur baru opt-in, tidak ubah behavior existing |
| **Zero new dependencies** | Tetap zero-dep — semua implementasi native |
| **Progressive disclosure** | Fitur sederhana terlihat sederhana, fitur complex bisa di-unlock |
| **Observable by default** | App SpeexJS harus bisa di-observe tanpa setup tambahan |
| **Shared nothing, share everything** | Multi-tenant isolation by default, sharing by explicit opt-in |

---

## 4. Gap Analysis — Post v2.0 Foundation

| Area | Setelah PRD v1.0 | Gap yang Tersisa | Priority |
|---|---|---|---|
| **Observability** | Debug toolbar (dev only) | Tidak ada production metrics/tracing/alerting | P0 |
| **Multi-tenancy** | Tidak ada | Harus arsitektur manual dari nol | P0 |
| **Job visibility** | Queue monitor (basic, v0.9) | Tidak ada scheduler UI, retry management, dead letter | P1 |
| **DB safety** | Migration runner | Tidak ada destructive change detection | P0 |
| **Feature flags** | Static flags ada | Tidak ada management UI, tidak ada rollout targeting | P1 |
| **AI assistance** | Tidak ada | Generator masih konvensional template-based | P1 |
| **Real-time** | WebSocket + SSE ada | Tidak ada higher-level primitives (presence, cursors, CRDTs) | P2 |
| **Rate limiting** | Static throttle ada | Tidak adaptive (tidak bisa respond ke traffic spike otomatis) | P1 |
| **Plugin sharing** | Plugin system ada | Tidak ada marketplace/registry CLI | P2 |
| **IDE integration** | Tidak ada | Tidak ada VS Code extension | P2 |
| **Zero-downtime** | `deploy` command (v2.0) | Deploy masih ada downtime | P0 |
| **Performance** | Tidak ada profiling | Tidak tahu mana route/query yang lambat di production | P1 |
| **Migration safety** | Tidak ada guard | Bisa DROP TABLE tanpa warning | P0 |
| **Webhooks** | Tidak ada outgoing | Harus buat sendiri untuk integrasi third-party | P1 |
| **Serverless** | Standard server mode | Tidak ada first-class serverless/edge function mode | P2 |

---

## 5. Feature Proposals

---

### F16 — Observability Layer (Tracing + Metrics)

**Status:** ❌ Belum ada (dev toolbar tidak cover production)
**Priority:** P0
**Target Version:** v2.1
**Depends on:** F15 (speexjs.config.ts), F9 (Dev Dashboard)

#### Problem Statement

Di production, developer blind. Tidak tahu request mana yang lambat, query mana yang bottleneck, berapa error rate, dan berapa memory usage. Saat ini harus setup Datadog, Sentry, atau Grafana yang masing-masing butuh konfigurasi tersendiri.

#### Proposed Solution

**Built-in observability layer** dengan tiga pilar (Metrics, Tracing, Logging) — semuanya zero-config, zero-dependency, dengan export ke standard formats.

#### Architecture: Three Pillars

```
┌─────────────────────────────────────────────────────┐
│              SpeexJS Observability                   │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   METRICS    │  │   TRACING    │  │  LOGGING   │ │
│  │              │  │              │  │            │ │
│  │ req/s        │  │ Trace ID     │  │ Structured │ │
│  │ error rate   │  │ Span timing  │  │ JSON logs  │ │
│  │ p50/p95/p99  │  │ DB queries   │  │ Log levels │ │
│  │ memory/cpu   │  │ Cache hits   │  │ Correlation│ │
│  │ queue depth  │  │ Queue jobs   │  │ Sampling   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │
│         └─────────────────┴──────────────────┘       │
│                           │                          │
│              ┌────────────▼────────────┐             │
│              │     Export Adapters     │             │
│              │                         │             │
│              │  Built-in: JSON / File  │             │
│              │  Optional: OTLP/Prometheus│            │
│              │  Optional: Datadog shim  │             │
│              └─────────────────────────┘             │
└─────────────────────────────────────────────────────┘
```

#### Config (di speexjs.config.ts)

```typescript
export default defineConfig({
  observability: {
    enabled: true,

    metrics: {
      enabled: true,
      endpoint: '/_speex/metrics',   // Prometheus-compatible scrape endpoint
      interval: 15,                  // seconds
      include: ['http', 'db', 'queue', 'cache', 'memory'],
    },

    tracing: {
      enabled: true,
      sampleRate: 0.1,               // 10% of requests in production
      propagation: 'w3c',            // W3C TraceContext standard
      export: {
        driver: 'otlp',              // OpenTelemetry Protocol
        endpoint: 'http://jaeger:4318/v1/traces',
      },
    },

    logging: {
      level: 'info',
      format: 'json',                // json | pretty
      destination: 'stdout',
      includeTraceId: true,          // Correlate logs dengan traces
    },

    alerts: {
      errorRate: { threshold: 0.05, window: '5m' },  // Alert if >5% errors
      p99Latency: { threshold: 2000, window: '5m' },  // Alert if p99 > 2s
      onAlert: async (alert) => {
        // Custom handler — kirim ke Slack, PagerDuty, dsb
        await notify(alert)
      },
    },
  },
})
```

#### Auto-Instrumentation (Zero Code)

Setelah config diaktifkan, SpeexJS otomatis instrument:

```typescript
// SEBELUM (manual, di setiap controller):
async index(req: Request) {
  const start = Date.now()
  try {
    const users = await User.query().paginate(1)
    metrics.record('users.list.duration', Date.now() - start)
    return users
  } catch (e) {
    metrics.increment('users.list.errors')
    throw e
  }
}

// SESUDAH (zero code — framework handle otomatis):
async index(req: Request) {
  return User.query().paginate(1)
  // ↑ Framework otomatis record:
  //   - HTTP request duration
  //   - SQL query count & duration
  //   - Memory snapshot
  //   - Trace span untuk request ini
}
```

#### Built-In Metrics Dashboard (extends F9 Dev Dashboard)

```
/_speex/dev/metrics

┌─────────────────────────────────────────────────────────────────┐
│  📊 Last 24 hours                           [1h] [6h] [24h] [7d]│
│                                                                  │
│  Requests/min  ████████████░░░░  847 req/min   ▲ 12%            │
│  Error Rate    █░░░░░░░░░░░░░░░  0.8%          ▼ 0.2%           │
│  p50 Latency   ███░░░░░░░░░░░░░  23ms                           │
│  p95 Latency   ████████░░░░░░░░  145ms                          │
│  p99 Latency   ████████████░░░░  892ms          ⚠️ Threshold 1s  │
│                                                                  │
│  Slowest Routes (p95):                                           │
│  1. GET /reports/monthly        1,240ms  ← Heavy query          │
│  2. POST /emails/send-bulk       890ms   ← External API call    │
│  3. GET /users?include=posts     445ms   ← N+1 detected ⚠️      │
│                                                                  │
│  Database:                                                       │
│  Total queries/req: 4.2 avg   Slowest: 234ms (users JOIN posts)  │
│  Cache hit rate: 73%           Pool usage: 6/10                  │
└─────────────────────────────────────────────────────────────────┘
```

#### N+1 Query Detection

```
⚠️  N+1 Query Detected
    Route: GET /users

    Executed 47 queries in 1 request:
    1x  SELECT * FROM users          (main query)
    46x SELECT * FROM posts WHERE user_id = ?  (per-user)

    💡 Fix: Use eager loading
       User.query().with('posts').paginate(1)
```

#### Acceptance Criteria

- [ ] Zero-config activation via `speexjs.config.ts`
- [ ] `/_speex/metrics` endpoint expose Prometheus-format metrics
- [ ] Trace ID otomatis di-inject ke setiap log line
- [ ] N+1 query detection dengan fix suggestion
- [ ] Alert system dengan custom handler
- [ ] Export ke OTLP (OpenTelemetry) untuk integrasi Jaeger/Grafana Tempo
- [ ] Zero performance overhead saat `enabled: false`

---

### F17 — Multi-Tenant Architecture Built-In

**Status:** ❌ Belum ada (di roadmap v3.0)
**Priority:** P0 (dipercepat dari v3.0 ke v2.1)
**Target Version:** v2.1
**Depends on:** F15 (config), F8 (schema CRUD)

#### Problem Statement

Multi-tenancy adalah kebutuhan yang muncul hampir di setiap SaaS. Saat ini developer harus arsitektur dari nol: desain tenant isolation, buat tenant middleware, modifikasi semua query untuk scoping, dan pilih strategy (schema vs database vs row-level). Ini bisa 2-4 minggu pekerjaan.

#### Proposed Solution

**Deklaratif multi-tenancy** — developer cukup pilih strategy, framework yang handle isolation di semua layer.

#### Tenant Strategies

```typescript
// speexjs.config.ts
export default defineConfig({
  multiTenant: {
    strategy: 'row',         // 'row' | 'schema' | 'database'
    resolver: 'subdomain',   // 'subdomain' | 'header' | 'path' | 'custom'

    // Strategy: row-level (satu DB, semua tabel punya tenant_id)
    // Pros: Simple, murah. Cons: Data tidak completely isolated

    // Strategy: schema (satu DB, schema per tenant)
    // Pros: Better isolation, shared infrastructure
    // Cons: PostgreSQL only

    // Strategy: database (DB per tenant)
    // Pros: Full isolation, easy backup per tenant
    // Cons: Resource intensive
  }
})
```

#### Row-Level Strategy (Most Common)

```typescript
// Framework auto-inject tenant scope ke SEMUA query
// Developer tidak perlu tambah WHERE tenant_id = ? secara manual

// Sebelum (manual, error-prone):
async index(req: Request) {
  const tenantId = req.tenant.id  // Harus ingat inject ini
  return User.query()
    .where('tenant_id', tenantId)  // Harus ingat filter ini
    .paginate(1)
  // ← Kalau lupa where() ini, semua tenant bisa lihat data tenant lain!
}

// Sesudah (otomatis, safe):
async index(req: Request) {
  return User.query().paginate(1)
  // ↑ Framework otomatis inject: WHERE tenant_id = {current_tenant_id}
  // Tidak mungkin lupa — framework yang enforce
}
```

#### Tenant Resolution

```typescript
// Subdomain resolver (default)
// tenant1.myapp.com → tenant: tenant1
// tenant2.myapp.com → tenant: tenant2

// Custom resolver
export default defineConfig({
  multiTenant: {
    strategy: 'row',
    resolver: async (req) => {
      // Bisa resolve dari mana saja
      const apiKey = req.header('X-API-Key')
      const tenant = await TenantApiKey.query()
        .where('key', apiKey)
        .first()
      return tenant?.id
    },
  }
})
```

#### Schema-Level Strategy (PostgreSQL)

```bash
# Generate migration untuk schema-per-tenant
speexjs make:migration AddTenantSchemas --strategy schema

# Auto-provision tenant baru
speexjs tenant:provision acme-corp
# ↑ Buat schema baru, run semua migration di schema tersebut

# List semua tenant
speexjs tenant:list

# Migrate semua tenant
speexjs migrate --all-tenants
```

#### Tenant-Aware Models

```typescript
// Model otomatis di-scope ke current tenant
export class User extends Model {
  // Tidak perlu tambah apapun — tenant isolation otomatis
  static table = 'users'
  fillable = ['name', 'email']
}

// Cross-tenant query (explicit, butuh permission)
@superAdmin()
async getAllUsers(req: Request) {
  return User.query().withoutTenantScope().paginate(1)
  //                 ↑ Explicit bypass — tidak bisa "accidental"
}
```

#### Tenant Management API (Auto-Generated)

```typescript
// speexjs make:tenant-management
// Auto-generate:
POST   /tenants              // Provision tenant baru
GET    /tenants              // List semua tenant (superadmin)
GET    /tenants/:id          // Get tenant detail
PATCH  /tenants/:id          // Update tenant config
DELETE /tenants/:id          // Deprovision tenant
POST   /tenants/:id/suspend  // Suspend tenant
```

#### Acceptance Criteria

- [ ] Support 3 strategies: row, schema, database
- [ ] Auto-scope semua Model query ke current tenant
- [ ] Tenant resolution dari subdomain, header, path, atau custom function
- [ ] `speexjs tenant:*` CLI commands untuk management
- [ ] Cross-tenant query harus explicit (`withoutTenantScope()`)
- [ ] Migration bisa di-run per-tenant atau semua sekaligus
- [ ] Zero breaking change untuk app yang tidak pakai multi-tenant

---

### F18 — Background Job Scheduler UI

**Status:** ⚠️ Partial (Queue monitor v0.9 basic, Scheduler ada tapi no UI)
**Priority:** P1
**Target Version:** v2.1
**Depends on:** F9 (Dev Dashboard), F16 (Observability)

#### Problem Statement

Queue dan scheduler sudah ada di v1.x tapi visibilitas sangat terbatas. Developer tidak bisa lihat job history, retry manually, inspect payload, atau pause/resume specific jobs tanpa code.

#### Proposed Solution

**Full Job Management UI** yang accessible di `/_speex/dev/jobs` (dev) dan `/_speex/admin/jobs` (production dengan auth).

#### UI Sections

**1. Queue Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔄 Queue Overview                          [Pause All] [Refresh]│
│                                                                  │
│  Queue          Waiting  Running  Done    Failed  Throughput     │
│  ─────────────────────────────────────────────────────────────  │
│  default        12       3        1,847   23      45 job/min     │
│  emails         0        1        892     2       8 job/min      │
│  reports        3        0        234     0       2 job/min      │
│  critical       0        0        56      0       0.5 job/min    │
└─────────────────────────────────────────────────────────────────┘
```

**2. Job Detail & Inspect**

```
┌─────────────────────────────────────────────────────────────────┐
│  Job: SendWelcomeEmail #4523                                     │
│  Status: ❌ Failed (3/3 attempts)    Queue: emails               │
│                                                                  │
│  Payload:                                                        │
│  {                                                               │
│    "userId": 42,                                                 │
│    "email": "user@example.com",                                  │
│    "template": "welcome"                                         │
│  }                                                               │
│                                                                  │
│  Error:                                                          │
│  SMTPConnectionError: Connection timeout after 5000ms            │
│  at Mailer.send (src/mail/Mailer.ts:234)                        │
│                                                                  │
│  Timeline:                                                       │
│  14:23:01  Queued                                                │
│  14:23:05  Attempt 1 → Failed (SMTP timeout)   Retry in 1min    │
│  14:24:05  Attempt 2 → Failed (SMTP timeout)   Retry in 5min    │
│  14:29:05  Attempt 3 → Failed (SMTP timeout)   → Dead Letter    │
│                                                                  │
│  [🔁 Retry Now]  [✏️ Edit Payload & Retry]  [🗑️ Discard]         │
└─────────────────────────────────────────────────────────────────┘
```

**3. Scheduler Management**

```
┌─────────────────────────────────────────────────────────────────┐
│  ⏰ Scheduled Tasks                                              │
│                                                                  │
│  Task                    Schedule      Last Run     Next Run     │
│  ───────────────────────────────────────────────────────────    │
│  GenerateDailyReport     0 6 * * *     Today 06:00  Tomorrow    │
│  CleanExpiredSessions    0 * * * *     14:00:00     15:00:00    │
│  SendWeeklyDigest        0 9 * * 1     Mon 09:00    Next Mon    │
│  PruneAuditLogs          0 0 1 * *     Jun 1        Jul 1       │
│                                                                  │
│  [▶ Run Now]  [⏸ Pause]  [📋 View History]                       │
└─────────────────────────────────────────────────────────────────┘
```

**4. Dead Letter Queue**

```
┌─────────────────────────────────────────────────────────────────┐
│  💀 Dead Letter Queue (23 jobs)         [Retry All] [Clear All] │
│                                                                  │
│  Job                    Failed At    Error           Actions     │
│  ─────────────────────────────────────────────────────────────  │
│  SendWelcomeEmail #4523  14:29:05    SMTP timeout   [Retry][Del] │
│  ResizeImage #4498       13:15:22    OOM (512MB)    [Retry][Del] │
│  ImportCSV #4401         11:03:44    Parse error    [Retry][Del] │
└─────────────────────────────────────────────────────────────────┘
```

#### Production Access (dengan Auth)

```typescript
// speexjs.config.ts
export default defineConfig({
  admin: {
    jobs: {
      enabled: true,
      path: '/_speex/admin/jobs',
      guard: 'admin',    // Pakai auth guard 'admin'
      // Atau custom auth:
      auth: async (req) => {
        return req.header('X-Admin-Token') === process.env.ADMIN_TOKEN
      },
    },
  },
})
```

#### Acceptance Criteria

- [ ] Real-time queue stats via SSE (sudah ada di v1.x)
- [ ] Inspect job payload dan error message
- [ ] Manual retry dengan optional payload edit
- [ ] Dead letter queue management
- [ ] Scheduler history dan next-run preview
- [ ] "Run Now" untuk trigger scheduled task manual
- [ ] Pause/resume per-queue
- [ ] Production mode dengan authentication
- [ ] Export job history sebagai CSV

---

### F19 — Database Schema Diff & Auto-Migration

**Status:** ❌ Belum ada
**Priority:** P0
**Target Version:** v2.1
**Depends on:** F8 (Schema-Driven CRUD), F15 (config)

#### Problem Statement

Developer sering lupa buat migration saat model berubah, atau sebaliknya — migration ada tapi tidak sync dengan model. Di production, ada kasus migration yang tidak sengaja DROP kolom yang masih dipakai.

#### Proposed Solution

**Schema diff engine** yang compare model definition vs database schema aktual, auto-detect perubahan, dan generate migration yang safe.

#### Workflow

```bash
# Detect perbedaan antara model dan DB
speexjs schema:diff

# Output:
┌─────────────────────────────────────────────────────────────────┐
│  📊 Schema Diff                                                  │
│                                                                  │
│  Model: User (src/models/User.ts)                                │
│  Table: users                                                    │
│                                                                  │
│  Changes detected:                                               │
│                                                                  │
│  ➕ ADD    column  bio        TEXT    NULL                       │
│  ➕ ADD    column  avatar_url VARCHAR(500) NULL                  │
│  ✏️  MODIFY column  name       VARCHAR(100) → VARCHAR(255)        │
│  ❌ DROP   column  old_field  (still referenced in UserResource) │
│                                                                  │
│  ⚠️  Safety Warnings:                                             │
│  • DROP column 'old_field' — still used in:                     │
│    - src/resources/UserResource.ts:34                            │
│    - src/controllers/UserController.ts:78                        │
│    Suggested: use soft-delete column instead                     │
│                                                                  │
│  Generate migration? [Y/n]                                       │
└─────────────────────────────────────────────────────────────────┘
```

```bash
# Auto-generate migration dari diff
speexjs schema:migrate
# → Generates: src/migrations/004_update_users_table.ts

# Preview SQL yang akan dijalankan (dry run)
speexjs migrate --dry-run
# Output: Actual SQL statements, no execution
```

#### Safety Guard System

```typescript
// Migration safety checks sebelum execute
const safetyChecks = [
  {
    name: 'DropColumnCheck',
    check: async (migration) => {
      // Scan seluruh codebase untuk referensi ke kolom yang akan di-drop
      const references = await scanCodebase(migration.droppedColumns)
      if (references.length > 0) {
        return {
          safe: false,
          warning: `Column referenced in ${references.length} files`,
          files: references,
        }
      }
    },
  },

  {
    name: 'DataLossCheck',
    check: async (migration) => {
      // Cek apakah ada data yang akan hilang
      const rowCount = await db.count('SELECT COUNT(*) FROM ?', [migration.targetTable])
      if (rowCount > 0 && migration.hasDestructiveChanges) {
        return {
          safe: false,
          warning: `${rowCount} rows affected — backup recommended`,
        }
      }
    },
  },

  {
    name: 'IndexCheck',
    check: async (migration) => {
      // Detect missing indexes untuk foreign keys
      const missingIndexes = await detectMissingIndexes(migration)
      return {
        safe: true,
        suggestions: missingIndexes.map(idx => `Consider adding index on ${idx}`),
      }
    },
  },
]
```

#### Generated Migration (Smart)

```typescript
// AUTO-GENERATED by speexjs schema:migrate
// Reviewed and confirmed by developer

export class UpdateUsersTable_004 extends Migration {
  async up() {
    await this.schema.alter('users', (table) => {
      // Safe operations first
      table.text('bio').nullable()
      table.string('avatar_url', 500).nullable()
      table.string('name', 255).change()  // Expanding — safe

      // Dangerous operation: deferred, dengan rename strategy
      // ⚠️ 'old_field' masih direferensi — di-rename dulu, bukan di-drop
      // Hapus baris ini dan uncomment DROP setelah code references dibersihkan:
      // table.renameColumn('old_field', '_deprecated_old_field')
      // table.dropColumn('_deprecated_old_field')  // Run di migration berikutnya
    })
  }

  async down() {
    await this.schema.alter('users', (table) => {
      table.dropColumn('bio')
      table.dropColumn('avatar_url')
      table.string('name', 100).change()
    })
  }
}
```

#### Acceptance Criteria

- [ ] `speexjs schema:diff` compare model vs live DB
- [ ] Detect: column add, modify, drop, rename; index add/drop; FK add/drop
- [ ] Safety scan — search seluruh codebase untuk referensi ke kolom yang akan di-drop
- [ ] `speexjs migrate --dry-run` preview SQL tanpa execute
- [ ] Konfirmasi interaktif sebelum destructive change
- [ ] Generated migration dengan comment yang jelas untuk dangerous operations
- [ ] `speexjs migrate --backup` auto-backup sebelum run

---

### F20 — Feature Flags Management UI

**Status:** ⚠️ Partial (Feature Flags v0.9 ada, tapi no management UI)
**Priority:** P1
**Target Version:** v2.1
**Depends on:** F9 (Dev Dashboard)

#### Problem Statement

Feature flags sudah ada di v1.x tapi hanya static — define di code, tidak bisa toggle runtime. Developer harus redeploy untuk enable/disable flag. Tidak ada targeting (flag ON untuk user tertentu saja).

#### Proposed Solution

**Dynamic feature flags** dengan persistent storage dan management UI — toggle flag di runtime tanpa deploy ulang.

#### Flag Types

```typescript
// speexjs.config.ts
export default defineConfig({
  featureFlags: {
    store: 'database',        // 'memory' | 'database' | 'redis'
    adminPath: '/_speex/flags',
    adminGuard: 'admin',

    flags: {
      // Simple on/off
      'new-checkout-flow': {
        type: 'boolean',
        default: false,
        description: 'Enable redesigned checkout page',
      },

      // Percentage rollout
      'ai-recommendations': {
        type: 'rollout',
        percentage: 20,       // 20% of users
        description: 'AI product recommendations in cart',
      },

      // User targeting
      'beta-dashboard': {
        type: 'targeting',
        rules: [
          { attribute: 'plan', operator: 'in', values: ['pro', 'enterprise'] },
          { attribute: 'country', operator: 'eq', value: 'US' },
        ],
        description: 'New dashboard for pro+ users in US',
      },

      // A/B experiment
      'button-color': {
        type: 'experiment',
        variants: {
          control: { value: 'blue', weight: 50 },
          treatment: { value: 'green', weight: 50 },
        },
        description: 'Test green vs blue CTA button',
      },
    },
  },
})
```

#### Usage (sama seperti sebelumnya, tapi sekarang dynamic)

```typescript
// Controller
async checkout(req: Request) {
  if (await flags.isEnabled('new-checkout-flow', req.user)) {
    return this.newCheckoutFlow(req)
  }
  return this.legacyCheckoutFlow(req)
}

// A/B variant
const variant = await flags.variant('button-color', req.user)
// → 'blue' atau 'green' berdasarkan user hash
```

#### Management UI

```
/_speex/flags

┌─────────────────────────────────────────────────────────────────┐
│  🚩 Feature Flags                              [+ New Flag]      │
│                                                                  │
│  Flag                    Type        Status    Exposure Actions  │
│  ─────────────────────────────────────────────────────────────  │
│  new-checkout-flow       Boolean     🔴 OFF    0%      [ON][Edit]│
│  ai-recommendations      Rollout     🟡 20%    20%     [Edit]   │
│  beta-dashboard          Targeting   🟢 ON     Pro+    [Edit]   │
│  button-color            Experiment  🔵 A/B    50/50   [Results]│
│                                                                  │
│  ────────────────────────────────────────────────────────────── │
│  Flag: button-color — Experiment Results                         │
│                                                                  │
│  Variant      Users    Conversion    Revenue    Winner           │
│  Control      4,523    3.2%          $45/user   —               │
│  Treatment    4,488    4.7%          $52/user   ✅ +46% revenue  │
│                                                                  │
│  [🏆 Declare Winner: Treatment]  [📊 Export Data]               │
└─────────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria

- [ ] Toggle flag di UI tanpa redeploy
- [ ] Percentage rollout dengan consistent hashing per-user
- [ ] Targeting rules berdasarkan user attributes
- [ ] A/B experiment dengan statistical significance tracking
- [ ] Audit log semua perubahan flag (siapa, kapan, dari apa ke apa)
- [ ] Flag history / rollback ke state sebelumnya
- [ ] SDK client auto-update saat flag berubah (polling / SSE)

---

### F21 — AI-Assisted Code Generator

**Status:** ❌ Belum ada
**Priority:** P1
**Target Version:** v2.2
**Depends on:** F1 (Conversational CLI), F8 (Schema CRUD), F15 (config)

#### Problem Statement

`speexjs make:resource` generate boilerplate berdasarkan template statis. Developer masih harus manual customisasi logic bisnis. Seharusnya developer bisa describe apa yang mereka mau dalam bahasa natural, dan framework yang generate kode yang sesuai.

#### Proposed Solution

**AI-powered `speexjs ai:generate`** yang terima deskripsi natural language dan generate kode yang contextual (paham schema yang sudah ada, paham conventions project).

#### Usage

```bash
speexjs ai:generate "Buat sistem komentar bersarang (nested comments) untuk Post,
dengan fitur:
- User bisa reply ke komentar lain (max depth 3)
- Like/unlike komentar
- Soft delete
- Pagination cursor-based
- Realtime update via SSE ketika ada komentar baru"
```

#### Generated Output

```
🤖 Analyzing your project context...
   Found: Post model, User model, existing auth system

📋 Generation Plan:
   1. Comment model (with parent_id, likes_count, depth)
   2. CommentLike model (polymorphic)
   3. 2 migrations
   4. CommentController (index, store, destroy, like, unlike)
   5. CommentResource (nested serialization)
   6. CommentSchema (validation)
   7. SSE endpoint untuk realtime
   8. 12 tests

   Estimated code: ~450 lines

? Proceed? [Y/n]

✅ src/models/Comment.ts
✅ src/models/CommentLike.ts
✅ src/migrations/005_create_comments_table.ts
✅ src/migrations/006_create_comment_likes_table.ts
✅ src/controllers/CommentController.ts
✅ src/resources/CommentResource.ts
✅ src/schemas/CommentSchema.ts
✅ src/tests/CommentController.test.ts

🎉 Done! 453 lines generated across 8 files.

Next steps:
1. Run migration: speexjs migrate
2. Review business logic in CommentController.ts
3. Run tests: npm test
```

#### Context Awareness

AI generator paham context project:

```typescript
// Generator scan dan inject context:
const projectContext = {
  models: await scanModels('src/models/'),        // User, Post, Comment...
  schemas: await scanSchemas('src/schemas/'),     // Existing validation rules
  routes: await scanRoutes('src/routes/'),        // Existing route patterns
  conventions: await detectConventions(project),  // Naming, file structure
  auth: await detectAuthSetup(config),            // Auth guards yang aktif
  database: config.database.dialect,              // MySQL/PostgreSQL/SQLite
}

// Generated code mengikuti conventions yang sudah ada di project
```

#### Provider Options

```typescript
// speexjs.config.ts
export default defineConfig({
  ai: {
    provider: 'anthropic',  // 'anthropic' | 'openai' | 'local' (Ollama)
    model: 'claude-sonnet-4-6',
    apiKey: process.env.ANTHROPIC_API_KEY,

    generate: {
      reviewBeforeWrite: true,  // Tampilkan preview sebelum tulis file
      includeTests: true,       // Generate test file sekaligus
      addComments: true,        // Tambah explanatory comments
    },
  },
})
```

#### Additional Commands

```bash
# Explain existing code
speexjs ai:explain src/controllers/UserController.ts

# Review code dan suggest improvements
speexjs ai:review src/

# Generate tests untuk file yang belum punya test
speexjs ai:test src/controllers/

# Fix failing test
speexjs ai:fix "npm test" output.log
```

#### Acceptance Criteria

- [ ] Natural language input → working, contextual code
- [ ] Generator paham schema dan model yang sudah ada
- [ ] Preview sebelum write files
- [ ] Generated code mengikuti project conventions (naming, structure)
- [ ] Support multiple AI providers (Anthropic, OpenAI, local Ollama)
- [ ] `ai:explain`, `ai:review`, `ai:test`, `ai:fix` commands
- [ ] Generated tests langsung bisa dijalankan
- [ ] Fallback ke template-based generation jika no API key

---

### F22 — Real-Time Collaboration API Primitives

**Status:** ⚠️ Partial (WebSocket + SSE ada, tapi low-level)
**Priority:** P2
**Target Version:** v2.2
**Depends on:** F15 (config), F16 (observability)

#### Problem Statement

WebSocket dan SSE sudah ada tapi developer masih harus implement sendiri fitur high-level seperti presence (siapa yang online), cursors (posisi user di dokumen), dan conflict-free shared state. Ini butuh banyak code dan error-prone.

#### Proposed Solution

**Higher-level real-time primitives** di atas WebSocket existing — presence, cursors, shared state, dan CRDT-based conflict resolution.

#### Primitives

**1. Presence** — Who's online

```typescript
// Server
import { Presence } from 'speexjs'

const presence = new Presence('document:123')

// Auto-track siapa yang join/leave channel
presence.on('join', (user) => broadcast({ type: 'user-joined', user }))
presence.on('leave', (user) => broadcast({ type: 'user-left', user }))

// Route
router.ws('/documents/:id/presence', (socket, req) => {
  presence.track(socket, {
    userId: req.user.id,
    name: req.user.name,
    avatar: req.user.avatar,
    cursor: null,
  })
})

// Get current members
const members = await presence.members('document:123')
// → [{ userId: 1, name: 'Alice', cursor: {x: 100, y: 200} }, ...]
```

**2. Cursors** — Where users are

```typescript
// Client (auto-generated SDK dari F6)
const doc = speexClient.realtime.document('doc-123')

// Track cursor
doc.updateCursor({ x: mouseX, y: mouseY, selection: { start: 10, end: 20 } })

// Subscribe ke cursor semua user lain
doc.onCursors((cursors) => {
  cursors.forEach(({ userId, x, y, color }) => renderCursor(userId, x, y, color))
})
```

**3. Shared State (CRDT)** — Conflict-free editing

```typescript
// Server — define shared document
import { SharedDoc } from 'speexjs'

const doc = new SharedDoc('document:123', {
  type: 'rich-text',    // 'rich-text' | 'json' | 'counter' | 'map'
  persist: true,        // Auto-save ke database
  history: true,        // Track edit history (undo/redo)
})

router.ws('/documents/:id/collab', (socket) => {
  doc.connect(socket)
  // Framework handle:
  // - Merge conflicts dengan CRDT algorithm
  // - Broadcast updates ke semua connected clients
  // - Persist perubahan ke DB
  // - Sync state ke client baru yang join
})
```

**4. Rooms** — Group management

```typescript
// High-level room abstraction
const room = speexjs.rooms.get('game:lobby:42')

room.on('message', (msg, sender) => {
  room.broadcast({ type: 'chat', from: sender.id, text: msg.text })
})

// Auto-cleanup saat semua user leave
room.onEmpty(() => room.destroy())
```

#### Acceptance Criteria

- [ ] Presence tracking dengan join/leave events
- [ ] Cursor sharing dengan multi-user awareness
- [ ] CRDT-based shared state (rich-text dan JSON)
- [ ] Room management dengan auto-cleanup
- [ ] Persist shared state ke database
- [ ] Edit history (undo/redo)
- [ ] Scale via Redis adapter untuk multi-server deployment
- [ ] Auto-generated client SDK (extends F6)

---

### F23 — Adaptive Rate Limiting

**Status:** ⚠️ Partial (Static throttle ada)
**Priority:** P1
**Target Version:** v2.1
**Depends on:** F16 (observability), F15 (config)

#### Problem Statement

Rate limiting saat ini static (misal: 100 req/min untuk semua). Tidak bisa respond terhadap traffic spike otomatis, tidak bisa bedakan legitimate burst dari DDoS, dan tidak ada per-user fairness.

#### Proposed Solution

**Adaptive rate limiting** yang menyesuaikan limit berdasarkan traffic pattern, server load, dan user behavior.

#### Configuration

```typescript
export default defineConfig({
  rateLimit: {
    adaptive: {
      enabled: true,

      // Basis limit
      default: { requests: 100, window: '1m' },

      // Naik limit kalau server idle
      boost: {
        condition: 'server_load < 30%',
        multiplier: 2.0,             // 200 req/min saat server santai
      },

      // Turun limit saat server stress
      throttle: {
        condition: 'server_load > 80%',
        multiplier: 0.5,             // 50 req/min saat server sibuk
        notifyUser: true,            // Kirim Retry-After header
      },

      // Per-tier limits (berdasarkan user plan)
      tiers: {
        free:       { requests: 60,    window: '1m' },
        pro:        { requests: 300,   window: '1m' },
        enterprise: { requests: 1000,  window: '1m' },
        internal:   { requests: 10000, window: '1m' },  // Untuk microservice calls
      },

      // Token bucket per endpoint
      endpoints: {
        'POST /auth/login':     { requests: 10,  window: '15m', byIp: true },
        'POST /auth/register':  { requests: 5,   window: '1h',  byIp: true },
        'GET /exports/*':       { requests: 5,   window: '1h',  byUser: true },
      },

      // DDoS detection
      ddos: {
        enabled: true,
        threshold: 500,   // req/s dari single IP → auto-block
        blockDuration: '1h',
        whitelist: ['10.0.0.0/8'],  // Internal network
      },
    },
  },
})
```

#### Adaptive Algorithm

```
Every 30 seconds, re-evaluate limits:

1. Measure current server load (CPU, memory, event loop lag)
2. Measure p95 latency dari observability layer (F16)
3. Adjust global multiplier:
   - Load < 30% AND p95 < 50ms  → multiplier = 1.5 (boost)
   - Load 30-70%                 → multiplier = 1.0 (normal)
   - Load 70-85%                 → multiplier = 0.75 (reduce)
   - Load > 85% OR p95 > 2s     → multiplier = 0.5 (emergency)

4. Apply per-IP anomaly detection:
   - Sudden burst > 10x baseline dari single IP → temporary hold
   - Sustained high rate > 1h dari single IP → alert + review
```

#### Response Headers

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1719652800
X-RateLimit-Policy: adaptive
Retry-After: 43
X-RateLimit-Reason: server-load-reduction
```

#### Acceptance Criteria

- [ ] Dynamic limit adjustment berdasarkan server load
- [ ] Per-tier limits berdasarkan user attribute
- [ ] Per-endpoint limits dengan custom windows
- [ ] DDoS auto-detection dan blocking
- [ ] Whitelist untuk internal services
- [ ] Informative response headers
- [ ] Rate limit stats di observability dashboard (F16)
- [ ] Alert saat sustained high traffic

---

### F24 — Plugin Marketplace CLI

**Status:** ❌ Belum ada
**Priority:** P2
**Target Version:** v2.2
**Depends on:** F10 (Plugin Presets), F15 (config)

#### Problem Statement

Plugin system ada tapi tidak ada cara untuk discover, install, dan share plugin. Developer harus buat plugin dari nol atau copy-paste dari project lain.

#### Proposed Solution

**Plugin marketplace** dengan CLI commands — mirip seperti `brew`, `cargo add`, atau `composer require` tapi untuk SpeexJS plugins.

#### CLI Commands

```bash
# Search plugin
speexjs plugin:search stripe
# → @speex/plugin-stripe     v2.1.0  Stripe payment integration  ⭐ 2.3k
# → @speex/plugin-stripe-connect v1.0  Stripe Connect for marketplace  ⭐ 445
# → community/speex-stripe-webhooks  v1.2  Stripe webhook handler  ⭐ 123

# Install plugin
speexjs plugin:install @speex/plugin-stripe

# → Installing @speex/plugin-stripe@2.1.0...
# → Updating speexjs.config.ts...
# → Running plugin setup...
# ✅ Plugin installed! Add your STRIPE_SECRET_KEY to .env

# List installed plugins
speexjs plugin:list
# → @speex/plugin-stripe      v2.1.0  ✅ Active
# → @speex/plugin-s3          v1.3.1  ✅ Active
# → @speex/plugin-sentry      v1.0.0  ✅ Active

# Update plugin
speexjs plugin:update @speex/plugin-stripe

# Remove plugin
speexjs plugin:remove @speex/plugin-stripe

# Create new plugin (scaffold)
speexjs plugin:create my-company-auth
```

#### Plugin Manifest Format

```typescript
// plugin.manifest.ts (di dalam plugin package)
export default {
  name: '@speex/plugin-stripe',
  version: '2.1.0',
  description: 'Stripe payment integration for SpeexJS',
  author: 'SpeexJS Team',
  speexVersion: '>=2.0.0',
  license: 'MIT',

  // Config yang plugin butuhkan
  requires: {
    env: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    packages: [],   // Zero deps tetap dijaga!
    speexModules: ['database', 'queue', 'webhook'],
  },

  // Apa yang plugin tambahkan
  provides: {
    routes: ['/webhooks/stripe', '/billing/*'],
    models: ['Subscription', 'Payment', 'Invoice'],
    commands: ['billing:sync', 'billing:cancel'],
    config: 'cashier',
  },

  // Setup script (auto-run setelah install)
  setup: async (app, config) => {
    await app.migrate()   // Run plugin migrations
    console.log('Stripe plugin ready!')
  },
}
```

#### Official Plugin Registry

```
plugins.speexjs.dev

Categories:
├── Payments        → stripe, paddle, midtrans, xendit
├── Authentication  → saml, ldap, magic-link, webauthn
├── Storage         → s3, gcs, cloudinary, bunny-cdn
├── Email           → sendgrid, mailgun, ses, postmark
├── Monitoring      → sentry, datadog, newrelic, grafana
├── Search          → meilisearch, algolia, elasticsearch
├── Queue           → redis, rabbitmq, sqs
├── AI              → openai, anthropic, huggingface
└── Utils           → slugify, currency, country, phone
```

#### Acceptance Criteria

- [ ] `speexjs plugin:search/install/remove/update/list` commands
- [ ] Plugin manifest format yang standar
- [ ] Auto-update `speexjs.config.ts` saat install plugin
- [ ] Plugin setup wizard (prompt untuk API keys dsb)
- [ ] `speexjs plugin:create` untuk scaffold plugin baru
- [ ] Official plugin registry di `plugins.speexjs.dev`
- [ ] Plugin versioning dan compatibility check
- [ ] Community plugin submission process

---

### F25 — SpeexJS Inspector (VS Code Extension)

**Status:** ❌ Belum ada
**Priority:** P2
**Target Version:** v2.2
**Depends on:** F2 (file convention), F9 (dev dashboard)

#### Problem Statement

Developer harus switch antara editor dan browser/terminal untuk lihat routes, debug queries, dan scaffold file. Tidak ada IDE integration yang mempercepat workflow.

#### Proposed Solution

**VS Code extension** `SpeexJS Inspector` yang membawa semua dev tools langsung ke editor.

#### Extension Features

**1. Route Explorer (Sidebar)**

```
SPEEXJS ROUTES
├── 🌐 GET    /                          HomeController.index
├── 👤 Auth Required
│   ├── GET  /users                     UserController.index
│   ├── POST /users                     UserController.store
│   └── 🔒 Admin Only
│       ├── GET  /admin/users           AdminController.index
│       └── DEL  /admin/users/:id       AdminController.destroy
├── 🔌 WebSocket
│   └── WS   /chat                      ChatController.handle
└── 📊 API
    ├── GET  /api/v1/posts              PostController.index
    └── POST /api/v1/posts              PostController.store

[Click route → jump to controller]
[Right-click → Test in API Playground]
```

**2. Inline SQL Preview**

```typescript
// Hover di atas query untuk lihat SQL yang dihasilkan
const users = await User
  .query()        // ← Hover: SELECT * FROM users
  .where('active', true)  // ← Hover: WHERE active = 1
  .with('posts')  // ← Hover: + LEFT JOIN posts ON posts.user_id = users.id
  .paginate(1)    // ← Hover: LIMIT 15 OFFSET 0
//
// Tooltip:
// ┌────────────────────────────────────────────┐
// │ Generated SQL (MySQL):                     │
// │ SELECT users.*, posts.*                    │
// │ FROM users                                 │
// │ LEFT JOIN posts ON posts.user_id = users.id│
// │ WHERE users.active = 1                     │
// │ LIMIT 15 OFFSET 0                          │
// │                                            │
// │ Estimated rows: ~245  [Run in DB Client]   │
// └────────────────────────────────────────────┘
```

**3. Quick Scaffold (Command Palette)**

```
Ctrl+Shift+P → "SpeexJS: Generate"

? What do you want to generate?
  ❯ Controller
    Model
    Migration
    Schema
    Resource (full CRUD)
    Job
    Middleware
    Test

? Controller name: Product
✅ src/controllers/ProductController.ts created
✅ Opened in editor
```

**4. Schema Visualizer**

```
SpeexJS: Open Schema Diagram

[Opens visual ERD dari models yang ada]

┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │    │  Post    │    │  Comment │
│──────────│    │──────────│    │──────────│
│ id (PK)  │◄──┤ user_id  │◄──┤ post_id  │
│ name     │    │ title    │    │ user_id  │
│ email    │    │ content  │    │ content  │
│ created  │    │ status   │    │ created  │
└──────────┘    └──────────┘    └──────────┘
```

**5. Inline Test Runner**

```typescript
// Code lens di atas setiap test
▶ Run | ▶ Debug | ⟳ Watch

test('GET /users returns list', async () => {
//   ✅ Passed in 45ms
  const res = await request.get('/users')
  expect(res.status).toBe(200)
})
```

#### Acceptance Criteria

- [ ] Route explorer dengan jump-to-handler
- [ ] Inline SQL preview on hover
- [ ] Quick scaffold dari command palette
- [ ] Schema visualizer (ERD dari models)
- [ ] Inline test runner dengan coverage highlight
- [ ] Live reload notif saat HMR trigger (F7)
- [ ] Plugin marketplace browser (F24) dari dalam VS Code

---

### F26 — Zero-Downtime Deploy (Blue-Green)

**Status:** ❌ Belum ada (F14 di PRD v1.0 hanya basic deploy)
**Priority:** P0
**Target Version:** v2.1
**Depends on:** F14 (Deploy Command), F16 (Observability)

#### Problem Statement

Deploy basic dari F14 masih ada brief downtime — server stop, update, start. Untuk production app dengan SLA, ini tidak acceptable.

#### Proposed Solution

**Blue-Green deployment** built-in — deploy versi baru paralel dengan versi lama, switch traffic, rollback instant jika ada masalah.

#### Deploy Flow

```bash
speexjs deploy --strategy blue-green
```

```
Deployment: v1.6.1 → v2.0.0
Strategy: Blue-Green

Step 1/6  ▶ Building v2.0.0...                    ✅ 45s
Step 2/6  ▶ Starting GREEN environment (port 3001)... ✅ 8s
Step 3/6  ▶ Health check GREEN...                  ✅ 2s
           GET /_speex/health → 200 OK (23ms)
Step 4/6  ▶ Running smoke tests...                 ✅ 15s
           ✅ 12/12 smoke tests passed
Step 5/6  ▶ Switching traffic BLUE→GREEN...        ✅ <1s
           0% downtime, 0 dropped requests
Step 6/6  ▶ Monitoring GREEN for 5 minutes...      ✅
           Error rate: 0.1% (baseline: 0.2%) ✅
           p95 latency: 145ms (baseline: 152ms) ✅

✅ Deployment complete!
BLUE (v1.6.1) kept standby for 30 minutes.
Run 'speexjs deploy:rollback' to revert if needed.

Rollback window: 29:43 remaining
```

#### Auto-Rollback

```bash
# Manual rollback
speexjs deploy:rollback
# → Switches traffic back to BLUE instantly

# Auto-rollback trigger
speexjs deploy --strategy blue-green --auto-rollback \
  --rollback-on "error_rate > 1%" \
  --rollback-on "p99_latency > 3s" \
  --rollback-on "health_check_fail"
```

#### Canary Mode (alternative)

```bash
speexjs deploy --strategy canary --canary-percent 10

# Traffic split:
# 90% → BLUE (v1.6.1)
# 10% → GREEN (v2.0.0)

# Monitor metrics selama 30 menit
# Jika aman, gradually increase:
# 25% → GREEN
# 50% → GREEN
# 100% → GREEN (full switch)
```

#### Acceptance Criteria

- [ ] Blue-green deployment dengan zero downtime
- [ ] Health check verifikasi sebelum traffic switch
- [ ] Smoke tests otomatis setelah deploy
- [ ] Auto-rollback berdasarkan metrics threshold
- [ ] Manual rollback dengan satu command
- [ ] Canary deployment dengan gradual traffic shift
- [ ] Rollback window configurable (default 30 menit)
- [ ] Slack/webhook notification saat deploy dan rollback

---

### F27 — Automated Performance Profiler

**Status:** ❌ Belum ada
**Priority:** P1
**Target Version:** v2.1
**Depends on:** F16 (Observability), F9 (Dev Dashboard)

#### Problem Statement

Developer tidak tahu mana bagian app yang lambat kecuali ada user yang complain. Tidak ada cara proaktif untuk detect performance bottleneck sebelum hit production.

#### Proposed Solution

**Continuous performance profiler** yang jalan di background (dev dan production) dan auto-detect bottleneck dengan actionable suggestions.

#### Auto-Detection Capabilities

```
SpeexJS Performance Profiler
─────────────────────────────

🔍 Scanning... Found 4 issues:

⚠️  N+1 Query — HIGH IMPACT
    Route: GET /users?include=posts,comments
    Detected: 47 queries per request (should be 3)

    Trace:
    → UserController.index
      → User.query().paginate()           [1 query]
      → user.posts (foreach 15 users)    [15 queries]
      → post.comments (foreach posts)    [31 queries]

    Fix:
    User.query().with(['posts.comments']).paginate()
    Expected improvement: 47 → 3 queries, ~800ms → ~45ms

────────────────────────────────────────────────────

⚠️  Missing Database Index — MEDIUM IMPACT
    Table: orders
    Query: SELECT * FROM orders WHERE user_id = ? AND status = ?
    Executed: 2,340 times/hour
    Avg time: 234ms (full table scan on 500k rows)

    Fix:
    ALTER TABLE orders ADD INDEX idx_user_status (user_id, status);

    In migration:
    table.index(['user_id', 'status'], 'idx_user_status')
    Expected improvement: 234ms → ~2ms

────────────────────────────────────────────────────

⚠️  Synchronous Blocking Call — MEDIUM IMPACT
    Route: POST /reports/generate
    Detected: 8.2s synchronous operation blocking event loop

    Fix: Move to background job
    // Before:
    const pdf = await generatePDF(data)  // Blocks for 8.2s

    // After:
    await dispatch(new GenerateReportJob(data))
    return { message: 'Report will be emailed when ready' }

────────────────────────────────────────────────────

ℹ️  Cache Opportunity — LOW IMPACT
    Route: GET /categories
    Response size: 4.2KB
    Called: 8,900 times/hour, data rarely changes

    Fix:
    @get('/categories', { cache: 3600 })  // Cache 1 hour
    async index(req: Request) { ... }
    Expected improvement: ~40ms → ~1ms for 99% of requests
```

#### Profiler Modes

```typescript
export default defineConfig({
  profiler: {
    enabled: true,
    mode: 'continuous',     // 'continuous' | 'on-demand' | 'ci'

    thresholds: {
      slowQuery: 100,        // ms — queries lebih lambat dari ini = warning
      slowRoute: 500,        // ms — routes lebih lambat dari ini = warning
      nPlusOne: 5,           // queries lebih dari ini per request = warning
    },

    // CI mode: fail build jika performance regression detected
    ci: {
      compareWith: 'main',
      failOn: {
        p95RegressionPercent: 20,   // Fail jika p95 naik > 20%
        newNPlusOne: true,           // Fail jika ada N+1 baru
      },
    },
  },
})
```

#### Acceptance Criteria

- [ ] Auto-detect N+1 queries dengan fix suggestion
- [ ] Missing index detection dengan CREATE INDEX suggestion
- [ ] Synchronous blocking call detection
- [ ] Cache opportunity suggestion
- [ ] Threshold alerts (slow route, slow query)
- [ ] CI mode untuk catch regression di PR
- [ ] Performance report yang bisa di-export sebagai HTML/PDF
- [ ] Historical comparison (performa hari ini vs minggu lalu)

---

### F28 — Schema Migration Safety Guard

**Status:** ❌ Belum ada (extends F19)
**Priority:** P0
**Target Version:** v2.1
**Depends on:** F19 (Schema Diff)

#### Problem Statement

F19 generate migration dari schema diff, tapi tidak ada safety net untuk mencegah migration yang catastrophic berjalan di production tanpa proper review. Tim besar butuh approval flow.

#### Proposed Solution

**Migration safety pipeline** dengan pre-flight checks, risk scoring, dan approval workflow untuk high-risk migrations.

#### Risk Scoring

```bash
speexjs migrate:analyze

┌─────────────────────────────────────────────────────────────────┐
│  Migration Risk Analysis                                         │
│  File: 006_update_orders_table.ts                               │
│                                                                  │
│  Risk Score: 🔴 HIGH (85/100)                                    │
│                                                                  │
│  Risk Factors:                                                   │
│  [+35] DROP COLUMN 'payment_method' — data loss (2.3M rows)     │
│  [+25] ALTER COLUMN 'amount' type change — potential overflow    │
│  [+15] No down() method — cannot rollback                       │
│  [+10] Runs on table with 2.3M rows — lock time ~45s estimated  │
│                                                                  │
│  Mitigations:                                                    │
│  [ ] Backup before migration (required for risk > 70)           │
│  [ ] Run during maintenance window                              │
│  [ ] Test on staging first                                      │
│  [ ] Approval required from: @db-admin, @tech-lead              │
│                                                                  │
│  Estimated execution time: 45-90 seconds                        │
│  Estimated lock duration: 45 seconds on 'orders' table           │
│                                                                  │
│  [📋 View Full Report]  [🔒 Request Approval]  [❌ Cancel]        │
└─────────────────────────────────────────────────────────────────┘
```

#### Approval Workflow

```typescript
// speexjs.config.ts
export default defineConfig({
  migrations: {
    safety: {
      enabled: true,

      // Risk score thresholds
      autoApprove: { maxRisk: 30 },    // Low risk: auto run
      requireReview: { minRisk: 30 },  // Medium+: need human review
      requireApproval: { minRisk: 70 }, // High: need explicit approval

      // Approval via GitHub PR comment, Slack, atau API
      approvalMethod: 'github',       // 'github' | 'slack' | 'api'

      // Mandatory checks sebelum run
      checks: [
        'staging-tested',      // Harus sudah run di staging
        'backup-exists',       // Harus ada recent backup
        'low-traffic-window',  // Hanya run saat traffic rendah
      ],
    },
  },
})
```

#### Point-in-Time Recovery Integration

```bash
# Sebelum migration high-risk, auto-create checkpoint
speexjs migrate --checkpoint

# Restore ke checkpoint jika ada masalah
speexjs migrate:restore --checkpoint latest
speexjs migrate:restore --to 2026-06-29T14:00:00Z
```

#### Acceptance Criteria

- [ ] Risk scoring untuk setiap migration (0-100)
- [ ] Risk factors dengan penjelasan yang clear
- [ ] Approval workflow (GitHub/Slack/API)
- [ ] Mandatory pre-migration checklist
- [ ] Estimated execution time dan lock duration
- [ ] `--dry-run` yang simulate tanpa eksekusi
- [ ] Auto-checkpoint sebelum high-risk migration
- [ ] Point-in-time restore capability

---

### F29 — Built-In Webhook System

**Status:** ❌ Belum ada (di roadmap v3.0)
**Priority:** P1
**Target Version:** v2.1
**Depends on:** F15 (config), F18 (Job Scheduler)

#### Problem Statement

Banyak integrasi third-party butuh webhooks — Stripe, GitHub, Slack, dsb. Developer saat ini harus buat endpoint, implement signature verification, handle retry, dan log delivery secara manual untuk setiap integrasi.

#### Proposed Solution

**Unified webhook system** — incoming webhook receiver dengan auto-verification, dan outgoing webhook dispatcher dengan retry dan delivery tracking.

#### Incoming Webhooks (Receiver)

```typescript
// Daftarkan webhook provider
// speexjs.config.ts
export default defineConfig({
  webhooks: {
    incoming: {
      stripe: {
        secret: process.env.STRIPE_WEBHOOK_SECRET,
        verify: 'stripe-v1',    // Built-in signature verifier
        path: '/webhooks/stripe',
      },
      github: {
        secret: process.env.GITHUB_WEBHOOK_SECRET,
        verify: 'github-sha256',
        path: '/webhooks/github',
      },
      custom: {
        secret: process.env.MY_WEBHOOK_SECRET,
        verify: 'hmac-sha256',  // Generic HMAC verifier
        path: '/webhooks/custom',
      },
    },
  },
})
```

```typescript
// Event handler (auto-routed berdasarkan event type)
// src/webhooks/StripeWebhook.ts
export class StripeWebhook extends WebhookHandler {
  @on('payment_intent.succeeded')
  async paymentSucceeded(payload: StripePaymentIntent) {
    await Order.query()
      .where('payment_intent_id', payload.id)
      .update({ status: 'paid' })

    await dispatch(new SendReceiptJob(payload))
  }

  @on('customer.subscription.deleted')
  async subscriptionCancelled(payload: StripeSubscription) {
    await User.query()
      .where('stripe_id', payload.customer)
      .update({ plan: 'free' })
  }
}
```

#### Outgoing Webhooks (Dispatcher)

```typescript
// Kirim webhook ke third-party atau ke subscribers
await webhook.dispatch('order.completed', {
  orderId: order.id,
  total: order.total,
  items: order.items,
})

// Framework handle:
// - Sign payload dengan HMAC-SHA256
// - Deliver ke semua registered endpoints
// - Retry dengan exponential backoff (3x default)
// - Log semua delivery attempts
// - Dead letter untuk permanently failed
```

#### Webhook Subscription API (untuk SaaS — let customers subscribe)

```typescript
// Auto-generated endpoint untuk manage subscriptions
POST   /webhooks/subscriptions         // Customer daftar URL mereka
GET    /webhooks/subscriptions         // List subscriptions
PATCH  /webhooks/subscriptions/:id    // Update URL/events
DELETE /webhooks/subscriptions/:id    // Unsubscribe

// Delivery log
GET    /webhooks/deliveries           // History pengiriman
POST   /webhooks/deliveries/:id/retry // Retry delivery
```

#### Delivery Dashboard (extends F18)

```
/_speex/dev/webhooks

Incoming (last 24h):                Outgoing (last 24h):
─────────────────────────────       ──────────────────────────────
stripe: 234 events received         456 dispatched
  payment.succeeded: 189  ✅         423 delivered ✅
  payment.failed: 23       ✅         28  failed ❌
  refund.created: 22       ✅         5   retrying 🔄
github: 45 events received
  push: 38                 ✅
  pull_request: 7          ✅        [View Delivery Log]
```

#### Acceptance Criteria

- [ ] Incoming webhook receiver dengan built-in signature verification (Stripe, GitHub, Slack, generic HMAC)
- [ ] Event handler dengan `@on('event.type')` decorator
- [ ] Outgoing webhook dispatcher dengan automatic signing
- [ ] Retry logic dengan exponential backoff
- [ ] Delivery log dan monitoring
- [ ] Customer webhook subscription management API (untuk SaaS)
- [ ] Dead letter queue untuk permanently failed webhooks
- [ ] Webhook dashboard (extends F18)

---

### F30 — SpeexJS Cloud Functions Mode

**Status:** ❌ Belum ada
**Priority:** P2
**Target Version:** v2.2
**Depends on:** F14 (Deploy), F15 (config), F16 (Observability)

#### Problem Statement

SpeexJS saat ini dirancang untuk long-running server. Tapi banyak use case cocok untuk serverless/edge functions — scheduled tasks, webhook handlers, background processing, API routes yang jarang di-hit.

#### Proposed Solution

**Hybrid mode** — beberapa route/handler di-deploy sebagai serverless function, sisanya tetap long-running server. Developer tidak perlu pilih satu atau yang lain.

#### Route-Level Serverless Annotation

```typescript
// Beberapa route di-run sebagai cloud function
// Sisanya tetap di long-running server

// Long-running (default — tetap di server)
@get('/users')
async index(req: Request) {
  return User.query().paginate(1)
}

// Serverless function — di-deploy terpisah
@get('/reports/monthly', { runtime: 'function', timeout: 300 })
async monthlyReport(req: Request) {
  // Bisa jalan lama, tidak block main server
  return generateMonthlyReport(req.query('month'))
}

// Edge function — jalan paling dekat ke user
@get('/personalize', { runtime: 'edge', region: 'auto' })
async personalize(req: Request) {
  // Cold start < 5ms, jalan di Cloudflare Workers
  return getPersonalizedContent(req.user)
}
```

#### Deployment Strategy

```bash
speexjs deploy --mode hybrid

Deployment Plan:
├── 🖥️  Long-Running Server (EC2/Railway)
│   └── Routes: /users, /posts, /auth, /dashboard (138 routes)
│
├── ⚡ Cloud Functions (AWS Lambda / Vercel Functions)
│   └── Routes: /reports/*, /exports/*, /webhooks/* (23 routes)
│
└── 🌐 Edge Functions (Cloudflare Workers)
    └── Routes: /personalize, /ab-test/*, /geo-redirect (5 routes)

Estimated cost vs full-server: -67% (heavy routes handled by functions)
```

#### Function Bundles (Zero-Dependency — tetap)

```typescript
// Setiap function di-bundle minimal
// Hanya import module yang dibutuhkan

// /reports/monthly → bundle size: 45 KB
import { db } from 'speexjs/server/database'
import { Response } from 'speexjs/server/http'
// Tidak include: auth, queue, mail, websocket, dll

// Vs full server bundle: 218 KB
```

#### Cron Functions

```typescript
// Scheduled function tanpa butuh long-running server
@cron('0 6 * * *', { runtime: 'function' })
async dailyReport() {
  // Jalan setiap jam 6 pagi via cloud scheduler
  // Tidak perlu server aktif 24/7 hanya untuk ini
  const report = await generateDailyReport()
  await mail.send(new DailyReportMail(report))
}
```

#### Acceptance Criteria

- [ ] `runtime: 'function' | 'edge' | 'server'` annotation per-route
- [ ] Automatic bundling — hanya include modules yang dipakai
- [ ] `speexjs deploy --mode hybrid` pisahkan routes ke target yang tepat
- [ ] Support: AWS Lambda, Vercel Functions, Cloudflare Workers
- [ ] Cron functions tanpa butuh long-running server
- [ ] Cold start optimization (target: < 50ms untuk function mode)
- [ ] Tetap zero additional dependencies
- [ ] Cost estimation sebelum deploy

---

## 6. Priority Matrix

| Feature | Priority | Effort | Impact | Target |
|---|---|---|---|---|
| F16 — Observability | P0 | L | ⭐⭐⭐⭐⭐ | v2.1 |
| F17 — Multi-Tenant | P0 | XL | ⭐⭐⭐⭐⭐ | v2.1 |
| F19 — Schema Diff | P0 | M | ⭐⭐⭐⭐⭐ | v2.1 |
| F26 — Zero-Downtime Deploy | P0 | L | ⭐⭐⭐⭐⭐ | v2.1 |
| F28 — Migration Safety Guard | P0 | M | ⭐⭐⭐⭐ | v2.1 |
| F18 — Job Scheduler UI | P1 | M | ⭐⭐⭐⭐ | v2.1 |
| F20 — Feature Flags UI | P1 | M | ⭐⭐⭐⭐ | v2.1 |
| F21 — AI Code Generator | P1 | XL | ⭐⭐⭐⭐⭐ | v2.2 |
| F23 — Adaptive Rate Limiting | P1 | M | ⭐⭐⭐⭐ | v2.1 |
| F27 — Performance Profiler | P1 | L | ⭐⭐⭐⭐ | v2.1 |
| F29 — Webhook System | P1 | M | ⭐⭐⭐⭐ | v2.1 |
| F22 — Real-Time Primitives | P2 | L | ⭐⭐⭐ | v2.2 |
| F24 — Plugin Marketplace | P2 | XL | ⭐⭐⭐⭐ | v2.2 |
| F25 — VS Code Extension | P2 | XL | ⭐⭐⭐⭐ | v2.2 |
| F30 — Cloud Functions Mode | P2 | L | ⭐⭐⭐ | v2.2 |

**Effort Scale:** M=Medium (2-4w), L=Large (4-8w), XL=Extra Large (8-16w)

---

## 7. Roadmap Placement

```
PRD v1.0 Target        PRD v2.0 Target
────────────────        ──────────────────────────────────────────────────
v2.0 (Q3 2026)          v2.1 (Q4 2026)               v2.2 (Q1 2027)
───────────────          ──────────────────────         ─────────────────
Foundation               Scale & Reliability            Intelligence & Ecosystem

● F1  Conv. CLI          ● F16 Observability            ● F21 AI Generator
● F4  @speex/create      ● F17 Multi-Tenant             ● F22 RT Primitives
● F5  Auth Scaffold      ● F18 Job UI                   ● F24 Plugin Market
● F7  Server HMR         ● F19 Schema Diff              ● F25 VS Code Ext
● F8  Schema CRUD        ● F20 Feature Flags UI         ● F30 Cloud Functions
● F14 Deploy             ● F23 Adaptive Rate Limit
● F15 Config File        ● F26 Zero-Downtime Deploy
                         ● F27 Perf Profiler
                         ● F28 Migration Safety
                         ● F29 Webhook System
```

---

## 8. Interdependency Graph

```
F15 (config)
  ├── F16 (observability) ──→ F27 (profiler)
  │                      └──→ F23 (adaptive rate limit)
  │                      └──→ F26 (zero-downtime deploy)
  ├── F17 (multi-tenant)
  ├── F18 (job UI) ──────────→ F29 (webhook system)
  ├── F20 (feature flags UI)
  └── F24 (plugin marketplace)

F19 (schema diff)
  └──→ F28 (migration safety guard)

F9 (dev dashboard) [dari PRD v1.0]
  ├── F16 (observability — extends dashboard)
  ├── F18 (job UI — extends dashboard)
  ├── F20 (flags UI — extends dashboard)
  └── F25 (VS Code ext — mirrors dashboard)

F6 (SDK client) [dari PRD v1.0]
  └──→ F22 (real-time primitives — extends SDK)

F14 (deploy) [dari PRD v1.0]
  ├── F26 (zero-downtime — extends deploy)
  └── F30 (cloud functions — extends deploy)

F21 (AI generator)
  └── depends on: F8 (schema CRUD) [PRD v1.0]
              + F15 (config)
              + F1 (conv. CLI) [PRD v1.0]
```

---

## 9. Success Metrics

### Developer Experience Metrics

| Metric | Setelah PRD v1.0 | Target Setelah PRD v2.0 |
|---|---|---|
| MTTR (Mean Time to Resolution) saat prod issue | ~2 jam (manual debug) | < 15 menit (observability + hints) |
| Deploy downtime | ~30 detik | 0 detik (blue-green) |
| Time to add multi-tenancy ke existing app | ~2 minggu | < 1 hari |
| Percentage of migrations that pass safety check | Unknown | 100% (semua di-analyze) |
| Feature flag rollout time | Butuh redeploy (~10 menit) | < 10 detik (runtime toggle) |
| Time to setup webhook integration | ~4 jam (manual) | < 30 menit |
| N+1 queries di production | Unknown | 0 (auto-detected di dev) |

### Platform Health Metrics

| Metric | Target (6 bulan setelah v2.1) |
|---|---|
| npm weekly downloads | +500% dari v1.x baseline |
| GitHub stars | 5,000+ |
| Production deployments menggunakan blue-green | >60% |
| Apps dengan observability enabled | >80% |
| Migration safety incidents di production | -90% |
| Plugin marketplace submissions | 50+ dalam 3 bulan |

### Quality Metrics

| Metric | Target |
|---|---|
| Test coverage (semua fitur baru) | > 95% |
| New TypeScript errors | 0 |
| Performance overhead dari observability layer | < 2ms per request |
| Multi-tenant isolation test coverage | 100% |

---

## 10. Appendix — Architectural Decisions

### ADR-001: Observability tanpa OpenTelemetry sebagai required dep

**Decision:** Built-in observability pakai native Node.js APIs, dengan optional OTLP export.

**Rationale:** Menambah OpenTelemetry sebagai hard dependency melanggar zero-dep principle dan menambah ~500KB bundle. Sebaliknya, implement minimal metrics/tracing secara native, dengan optional `speexjs export:otlp` yang bisa diinstall terpisah.

---

### ADR-002: Multi-tenant row-level vs schema-level sebagai default

**Decision:** Row-level sebagai default strategy, schema-level opt-in.

**Rationale:** Row-level support semua DB dialects (MySQL, PostgreSQL, SQLite). Schema-level lebih isolasi tapi PostgreSQL-only. Developer bisa upgrade ke schema-level tanpa framework change — hanya config.

---

### ADR-003: AI Generator — Anthropic vs OpenAI vs Agnostic

**Decision:** Agnostic dengan default ke Anthropic, support OpenAI dan Ollama (local).

**Rationale:** Tidak lock developer ke satu provider. Local Ollama support penting untuk developer di environment tanpa internet akses atau yang ingin zero cost. Default ke Anthropic karena code generation quality.

---

### ADR-004: Zero-Downtime Deploy — Nginx vs L7 Load Balancer

**Decision:** Built-in dengan Node.js cluster + shared socket, tidak require external load balancer.

**Rationale:** Tidak bisa assume developer punya Nginx atau ELB. SpeexJS cluster mode sudah ada (v1.x) — blue-green bisa diimplementasikan dengan 2 cluster groups dan socket hand-off, tanpa external dependency.

---

### ADR-005: Plugin Marketplace — npm vs custom registry

**Decision:** npm sebagai transport (karena gratis dan sudah dikenal), dengan custom discovery layer di `plugins.speexjs.dev`.

**Rationale:** Maintain custom registry butuh infrastructure. Pakai npm sebagai transport eliminates hosting cost, tapi tambah `speexjs` tag dan manifest format untuk discoverability.

---

*Document prepared as continuation of PRD v1.0 (F1-F15)*
*PRD v2.0 (F16-F30) — Scale, Intelligence & Ecosystem*
*Independent analysis based on speexjs v1.6.1 (https://github.com/superdevids/speexjs)*