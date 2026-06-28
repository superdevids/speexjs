# Changelog

## [0.4.4] - 2026-06-28

### Diubah
- Semua markdown file dipindah ke packages/core/ dan include di npm package
- `files` di package.json: nambah `"*.md"` biar dokumentasi ikut ter-publish

## [0.4.3] - 2026-06-28

### Diubah
- Markdown file dipindah dari root ke packages/core/

## [0.4.2] - 2026-06-28

### Ditambahkan
- **validation** — `parseNIK()` extract data dari NIK (gender, provinsi, tanggal lahir)
- **validation** — `isPlatNomor()` validasi plat kendaraan Indonesia (B 1234 CD)
- **validation** — `isKodepos()` validasi kode pos Indonesia (5 digit)
- **validation** — `isNoRekening()` validasi nomor rekening bank (8-16 digit)
- 828 total tests (19 test files)

## [0.4.1] - 2026-06-28

### Diubah
- Semua dokumentasi pake Bahasa Indonesia
- Description npm: fokus ke developer Indonesia

## [0.4.0] - 2026-06-28

### Ditambahkan
- **color module** — `hexToRgb()`, `rgbToHex()`, `lighten()`, `darken()`, `contrastRatio()`, `meetsWCAG()`
- **core** — `deepEqual()` (deep equality), `pipe()`, `compose()` (function composition)
- **string** — `formatBytes()`, `randomString()`, `randomBoolean()`, `pluralize()`
- **collection** — `deepGet()`, `deepSet()` (nested object path access)
- 810 total tests (18 test files)

### Diubah
- Semua dokumentasi pake Bahasa Indonesia

## [0.3.9] - 2026-06-28

### Diubah
- README pake Bahasa Inggris (dulu Indonesia)
- Description npm diupdate

## [0.3.6] - 2026-06-28

### Diubah
- 810 total tests (dari 484) — nambah brutal audit suite 273 edge-case tests
- SUMMARY.md dibuat — dokumentasi fitur lengkap semua module

### Dibenerin
- 6 bug ditemukan pas brutal audit
- Semua prototype pollution, ReDoS, crypto tests terverifikasi

## [0.3.5] - 2026-06-28

### Ditambahkan (Ekspansi P1)
- **async**: Queue (priority task queue), Semaphore, memoizeAsync (stale-while-revalidate)
- **math**: median, stddev, sampleStddev, percentile, correlation, formatCurrency
- **string**: levenshtein, fuzzyMatch, maskString (PDPA compliance), terbilang (angka→kata), formatRupiah
- **collection**: topoSort (Kahn's algorithm), slidingWindows, tumblingWindows
- **date**: timeAgo (id/en), timeRemaining, Duration, formatDuration, toTimezone, formatInTimezone, WIB/WITA/WIT constants

## [0.3.4] - 2026-06-28

### Ditambahkan (Modul P0)
- **validation**: isNIK, isNPWP, isPhone, isEmail, isURL — validasi khusus Indonesia
- **error**: createError, TypedError (10 codes + HTTP status), MultiError, collectErrors
- **logger**: Logger class, child loggers, console/JSON/file transports, buffered transport
- 16 modules total, 484 tests passing

## [0.3.3] - 2026-06-28

### Dibenerin
- `round(1.005, 2)` floating-point bug
- `parseDate('29/02/2023')` gak throw buat invalid leap year
- Nambah `sideEffects: false` buat tree-shaking optimal

## [0.3.2] - 2026-06-28

### Ditambahkan
- Biome linter + formatter config
- CI workflow dengan matrix testing (Node 18, 20, 22)
- SECURITY.md buat vulnerability disclosure
- CHANGELOG.md

### Dibenerin
- Cross-platform `clean` script
- GitHub Actions: dep-exray-scan pake superjs-core
- Hapus keyword "zero-dependency" yang misleading

## [0.3.0] - 2026-06-27

### Diubah
- `superjs-dep-exray` digabung ke `superjs-core` jadi module built-in
- Satu package: `npm install superjs-core` dapet semua
- 7 npm packages di-unpublish/deprecate

### Ditambahkan
- `dep-exray` module: scanProject, analyzeUsage, generateReport
- CLI: `npx dep-exray .`

## [0.2.0] - 2026-06-27

### Ditambahkan
- crypto module: hash, randomHex, base64, generateToken, generateOTP
- path module: join, resolve, basename, dirname, extname

## [0.1.0] - 2026-06-27

### Ditambahkan
- Initial release
- core, math, date, collection, string, async, io, type modules
- 100+ utility functions
- Full TypeScript strict mode
