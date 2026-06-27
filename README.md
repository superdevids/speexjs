# superjs

> **superJS — Semua JavaScript utility dalam 1 package — Standard Library + Dependency Scanner**

```
npm install superjs-core
```

Satu package buat semua kebutuhan JavaScript: utility functions (deepClone, debounce, camelCase, formatDate, dll), async helpers, crypto, path manipulation, **plus** dependency health scanner (deteksi bloat + security issues).

---

## Package

### `superjs-core` — All-in-One JavaScript Toolkit

**Kenapa harus pake?**
- **Satu package, semua fungsi** — gak perlu install 20 package cuma buat utility dasar.
- **Tree-shakeable** — import fungsi yang lo butuh aja, sisanya gak masuk bundle.
- **TypeScript strict** — full type safety, no `any`.
- **Modern** — ESM, target ES2022, optimized buat Node 18+ dan modern browser.

```bash
npm install superjs-core
# atau
pnpm add superjs-core
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
| `dep-exray` | scanProject, analyzeUsage, generateReport, KNOWN_MAPPINGS, KNOWN_CVES | dep-checker tools |
#### Contoh

```typescript
import { deepClone, debounce, retry } from "superjs-core"
import { formatDate, addDays } from "superjs-core/date"
import { groupBy, shuffle } from "superjs-core/collection"
import { sleep, parallelMap } from "superjs-core/async"
import { isNil, assertDefined } from "superjs-core/type"
import { generateToken, constantTimeEqual } from "superjs-core/crypto"
import { join, basename } from "superjs-core/path"
import { scanProject } from "superjs-core/dep-exray"

const cloned = deepClone({ a: 1, b: { c: new Date() } })
console.log(add(0.1, 0.2)) // 0.3
console.log(formatDate(new Date(), "DD/MM/YYYY")) // "27/06/2026"
const results = await parallelMap([1,2,3,4,5], async (n) => n * 2, 2)
const apiKey = generateToken(32)
console.log(constantTimeEqual(apiKey, apiKey)) // true
const report = await scanProject({ path: "./my-project" })
console.log(report.totalEstimatedSize) // "2.3 MB"
```

---

### dep-exray — Dependency Health Scanner (built-in)

**Scan project lo buat nemuin dependency yang gak kepake, bloated, atau punya CVE — langsung dari `superjs-core`.**

```bash
# Via CLI
npx dep-exray .
npx dep-exray /path/to/project --json --verbose
```

#### Features

- Deteksi replacement — lodash ke superjs-core, moment ke superjs-core/date, uuid ke native crypto.randomUUID()
- Ukuran dependency — estimasi size dalam MB/KB
- Security check — CVE detection dari known database
- Auto-PR ready — replacement dengan confidence tinggi bisa auto-PR
- JSON output — --json buat integrasi CI/CD
- Usage analyzer — deteksi apakah dependency beneran dipake di codebase

---

### VS Code Extension — vscode-dep-exray

**Inline diagnostics + tree view untuk package.json.**

- Diagnostics — lihat langsung di package.json mana dependency yang bisa di-replace
- Tree View — panel sidebar dengan grup High/Medium/Security
- Auto-scan — scan otomatis tiap buka/save package.json
- Quick Fix — klik replacement suggestion buat apply

Location: `extensions/vscode-dep-exray/`

---

## GitHub Actions

### PR Scan (Auto)

Setiap PR yang ubah package.json atau lockfiles bakal otomatis di-scan oleh workflow yang sudah include.

### Scheduled Scan (Weekly)

Scan otomatis tiap minggu, bikin issue kalo ada masalah.

---

## Quick Start

```bash
git clone <repo-url> superjs
cd superjs
cd packages/core
npm install

# Build
npx tsup

# Test (428 tests)
npx vitest run

# Scan project sendiri
npx dep-exray .
```

---

## Project Structure

```
superjs/
├── .github/workflows/
│   ├── publish.yml
│   ├── dep-exray-pr.yml
│   ├── dep-exray-reusable.yml
│   └── dep-exray-scheduled.yml
├── packages/
│   └── core/                    # superjs-core — ALL-IN-ONE
│       ├── src/
│       │   ├── index.ts         # Barrel exports
│       │   ├── core/            # deepClone, debounce, dll
│       │   ├── math/            # add, sub, clamp, dll
│       │   ├── date/            # formatDate, parseDate, dll
│       │   ├── collection/      # groupBy, shuffle, sortBy, dll
│       │   ├── string/          # camelCase, uuid, nanoid, dll
│       │   ├── async/           # sleep, parallelMap, dll
│       │   ├── io/              # parseCsv, safeJsonParse, dll
│       │   ├── type/            # 20+ type guards
│       │   ├── crypto/          # hash, generateToken, base64, dll
│       │   ├── path/            # join, resolve, basename, dll
│       │   └── dep-exray/       # Dependency scanner
│       └── tests/               # 428 tests
├── extensions/
│   └── vscode-dep-exray/        # VS Code Extension
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```
