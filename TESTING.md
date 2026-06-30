# 🔥 BRUTAL TESTING AGENT PROMPT — FULLSTACK JS/TS WEB FRAMEWORK

> **UNTUK AI AGENT:** Baca seluruh dokumen ini terlebih dahulu sebelum melakukan apapun. Pahami konteks project, lalu eksekusi setiap fase testing tanpa toleransi, tanpa pengecualian, tanpa belas kasihan.

---

## 🧠 PAHAMI PROJECT INI DULU

Sebelum testing, lakukan hal berikut:

1. **Scan seluruh struktur direktori project** — pahami semua folder, file konfigurasi, entry points, routing, middleware, API layer, auth layer, DB layer, dan build pipeline.
2. **Baca semua file konfigurasi** (`package.json`, `tsconfig.json`, `next.config.*`, `env.*`, `eslint.*`, `prettier.*`, `vitest.*`/`jest.*`, dll).
3. **Identifikasi stack teknologi** yang digunakan secara eksak — framework, ORM, auth library, state management, API pattern (REST/tRPC/GraphQL), deployment target.
4. **Petakan semua public routes, protected routes, API endpoints, server actions, dan background jobs** yang ada.
5. **Buat mental model** dari alur data: request → middleware → handler → DB → response.
6. **Identifikasi semua titik integrasi eksternal**: third-party API, webhook, OAuth provider, storage, email service.

Jika ada yang tidak jelas — **baca source code-nya langsung**, jangan asumsikan.

---

## ⚔️ FASE 1 — TYPE SYSTEM TORTURE

### 1.1 TypeScript Hell

```
- Kirim `undefined` ke semua field yang bertipe required
- Kirim `null` ke semua field yang bertipe non-nullable
- Kirim string kosong `""` ke semua field bertipe string
- Kirim `0` dan `-0` ke semua field bertipe number
- Kirim `NaN`, `Infinity`, `-Infinity` ke semua numeric field
- Kirim object `{}` ke field yang expect primitive
- Kirim array `[]` ke field yang expect object
- Kirim nested object dengan depth 1000 level
- Kirim circular reference object (jika possible di layer tersebut)
- Kirim array dengan 100.000 element
- Kirim string dengan panjang 10MB
- Kirim number yang melebihi Number.MAX_SAFE_INTEGER
- Kirim BigInt ke field yang expect number biasa
- Kirim semua kombinasi union type yang salah
- Kirim discriminated union dengan discriminant yang tidak valid
```

### 1.2 Zod / Validation Schema Bypass

```
- Bypass semua `.min()`, `.max()`, `.email()`, `.url()`, `.uuid()` validator
- Kirim string yang looks like email tapi bukan: "a@", "@b", "a@b", "a@@b.com"
- Kirim URL dengan protocol aneh: "javascript:alert(1)", "file:///etc/passwd", "data:text/html,<script>", "ftp://", "//evil.com"
- Kirim UUID dengan format salah: semua huruf, semua angka, panjang berbeda
- Kirim date string yang ambigu: "02/03/04", "2024-13-01", "2024-01-32"
- Kirim JSON string sebagai value (`"{"key":"val"}"`)
- Kirim number sebagai string yang lolos coercion (`"123"`, `" 123 "`, `"1e2"`)
- Test semua `.transform()` dan `.refine()` dengan edge case input
- Kirim payload yang lebih besar dari schema expect (extra fields)
- Test `.passthrough()` vs `.strict()` behavior
```

---

## ⚔️ FASE 2 — HTTP & API LAYER ANNIHILATION

### 2.1 Request Manipulation

