# Product Requirements Document — SpeexJS v3.x
## Volume 4 — Developer Experience & Framework Maturity

> **Version:** 1.0
> **Status:** Draft — Vision
> **Last Updated:** 2026-06-29
> **Target:** v3.0 — Q1 2027
> **Filosofi:** "Framework yang makin dewasa — semakin sedikit yang harus kamu pikirkan, semakin banyak yang bisa kamu buat."

---

## 1. Filosofi Dasar

**SpeexJS bukan no-code builder.** SpeexJS adalah **framework fullstack TypeScript profesional** seperti Nest.js, Next.js, atau Nuxt.js — tapi dengan **zero dependency**, **satu package terintegrasi**, dan **developer experience yang jauh lebih mulus**.

*"Zero Effort"* berarti framework ini menghilangkan **friction** di setiap tahap development:

```
Setup Project     → 1 command (npx @speex/create)
Buat API endpoint → 1 controller file (auto-registered)
Validasi data     → 1 schema definition (auto-validated)
Database query    → 1 Model class (auto-migrated)
Auth              → 1 command (speexjs make:auth)
Deploy            → 1 command (speexjs deploy)
```

BUKAN berarti menghilangkan **proses coding** — developer tetap nulis kode TypeScript, tetap paham arsitektur, tetap bikin logika bisnis. Tapi semua **boilerplate**, **konfigurasi**, dan **setup** diotomatisasi.

---

## 2. Visi PRD05 — "Developer Maturity"

### Prinsip Dasar Semua Fitur

| Prinsip | Artinya |
|---------|---------|
| **TypeScript-First** | Semua fitur punya type inference penuh — developer dapet autocomplete, type checking, dan refactoring tools |
| **Progressive Disclosure** | Fitur sederhana tetap sederhana (1 file = 1 API). Fitur kompleks bisa di-unlock tanpa rewrite |
| **Zero Boilerplate** | Framework generate apa yang biasanya ditulis manual. Generators produce **production-quality code** |
| **Runtime Safety** | Validasi di compile time (TypeScript) + runtime (Schema) + edge case handling |
| **Backward Compatible** | Semua fitur baru opt-in — tidak ada breaking change untuk project existing |

### Target Developer Persona

- **Solo Developer / Indie Hacker** (Alex, 30): Mau build & ship cepat tanpa setup 10 library
- **Startup CTO** (Maya, 35): Laravel → TypeScript migrant, butuh framework yang powerful
- **Enterprise Architect** (David, 48): Butuh zero dependency supply chain, enterprise-grade security
- **Hobbyist / Student** (Putra, 22): Mau belajar fullstack dalam satu framework

---

## 3. 10 PRD — "Next-Gen Developer Experience"

### PRD-01: SpeexJS DevTools Dashboard

**Status:** 🔜 Planned
**Priority:** P0
**Effort:** L
**Target:** v3.0

#### Problem Statement

Debug toolbar (v0.9) dan dev dashboard (`/_speexjs/dashboard`) sudah ada tapi terbatas. Developer masih harus buka terminal terpisah untuk log, DB client terpisah untuk query, dan browser devtools untuk network.

#### Proposed Solution

**SpeexJS DevTools** — satu dashboard developer di `/_speex/devtools` yang mengkonsolidasi semua tools:

1. **Request Log (Live Streaming via SSE)**
   ```
   Method  Path              Status  Duration  Auth    Query Count
   GET     /users             200     45ms      token   2 queries
   POST    /users             422     12ms      token   0 queries (validation error)
   GET     /users/999         404     8ms       token   1 query
   ```

2. **Database Query Inspector**
   - Semua query yang di-execute, dengan duration + bindings
   - Slow query highlighting (>100ms)
   - N+1 detection alerts
   - EXPLAIN plan viewer untuk query lambat

3. **Cache Inspector**
   - Lihat semua cache keys, hit rate, TTL
   - Clear cache per-key
   - Memory usage stats

