# superjs-core — Ringkasan Fitur Lengkap

> **Versi:** 0.4.4 | **License:** MIT | **Zero runtime dependencies**

```
npm install superjs-core
```

---

## 1. CORE — Utility Functions

| Fungsi | Deskripsi |
|--------|-----------|
| `deepClone(value)` | Deep clone dengan circular reference, Date, RegExp, Map, Set support |
| `deepMerge(...objects)` | Deep merge multiple objects, nested overwrite |
| `deepEqual(a, b)` | Deep equality check — object, array, Date, Map, Set, RegExp |
| `pipe(initial, ...fns)` | Function composition left-to-right |
| `compose(...fns)` | Function composition right-to-left |
| `debounce(fn, wait, options?)` | Debounce dengan leading/trailing/maxWait |
| `throttle(fn, wait)` | Throttle execution |
| `memoize(fn, resolver?)` | Memoize dengan custom cache key |
| `retry(fn, options?)` | Retry dengan exponential backoff |
| `noop()` | No-operation function |
| `identity(value)` | Return input unchanged |
| `once(fn)` | Execute function sekali doang |

---

## 2. MATH

| Fungsi | Deskripsi |
|--------|-----------|
| `add(a, b)` | Safe addition (0.1+0.2=0.3) |
| `sub(a, b)` | Safe subtraction |
| `mul(a, b)` | Safe multiplication |
| `div(a, b)` | Safe division (throw kalo /0) |
| `round(value, precision?)` | Round dengan floating-point fix |
| `floor(value, precision?)` | Floor dengan precision |
| `ceil(value, precision?)` | Ceil dengan precision |
| `clamp(value, min, max)` | Clamp ke range |
| `sum(values)` | Sum of array |
| `average(values)` | Average (throw kalo kosong) |
| `randomInt(min, max)` | Random integer dalam range |
| `inRange(value, min, max)` | Cek apakah dalam range |
| `median(values)` | Median dari array |
| `stddev(values)` | Population standard deviation |
| `sampleStddev(values)` | Sample standard deviation |
| `percentile(values, p)` | Persentil (0-100) |
| `correlation(x, y)` | Pearson correlation |
| `formatCurrency(value, options?)` | Format mata uang locale-aware |

---

## 3. DATE & TIME

| Fungsi | Deskripsi |
|--------|-----------|
| `formatDate(date, format?)` | Format tanggal (YYYY-MM-DD, DD/MM/YYYY, dll) |
| `parseDate(input)` | Parse string/number/Date |
| `dateDiff(date1, date2)` | Selisih antar tanggal |
| `addDays(date, days)` | Tambah/kurang hari |
| `addMonths(date, months)` | Tambah/kurang bulan |
| `addYears(date, years)` | Tambah/kurang tahun |
| `startOfDay(date)` | Awal hari (00:00:00.000) |
| `endOfDay(date)` | Akhir hari (23:59:59.999) |
| `isWeekend(date)` | Sabtu atau Minggu |
| `isLeapYear(year)` | Cek tahun kabisat |
| `isBefore(date1, date2)`, `isAfter`, `isBetween` | Perbandingan tanggal |
| `isBusinessDay(date)` | Senin-Jumat |
| `addBusinessDays(date, days)` | Tambah hari kerja |
| `calculateAge(birthDate)` | Hitung umur dalam tahun |
| `timeAgo(date, options?)` | Waktu relatif ("5 detik yang lalu") |
| `timeRemaining(target, options?)` | Waktu menuju tanggal masa depan |
| `formatDuration(duration, options?)` | Format Duration object |
| `toTimezone(date, offsetHours)` | Konversi date ke timezone tertentu |
| `formatInTimezone(date, format, offset)` | Format tanggal di timezone tertentu |

### Konstanta: `TIMEZONE_WIB` (7), `TIMEZONE_WITA` (8), `TIMEZONE_WIT` (9) 🇮🇩

---

## 4. COLLECTION — Array & Object Utilities

