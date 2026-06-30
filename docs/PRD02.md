# Product Requirements Document — SpeexJS: No-Effort Framework Vision

> **Version:** 1.0.2 (PRD)
> **Status:** Draft — Feature Proposal
> **Last Updated:** 2026-06-29
> **Author:** Independent Analysis (based on speexjs v1.6.1)
> **Scope:** Framework DX Features — "Zero Effort, Maximum Output"

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Filosofi: Apa Itu "No Effort Framework"?](#2-filosofi)
3. [Gap Analysis — Current vs Target](#3-gap-analysis)
4. [Feature Proposals](#4-feature-proposals)
   - [F1 — Auto-Scaffold via Conversational CLI](#f1--auto-scaffold-via-conversational-cli)
   - [F2 — Convention-Over-Config File Structure Enforcer](#f2--convention-over-config-file-structure-enforcer)
   - [F3 — Type-Safe Environment Variables (Zero Config)](#f3--type-safe-environment-variables-zero-config)
   - [F4 — `@speex/create` — One-Command Project Bootstrap](#f4--speexcreate--one-command-project-bootstrap)
   - [F5 — Zero-Config Auth Scaffolding](#f5--zero-config-auth-scaffolding)
   - [F6 — Auto-Generated OpenAPI + Typed SDK Client](#f6--auto-generated-openapi--typed-sdk-client)
   - [F7 — Hot Module Replacement (HMR) — Server Side](#f7--hot-module-replacement-hmr--server-side)
   - [F8 — Schema-Driven CRUD Generator](#f8--schema-driven-crud-generator)
   - [F9 — Built-In Dev Dashboard](#f9--built-in-dev-dashboard)
   - [F10 — Plugin Presets System](#f10--plugin-presets-system)
   - [F11 — Zero-Config Testing Harness](#f11--zero-config-testing-harness)
   - [F12 — Declarative Middleware Composition](#f12--declarative-middleware-composition)
   - [F13 — Smart Error Recovery + Dev Hints](#f13--smart-error-recovery--dev-hints)
   - [F14 — Deployable Monolith Mode](#f14--deployable-monolith-mode)
   - [F15 — speexjs.config.ts — Universal Config File](#f15--speexjsconfigts--universal-config-file)
5. [Priority Matrix](#5-priority-matrix)
6. [Roadmap Placement](#6-roadmap-placement)
7. [Success Metrics](#7-success-metrics)
8. [Appendix — Developer Pain Point Research](#8-appendix)

---

## 1. Executive Summary

SpeexJS sudah memiliki fondasi yang **luar biasa kuat**: 300+ fitur, zero dependency, 96.3% coverage, dan TypeScript strict mode. Namun dari sudut pandang **developer experience (DX) dan "no effort" philosophy**, masih ada gap signifikan antara "framework yang powerful" dengan "framework yang terasa magical dan frictionless."

Dokumen ini berfokus pada **15 fitur baru** yang mengubah SpeexJS dari sebuah fullstack framework yang lengkap, menjadi sebuah **"no effort framework"** — di mana developer bisa dari nol ke production dengan usaha yang seminimal mungkin, tanpa baca docs panjang, tanpa config hell, dan tanpa boilerplate yang membosankan.

**Tagline yang diusulkan untuk direction ini:**

> _"Describe what you want. SpeexJS builds it."_

---

## 2. Filosofi: Apa Itu "No Effort Framework"?

"No Effort" bukan berarti tidak powerful. Ini tentang **effort yang dikeluarkan developer proporsional dengan hasil yang didapatkan.** Framework yang baik harus terasa seperti:

```
Effort Developer  →  Output
─────────────────────────────
1 command         →  Full auth system (register, login, reset pw, 2FA)
1 decorator       →  Full CRUD API dengan validation & pagination
1 config line     →  Deploy ke production
1 schema          →  DB migration + API endpoint + SDK client + docs
```

### Karakteristik No-Effort Framework:

| Dimensi         | Target Perilaku                                                                     |
| --------------- | ----------------------------------------------------------------------------------- |
| **Onboarding**  | `npx @speex/create my-app` → `npm run dev` → working app in < 60 detik              |
| **Scaffolding** | CLI yang tanya apa yang kamu mau, bukan kamu yang harus tahu apa yang harus diketik |
| **Boilerplate** | Minimal — framework generate apa yang biasanya kamu tulis ulang                     |
| **Config**      | Convention over configuration — satu file config opsional, bukan 10 file wajib      |
| **Debugging**   | Error message yang kasih solusi, bukan sekedar stack trace                          |
| **Deploy**      | Satu command, framework yang tahu platformnya                                       |
| **Discovery**   | Developer discover fitur dari CLI, bukan dari docs yang panjang                     |

---

## 3. Gap Analysis — Current vs Target

Berdasarkan analisis kondisi SpeexJS v1.6.1 vs target "no effort framework":

| Area              | Kondisi Saat Ini                                               | Gap                                                                        | Priority |
| ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| **Project Init**  | `speexjs init` ada, tapi template terbatas (4 template statis) | Tidak ada interactive wizard, tidak ada opsi pilih fitur                   | P0       |
| **Config**        | Config tersebar di berbagai file                               | Tidak ada single `speexjs.config.ts` sebagai satu sumber kebenaran         | P0       |
| **Env Variables** | `requireEnv()` / `validateEnv()` sudah ada                     | Belum ada type inference otomatis dari `.env` file                         | P1       |
| **Auth Setup**    | AuthManager dengan 5 guard sudah ada                           | Butuh manual wiring, tidak ada "auth in one command"                       | P0       |
| **CRUD**          | `make:resource` sudah ada                                      | Tidak ada schema-driven generation (satu schema → semua layer)             | P1       |
| **HMR**           | Belum ada (di roadmap v2.0)                                    | Full server restart tiap file change, lambat                               | P0       |
| **SDK Client**    | OpenAPI generator ada                                          | Tidak auto-generate typed client SDK untuk konsumsi frontend               | P1       |
| **Testing**       | TestRequest & helpers ada                                      | Butuh manual setup per-file, tidak ada zero-config test runner integration | P2       |
| **Dev Dashboard** | Debug toolbar (v0.9) ada                                       | Tidak ada unified dev dashboard (routes, queries, jobs, errors)            | P1       |
| **Deploy**        | Belum ada (di roadmap v2.0)                                    | Zero deploy automation                                                     | P0       |
| **Error DX**      | 12 HttpException classes ada                                   | Error pages tidak kasih actionable hints untuk developer                   | P1       |
| **Middleware**    | 17 built-in middleware                                         | Composing middleware stack masih verbose                                   | P2       |
| **Plugin**        | Plugin system ada                                              | Tidak ada "preset" — kumpulan plugin untuk use case tertentu               | P2       |

---

## 4. Feature Proposals

---

### F1 — Auto-Scaffold via Conversational CLI

**Status:** ❌ Belum ada
**Priority:** P0
**Target Version:** v2.0

#### Problem Statement

Saat ini `speexjs init` generate project dari template statis. Developer yang baru harus tahu lebih dulu apa yang mereka butuhkan sebelum bisa mulai. Ini membalik logika — seharusnya framework yang nanya, bukan developer yang harus tahu.

#### Proposed Solution

Ganti `speexjs init` dengan **interactive conversational wizard** yang:

1. Tanya nama project
2. Tanya use case (API only, Fullstack, SaaS, Blog, E-commerce)
3. Tanya fitur yang dibutuhkan (Auth? Database? Queue? WebSocket?)
4. Tanya deployment target (Node, Bun, Cloudflare Workers, Docker)
5. Generate project yang sudah dikonfigurasi sesuai jawaban

#### User Flow

```bash
$ npx @speex/create

✨ Welcome to SpeexJS!

? Project name: my-saas
? What are you building?
  ❯ SaaS Application
    REST API Only
    Fullstack Web App
    Blog / CMS
    E-commerce

? Which features do you need? (space to select)
  ❯ ◉ Authentication (Session + OAuth)
    ◉ Database ORM (MySQL)
    ◯ Queue & Jobs
    ◯ WebSocket
    ◉ Email (SMTP)
    ◯ File Storage (S3)

? Deployment target?
  ❯ Node.js (standard)
    Docker (with Dockerfile)
    Bun Runtime
    Cloudflare Workers

✅ Generating project...
✅ Installing dependencies...
✅ Running database migration...

🚀 Ready! Run: cd my-saas && npm run dev
```

#### Generated Output

Berdasarkan pilihan user, framework generate:

- `src/` structure yang sesuai
- `.env.example` dengan semua variables yang diperlukan
- Pre-wired config sesuai fitur yang dipilih
- Seed data contoh
- README yang relevan dengan use case mereka

#### Acceptance Criteria

- [ ] Interactive prompt dengan arrow key navigation
- [ ] Minimum 5 use case template
- [ ] Support pilih fitur à la carte
- [ ] Generated project langsung `npm run dev` tanpa konfigurasi tambahan
- [ ] Fallback ke non-interactive mode: `npx @speex/create my-app --template saas --features auth,db,queue`

---

### F2 — Convention-Over-Config File Structure Enforcer

**Status:** ❌ Belum ada
**Priority:** P0
**Target Version:** v2.0

#### Problem Statement

SpeexJS saat ini tidak enforce struktur folder tertentu. Developer harus tahu di mana menaruh file. Tidak ada auto-discovery yang kuat, sehingga wiring masih manual.

#### Proposed Solution

Definisikan **standard SpeexJS project structure** dan buat framework auto-discover file dari struktur tersebut — mirip seperti Next.js dengan `pages/`, atau Laravel dengan `app/`.

#### Proposed Directory Convention

```
my-app/
├── speexjs.config.ts          ← Single config file (F15)
├── src/
│   ├── bootstrap.ts           ← App entry (auto-loaded)
│   ├── controllers/           ← Auto-discovered & registered
│   │   └── UserController.ts
│   ├── models/                ← Auto-discovered
│   │   └── User.ts
│   ├── middleware/            ← Auto-discovered
│   │   └── AuthMiddleware.ts
│   ├── jobs/                  ← Auto-discovered by Queue
│   │   └── SendEmailJob.ts
│   ├── migrations/            ← Auto-run on startup (dev mode)
│   │   └── 001_create_users.ts
│   ├── seeders/               ← Auto-run when --seed flag
│   ├── routes/                ← File-based routing
│   │   ├── index.ts           → GET /
│   │   ├── users/
│   │   │   ├── index.ts       → GET /users
│   │   │   └── [id].ts        → GET /users/:id
│   ├── schemas/               ← Shared validation schemas
│   │   └── UserSchema.ts
│   └── views/                 ← TSX templates
│       └── layouts/
│           └── app.tsx
├── resources/
│   ├── prompts/               ← (v3.x) AI prompt templates
│   └── locales/               ← i18n translation files
│       └── en.json
└── public/                    ← Static files
```

#### Auto-Discovery Rules

| Directory          | Behavior                                               |
| ------------------ | ------------------------------------------------------ |
| `src/controllers/` | Auto-register semua class yang extend `BaseController` |
| `src/routes/`      | File-based routing, `[param].ts` = dynamic route       |
| `src/jobs/`        | Auto-register ke Queue                                 |
| `src/middleware/`  | Available untuk dipakai by name string                 |
| `src/migrations/`  | Ordered by filename prefix (001*, 002*, dst)           |
| `src/models/`      | Auto-load ke model registry                            |

#### Acceptance Criteria

- [ ] Zero manual registration — semua auto-discovered
- [ ] `speexjs doctor` command yang deteksi violation dari convention
- [ ] Support opt-out per-directory via `speexjs.config.ts`
- [ ] Tidak breaking untuk project yang sudah pakai programmatic routing

---

### F3 — Type-Safe Environment Variables (Zero Config)

**Status:** ⚠️ Partial (`requireEnv()` ada, tapi tanpa type inference)
**Priority:** P1
**Target Version:** v2.0

#### Problem Statement

Developer sering lupa define env variables atau salah nama. SpeexJS punya `requireEnv()` tapi tidak ada type safety dari `.env` file secara otomatis.

#### Proposed Solution

Buat **`speexjs env:generate`** yang scan `.env` file dan auto-generate typed `Env` object. Developer cukup define `.env` sekali, sisanya otomatis.

#### Workflow

**Step 1: Developer tulis `.env`**

```env
DATABASE_URL=mysql://localhost:3306/mydb
JWT_SECRET=my-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
APP_ENV=development
REDIS_URL=redis://localhost:6379
```

**Step 2: Run generate (atau auto pada `npm run dev`)**

```bash
$ speexjs env:generate
✅ Generated src/env.ts
```

**Step 3: Auto-generated `src/env.ts`**

```typescript
// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Re-generate with: speexjs env:generate

import { createEnv } from "speexjs";

export const Env = createEnv({
  DATABASE_URL: { type: "string", required: true },
  JWT_SECRET: { type: "string", required: true },
  SMTP_HOST: { type: "string", required: true },
  SMTP_PORT: { type: "number", default: 587 },
  APP_ENV: {
    type: "enum",
    values: ["development", "staging", "production"],
    default: "development",
  },
  REDIS_URL: { type: "string", required: false },
});

// Fully typed:
// Env.DATABASE_URL → string
// Env.SMTP_PORT    → number
// Env.APP_ENV      → 'development' | 'staging' | 'production'
```

**Step 4: Developer pakai dengan type safety penuh**

```typescript
import { Env } from "@/env";

const port = Env.SMTP_PORT; // TypeScript tahu ini number
const env = Env.APP_ENV; // TypeScript tahu ini union type
```

#### Acceptance Criteria

- [ ] Auto-detect tipe dari value (number, boolean, string)
- [ ] Enum detection dari komentar atau nilai yang sama berulang
- [ ] Runtime validation saat startup — fail fast kalau ada env yang missing
- [ ] `speexjs env:check` command untuk validasi tanpa restart
- [ ] Support `.env`, `.env.local`, `.env.production`, `.env.staging`
- [ ] Integrasi dengan `speexjs.config.ts`

---

### F4 — `@speex/create` — One-Command Project Bootstrap

**Status:** ❌ Belum ada (hanya `speexjs init`)
**Priority:** P0
**Target Version:** v2.0

#### Problem Statement

`speexjs init` hanya bisa dijalankan setelah install speexjs. Idealnya, seperti `create-next-app` atau `create-vite`, developer bisa bootstrap project tanpa install apapun dulu.

#### Proposed Solution

Publish package `@speex/create` ke npm yang bisa dijalankan via `npx` tanpa install apapun.

#### Implementation

```bash
# Zero install bootstrap
npx @speex/create my-app

# Dengan flags untuk non-interactive
npx @speex/create my-app --template saas
npx @speex/create my-api --template api-only --db postgres
npx @speex/create my-blog --template blog --no-auth
```

#### Template Registry

| Template    | Fitur yang Di-include                     | Use Case            |
| ----------- | ----------------------------------------- | ------------------- |
| `saas`      | Auth, DB, Queue, Mail, RBAC, Stripe-ready | SaaS/startup        |
| `api-only`  | Router, DB, Auth (Token), OpenAPI         | Backend API         |
| `fullstack` | Auth, DB, Queue, JSX/VDOM, Client Router  | Web app             |
| `blog`      | DB, Auth (Session), i18n, Static pages    | Blog/CMS            |
| `realtime`  | Auth, DB, WebSocket, Queue, SSE           | Chat/live dashboard |
| `minimal`   | HTTP Server, Router only                  | Micro-service       |

#### Acceptance Criteria

- [ ] `npx @speex/create` bisa dijalankan tanpa install global
- [ ] Selesai dalam < 30 detik di koneksi normal
- [ ] Generated project langsung `npm run dev` tanpa langkah tambahan
- [ ] Setiap template punya `README.md` yang relevan
- [ ] Support `--yes` flag untuk skip semua prompts

---

### F5 — Zero-Config Auth Scaffolding

**Status:** ⚠️ Partial (AuthManager ada, tapi setup manual)
**Priority:** P0
**Target Version:** v2.0

#### Problem Statement

SpeexJS punya 5 auth guards yang powerful, tapi developer harus manual wiring semuanya: buat controller, buat routes, buat middleware, buat model, dan konfigurasi guard. Ini bisa 1-2 jam pekerjaan boilerplate.

#### Proposed Solution

Satu command yang generate **full auth system** siap pakai:

```bash
speexjs make:auth
```

#### Interactive Wizard

```
? What type of auth do you need?
  ❯ ◉ Session (web app with cookies)
    ◯ Token (API / mobile)
    ◯ Both (web + API)

? Enable OAuth providers?
  ❯ ◉ Google
    ◉ GitHub
    ◯ Facebook
    ◯ Discord

? Enable extra security features?
  ❯ ◉ Two-Factor Authentication (TOTP)
    ◉ Email Verification
    ◉ Password Reset
    ◯ Account Lockout (brute force protection)

? Generate admin panel for user management? (Y/n)
```

#### Generated Files

```
src/
├── controllers/
│   ├── Auth/
│   │   ├── LoginController.ts
│   │   ├── RegisterController.ts
│   │   ├── PasswordResetController.ts
│   │   ├── EmailVerificationController.ts
│   │   └── TwoFactorController.ts
│   └── OAuth/
│       ├── GoogleController.ts
│       └── GitHubController.ts
├── models/
│   ├── User.ts             ← dengan semua auth columns
│   └── PasswordReset.ts
├── migrations/
│   ├── 001_create_users_table.ts
│   ├── 002_create_password_resets.ts
│   └── 003_create_two_factor.ts
├── schemas/
│   ├── LoginSchema.ts
│   └── RegisterSchema.ts
├── middleware/
│   └── AuthMiddleware.ts
└── routes/
    └── auth.ts             ← semua auth routes pre-wired
```

#### Generated Routes (auto-registered)

```typescript
// Auto-generated auth routes
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/verify-email
POST /auth/2fa/enable
POST /auth/2fa/verify
GET  /auth/google
GET  /auth/google/callback
GET  /auth/github
GET  /auth/github/callback
```

#### Acceptance Criteria

- [ ] Satu command generate full auth system
- [ ] Tidak ada manual wiring yang diperlukan
- [ ] Setiap generated file punya comment yang jelas
- [ ] Support pilih per-fitur (bisa hanya session tanpa OAuth)
- [ ] Generated migration langsung bisa dijalankan
- [ ] Include basic test untuk setiap auth flow

---

### F6 — Auto-Generated OpenAPI + Typed SDK Client

**Status:** ⚠️ Partial (OpenAPI generator ada, tapi SDK client tidak)
**Priority:** P1
**Target Version:** v2.0

#### Problem Statement

SpeexJS punya OpenAPI generator, tapi outputnya hanya spec JSON/YAML. Developer frontend masih harus manual menulis API call atau pakai third-party tool untuk generate client. Ini friction yang tidak perlu.

#### Proposed Solution

**Schema-first chain**: Tulis satu schema → auto-generate migration, API endpoint, OpenAPI spec, dan **typed TypeScript SDK client**.

#### Complete Chain

```
speexjs/schema  →  API Route  →  OpenAPI Spec  →  TypeScript SDK Client
UserSchema            /users            users.json       speexClient.users.list()
```

#### SDK Generation

```bash
speexjs sdk:generate --output ./sdk/client.ts
```

#### Generated SDK (`sdk/client.ts`)

```typescript
// Auto-generated by SpeexJS SDK Generator
// Regenerate: speexjs sdk:generate

export class SpeexClient {
  constructor(private baseUrl: string, private token?: string) {}

  users = {
    list: (params?: { page?: number; limit?: number }) =>
      this.get<Paginated<User>>('/users', params),

    find: (id: string) =>
      this.get<User>(`/users/${id}`),

    create: (data: CreateUserInput) =>
      this.post<User>('/users', data),

    update: (id: string, data: UpdateUserInput) =>
      this.patch<User>(`/users/${id}`, data),

    delete: (id: string) =>
      this.delete<void>(`/users/${id}`),
  }

  posts = {
    // ... auto-generated dari PostSchema
  }

  // Typed error handling
  private async get<T>(path: string, params?: object): Promise<T> { ... }
  private async post<T>(path: string, data: unknown): Promise<T> { ... }
}

// Usage (fully typed):
const client = new SpeexClient('http://localhost:3000')
const users = await client.users.list({ page: 1 })
//    ^-- type: Paginated<User>  ← inferred dari schema
```

#### Acceptance Criteria

- [ ] `speexjs sdk:generate` menghasilkan `client.ts` yang fully typed
- [ ] SDK support semua HTTP methods
- [ ] Type inference dari schema definition
- [ ] Support authentication header injection
- [ ] SDK bisa di-publish sebagai npm package terpisah
- [ ] Support `--watch` flag untuk regenerate saat schema berubah

---

### F7 — Hot Module Replacement (HMR) — Server Side

**Status:** ❌ Belum ada (di roadmap v2.0)
**Priority:** P0
**Target Version:** v2.0

#### Problem Statement

Saat file berubah, server harus full restart. Untuk project dengan banyak file dan koneksi DB, ini bisa 3-10 detik. Developer yang lagi vibe coding perlu feedback loop yang lebih cepat.

#### Proposed Solution

**Two-tier approach** untuk HMR server-side:

**Tier 1 (v2.0): Smart Restart** — restart lebih cepat dengan cache preservation
**Tier 2 (v2.x): True HMR** — module-level hot reload tanpa restart

#### Tier 1: Smart Restart Implementation

```typescript
// Deteksi tipe perubahan file
const changeType = detectChangeType(changedFile);

switch (changeType) {
  case "route":
    // Hanya reload route registry, tidak perlu restart server
    await router.reload(changedFile);
    break;

  case "middleware":
    // Reload middleware pipeline
    await middleware.reload(changedFile);
    break;

  case "model":
    // Tidak perlu restart — model di-resolve lazy
    invalidateModelCache(changedFile);
    break;

  case "migration":
    // Auto-run migration baru di dev mode
    await runPendingMigrations();
    break;

  case "config":
    // Full restart diperlukan
    await app.restart();
    break;
}
```

#### Tier 2: True HMR (modul-level)

```
File changed: src/controllers/UserController.ts
↓
Invalidate module cache for UserController
↓
Re-require UserController (tanpa restart server)
↓
Update route handler reference
↓
Log: [HMR] UserController reloaded in 45ms ✅
```

#### Performance Targets

| Scenario          | Before (v1.x) | After Tier 1 | After Tier 2 |
| ----------------- | ------------- | ------------ | ------------ |
| Route change      | ~5s restart   | ~1s reload   | ~100ms       |
| Controller change | ~5s restart   | ~1s reload   | ~200ms       |
| Config change     | ~5s restart   | ~2s restart  | ~1s restart  |
| Model change      | ~5s restart   | Instant      | Instant      |

#### Acceptance Criteria

- [ ] Route/controller changes tidak perlu full restart
- [ ] State (DB connections, cache) dipreserve selama HMR
- [ ] WebSocket connections tetap hidup saat HMR
- [ ] Error saat HMR ditampilkan di terminal dengan jelas
- [ ] Fallback ke full restart kalau HMR gagal

---

### F8 — Schema-Driven CRUD Generator

**Status:** ⚠️ Partial (`make:resource` ada, tapi tidak schema-driven)
**Priority:** P1
**Target Version:** v2.0

#### Problem Statement

`speexjs make:resource User` generate boilerplate tapi developer masih harus manual tambah fields, validation, dan migration. Seharusnya cukup define schema sekali, sisanya auto-generate.

#### Proposed Solution

**Schema sebagai single source of truth** untuk semua layer.

#### Workflow

**Step 1: Define schema**

```typescript
// src/schemas/PostSchema.ts
import { s } from "speexjs";

export const PostSchema = s.object({
  title: s.string().min(3).max(255),
  content: s.string().min(10),
  status: s.enum(["draft", "published", "archived"]).default("draft"),
  published_at: s.date().optional(),
  author_id: s.number().int(),
  tags: s.array(s.string()).optional(),
});
```

**Step 2: Generate everything**

```bash
speexjs make:resource Post --from-schema PostSchema --all
```

**Step 3: Auto-generated files**

```typescript
// src/migrations/003_create_posts_table.ts  ← Auto dari schema
export class CreatePostsTable extends Migration {
  up() {
    this.schema.create("posts", (table) => {
      table.id();
      table.string("title", 255);
      table.text("content");
      table.enum("status", ["draft", "published", "archived"]).default("draft");
      table.timestamp("published_at").nullable();
      table.foreignId("author_id").references("users.id");
      table.json("tags").nullable();
      table.timestamps();
    });
  }
}

// src/models/Post.ts  ← Auto dari schema
export class Post extends Model {
  static table = "posts";
  fillable = [
    "title",
    "content",
    "status",
    "published_at",
    "author_id",
    "tags",
  ];

  author() {
    return this.belongsTo(User, "author_id");
  }

  // Type-safe:  Post.status → 'draft' | 'published' | 'archived'
}

// src/controllers/PostController.ts  ← Full CRUD dengan validasi
export class PostController extends BaseController {
  @get("/posts")
  async index(req: Request) {
    return Post.query().paginate(req.query("page", 1));
  }

  @post("/posts")
  async store(req: Request) {
    const data = await req.validate(PostSchema); // Auto-validated
    return Post.create(data);
  }

  @get("/posts/:id")
  async show(req: Request) {
    return Post.findOrFail(req.param("id"));
  }

  @put("/posts/:id")
  async update(req: Request) {
    const post = await Post.findOrFail(req.param("id"));
    const data = await req.validate(PostSchema.partial());
    return post.update(data);
  }

  @del("/posts/:id")
  async destroy(req: Request) {
    const post = await Post.findOrFail(req.param("id"));
    await post.delete();
    return { message: "Deleted" };
  }
}
```

#### Acceptance Criteria

- [ ] Satu schema → migration + model + controller + routes + tests
- [ ] Type mapping yang benar: `s.string()` → `VARCHAR`, `s.number().int()` → `INT`, dst
- [ ] Relation detection dari field name convention (`author_id` → `belongsTo(User)`)
- [ ] Generated test file cover semua endpoint
- [ ] Support `--only` flag: `--only migration,model` kalau tidak perlu semua

---

### F9 — Built-In Dev Dashboard

**Status:** ⚠️ Partial (Debug toolbar v0.9 ada, tapi terbatas)
**Priority:** P1
**Target Version:** v2.0

#### Problem Statement

Developer harus buka terminal untuk lihat request log, buka DB client terpisah untuk cek data, dan tidak ada cara mudah untuk monitor queue dan jobs di dev mode.

#### Proposed Solution

**Built-in Dev Dashboard** yang accessible di `/_speex/dev` saat `NODE_ENV=development`.

#### Dashboard Sections

**1. Routes Explorer**

```
Method   Path              Handler                       Middleware
──────────────────────────────────────────────────────────────────
GET      /                 HomeController.index           [cors, throttle]
GET      /users            UserController.index           [cors, auth, throttle]
POST     /users            UserController.store           [cors, auth, validate]
GET      /users/:id        UserController.show            [cors, auth]
```

**2. Request Log (Live)**

```
12:34:56  200  GET    /users?page=1       45ms   UserController.index
12:34:57  201  POST   /users              123ms  UserController.store
12:34:58  404  GET    /users/999          8ms    UserController.show
12:34:59  422  POST   /posts              12ms   Validation failed
```

**3. Query Log**

```
Query                                          Time    Origin
─────────────────────────────────────────────────────────────────
SELECT * FROM users WHERE id = ?               2ms     UserController.show:45
INSERT INTO users (name, email) VALUES (?, ?)  8ms     UserController.store:67
SELECT * FROM posts WHERE user_id = ?          3ms     Post.forUser scope
```

**4. Queue Monitor**

```
Job                    Status      Attempts  Queued At      Worker
────────────────────────────────────────────────────────────────────────
SendWelcomeEmail       ✅ done      1         2min ago       worker-1
ResizeImageJob         🔄 running   1         10sec ago      worker-2
SendWeeklyDigest       ⏳ waiting   0         5sec ago       —
FailedImportJob        ❌ failed    3         1hr ago        —
```

**5. Cache Inspector**

```
Key                        Size    TTL      Hits
────────────────────────────────────────────────
users:list:page:1          2.3KB   8min     145
user:profile:42            456B    28min    23
posts:featured             8.1KB   expired  0    [Clear]
```

**6. Mail Preview**

```
[List of emails sent in current session]
From: no-reply@myapp.com
To: user@example.com
Subject: Welcome to MyApp!
[Render preview HTML]
```

#### Acceptance Criteria

- [ ] Dashboard hanya aktif di `NODE_ENV=development`
- [ ] Accessible via `/_speex/dev` tanpa auth
- [ ] Real-time update via SSE (sudah ada di v1.x)
- [ ] Zero additional dependency
- [ ] Cache inspector dengan tombol clear per-key
- [ ] Mail preview untuk semua email yang terkirim di session

---

### F10 — Plugin Presets System

**Status:** ❌ Belum ada
**Priority:** P2
**Target Version:** v2.0

#### Problem Statement

Plugin system sudah ada tapi developer masih harus register plugin satu per satu. Untuk use case umum (SaaS, API, Blog), ada pattern yang berulang.

#### Proposed Solution

**Preset** = kumpulan plugin + konfigurasi yang sudah dioptimasikan untuk use case tertentu.

#### Built-In Presets

```typescript
// speexjs.config.ts
import { defineConfig, presets } from "speexjs";

export default defineConfig({
  preset: presets.saas({
    // Override default preset config
    auth: { guards: ["session", "token"] },
    database: { dialect: "postgresql" },
    queue: { driver: "redis" },
    mail: { transport: "smtp" },
  }),

  // Tambah plugin di luar preset
  plugins: [myCustomPlugin()],
});
```

#### Available Presets

| Preset               | Plugins Included                            | Config Defaults                      |
| -------------------- | ------------------------------------------- | ------------------------------------ |
| `presets.saas()`     | Auth, DB, Queue, Mail, RBAC, Cache, Storage | Session auth, Redis queue, SMTP mail |
| `presets.api()`      | Auth (token), DB, OpenAPI, Rate Limiting    | Token auth, JSON-only response       |
| `presets.realtime()` | Auth, DB, WebSocket, Queue, SSE             | WebSocket broadcast, memory queue    |
| `presets.blog()`     | Auth (session), DB, i18n, Static cache      | Session auth, file cache             |
| `presets.minimal()`  | Router only                                 | No auth, no DB                       |

#### Custom Preset

```typescript
// Buat preset sendiri
export const myCompanyPreset = createPreset({
  name: "my-company",
  plugins: [
    authPlugin({ guard: "sanctum" }),
    databasePlugin({ dialect: "mysql" }),
    myInternalAuditPlugin(),
  ],
  config: {
    app: { timezone: "Asia/Jakarta" },
    cors: { origins: ["https://mycompany.com"] },
  },
});
```

#### Acceptance Criteria

- [ ] Minimum 5 built-in presets
- [ ] Preset bisa di-override per-item
- [ ] Custom preset bisa dibuat dan di-share sebagai npm package
- [ ] `speexjs preset:list` untuk lihat semua preset yang available
- [ ] Preset conflict detection (2 preset yang install plugin sama)

---

### F11 — Zero-Config Testing Harness

**Status:** ⚠️ Partial (TestRequest & helpers ada, tapi setup masih manual)
**Priority:** P2
**Target Version:** v2.0

#### Problem Statement

Testing helper sudah ada tapi developer masih harus setup boilerplate per-test file: import app, bootstrap, truncate DB, dsb.

#### Proposed Solution

**Global test setup** yang otomatis berjalan sebelum semua test, plus **test helpers** yang tersedia global.

#### Zero-Config Test Setup

```typescript
// Tidak perlu import atau setup apapun di test file!
// speexjs.config.ts sudah menghandle bootstrap

// src/tests/UserController.test.ts
test("GET /users returns paginated list", async () => {
  await seed(UserFactory, 10); // Global helper

  const res = await request.get("/users"); // Global request helper

  expect(res.status).toBe(200);
  expect(res.body.data).toHaveLength(10);
  expect(res.body.meta.total).toBe(10);
});

test("POST /users creates user", async () => {
  const res = await request
    .post("/users")
    .auth(await actingAs(UserFactory.make())) // Global auth helper
    .json({ name: "John", email: "john@example.com" });

  expect(res.status).toBe(201);
  await assertDatabaseHas("users", { email: "john@example.com" });
});
```

#### Global Helpers (auto-available in tests)

```typescript
// Tersedia global tanpa import
request; // TestRequest instance
seed(); // Database seeder
actingAs(); // Auth helper
assertDatabaseHas();
assertDatabaseMissing();
assertQueueHas();
assertMailSent();
travel(); // Time travel
```

#### Acceptance Criteria

- [ ] Zero import di test file untuk basic testing
- [ ] DB auto-reset per-test (transactional rollback)
- [ ] Queue auto-fake di test environment
- [ ] Mail auto-fake di test environment
- [ ] Compatible dengan Vitest dan Node test runner built-in
- [ ] `speexjs make:test UserController` generate test file dengan template yang benar

---

### F12 — Declarative Middleware Composition

**Status:** ⚠️ Partial (17 built-in middleware ada, tapi composing masih verbose)
**Priority:** P2
**Target Version:** v2.0

#### Problem Statement

Mendefinisikan middleware stack untuk route saat ini verbose. Developer harus pass array panjang atau nested groups.

#### Proposed Solution

**Fluent middleware builder** + **named middleware groups** untuk composition yang lebih clean.

#### Current State (verbose)

```typescript
// Saat ini — verbose
app.group("/api", (router) => {
  router.use([
    corsMiddleware(),
    throttleMiddleware({ limit: 100 }),
    authMiddleware("token"),
  ]);

  router.get(
    "/users",
    [validateQuery(ListUserSchema), cacheMiddleware(60)],
    userController.index,
  );
  router.post("/users", [validateBody(CreateUserSchema)], userController.store);
});
```

#### Proposed: Named Middleware Groups

```typescript
// speexjs.config.ts — define middleware groups sekali
export default defineConfig({
  middleware: {
    groups: {
      api: ["cors", "throttle:60,100", "auth:token"],
      web: ["cors", "session", "csrf", "auth:session"],
      admin: ["web", "auth:session", "can:admin"],
      public: ["cors", "throttle:60,30"],
    },
  },
});
```

```typescript
// Route definition — clean
app.group('/api', { middleware: 'api' }, (router) => {
  router.get('/users', { cache: 60, validate: ListUserSchema }, userController.index)
  router.post('/users', { validate: CreateUserSchema }, userController.store)
})

// Atau dengan decorator
@group('/api', { middleware: 'api' })
export class UserController extends BaseController {
  @get('/users', { cache: 60, validate: ListUserSchema })
  async index(req: Request) { ... }
}
```

#### Acceptance Criteria

- [ ] Named middleware groups di `speexjs.config.ts`
- [ ] Groups bisa extend groups lain
- [ ] Middleware parameters via string syntax: `'throttle:60,100'`
- [ ] Per-route middleware override tetap bisa
- [ ] Tidak breaking untuk existing middleware usage

---

### F13 — Smart Error Recovery + Dev Hints

**Status:** ⚠️ Partial (12 HttpException ada, tapi dev hints tidak ada)
**Priority:** P1
**Target Version:** v2.0

#### Problem Statement

Saat terjadi error di development, developer hanya dapat stack trace. Tidak ada context, tidak ada saran solusi.

#### Proposed Solution

**Error page yang actionable** untuk development mode, dengan:

- Error context (request, session, env)
- Saran solusi berdasarkan error type
- Link ke dokumentasi yang relevan
- REPL untuk debug interaktif

#### Dev Error Page Features

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  ModelNotFoundException                              │
│                                                         │
│  User with id "999" not found.                         │
│                                                         │
│  💡 Possible fixes:                                     │
│  • Check if the user exists: speexjs tinker             │
│    > await User.find(999)                               │
│  • Use findOrFail() only when record must exist         │
│  • Use find() instead and handle null case              │
│                                                         │
│  📍 Thrown at:                                          │
│  src/controllers/UserController.ts:45                   │
│  > const user = await User.findOrFail(req.param('id'))  │
│                                                         │
│  🔗 Docs: speexjs.dev/docs/orm/exceptions               │
│                                                         │
│  📋 Request context:                                    │
│  GET /users/999                                         │
│  User-Agent: Mozilla/5.0...                             │
│  Auth: Bearer eyJ... (token valid, user: id=1)          │
│                                                         │
│  📊 Recent queries (last 5):                            │
│  SELECT * FROM users WHERE id = 999   →  0 rows  (1ms)  │
│                                                         │
│  [Open in Tinker]  [Copy Stack Trace]  [Report Bug]     │
└─────────────────────────────────────────────────────────┘
```

#### Error Hint Registry

```typescript
// Built-in hints untuk common errors
const errorHints = {
  ModelNotFoundException: (error) => [
    `Check if record exists: await ${error.model}.find(${error.id})`,
    `Use .find() instead of .findOrFail() to handle null`,
  ],

  ValidationException: (error) => [
    `Failed fields: ${error.fields.join(", ")}`,
    `Schema expects: ${JSON.stringify(error.schema, null, 2)}`,
  ],

  DatabaseConnectionException: () => [
    `Check DATABASE_URL in your .env file`,
    `Ensure database server is running: speexjs env:check`,
  ],
};
```

#### Acceptance Criteria

- [ ] Custom error page hanya muncul di `NODE_ENV=development`
- [ ] Hint tersedia untuk semua built-in exception types
- [ ] Link ke docs untuk setiap error type
- [ ] Request context tersedia (headers, body, session)
- [ ] "Open in Tinker" button yang auto-populate context
- [ ] Production mode hanya tampilkan safe error message

---

### F14 — Deployable Monolith Mode

**Status:** ❌ Belum ada (di roadmap v2.0)
**Priority:** P0
**Target Version:** v2.0

#### Problem Statement

Tidak ada cara built-in untuk deploy SpeexJS app. Developer harus manual setup Dockerfile, reverse proxy, process manager, dll.

#### Proposed Solution

**`speexjs deploy`** command yang handle semua deployment concern.

#### Deployment Targets

```bash
# Auto-detect dan deploy
speexjs deploy

# Explicit target
speexjs deploy --target vercel
speexjs deploy --target railway
speexjs deploy --target fly
speexjs deploy --target docker
speexjs deploy --target ec2    # Dengan SSH key
```

#### Docker Mode (Priority Target)

```bash
speexjs deploy --target docker
```

Auto-generate:

```dockerfile
# AUTO-GENERATED by SpeexJS
# Optimized multi-stage build

FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/bootstrap.js"]
```

```yaml
# AUTO-GENERATED docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env.production
    depends_on: [db, redis]

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine
```

#### Vercel Adapter

```bash
speexjs deploy --target vercel
```

Auto-generate:

```json
// vercel.json
{
  "builds": [{ "src": "dist/bootstrap.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "dist/bootstrap.js" }]
}
```

#### Acceptance Criteria

- [ ] Minimum support: Docker, Vercel, Railway
- [ ] `speexjs build` menghasilkan production-ready bundle
- [ ] `.env.production` auto-validation sebelum deploy
- [ ] Rollback support: `speexjs deploy:rollback`
- [ ] Deploy log yang informatif dengan progress indicator

---

### F15 — speexjs.config.ts — Universal Config File

**Status:** ❌ Belum ada sebagai unified file
**Priority:** P0
**Target Version:** v2.0

#### Problem Statement

Konfigurasi SpeexJS saat ini tersebar: CORS di satu tempat, DB connection di tempat lain, Auth config di tempat lain. Tidak ada "single source of truth" untuk config.

#### Proposed Solution

**`speexjs.config.ts`** di root project — satu file yang jadi pusat semua konfigurasi, dengan type safety penuh.

#### Full Config Interface

```typescript
// speexjs.config.ts
import { defineConfig, presets } from "speexjs";

export default defineConfig({
  // App
  app: {
    name: "My SaaS",
    url: process.env.APP_URL ?? "http://localhost:3000",
    env: (process.env.APP_ENV ?? "development") as AppEnv,
    key: process.env.APP_KEY!,
    timezone: "Asia/Jakarta",
    locale: "id",
  },

  // Server
  server: {
    port: Number(process.env.PORT ?? 3000),
    host: "0.0.0.0",
    bodyLimit: "10mb",
    trustProxy: true,
  },

  // Database
  database: {
    dialect: "mysql",
    host: process.env.DB_HOST ?? "localhost",
    port: 3306,
    database: process.env.DB_NAME!,
    username: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    pool: { min: 2, max: 10 },
  },

  // Auth
  auth: {
    guards: {
      web: { driver: "session", provider: "users" },
      api: { driver: "token", provider: "users" },
    },
    providers: {
      users: { model: () => import("./src/models/User") },
    },
    session: { secret: process.env.SESSION_SECRET!, lifetime: "7d" },
  },

  // Cache
  cache: {
    driver: "redis",
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    prefix: "myapp:",
    ttl: 3600,
  },

  // Queue
  queue: {
    driver: "redis",
    url: process.env.REDIS_URL,
    workers: 3,
    retries: 3,
  },

  // Mail
  mail: {
    transport: "smtp",
    host: process.env.SMTP_HOST!,
    port: 587,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    from: { name: "My SaaS", address: "no-reply@mysaas.com" },
  },

  // Storage
  storage: {
    driver: "s3",
    bucket: process.env.S3_BUCKET!,
    region: "ap-southeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SECRET_KEY!,
    },
  },

  // Middleware groups
  middleware: {
    groups: {
      api: ["cors", "throttle:60,100", "auth:api"],
      web: ["cors", "session", "csrf", "auth:web"],
    },
  },

  // CORS
  cors: {
    origins: ["https://myapp.com"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },

  // Dev Dashboard
  dev: {
    dashboard: true, // Aktif di dev mode
    queryLog: true,
    mailPreview: true,
  },

  // Plugins (jika tidak pakai preset)
  plugins: [],
});
```

#### Type Safety

```typescript
// defineConfig() return type yang fully typed
// Semua config auto-complete di IDE
// Missing required fields → TypeScript error saat compile
```

#### Acceptance Criteria

- [ ] Single `speexjs.config.ts` replace semua scattered config
- [ ] Full TypeScript intellisense dan type checking
- [ ] `speexjs config:validate` command untuk validasi config
- [ ] Backward compatible — existing programmatic setup tetap bisa
- [ ] Environment-specific config: `speexjs.config.production.ts`
- [ ] `speexjs config:show` untuk debug resolved config

---

## 5. Priority Matrix

| Feature                        | Priority | Effort | Value      | Target Version |
| ------------------------------ | -------- | ------ | ---------- | -------------- |
| F1 — Conversational CLI        | P0       | M      | ⭐⭐⭐⭐⭐ | v2.0           |
| F4 — `@speex/create`           | P0       | S      | ⭐⭐⭐⭐⭐ | v2.0           |
| F5 — Zero-Config Auth          | P0       | M      | ⭐⭐⭐⭐⭐ | v2.0           |
| F7 — Server HMR                | P0       | L      | ⭐⭐⭐⭐⭐ | v2.0           |
| F14 — Deploy Command           | P0       | L      | ⭐⭐⭐⭐⭐ | v2.0           |
| F15 — speexjs.config.ts        | P0       | M      | ⭐⭐⭐⭐⭐ | v2.0           |
| F2 — File Structure Convention | P0       | M      | ⭐⭐⭐⭐   | v2.0           |
| F3 — Typed Env Variables       | P1       | S      | ⭐⭐⭐⭐   | v2.0           |
| F6 — OpenAPI + SDK Client      | P1       | M      | ⭐⭐⭐⭐   | v2.0           |
| F8 — Schema-Driven CRUD        | P1       | M      | ⭐⭐⭐⭐⭐ | v2.0           |
| F9 — Dev Dashboard             | P1       | M      | ⭐⭐⭐⭐   | v2.0           |
| F13 — Smart Error Hints        | P1       | S      | ⭐⭐⭐     | v2.0           |
| F10 — Plugin Presets           | P2       | S      | ⭐⭐⭐     | v2.0           |
| F11 — Zero-Config Testing      | P2       | M      | ⭐⭐⭐⭐   | v2.0           |
| F12 — Middleware DSL           | P2       | S      | ⭐⭐⭐     | v2.0           |

**Effort Scale:** S=Small (1-2w), M=Medium (2-4w), L=Large (4-8w)

---

## 6. Roadmap Placement

```
v1.6.x (Current)          v2.0 (Q3 2026)                v2.x (Q4 2026)
────────────────           ─────────────────────          ──────────────────
                           Foundation of "No Effort"
                           ─────────────────────
                           ● F15: speexjs.config.ts        ● HMR Tier 2
                           ● F1:  Conversational CLI        ● F6: Full SDK
                           ● F4:  @speex/create             ● F2: Auto-discovery
                           ● F5:  Zero-Config Auth          ● F11: Test harness
                           ● F7:  HMR Tier 1
                           ● F8:  Schema CRUD
                           ● F14: Deploy Command
                           ● F3:  Typed Env
                           ● F9:  Dev Dashboard
                           ● F13: Smart Errors
                           ● F10: Plugin Presets
                           ● F12: Middleware DSL
```

### Interdependencies

```
F15 (config)
  └── F1 (CLI wizard)
        └── F4 (@speex/create)
              └── F5 (auth scaffold)
  └── F10 (presets)
        └── F12 (middleware groups)

F8 (schema CRUD)
  └── F6 (SDK client)
        └── F2 (file convention)

F7 (HMR)
  └── F9 (dev dashboard) — shows HMR status
        └── F13 (smart errors) — shown in dashboard
```

---

## 7. Success Metrics

### Developer Experience Metrics

| Metric                | Current (v1.6.1)        | Target (v2.0)                             |
| --------------------- | ----------------------- | ----------------------------------------- |
| Time to "Hello World" | ~5 menit (manual setup) | < 60 detik (`npx @speex/create`)          |
| Time to full CRUD API | ~1 jam                  | < 5 menit (`make:resource --from-schema`) |
| Time to add auth      | ~2 jam                  | < 2 menit (`make:auth`)                   |
| Time to deploy        | ~2 jam (manual)         | < 5 menit (`speexjs deploy`)              |
| Dev iteration speed   | ~5s per change          | < 500ms (HMR)                             |
| Config files needed   | 5-10 files              | 1 file (`speexjs.config.ts`)              |

### Adoption Metrics

| Metric                                         | Target (6 bulan setelah v2.0) |
| ---------------------------------------------- | ----------------------------- |
| npm weekly downloads                           | +300% dari v1.x baseline      |
| GitHub stars                                   | +500 dalam 3 bulan            |
| `@speex/create` usage                          | >70% project baru pakai ini   |
| Forum/Discord questions tentang "cara setup X" | -60% (karena auto-scaffold)   |

### Quality Metrics

| Metric                     | Target               |
| -------------------------- | -------------------- |
| Test coverage setelah v2.0 | > 95% (maintain)     |
| New TypeScript errors      | 0                    |
| Breaking changes dari v1.x | Minimal (documented) |
| New known bugs             | 0 saat release       |

---

## 8. Appendix — Developer Pain Point Research

### Pain Points yang Diidentifikasi (dari framework landscape analysis)

**Pain Point #1: Configuration Fatigue**
Developer JS/TS rata-rata menghabiskan 20-30% waktu mereka untuk konfigurasi dan boilerplate di awal project. Source: State of JS 2024, NextJS community surveys.

**Pain Point #2: Fragmented Toolchain**
Rata-rata fullstack JS project membutuhkan: framework + ORM + auth library + validation library + testing library + process manager + deployment tool. Setiap tool punya config sendiri.

**Pain Point #3: Slow Feedback Loop**
Server restart 3-10 detik setiap ada perubahan file sangat mengganggu flow state developer, terutama dalam konteks vibe coding.

**Pain Point #4: Auth adalah Boilerplate Terbesar**
Dari survey komunitas, "setting up authentication" adalah pekerjaan paling berulang dan membosankan yang developer lakukan di setiap project baru.

**Pain Point #5: Deployment adalah Tembok Terakhir**
Banyak developer yang bisa bikin app tapi stuck di deployment. One-command deploy akan significantly lower the barrier.

### Competing Framework "No Effort" Features yang Jadi Benchmark

| Framework     | No-Effort Feature         | SpeexJS Equivalent             |
| ------------- | ------------------------- | ------------------------------ |
| Next.js       | `create-next-app`         | → F4: `@speex/create`          |
| Laravel       | `php artisan make:auth`   | → F5: `speexjs make:auth`      |
| Ruby on Rails | Convention over config    | → F2: File structure enforcer  |
| AdonisJS      | `.env` validation         | → F3: Typed env variables      |
| Next.js       | Fast Refresh (HMR)        | → F7: Server HMR               |
| Laravel       | `php artisan tinker`      | ✅ Sudah ada: `speexjs tinker` |
| Django        | Admin panel               | → F9: Dev dashboard (partial)  |
| Rails         | `rails generate scaffold` | → F8: Schema-driven CRUD       |

---

_Document prepared based on analysis of speexjs v1.6.1 (https://github.com/superdevids/speexjs)_
_PRD ini bersifat proposal dan tidak merepresentasikan roadmap resmi SpeexJS._
