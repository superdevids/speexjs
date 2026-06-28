# SuperJS Roadmap

## v0.4.0 — Indonesia Module & Error Foundation (Next)

### New Modules
- **validation** — `isNIK()`, `isNPWP()`, `isPhone("id")`, `isEmail()`, `isURL()` — zero-dep, khusus Indonesia
- **error** — `createError()` factory, `ErrorBoundary`, `MultiError`, typed error codes

### Existing Module Expansions
- **string** — `maskString()`, `levenshtein()`, `fuzzyMatch()`, `terbilang()`, `formatRupiah()`, `parseNIK()`
- **math** — `median()`, `stddev()`, `percentile()`, `correlation()`, `formatCurrency("id-ID")`
- **async** — `createQueue()`, `Semaphore`, `memoizeAsync()` stale-while-revalidate

---

## v0.5.0 — Production Toolkit

### New Modules
- **logger** — Structured logger zero-dep, child loggers, file transport, log levels
- **core** — `pipe()`, `compose()`, `deepEqual()`, `Result<T,E>` type

### Existing Module Expansions
- **collection** — `topoSort()`, sliding/tumbling windows, lazy Iterator pipeline
- **date** — `timeAgo({locale:"id"})`, `Duration` type, WIB/WITA/WIT helpers
- **io** — `parseJSONL()`, streaming CSV parser, TOML parser

---

## v0.6.0 — Advanced & Future

### New Modules
- **signal** — Reactive primitives: `signal()`, `computed()`, `effect()` — framework-agnostic
- **crypto** — AES-GCM, HMAC signing, JWT lite for edge runtime, remove xorCipher

### Existing Module Expansions
- **type** — Schema validation lite, Branded types
- **crypto** — Proper AES-GCM encrypt/decrypt, HMAC signing

---

## v1.0.0 — Stable API

### New Modules
- **color** — WCAG contrast checker, oklch color manipulation, palette generation
- **ml** — `cosineSimilarity()`, confusion matrix, F1 score, k-means clustering, BPE tokenizer lite

### Infrastructure
- API freeze — no breaking changes after v1.0
- TypeDoc generated API docs
- Benchmark suite vs competitors
- VS Code Extension published to Marketplace
- Dependabot + Renovate configured
- Co-maintainer onboarding

---

## Priority Matrix

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| validation module (isNIK, isNPWP, isPhone) | 🔥🔥🔥 | 🟢 Small | P0 |
| error module | 🔥🔥🔥 | 🟢 Small | P0 |
| logger module | 🔥🔥🔥 | 🟢 Small | P0 |
| string: terbilang, formatRupiah, maskString | 🔥🔥🔥 | 🟢 Small | P0 |
| math: median, stddev, percentile | 🔥🔥 | 🟢 Small | P1 |
| async: createQueue, Semaphore | 🔥🔥 | 🟡 Medium | P1 |
| core: pipe, compose, deepEqual, Result | 🔥🔥🔥 | 🟡 Medium | P1 |
| collection: topoSort, slidingWindows | 🔥🔥 | 🟡 Medium | P1 |
| date: timeAgo, Duration, tz helpers | 🔥🔥 | 🟡 Medium | P1 |
| io: JSONL parser, streaming CSV | 🔥🔥 | 🟡 Medium | P1 |
| signal module | 🔥🔥 | 🔴 Large | P2 |
| crypto: AES-GCM, HMAC, JWT | 🔥🔥🔥 | 🔴 Large | P2 |
| color module | 🔥 | 🟡 Medium | P3 |
| ml module | 🔥🔥 | 🔴 Large | P3 |