4. **Route Explorer (interaktif)**
   - Daftar semua route dengan method, path, middleware stack
   - **Click-to-test** — kirim request langsung dari dashboard
   - Lihat middleware yang aktif per route

5. **Queue & Job Monitor**
   - List semua job: waiting, running, failed, completed
   - Retry job dari dashboard
   - Lihat job payload + error stack

6. **Environment Variables Viewer**
   - Lihat env vars yang aktif (value di-mask untuk secrets)
   - Validasi env vars

#### Teknologi

- **Backend**: SSE streaming (sudah ada di v1.x), route registrasi baru di SuperApp
- **Frontend**: Vanilla JS, inline HTML (0 dep), dark theme
- **Aktivasi**: `SPEEXJS_DEBUG=true` atau `NODE_ENV=development`

#### Acceptance Criteria

- [ ] Dashboard di `/_speex/devtools` — hanya di development mode
- [ ] Real-time request log via SSE
- [ ] Database query inspector dengan slow query highlighting
- [ ] Cache inspector dengan clear per-key
- [ ] Route explorer dengan click-to-test
- [ ] Queue job monitor dengan retry
- [ ] Environment variable viewer
- [ ] Zero additional dependencies

---

### PRD-02: SpeexJS HMR 2.0 — True Hot Module Replacement

**Status:** 🔜 Planned
**Priority:** P0
**Effort:** XL
**Target:** v3.0

#### Problem Statement

Saat ini `speexjs serve` menggunakan **process restart** (via tsx watch). Untuk perubahan kecil seperti edit controller, full restart memakan 2-5 detik. Developer yang lagi flow state butuh feedback loop < 500ms.

#### Proposed Solution

**Dua tier HMR:**

**Tier 1 (v3.0): Selective Reload**
```
File Change Detection
  ├── Route change        → reload route registry only (no restart)
  ├── Controller change   → invalidate module cache → reload controller
  ├── Middleware change    → reload middleware pipeline
  ├── Config change       → full reload (config is foundational)
  ├── Model change        → no reload needed (lazy-loaded)
  └── View/TSX change     → reload view cache
```

**Tier 2 (v3.x): True Module-Level HMR**
- Gunakan Node.js `module.hot` pattern atau Vite-based dev server
- Swappable module instances tanpa memory leak
- State preservation (DB connections, cache, WebSocket tetap hidup)

#### Performance Targets

| Scenario | v1.x (restart) | v3.0 (selective) | v3.x (true HMR) |
|----------|---------------|-------------------|------------------|
| Route change | 5s | 500ms | 50ms |
| Controller change | 5s | 500ms | 100ms |
| Config change | 5s | 2s | 500ms |
| View change | 5s | 200ms | 50ms |

#### Acceptance Criteria

- [ ] Selective reload untuk route & controller changes
- [ ] State preservation (DB connection, WebSocket, cache)
- [ ] Fallback ke full restart jika HMR gagal
- [ ] Clear error messages saat HMR error
- [ ] WebSocket connections tetap hidup saat HMR

---

### PRD-03: SpeexJS CLI Gen 2 — Better Generators

**Status:** 🔜 Planned
**Priority:** P0
**Effort:** M
**Target:** v3.0

#### Problem Statement

CLI generators sudah ada (15+ `make:*` commands) tapi outputnya masih template statis. Developer harus manual edit setelah generate.

#### Proposed Solution

**Generators yang menghasilkan PRODUCTION-QUALITY code:**

1. **Better `make:resource`** — Schema-driven full CRUD:
   ```
   speexjs make:resource Post --schema PostSchema
   # → Post model with validation
   # → PostController with CRUD + validation middleware
   # → Post routes (RESTful)
   # → Post migration
   # → Post test file (Vitest)
   ```

2. **`make:auth` enhancement** — Generate dengan pilihan:
   - Guard type: session, token, sanctum, atau kombinasi
   - OAuth providers: Google, GitHub, Discord
   - 2FA/TOTP
   - Email verification
   - Password reset
   - Admin user management

