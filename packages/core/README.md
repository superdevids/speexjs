# constx-core

> **JavaScript toolkit all-in-one buat developer Indonesia — Standard Library + Dependency Scanner + 🇮🇩 Validasi NIK/NPWP/Phone + Logger + Typed Errors**

```bash
npm install constx-core
```

Satu package buat semua kebutuhan JavaScript lo: utility functions, async helpers, crypto, path manipulation, typed errors, structured logging, **plus** dependency health scanner dan validasi data Indonesia (NIK, NPWP, Phone).

**100% buat programmer Indonesia. Zero dependency runtime.**

---

## Fitur Unggulan 🇮🇩

| Fitur | Fungsi |
|-------|--------|
| **Validasi NIK** | `isNIK('3201010203940001')` — validasi 16 digit + tanggal lahir |
| **Parse NIK** | `parseNIK('320101...')` — extract gender, provinsi, tanggal lahir |
| **Validasi NPWP** | `isNPWP('12.345.678.9-012.344')` — dengan checksum otomatis |
| **Validasi Plat Nomor** | `isPlatNomor('B 1234 CD')` — validasi plat kendaraan |
| **Validasi Nomor HP** | `isPhone('08123456789')` — support semua prefix Indonesia |
| **Validasi Kode Pos** | `isKodepos('16110')` — validasi kode pos 5 digit |
| **Validasi No. Rekening** | `isNoRekening('1234567890')` — validasi 8-16 digit |
| **Terbilang** | `terbilang(1500000)` → "satu juta lima ratus ribu" |
| **Format Rupiah** | `formatRupiah(1500000)` → "Rp1.500.000" |
| **Format Waktu** | `timeAgo(new Date(...))` → "5 detik yang lalu" |
| **Timezone WIB/WITA/WIT** | `formatInTimezone(date, 'HH', TIMEZONE_WIB)` → "07" |
| **Dependency Scanner** | `npx dep-exray .` — scan project lo |

---

## 16 Modules

| Module | Fungsi Unggulan |
|--------|----------------|
| **core** | deepClone, deepMerge, debounce, deepEqual, pipe, throttle, memoize |
| **math** | add/sub/mul/div (safe float), median, stddev, percentile, formatCurrency |
| **date** | formatDate, timeAgo, Duration, timezone helpers (WIB/WITA/WIT) |
| **collection** | sortBy, groupBy, shuffle, topoSort, slidingWindows, deepGet, deepSet |
| **string** | camelCase, uuid, nanoid, slugify, **terbilang**, **formatRupiah**, maskString, formatBytes |
| **async** | sleep, parallelMap, Queue, Semaphore, memoizeAsync, retryAsync |
| **io** | parseCsv, stringifyCsv, safeJsonParse, env |
| **type** | 20+ type guards (isString, isNil, assertDefined, getType) |
| **crypto** | hash, base64, generateToken, generateOTP, constantTimeEqual |
| **path** | join, resolve, basename, dirname, extname, normalize |
| **color** | hexToRgb, rgbToHex, lighten, darken, contrastRatio, meetsWCAG |
| **validation** | **isNIK**, **parseNIK**, **isNPWP**, **isPlatNomor**, **isPhone**, **isKodepos**, **isNoRekening**, isEmail, isURL |
| **error** | createError (typed + HTTP status), TypedError, MultiError |
| **logger** | Logger class, child loggers, console/JSON/file transports |
| **dep-exray** | scanProject, generateReport, analyzeUsage, CLI: `npx dep-exray .` |

---

## Contoh Kode

```typescript
import { deepClone } from "constx-core"
import { formatDate, timeAgo, TIMEZONE_WIB } from "constx-core/date"
import { Queue } from "constx-core/async"
import { uuid, maskString, terbilang, formatRupiah, formatBytes } from "constx-core/string"
import { isNIK, isNPWP, isPhone } from "constx-core/validation"
import { createError } from "constx-core/error"
import { Logger } from "constx-core/logger"
import { hexToRgb, contrastRatio } from "constx-core/color"

// Validasi data Indonesia
isNIK("3201010203940001")     // true
isNPWP("12.345.678.9-012.344") // true
isPhone("08123456789")        // true

// Konversi angka ke kata
terbilang(1500000)  // "satu juta lima ratus ribu"
formatRupiah(1500000)  // "Rp1.500.000"

// Relative time
timeAgo(new Date(Date.now() - 5000)) // "5 detik yang lalu"

// Mask data sensitif (PDPA compliance)
maskString("08123456789") // "081*****789"

// Format file size
formatBytes(1048576) // "1 MB"

// Color utilities
hexToRgb("#ff0000") // { r: 255, g: 0, b: 0 }
contrastRatio("#000000", "#ffffff") // 21

// Typed errors
throw createError("VALIDATION_ERROR", "Email wajib diisi")

// Structured logger
const log = new Logger({ level: "info", name: "app" })
log.info("Server started", { port: 3000 })
```

---

## dep-exray — Dependency Health Scanner

**Scan project lo buat nemuin dependency yang gak kepake, bloated, atau punya CVE.**

```bash
npx dep-exray .
npx dep-exray /path/to/project --json --verbose
```

### Fitur
- Deteksi replacement: lodash → constx-core, moment → constx-core/date, uuid → native crypto.randomUUID()
- Estimasi ukuran dependency
- CVE detection
- JSON output untuk CI/CD
- Usage analyzer

---

## Quick Start

```bash
git clone https://github.com/superdevids/constx.git
cd constx/packages/core
npm install
npx tsup              # Build
npx vitest run        # Test (828 tests)
npx dep-exray .       # Scan project sendiri
```

---

## Statistik Test

| File Tes | Jumlah |
|----------|--------|
| 19 file | **828** passing ✅ |

---

## Struktur Project

```
packages/core/
├── src/
│   ├── core/          # deepClone, debounce, deepEqual, pipe
│   ├── math/          # add, median, stddev, formatCurrency
│   ├── date/          # formatDate, timeAgo, Duration, WIB/WITA/WIT
│   ├── collection/    # groupBy, topoSort, deepGet, deepSet
│   ├── string/        # camelCase, terbilang, formatRupiah
│   ├── async/         # sleep, Queue, Semaphore, memoizeAsync
│   ├── io/            # parseCsv, safeJsonParse, env
│   ├── type/          # 20+ type guards
│   ├── crypto/        # hash, generateToken, base64
│   ├── path/          # join, resolve, basename
│   ├── color/         # hexToRgb, lighten, darken, contrastRatio
│   ├── validation/    # isNIK, parseNIK, isNPWP, isPlatNomor, isPhone, isKodepos, isNoRekening, isEmail, isURL
│   ├── error/         # createError, TypedError, MultiError
│   ├── logger/        # Logger, transports
│   └── dep-exray/     # Dependency scanner
├── tests/             # 828 tests
├── dist/              # Hasil build
└── package.json
```

---

## Roadmap

Lihat [ROADMAP.md](./ROADMAP.md) untuk detail lengkap.

---

## License

MIT
