# Roadmap SuperJS

## v0.4.0 — Modul Indonesia & Error Foundation ✅ (Selesai)

### Modul Baru
- ✅ **validation** — `isNIK()`, `isNPWP()`, `isPhone("id")`, `isEmail()`, `isURL()` — zero-dep, khusus Indonesia
- ✅ **error** — `createError()` factory, `MultiError`, typed error codes
- ✅ **logger** — Structured logger zero-dep, child loggers, file transport
- ✅ **color** — `hexToRgb()`, `lighten()`, `darken()`, `contrastRatio()`, `meetsWCAG()`

### Ekspansi Modul Existing
- ✅ **core** — `deepEqual()`, `pipe()`, `compose()`
- ✅ **string** — `maskString()`, `levenshtein()`, `fuzzyMatch()`, `terbilang()`, `formatRupiah()`, `formatBytes()`, `pluralize()`
- ✅ **math** — `median()`, `stddev()`, `percentile()`, `correlation()`, `formatCurrency()`
- ✅ **async** — `Queue()`, `Semaphore`, `memoizeAsync()`
- ✅ **collection** — `topoSort()` (Kahn), `slidingWindows()`, `deepGet()`, `deepSet()`
- ✅ **date** — `timeAgo()`, `Duration`, `formatDuration()`, `toTimezone()`, WIB/WITA/WIT

---

## v0.5.0 — Production Toolkit (Next)

### Ekspansi
- **validation** — Tambah `isEmail()` detail check, `isURL()` lebih ketat
- **io** — `parseJSONL()`, streaming CSV parser
- **crypto** — AES-GCM encrypt/decrypt, HMAC signing, hapus xorCipher

### Infrastructure
- TypeDoc generated API docs (biar gampang referensi)
- Benchmark suite vs lodash/moment
- VS Code Extension publish ke Marketplace

---

## v0.6.0 — Advanced

### Modul Baru
- **signal** — Reactive primitives: `signal()`, `computed()`, `effect()` — framework-agnostic
- **ml** — `cosineSimilarity()`, confusion matrix, F1 score, k-means clustering

### Ekspansi
- **crypto** — JWT lite buat edge runtime
- **type** — Schema validation lite

---

## v1.0.0 — Stable API

- API freeze — no breaking changes setelah v1.0
- Dependabot + Renovate configured
- Co-maintainer onboarding

---

## Prioritas Matrix

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| validation module (isNIK, isNPWP, isPhone) | 🔥🔥🔥 | 🟢 Small | ✅ P0 |
| error module | 🔥🔥🔥 | 🟢 Small | ✅ P0 |
| logger module | 🔥🔥🔥 | 🟢 Small | ✅ P0 |
| color module | 🔥🔥 | 🟢 Small | ✅ P0 |
| string: terbilang, formatRupiah, maskString | 🔥🔥🔥 | 🟢 Small | ✅ P0 |
| math: median, stddev, percentile | 🔥🔥 | 🟢 Small | ✅ P1 |
| async: Queue, Semaphore | 🔥🔥 | 🟡 Medium | ✅ P1 |
| core: pipe, compose, deepEqual | 🔥🔥🔥 | 🟡 Medium | ✅ P1 |
| collection: topoSort, deepGet, deepSet | 🔥🔥 | 🟡 Medium | ✅ P1 |
| date: timeAgo, Duration, tz helpers | 🔥🔥 | 🟡 Medium | ✅ P1 |
| io: JSONL parser, streaming CSV | 🔥🔥 | 🟡 Medium | P2 |
| crypto: AES-GCM, HMAC, JWT | 🔥🔥🔥 | 🔴 Large | P2 |
| signal module | 🔥🔥 | 🔴 Large | P2 |
| ml module | 🔥🔥 | 🔴 Large | P3 |