| Fungsi | Deskripsi |
|--------|-----------|
| `groupBy(items, keyFn)` | Grouping berdasarkan key |
| `keyBy(items, keyFn)` | Indexing berdasarkan key |
| `omit(obj, keys)` | Hapus keys tertentu |
| `pick(obj, keys)` | Ambil keys tertentu |
| `pluck(items, key)` | Extract property dari array |
| `shuffle(items)` | Fisher-Yates shuffle |
| `sample(items)` | Random element |
| `sampleSize(items, size)` | N random elements |
| `chunk(items, size)` | Potong array jadi chunk |
| `sortBy(items, ...criteria)` | Multi-criteria sort |
| `orderBy(items, key, dir?)` | Sort by key + direction |
| `uniqueBy(items, keyFn)` | Unique by key function |
| `flatten(items)` | Flatten satu level |
| `uniq(items)` | Hapus duplicate |
| `first(items)`, `last(items)` | Element pertama/terakhir |
| `isEmpty(value)` | Cek kosong |
| `topoSort(items)` | Topological sort (Kahn's algorithm) |
| `slidingWindows(items, size, step?)` | Overlapping windows |
| `tumblingWindows(items, size)` | Non-overlapping chunks |
| `deepGet(obj, path, default?)` | Akses nested object pake path string |
| `deepSet(obj, path, value)` | Set nested object pake path string |

---

## 5. STRING — Text Manipulation 🇮🇩

| Fungsi | Deskripsi |
|--------|-----------|
| `capitalize(str)` | Kapitalisasi huruf pertama |
| `camelCase(str)` | Konversi ke camelCase |
| `kebabCase(str)` | Konversi ke kebab-case |
| `snakeCase(str)` | Konversi ke snake_case |
| `pascalCase(str)` | Konversi ke PascalCase |
| `truncate(str, max, suffix?)` | Potong string dengan suffix |
| `template(str, data)` | Interpolasi string `{{key}}` |
| `uuid()` | RFC 4122 v4 UUID |
| `nanoid(size?, alphabet?)` | URL-safe random ID |
| `escapeHtml(str)` | Escape HTML entities |
| `unescapeHtml(str)` | Unescape HTML entities |
| `levenshtein(a, b)` | Levenshtein distance |
| `fuzzyMatch(str, query)` | Fuzzy string match |
| `maskString(str, options?)` | Masking data sensitif |
| `slugify(str)` | URL-friendly slug |
| `formatBytes(bytes, options?)` | Format ukuran file ("1 MB") |
| `randomString(length?)` | Random alphanumeric |
| `randomBoolean()` | Random true/false |
| `pluralize(count, singular)` | English pluralization |

### 🇮🇩 Indonesian Locale

| Fungsi | Deskripsi |
|--------|-----------|
| `terbilang(value)` | **Angka ke kata** ("satu juta lima ratus ribu") |
| `formatRupiah(value, options?)` | **Format Rupiah** ("Rp1.500.000") |

---

## 6. ASYNC

| Fungsi | Deskripsi |
|--------|-----------|
| `sleep(ms)` | Delay eksekusi |
| `timeout(promise, ms)` | Reject kalo timeout |
| `raceWithTimeout(promise, ms)` | Race promise vs timeout |
| `allSettledMap(items, fn)` | Map dengan allSettled |
| `parallelMap(items, fn, concurrency?)` | Concurrent map dengan limit |
| `retryAsync(fn, options?)` | Retry dengan backoff |
| `pipeline(initial, ...fns)` | Async function composition |
| `deferred()` | Deferred promise |
| `Queue(options?)` | Priority task queue dengan concurrency |
| `Semaphore(concurrency)` | Semaphore buat resource control |
| `memoizeAsync(fn, options?)` | Async memoize dengan TTL + stale-while-revalidate |

---

## 7. IO

| Fungsi | Deskripsi |
|--------|-----------|
| `parseCsv(input, options?)` | Parse CSV string |
| `stringifyCsv(data, options?)` | Convert records ke CSV |
| `safeJsonParse(input, default?)` | Safe JSON parse |
| `env(name, default?)` | Baca environment variable |
| `envInt(name, default?)` | Baca env var sebagai integer |
| `envBool(name, default?)` | Baca env var sebagai boolean |

---

## 8. TYPE — Type Guards

| Fungsi | Deskripsi |
|--------|-----------|
| `isString`, `isNumber`, `isBoolean`, `isObject`, `isArray`, `isFunction` | Type checks |
| `isDate`, `isRegExp`, `isMap`, `isSet`, `isPromise` | Instance checks |
| `isNull`, `isUndefined`, `isNil` | Nullish checks |
| `isEmpty(value)` | Empty/blank check |
| `assertDefined(value, msg?)` | Runtime assertion |
| `assertType(value, guard, msg?)` | Type assertion |
| `ensureArray(value)` / `castArray(value)` | Wrap in array |
| `getType(value)` | String type name |

---

## 9. CRYPTO

| Fungsi | Deskripsi |
|--------|-----------|
| `hash(str)` | djb2 hash (32-bit) |
| `simpleHash(str)` | Simple hex hash |
| `randomHex(size?)` | Random hex string |
| `base64Encode(str)` | Base64 encode (UTF-8 safe) |
| `base64Decode(str)` | Base64 decode |
| `generateToken(bytes?)` | Crypto-random hex token |
| `generateOTP(length?)` | Numeric OTP |
| `xorCipher(str, key)` | ⚠️ XOR obfuscation (BUKAN encryption) |
| `checksum(input)` | CRC-like checksum |
| `constantTimeEqual(a, b)` | Timing-safe string comparison |

---

## 10. PATH

| Fungsi | Deskripsi |
|--------|-----------|
| `join(...segments)` | Gabung path segments |
| `resolve(...segments)` | Resolve ke absolute path |
| `basename(p, ext?)` | Ambil filename |
| `dirname(p)` | Ambil directory |
| `extname(p)` | Ambil extension |
| `normalize(p)` | Normalize path |
| `isAbsolute(p)` | Cek absolute path |
| `relative(from, to)` | Relative path |
| `parse(p)` | Parse path jadi components |
| `format(parsed)` | Format parsed path |

---

## 11. VALIDATION — 🇮🇩 Khusus Indonesia

| Fungsi | Deskripsi |
|--------|-----------|
| `isNIK(value)` | **Validasi NIK** 16 digit + tanggal lahir |
| `parseNIK(value)` | **Extract data dari NIK** — gender, provinsi, tanggal lahir |
| `isNPWP(value)` | **Validasi NPWP** + checksum |
| `isPlatNomor(value)` | **Validasi plat kendaraan** RI (B 1234 CD) |
| `isPhone(value, country?)` | **Validasi nomor HP Indonesia** |
| `isKodepos(value)` | **Validasi kode pos** 5 digit |
| `isNoRekening(value)` | **Validasi nomor rekening** bank (8-16 digit) |
| `isEmail(value)` | Validasi email RFC-compliant |
| `isURL(value)` | Validasi URL (http/https) |

---

## 12. ERROR — Typed Errors

| Fungsi | Deskripsi |
|--------|-----------|
| `createError(code, message, options?)` | Bikin typed error dengan HTTP status |
| `isTypedError(error)` | Type guard |
| `TypedError` | Class dengan code + status + details + toJSON |
| `MultiError` | Kumpulin multiple errors |
| `collectErrors(fn)` | Jalanin function, kumpulin error yang ke-throw |

### Error Codes: `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `VALIDATION_ERROR` (422), `TOO_MANY` (429), `INTERNAL` (500), `BAD_GATEWAY` (502), `UNAVAILABLE` (503)

---

## 13. LOGGER — Structured Logging

| Fungsi | Deskripsi |
|--------|-----------|
| `Logger(options?)` | Structured logger dengan level |
| `logger` | Default singleton (info level) |
| `createConsoleTransport(options?)` | Colored console output |
| `createJsonTransport(options?)` | JSON-line output |
| `createFileTransport(filename, options?)` | File appender |
| `createBufferedTransport(transport, options?)` | Batched transport |

### Log Levels: `debug`, `info`, `warn`, `error`

---

## 14. COLOR — Color Utilities

| Fungsi | Deskripsi |
|--------|-----------|
| `hexToRgb(hex)` | Convert hex ke RGB object |
| `rgbToHex(r, g, b)` | Convert RGB ke hex string |
| `lighten(hex, percent)` | Terangin warna (0-100%) |
| `darken(hex, percent)` | Gelapin warna (0-100%) |
| `contrastRatio(hex1, hex2)` | WCAG contrast ratio (1-21) |
| `meetsWCAG(hex1, hex2, level?)` | Cek WCAG compliance (AA/AAA) |

---

## 15. DEP-EXRAY — Dependency Health Scanner

| Fungsi | Deskripsi |
|--------|-----------|
| `scanProject(config)` | Scan project buat bloat + security issues |
| `generateReport(result, json?)` | Generate scan report |
| `analyzeUsage(projectPath, packageName)` | Deteksi pemakaian dependency |
| `KNOWN_MAPPINGS` | 11 known replacement mappings |
| `KNOWN_CVES` | CVE database untuk known packages |

**CLI:** `npx dep-exray .`

---

## Statistik Test

| Module | Test Files | Tests |
|--------|-----------|-------|
| Semua module | 19 | **828** ✅ |

---

## Referensi Cepat

```bash
npm install superjs-core

# Import semua module
import { deepClone, deepEqual, pipe } from 'superjs-core'
import { formatDate, timeAgo, TIMEZONE_WIB } from 'superjs-core/date'
import { groupBy, topoSort, deepGet } from 'superjs-core/collection'
import { terbilang, formatRupiah, formatBytes } from 'superjs-core/string'
import { Queue, Semaphore } from 'superjs-core/async'
import { isNIK, isNPWP, isPhone } from 'superjs-core/validation'
import { createError, MultiError } from 'superjs-core/error'
import { Logger } from 'superjs-core/logger'
import { hexToRgb, lighten, contrastRatio } from 'superjs-core/color'
import { median, stddev, formatCurrency } from 'superjs-core/math'
import { scanProject } from 'superjs-core/dep-exray'
```