```
- Kirim request tanpa Content-Type header
- Kirim Content-Type: application/json tapi body-nya bukan JSON
- Kirim Content-Type: text/plain tapi body-nya JSON
- Kirim Content-Type: multipart/form-data tapi tanpa boundary
- Kirim body JSON yang malformed: trailing comma, unclosed bracket, single quotes
- Kirim body yang valid JSON tapi bukan object: `"string"`, `123`, `true`, `null`, `[]`
- Kirim request dengan Content-Length yang salah (terlalu besar/kecil dari actual body)
- Kirim chunked transfer encoding yang corrupt
- Kirim request dengan header duplikat yang conflicting
- Kirim request dengan header size > 8KB
- Kirim 10.000 query params sekaligus
- Kirim query param dengan nama yang sama berulang kali
- Kirim path param yang berisi karakter aneh: `../`, `%00`, `%2F`, `\x00`, `<script>`
- Kirim method yang tidak ada: `PATCH`, `PURGE`, `CUSTOM`, `HACK`
- Kirim HTTP/1.0 request ke server yang expect HTTP/1.1+
```

### 2.2 Authentication & Authorization Bypass

```
- Kirim JWT dengan signature yang diubah 1 karakter
- Kirim JWT yang expired (ubah exp ke masa lalu)
- Kirim JWT dengan alg: "none" (classic attack)
- Kirim JWT dengan alg yang berbeda dari yang server expect
- Kirim Bearer token yang bukan JWT (random base64)
- Kirim Bearer token kosong: "Bearer "
- Kirim token milik user A untuk mengakses resource user B
- Akses endpoint protected tanpa token sama sekali
- Kirim Authorization header dua kali dengan nilai berbeda
- Test semua protected route dengan role yang kurang privilege
- Test privilege escalation: user role mencoba akses admin endpoint
- Test IDOR: manipulasi ID di URL/body untuk akses resource orang lain
- Kirim session cookie yang dimodifikasi manual
- Test login dengan password yang benar tapi username/email uppercase/lowercase berbeda
- Test concurrent login dari 2 device → apakah session lama di-invalidate?
- Test akses endpoint setelah logout — apakah token masih valid?
- Kirim API key yang sudah di-revoke
```

### 2.3 Rate Limiting & DoS

```
- Kirim 10.000 request dalam 1 detik ke satu endpoint
- Kirim 1 request raksasa (body 100MB)
- Kirim 1.000.000 request dengan body 1 byte (slow accumulation)
- Kirim request dengan Connection: keep-alive dan tidak pernah close
- Test slowloris attack: kirim header satu per satu dengan jeda panjang
- Spam endpoint login dengan credential salah untuk trigger lockout
- Bypass rate limit dengan rotate IP header: X-Forwarded-For, X-Real-IP
- Kirim burst request tepat di limit boundary (N-1, N, N+1 request)
- Test apakah rate limit per-IP, per-user, atau per-route
```

---

## ⚔️ FASE 3 — DATABASE LAYER DESTRUCTION

### 3.1 Query & ORM Stress