3. **`make:crud` — Schema-first**:
   - Tanya fields interaktif (seperti yang sudah ada)
   - Tanya relations: belongsTo, hasMany, belongsToMany
   - Auto-generate migration + Model + Controller + Routes + Schema + Tests

4. **`make:test`** — Generate test file dari controller:
   ```
   speexjs make:test UserController
   # → tests/UserController.test.ts dengan test cases untuk semua endpoint
   ```

#### Acceptance Criteria

- [ ] `make:resource --schema` generates validated CRUD
- [ ] `make:auth` supports OAuth + 2FA options
- [ ] `make:crud` interaktif dengan relations
- [ ] `make:test` generates from controller
- [ ] Semua generated code **production-quality** (validation, error handling, type safety)

---

### PRD-04: Universal Data Layer — Query Builder 2.0

**Status:** 🔜 Planned
**Priority:** P1
**Effort:** L
**Target:** v3.1

#### Problem Statement

Query Builder (30+ methods) sudah powerful tapi masih ada gap: belum ada type-safe raw queries, streaming untuk large datasets, dan query analysis.

#### Proposed Solution

**Query Builder 2.0 — Lebih safe, lebih cepat, lebih observable:**

1. **Type-Safe Raw Queries**
   ```typescript
   // Sekarang: raw SQL tanpa type safety
   const users = await db.raw('SELECT * FROM users WHERE id = ?', [1])
   
   // Nanti: type-safe raw queries
   const users = await db.raw<{ id: number; name: string; email: string }>(
     'SELECT id, name, email FROM users WHERE department = ?',
     ['engineering']
   )
   // users → { id: number; name: string; email: string }[]
   ```

2. **Streaming untuk Large Datasets**
   ```typescript
   // Streaming 1 juta rows tanpa memory overflow
   const stream = db.stream('SELECT * FROM audit_logs')
   for await (const row of stream) {
     await processRow(row)
   }
   ```

3. **Query Analysis & Optimization**
   ```typescript
   const result = await db.query('SELECT * FROM users')
   console.log(result.explain) // Query plan
   console.log(result.timing)  // Execution time
   console.log(result.warnings) // Missing index alerts
   ```

4. **Batch Operations**
   ```typescript
   await db.batchInsert('users', [
     { name: 'A', email: 'a@test.com' },
     { name: 'B', email: 'b@test.com' },
     // ...10,000 rows
   ], { chunkSize: 500 })
   ```

#### Acceptance Criteria

- [ ] Type-safe raw queries dengan generic parameter
- [ ] Streaming untuk SELECT besar
- [ ] Query analysis (EXPLAIN, timing, warnings)
- [ ] Batch insert dengan chunking
- [ ] Backward compatible dengan Query Builder existing

---

### PRD-05: SpeexJS Auth 2.0 — SSO & Enterprise Auth

**Status:** 🔜 Planned
**Priority:** P1
**Effort:** L
**Target:** v3.1

#### Problem Statement

Auth sudah punya 5 guards (Session, Token, Sanctum, Socialite, OAuth) tapi belum support enterprise-grade SSO (SAML2, OIDC) dan fitur modern seperti magic link, passkeys, dan MFA.

#### Proposed Solution

**Auth 2.0 — Enterprise-Ready Authentication:**

1. **SSO / SAML2 / OIDC**
   ```typescript
   // speexjs.config.ts
   auth: {
     guards: {
       saml: {
         driver: 'saml',
         entryPoint: 'https://mycompany.okta.com/sso/saml',
         cert: process.env.SAML_CERT!,
       },
       oidc: {
         driver: 'oidc',
         issuer: 'https://accounts.google.com',
         clientId: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
       },
     }
   }
   ```

2. **Passwordless Magic Link**
   ```typescript
   // 1 command generate full magic link auth
   speexjs make:auth --magic-link
   // → Email verification + magic link email template
   ```

