# 🔧 jscore

> **JavaScript ecosystem tools — Standard Library + Dependency Scanner**

```
jscore-core       → Zero-dependency JS standard library (10 modules, 100+ functions) — **[npm](https://www.npmjs.com/package/jscore-core)**
jscore-dep-exray   → Dependency health scanner & replacement engine — **[npm](https://www.npmjs.com/package/jscore-dep-exray)**
vscode-dep-exray    → VS Code extension for inline diagnostics
```

---

## 📦 Packages

### `jscore-core` — Standard Library for JavaScript

**Kenapa harus pake?**
- **Zero dependency** — gak perlu install 20 package cuma buat utility dasar.
- **Tree-shakeable** — import fungsi yang lo butuh aja, sisanya gak masuk bundle.
- **TypeScript strict** — full type safety, no `any`.
- **Modern** — ESM, target ES2022, optimized buat Node 18+ dan modern browser.

```bash
npm install jscore-core
# atau
pnpm add jscore-core
```

#### Modules

| Module | Fungsi | Pengganti |
|--------|--------|-----------|
| `core` | deepClone, deepMerge, debounce, throttle, memoize, retry, noop, identity, once | lodash |
| `math` | add, sub, mul, div, round, floor, ceil, approxEqual, clamp, sum, average, randomInt, inRange | Native (safe) |
| `date` | formatDate, parseDate, dateDiff, addDays, addMonths, addYears, startOfDay, endOfDay, isWeekend, isLeapYear, isBusinessDay, calculateAge, dll | moment, date-fns |
| `collection` | groupBy, keyBy, omit, pick, pluck, shuffle, sample, chunk, sortBy, orderBy, uniqueBy, flatten, uniq, first, last, isEmpty | lodash |
| `string` | capitalize, camelCase, kebabCase, snakeCase, pascalCase, truncate, template, uuid, nanoid, escapeHtml, slugify, dll | lodash, nanoid |
| `async` | sleep, timeout, raceWithTimeout, parallelMap, retryAsync, pipeline, deferred | async helpers |
| `io` | parseCsv, stringifyCsv, safeJsonParse, env, envInt, envBool | csv-parser, dotenv |
| `type` | 20+ type guards (isString, isNil, assertDefined, ensureArray, getType, dll) | — |
| `crypto` | hash, randomHex, base64Encode/Decode, generateToken, generateOTP, xorCipher, checksum, constantTimeEqual | Node crypto |
| `path` | join, resolve, basename, dirname, extname, normalize, isAbsolute, relative, parse, format | Node path |

#### Contoh

```typescript
import { deepClone, debounce, retry } from 'jscore-core'
import { formatDate, addDays } from 'jscore-core/date'
import { groupBy, shuffle } from 'jscore-core/collection'
import { sleep, parallelMap } from 'jscore-core/async'
import { isNil, assertDefined } from 'jscore-core/type'
import { generateToken, constantTimeEqual } from 'jscore-core/crypto'
import { join, basename } from 'jscore-core/path'

// Deep clone dengan cyclic reference support
const cloned = deepClone({ a: 1, b: { c: new Date() } })

// Safe math (0.1 + 0.2 = 0.3 ✅)
console.log(add(0.1, 0.2)) // 0.3

// Date formatting tanpa moment
console.log(formatDate(new Date(), 'DD/MM/YYYY')) // "27/06/2026"

// Parallel map dengan concurrency limit
const results = await parallelMap([1,2,3,4,5], async (n) => n * 2, 2)

// Token generation
const apiKey = generateToken(32) // 64-character hex string
console.log(constantTimeEqual(apiKey, apiKey)) // true
```

---

### `jscore-dep-exray` — Dependency Health Scanner

**Scan project lo buat nemuin dependency yang gak kepake, bloated, atau punya CVE.**

```bash
npx jscore-dep-exray .
# atau setelah global install
dep-exray /path/to/project
dep-exray /path/to/project --json
```

#### Features

- ✅ **Deteksi replacement** — lodash → `jscore-core`, moment → `jscore-core/date`, uuid → native `crypto.randomUUID()`
- ✅ **Ukuran dependency** — estimasi size dalam MB/KB
- ✅ **Security check** — CVE detection dari known database
- ✅ **Auto-PR ready** — replacement dengan confidence tinggi bisa auto-PR
- ✅ **JSON output** — `--json` buat integrasi CI/CD
- ✅ **Usage analyzer** — deteksi apakah dependency beneran dipake di codebase

#### Output

```
┌──────────────────────────────────────────────────────────┐
│                    dep-exray Report                       │
├──────────────────────────────────────────────────────────┤
│  📦 PROJECT: my-app                                       │
│  📊 DEPENDENCIES: 42 direct + 283 transitive              │
│  💾 TOTAL SIZE: 487.2 MB                                  │
├──────────────────────────────────────────────────────────┤
│ 🟢 HIGH IMPACT REPLACEMENTS (3)                            │
├──────────────────────────────────────────────────────────┤
│ ❌ lodash (4.2MB) → jscore-core (~5KB)                    │
│    └─ [Auto-PR ready] ✓ 100% behavior match               │
│ ❌ moment (2.5MB) → jscore-core/date (<1KB)               │
│    └─ [Auto-PR ready] ✓ 98% behavior match                │
│ ❌ uuid (30KB) → crypto.randomUUID() (0KB)                 │
│    └─ [Auto-PR ready] ✓ 100% native replacement           │
├──────────────────────────────────────────────────────────┤
│ 🔴 SECURITY (2)                                            │
├──────────────────────────────────────────────────────────┤
│ CVE-2021-3807 in ansi-regex → update to v6.0.1+           │
└──────────────────────────────────────────────────────────┘
```

