# Changelog

## [0.8.0] - 2026-06-29

### Added
- **nlarray** — NumPy-like NDArray with 60+ methods: zeros, ones, arange, linspace, reshape, add/sub/mul/div (broadcasting), sum/mean/var/std (axis-aware), matmul, transpose, slice, concatenate, etc.
- **nlfunction** — Functional programming toolkit: curry, partial, partialRight, tap, trace, memoizeSync, negate, before, wrapArray, constant, over, comparing, memoizeLast
- **collection** — 18 new object/dictionary operations: pickBy, omitBy, mapKeys, mapValues, invert, invertBy, toPairs, fromPairs, hasPath, unset, mergeWith, defaults, defaultsDeep, deepFreeze, at, renameKeys, diff, fromKeys
- **string** — `escapeRegExp()` utility
- **type** — `isPlainObject()` now publicly exported
- 1,477 total tests across 24 test files (96.5% line coverage)

### Changed
- **validation** — Removed Indonesia-specific validators (NIK, NPWP, PlatNomor, Kodepos, NoRekening, NoSIM, Passport, NoBPJS, NoKK). Kept global: isEmail, isURL, isPhone
- **string** — Removed terbilang(), formatRupiah(). Kept 40+ string functions
- **date** — Removed isHolidayIndonesia(), getIndonesianHolidayNames(), WIB/WITA/WIT timezone constants. timeAgo/timeRemaining default locale changed to 'en' (English)
- **index.ts** — Updated all exports for new modules

## [0.7.0] - 2026-06-28

### Added
- **color** — `hexToRgb()`, `rgbToHex()`, `lighten()`, `darken()`, `contrastRatio()`, `meetsWCAG()`
- **core** — `deepEqual()`, `pipe()`, `compose()`
- **string** — `formatBytes()`, `randomString()`, `randomBoolean()`, `pluralize()`
- **string** — `levenshtein()`, `fuzzyMatch()`, `maskString()`
- **collection** — `deepGet()`, `deepSet()`
- **async** — `Queue()`, `Semaphore`, `memoizeAsync()`
- **math** — `median()`, `stddev()`, `sampleStddev()`, `percentile()`, `correlation()`, `formatCurrency()`
- **date** — `timeAgo()`, `timeRemaining()`, `Duration`, `formatDuration()`, `toTimezone()`, `formatInTimezone()`
- **validation** — `isPhone()`, `isEmail()`, `isURL()`
- **error** — `createError()`, `TypedError`, `MultiError`, `collectErrors()`
- **logger** — `Logger` class with console/JSON/file transport

### Changed
- Full English documentation and API references
- Added 828 total tests across 19 test files
- `sideEffects: false` for optimal tree-shaking

### Fixed
- `round(1.005, 2)` floating-point bug
- `parseDate('29/02/2023')` invalid leap year detection
- Prototype pollution and ReDoS edge cases

## [0.6.0] - 2026-06-27

### Ditambahkan
- **dep-exray** — `scanProject()`, `analyzeUsage()`, `generateReport()`
- CLI: `npx dep-exray .`
- **crypto** — `hash()`, `randomHex()`, `base64`, `generateToken()`, `generateOTP()`
- **path** — `join()`, `resolve()`, `basename()`, `dirname()`, `extname()`

### Diubah
- Integrasi dep-exray sebagai module built-in
- Satu package: `npm install speexjs-core` untuk semua modul

## [0.1.0] - 2026-06-27

### Ditambahkan
- Initial release
- Modul: core, math, date, collection, string, async, io, type
- 100+ utility functions
- Full TypeScript strict mode