3. **WebAuthn / Passkeys**
   ```typescript
   // Biometric auth (fingerprint, Face ID, Windows Hello)
   await auth.registerPasskey(user.id, { name: 'My MacBook' })
   await auth.authenticatePasskey()
   ```

4. **Rate Limiting per Login Attempt**
   ```typescript
   // Auto-lockout setelah 5 failed attempts
   auth.guard('session').configure({
     maxAttempts: 5,
     lockoutDuration: '15m',
   })
   ```

5. **Session Management UI**
   ```typescript
   // Lihat & revoke active sessions
   const sessions = await auth.user().sessions()
   // → [{ id, device, ip, lastActive, createdAt }]
   await auth.revokeSession(sessionId)
   ```

#### Acceptance Criteria

- [ ] SAML2 SSO guard
- [ ] OIDC guard (Google, Microsoft, Okta)
- [ ] Magic link authentication flow
- [ ] WebAuthn / Passkeys support
- [ ] Login attempt rate limiting + lockout
- [ ] Session management (list, revoke)
- [ ] Backward compatible dengan auth existing

---

### PRD-06: SpeexJS Worker & Queue 2.0

**Status:** 🔜 Planned
**Priority:** P1
**Effort:** M
**Target:** v3.1

#### Problem Statement

Queue sudah ada (in-memory, Redis, SQLite) tapi belum ada fitur: delayed jobs, job chaining, cron expressions lengkap, dan monitoring dashboard.

#### Proposed Solution

**Queue 2.0 — Production-Grade Job Processing:**

1. **Delayed Jobs**
   ```typescript
   await queue.dispatch(SendEmailJob, { userId: 1 }, { delay: '1h' })
   await queue.dispatch(GenerateReportJob, { reportId: 5 }, { delay: '2026-01-01T00:00:00Z' })
   ```

2. **Job Chaining (Pipelines)**
   ```typescript
   await queue
     .chain(ResizeImageJob, { imageId: 1 })
     .then(GenerateThumbnailJob, { imageId: 1 })
     .then(NotifyUserJob, { userId: 1 })
     .dispatch()
   ```

3. **Cron Expressions Lengkap**
   ```typescript
   scheduler.cron('0 0 * * *', GenerateDailyReportJob) // setiap tengah malam
   scheduler.cron('*/15 * * * *', HealthCheckJob) // setiap 15 menit
   scheduler.cron('0 9 * * 1', SendWeeklyDigestJob) // setiap Senin jam 9
   ```

4. **Job Retry Strategy**
   ```typescript
   class SendEmailJob extends Job {
     retry = {
       maxAttempts: 5,
       backoff: 'exponential', // 1s, 2s, 4s, 8s, 16s
       maxDelay: '1h',
     }
   }
   ```

5. **Queue Dashboard** (bagian dari DevTools PRD-01)

#### Acceptance Criteria

- [ ] Delayed job execution
- [ ] Job chaining / pipelines
- [ ] Full cron expression parser
- [ ] Configurable retry with exponential backoff
- [ ] Dead letter queue management
- [ ] Queue dashboard (DevTools integration)

---

### PRD-07: SpeexJS File System & Storage 2.0

**Status:** 🔜 Planned
**Priority:** P2
**Effort:** M
**Target:** v3.2

#### Problem Statement

Storage sudah ada (Local + S3) tapi belum ada: file validation, image processing, streaming upload, dan CDN integration.

#### Proposed Solution

**Storage 2.0 — File Management Lengkap:**

1. **File Validation Otomatis**
   ```typescript
   const upload = storage.disk('s3').upload('avatars/')
     .accept(['image/jpeg', 'image/png', 'image/webp'])
     .maxSize('5MB')
     .sanitize() // rename file, remove special chars
   
   await upload.save(req.file('avatar'))
   ```

2. **Image Processing (built-in via Sharp atau native)**
   ```typescript
   const image = await Image.from('uploads/photo.jpg')
     .resize(800, 600)
     .format('webp')
     .quality(80)
     .save('optimized/photo.webp')
   
   // Auto-generate thumbnails
   await image.thumbnail(150, 150).save('thumbs/photo.jpg')
   ```