```
- Kirim string yang mengandung SQL injection ke semua input: `'; DROP TABLE users; --`
- Kirim `' OR '1'='1` ke semua field yang masuk ke query
- Kirim NoSQL injection jika menggunakan MongoDB: `{"$gt": ""}`, `{"$where": "function(){return true}"}`
- Kirim data dengan character encoding berbeda: UTF-8, UTF-16, Latin-1, emoji 4-byte
- Kirim string dengan semua special character: `\`, `'`, `"`, `;`, `%`, `_`, `\n`, `\r`, `\0`
- Test LIKE query injection: `%`, `_`, `\%`, `\_`
- Kirim data yang melebihi kolom DB limit (varchar(255) → kirim 256 char)
- Test unique constraint violation (kirim data duplikat)
- Test foreign key violation (kirim ID yang tidak exist di parent table)
- Test check constraint violation
- Buat transaksi yang sengaja deadlock dengan concurrent request
- Test N+1 query: kirim request yang trigger 10.000 query sekuensial
- Kirim timestamp di luar range DB: `0000-01-01`, `9999-12-31`, negative timestamp
- Test race condition: dua request concurrent yang modify record yang sama
- Test soft delete: apakah data yang sudah deleted masih bisa diakses via ID langsung?
```

### 3.2 Connection & Pool Stress

```
- Exhausted connection pool: buka 1000 koneksi concurrent dan hold semuanya
- Test behavior ketika DB down sama sekali
- Test behavior ketika DB response lambat (simulate 30 detik timeout)
- Test reconnection logic setelah DB restart
- Kirim query yang sengaja timeout: `SELECT pg_sleep(3600)`
- Test apakah connection leak terjadi ketika query error
```

---

## ⚔️ FASE 4 — SECURITY ANNIHILATION

### 4.1 Injection Attacks

```
- XSS: `<script>alert(document.cookie)</script>` di semua text input
- XSS: `"><img src=x onerror=alert(1)>`
- XSS: `javascript:alert(1)` di semua URL field
- XSS: `{{7*7}}` untuk test template injection (SSTI)
- XSS: `${7*7}`, `#{7*7}`, `<%= 7*7 %>` untuk berbagai template engine
- Command injection: `; ls -la`, `| cat /etc/passwd`, `$(whoami)`
- Path traversal: `../../etc/passwd`, `..%2F..%2Fetc%2Fpasswd`, `....//....//etc/passwd`
- SSRF: kirim URL yang point ke internal service: `http://localhost:3000/admin`, `http://169.254.169.254/`
- XXE jika ada XML parser: inject external entity
- CRLF injection di header values: `\r\nSet-Cookie: admin=true`
- Header injection di semua field yang masuk ke response header
- Log injection: kirim `\n` dan `\r` di semua log-able field
```

### 4.2 File Upload (jika ada)

```
- Upload file PHP/JS/EJS dengan extension yang di-disguise: `shell.php.jpg`, `evil.js.png`
- Upload file dengan MIME type yang salah
- Upload file 0 byte
- Upload file 10GB (atau test limit-nya)
- Upload file dengan nama: `../../etc/passwd`, `<script>.jpg`, `CON.txt` (Windows reserved)
- Upload file yang mengandung virus signature (EICAR test string)
- Upload ZIP yang berisi path traversal (ZipSlip attack)
- Upload polyglot file yang valid sebagai dua format sekaligus
- Upload file dengan embedded null byte di nama: `evil.php\x00.jpg`
```

### 4.3 Business Logic Abuse

```
- Test negative quantity/amount di semua e-commerce/transaction logic
- Test apply discount coupon berkali-kali
- Test race condition di checkout (beli 1 item tapi concurrent request buat 2 order)
- Test skip step di multi-step form/wizard
- Test akses step 3 tanpa menyelesaikan step 1 & 2
- Test manipulasi harga di request body
- Test bypass email verification
- Test bypass phone OTP dengan brute force (jika tidak ada rate limit)
- Modifikasi semua hidden field di form
- Test refund/cancel pada order yang sudah selesai
```

---

## ⚔️ FASE 5 — FRONTEND ANNIHILATION

### 5.1 React/Next.js Specific

```
- Trigger re-render storm: update state 10.000x dalam satu event handler
- Test memory leak: mount dan unmount component 1.000x
- Test semua useEffect cleanup function
- Kirim prop yang expect children tapi kirim null/undefined/0/false
- Test hydration mismatch: server render berbeda dari client render
- Test semua Suspense boundary dengan data yang sengaja lambat
- Test Error Boundary: throw error di setiap kemungkinan titik
- Test concurrent mode: interrupt render di tengah jalan
- Manipulasi URL langsung (bypass React Router): akses route yang tidak ada
- Test browser back/forward navigation di SPA
- Test refresh di tengah multi-step flow
- Disable JavaScript di browser: apakah SSR/SSG masih functional?
- Test dengan very slow network (2G simulation): apakah ada race condition di data fetching?
- Test dengan CPU throttling 6x slowdown
```

### 5.2 Form & Input

```
- Copy-paste 1MB text ke semua textarea
- Kirim form dengan tombol submit diklik 100x dalam 1 detik (double submit)
- Submit form dengan keyboard shortcut sebelum validation selesai
- Test semua form dengan autofill browser yang aneh
- Isi field dengan hanya whitespace: `"   "`
- Isi field dengan hanya newline: `"\n\n\n"`
- Test IME input (Japanese/Chinese/Korean) di semua text field
- Test RTL text (Arabic/Hebrew) di semua text field
- Paste emoji 4-byte ke semua text field: `💀🔥😈`
- Test semua number input: `-`, `+`, `.`, `,`, `e`, `E` sebagai value
- Test date input dengan tanggal leap year: 29 Feb di tahun non-leap
```

---

## ⚔️ FASE 6 — INFRASTRUCTURE & BUILD TORTURE

### 6.1 Environment & Config

```
- Hapus semua env variable satu per satu, test behavior masing-masing
- Set env variable ke string kosong `""`
- Set DATABASE_URL ke URL yang tidak valid
- Set PORT ke `0`, `-1`, `99999`, `"abc"`
- Test behavior ketika `.env` file tidak ada sama sekali
- Set NODE_ENV ke nilai yang tidak ada: `"staging"`, `"wat"`, undefined
- Test build tanpa semua peer dependency
- Test dengan Node.js version yang tidak sesuai requirement
```

### 6.2 Build & Bundle

```
- Test tree shaking: apakah semua dead code ter-eliminate?
- Test code splitting: apakah lazy-loaded chunk ter-load dengan benar?
- Corrupt satu file di node_modules yang kritikal → apakah error-nya informatif?
- Test build dengan circular import antar module
- Test dengan semua environment variable production di development mode
- Jalankan type-check strict: `tsc --noEmit --strict`
- Jalankan `eslint --max-warnings 0` → zero tolerance
- Test bundle size: apakah ada dependency raksasa yang masuk bundle?
```

---

## ⚔️ FASE 7 — CONCURRENCY & RACE CONDITIONS

```
- Kirim 100 request concurrent ke endpoint yang melakukan `read-modify-write`
- Test concurrent user registration dengan email yang sama
- Test concurrent depletion resource terbatas (stok, slot, kuota)
- Test concurrent token refresh (apakah menghasilkan multiple valid token?)
- Test concurrent file upload dengan nama yang sama
- Test concurrent DB migration di multi-instance deployment
- Test websocket: connect 10.000 client sekaligus
- Test concurrent cache write (Redis/in-memory) — apakah ada data corruption?
- Test atomic operation: apakah semua critical section menggunakan proper locking?
```

---

## ⚔️ FASE 8 — ERROR HANDLING & OBSERVABILITY

```
- Verifikasi semua error response tidak expose stack trace di production
- Verifikasi semua error response tidak expose DB schema/query
- Verifikasi semua error response tidak expose internal path/filename
- Verifikasi semua error response tidak expose environment variable name/value
- Test apakah semua unhandled promise rejection ter-catch
- Test apakah semua uncaught exception ter-handle (tidak crash server)
- Test apakah semua external API failure di-handle dengan graceful fallback
- Verifikasi semua log sensitif (password, token, PII) di-redact sebelum ditulis
- Simulasi disk full: apakah logger gracefully fail?
- Test apakah health check endpoint tetap respond ketika DB down
- Test apakah graceful shutdown berjalan: semua in-flight request selesai sebelum kill
```

---

## 📋 LAPORAN WAJIB AGENT

Setelah semua fase selesai, buat laporan dengan format berikut:

```
## BRUTAL TEST REPORT — [NAMA PROJECT] — [TANGGAL]

### CRITICAL (harus fix sebelum production)
- [BUG-001] [FASE X.Y] [Deskripsi singkat] — [Reproduce step]
- ...

### HIGH (fix dalam 1 sprint)
- ...

### MEDIUM (technical debt)
- ...

### LOW (nice to have)
- ...

### PASSED (tidak ada issue)
- [FASE X.Y] ✅ [Deskripsi]
- ...

### TIDAK APPLICABLE
- [FASE X.Y] ⊘ [Alasan]
- ...

### STATISTIK
- Total test cases dieksekusi: N
- Critical issues: N
- High issues: N
- Medium issues: N
- Security vulnerabilities: N
- Performance bottlenecks: N
- Test coverage estimate: N%
```

---

> **ZERO TOLERANCE POLICY:** Tidak ada issue yang di-skip. Tidak ada "probably fine". Tidak ada "edge case tidak mungkin terjadi". Jika ragu — test. Jika tidak bisa test — dokumentasikan kenapa dan apa risikonya.