---

### `vscode-dep-exray` — VS Code Extension

**Inline diagnostics + tree view untuk package.json.**

- 🔍 **Diagnostics** — lihat langsung di `package.json` mana dependency yang bisa di-replace
- 🗂️ **Tree View** — panel sidebar dengan grup High/Medium/Security
- ⚡ **Auto-scan** — scan otomatis tiap buka/save `package.json`
- 🎯 **Quick Fix** — klik replacement suggestion buat apply

Location: `extensions/vscode-dep-exray/`

---

## 🤖 GitHub Actions

### PR Scan (Auto)

Setiap PR yang ubah `package.json` atau lockfiles bakal otomatis di-scan:

```yaml
# .github/workflows/dep-exray-pr.yml — sudah include
```

### Scheduled Scan (Weekly)

Scan otomatis tiap Senin jam 8 pagi, bikin issue kalo ada masalah:

```yaml
# .github/workflows/dep-exray-scheduled.yml — sudah include
```

### Reusable Workflow

Panggil dari workflow lain:

```yaml
jobs:
  depscan:
    uses: ./.github/workflows/dep-exray-reusable.yml
    secrets:
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 🚀 NPM Publish

Packages ready to publish:

```bash
# Build
pnpm build

# Test
pnpm test

# Bump version & publish
pnpm changeset        # Create changeset
pnpm ci:version       # Bump versions
pnpm ci:publish       # Publish to npm
```

Publish otomatis via GitHub Actions tiap merge ke `main` (file `.github/workflows/publish.yml`).

**Setup NPM Token:**
```bash
pnpm config set "//registry.npmjs.org/:_authToken" <your-token> --global
```

---

## 🚀 Quick Start

```bash
# Clone & install
git clone <repo-url> jscore
cd jscore
pnpm install

# Build semua package
pnpm build

# Test semua package
pnpm test

# Scan project sendiri
node packages/dep-exray/dist/cli.js .

# VS Code Extension
pnpm ext:install
pnpm ext:compile
```

## 🧪 Test Stats

| Package | Test Files | Tests |
|---------|-----------|-------|
| `jscore-core` | 10 | 392 |
| `jscore-dep-exray` | 4 | 36 |
| **Total** | **14** | **428** |

## 📊 Bundle Size

| Import | Size |
|--------|------|
| `jscore-core` (all 10 modul) | ~24 KB |
| `jscore-core/core` | ~6 KB |
| `jscore-core/date` | ~8 KB |
| `jscore-core/math` | ~3 KB |
| `jscore-core/async` | ~2 KB |
| `jscore-core/collection` | ~3 KB |
| `jscore-core/string` | ~4 KB |
| `jscore-core/io` | ~3 KB |
| `jscore-core/type` | ~3 KB |
| `jscore-core/crypto` | ~4 KB |
| `jscore-core/path` | ~3 KB |

## 📁 Project Structure

```
jscore/
├── .changeset/              # Changeset config for versioning
├── .github/
│   ├── actions/
│   │   └── dep-exray-scan/  # Reusable composite action
│   └── workflows/
│       ├── publish.yml       # Auto-publish on merge to main
│       ├── dep-exray-pr.yml  # Scan on PR
│       ├── dep-exray-reusable.yml
│       └── dep-exray-scheduled.yml  # Weekly scan
├── packages/
│   ├── core/                 # jscore-core — Standard Library
│   │   ├── src/
│   │   │   ├── core/        # deepClone, debounce, retry, dll
│   │   │   ├── math/        # add, sub, clamp, dll
│   │   │   ├── date/        # formatDate, parseDate, dll
│   │   │   ├── collection/  # groupBy, shuffle, sortBy, dll
│   │   │   ├── string/      # camelCase, uuid, nanoid, dll
│   │   │   ├── async/       # sleep, parallelMap, dll
│   │   │   ├── io/          # parseCsv, safeJsonParse, dll
│   │   │   ├── type/        # 20+ type guards
│   │   │   ├── crypto/      # hash, generateToken, base64, dll
│   │   │   └── path/        # join, resolve, basename, dll
│   │   └── tests/           # 392 tests
│   └── dep-exray/           # jscore-dep-exray
│       ├── src/
│       │   ├── cli.ts       # Commander.js CLI
│       │   ├── scanner/     # Scanner engine
│       │   ├── reporter/    # Pretty report generator
│       │   └── analyzer/    # Usage analyzer
│       └── tests/           # 36 tests
├── extensions/
│   └── vscode-dep-exray/    # VS Code Extension
│       ├── src/
│       │   ├── extension.ts           # Entry point
│       │   ├── diagnosticProvider.ts   # Inline diagnostics
│       │   ├── depExrayProvider.ts     # Tree view
│       │   └── scanner.ts             # Built-in scanner
│       └── test-fixtures/
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## 🗺️ Roadmap

- [x] **v0.1 — Core library** (8 modul, 100+ functions) ✅
- [x] **v0.2 — More functions** (crypto, path — 20 new functions) ✅
- [x] **v0.3 — dep-exray GitHub Action** (PR scan + scheduled + reusable) ✅
- [x] **v0.4 — VS Code Extension** (inline hints + tree view) ✅
- [x] **NPM Publish Setup** (changesets, CI/CD, auto-publish) ✅
- [ ] **v0.5 — Auto-PR generator** (beneran bikin PR replace library)
- [ ] **v1.0 — Stable API** (setelah feedback komunitas)

## 📝 License

MIT

---

> Dibuat dengan ❤️ sama programmer JS buat programmer JS.