3. **Signed URLs untuk Temporary Access**
   ```typescript
   const url = storage.disk('s3').temporaryUrl('reports/2026-01.pdf', '1h')
   // → https://bucket.s3.amazonaws.com/reports/2026-01.pdf?X-Amz-...
   ```

4. **Streaming Upload & Download**
   ```typescript
   // Upload langsung dari request
   const file = await storage.putStream('large-file.zip', req.stream)
   
   // Download ke response  
   await file.streamTo(res)
   ```

#### Acceptance Criteria

- [ ] File type & size validation
- [ ] Image resizing & format conversion
- [ ] Signed URLs with TTL
- [ ] Streaming upload/download
- [ ] Backward compatible dengan Storage existing

---

### PRD-08: SpeexJS Full-Text Search Engine

**Status:** 🔜 Planned
**Priority:** P2
**Effort:** M
**Target:** v3.2

#### Problem Statement

Full-text search (in-memory, v1.3) ada tapi terbatas. Tidak ada fuzzy search, relevance scoring, highlight, atau pagination untuk search results.

#### Proposed Solution

**Search Engine Built-in:**

```typescript
// Index model untuk search
await Search.index(User, ['name', 'email', 'bio'])

// Basic search
const results = await Search.query('john')
// → [{ id: 1, name: 'John Doe', relevance: 0.95 }, ...]

// Advanced search
const results = await Search.query('engineering manager')
  .where('department', 'engineering')
  .fuzzy(true)           // typo tolerance
  .highlight(true)       // <mark>highlight</mark>
  .paginate(1, 20)       // pagination
  .get()

// Full-text search di PostgreSQL (native)
const users = await User.query()
  .whereRaw('MATCH(name, email) AGAINST(? IN BOOLEAN MODE)', ['john*'])
  .get()
```

#### Teknologi

- **PostgreSQL**: `tsvector` / `tsquery` untuk production
- **SQLite**: `FTS5` untuk development/testing
- **In-memory**: TF-IDF based untuk small datasets
- **Auto-switch**: framework pilih backend terbaik sesuai DB dialect

#### Acceptance Criteria

- [ ] Full-text search across all 3 DB dialects
- [ ] Fuzzy search (typo tolerance)
- [ ] Relevance scoring & sorting
- [ ] Search highlight
- [ ] Search pagination
- [ ] Zero additional dependencies

---

### PRD-09: SpeexJS Performance & Bundle Analyzer

**Status:** 🔜 Planned
**Priority:** P2
**Effort:** M
**Target:** v3.2

#### Problem Statement

Developer tidak tahu seberapa cepat aplikasi mereka atau seberapa besar bundle framework yang digunakan. Tidak ada feedback loop untuk performance optimization.

#### Proposed Solution

**Built-in Performance Analyzer:**

1. **Route Latency Report** (enhance dari PRD04 N9)
   ```bash
   speexjs metrics:report --routes --duration 5m
   # → Routes tercepat/lambat selama 5 menit terakhir
   # → P50/P95/P99 latency per route
   # → Slow route recommendations
   ```

2. **Bundle Size Analyzer**
   ```bash
   speexjs metrics:bundle
   # → speexjs/server: 42 KB (gzip)
   # → speexjs/client: 28 KB (gzip)
   # → speexjs/schema: 12 KB (gzip)
   # → speexjs/rpc: 8 KB (gzip)
   # → Total: 218 KB (gzip)
   ```

3. **Database Query Performance**
   ```bash
   speexjs metrics:queries
   # → Total queries: 1,234
   # → Slow queries (>100ms): 23
   # → N+1 detected: 2
   # → Cache hit rate: 73%
   ```

4. **Memory Usage Profile**
   ```bash
   speexjs metrics:memory
   # → Heap used: 45 MB
   # → Heap total: 128 MB
   # → External: 12 MB
   # → ArrayBuffers: 3 MB
   ```

#### Acceptance Criteria

- [ ] Route latency report dari production data
- [ ] Bundle size analyzer per sub-path import
- [ ] Database query performance dashboard
- [ ] Memory usage tracking
- [ ] HTML report generation

---

### PRD-10: SpeexJS API Versioning & SDK Evolution

**Status:** 🔜 Planned
**Priority:** P2
**Effort:** L
**Target:** v3.3

#### Problem Statement

API versioning (`/api/v1/`) sudah ada tapi manual. SDK generator sudah ada tapi outputnya perlu compile terpisah. Tidak ada deprecation management untuk API endpoints.

#### Proposed Solution

**API Lifecycle Management:**

1. **Auto-Versioning Routes**
   ```typescript
   // ApiVersion helper (sudah ada)
   app.group(app.apiVersion('v1'), (router) => {
     router.get('/users', UserController, 'index')
   })
   
   // Auto-generate version mapping
   // /api/v1/users → UserController v1
   // /api/v2/users → UserController v2 (jika ada)
   ```

2. **API Deprecation Management**
   ```typescript
   @get('/users', { deprecated: true, sunset: '2026-06-01', migration: '/api/v2/users' })
   async index() { ... }
   // → Response header: Sunset: Sat, 01 Jun 2026 00:00:00 GMT
   // → Response header: Deprecation: true
   ```

3. **SDK Evolution — Type-Safe Client Generator**
   ```typescript
   // Generate SDK yang langsung bisa dipakai
   speexjs sdk:generate --output ./sdk/client.ts
   
   // Auto-detect perubahan API
   speexjs sdk:diff
   // → BREAKING: users.list() response changed
   // → ADDED: posts.create() new endpoint
   ```

4. **OpenAPI 3.1 Full Compliance**
   - Webhook support
   - Discriminated unions
   - OneOf/AnyOf/AllOf dari UnionSchema/IntersectionSchema
   - Examples dari schema defaults

#### Acceptance Criteria

- [ ] Auto-version prefix helper (sudah ada, enhanced)
- [ ] API deprecation headers otomatis
- [ ] SDK diff detection untuk breaking changes
- [ ] Full OpenAPI 3.1 compliance
- [ ] Backward compatible

---

## 4. Priority Matrix Keseluruhan

| PRD | Fitur | Priority | Effort | Nilai DX | Target |
|-----|-------|----------|--------|----------|--------|
| **1** | DevTools Dashboard | **P0** | L | ⭐⭐⭐⭐⭐ | v3.0 |
| **2** | True HMR | **P0** | XL | ⭐⭐⭐⭐⭐ | v3.0 |
| **3** | CLI Gen 2 | **P0** | M | ⭐⭐⭐⭐⭐ | v3.0 |
| **4** | Query Builder 2.0 | **P1** | L | ⭐⭐⭐⭐ | v3.1 |
| **5** | Auth 2.0 (SSO) | **P1** | L | ⭐⭐⭐⭐ | v3.1 |
| **6** | Queue 2.0 | **P1** | M | ⭐⭐⭐⭐ | v3.1 |
| **7** | Storage 2.0 | **P2** | M | ⭐⭐⭐ | v3.2 |
| **8** | Search Engine | **P2** | M | ⭐⭐⭐ | v3.2 |
| **9** | Performance Analyzer | **P2** | M | ⭐⭐⭐ | v3.2 |
| **10** | API Versioning & SDK | **P2** | L | ⭐⭐⭐ | v3.3 |

---

## 5. Kesimpulan

SpeexJS adalah **framework untuk developer yang benar-benar nulis kode** — bukan builder no-code.

"Zero Effort" artinya: semua kerumitan infrastruktur, boilerplate, konfigurasi, dan setup di-handle oleh framework. Developer cukup fokus pada **logika bisnis** dan **user experience** aplikasi mereka.

**Seperti Laravel untuk PHP, Rails untuk Ruby — SpeexJS adalah framework yang membuat developer TypeScript 10x lebih produktif.**
