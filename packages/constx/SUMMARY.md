# SpeexJS Framework — Ringkasan Lengkap

> **Fullstack JavaScript/TypeScript Framework** — Server, Client, RPC, Schema, CLI, Database, Auth, Cache, Storage. Zero Dependencies. 🇮🇩 Indonesia First.
>
> Versi: **0.2.0** | Lisensi: **MIT** | Node: **>=18.0.0**

---

## Daftar Modul

- [1. Native Core](#1-native-core)
- [2. Schema](#2-schema)
- [3. Server / HTTP](#3-server--http)
- [4. Server / Router](#4-server--router)
- [5. Server / Middleware](#5-server--middleware)
- [6. Server / Controller](#6-server--controller)
- [7. Server / Container](#7-server--container)
- [8. Server / Engine](#8-server--engine)
- [9. Server / Auth](#9-server--auth)
- [10. Server / Gate](#10-server--gate)
- [11. Server / Cache](#11-server--cache)
- [12. Server / Storage](#12-server--storage)
- [13. Server / Events](#13-server--events)
- [14. Server / Database](#14-server--database)
- [15. Server / Helpers](#15-server--helpers)
- [16. Client](#16-client)
- [17. RPC](#17-rpc)
- [18. CLI](#18-cli)
- [19. Entry Point (SuperApp)](#19-entry-point-superapp)

---

## 1. Native Core

> Lokasi: `SpeexJS` (main entry) | File: `src/native/`

### args.ts — Argument Parsing

| Function | Deskripsi |
|---|---|
| `parseArgs(argv)` | Parse `process.argv` => `{ command, subcommand, args, options }` |
| `toCommandName(argv)` | Konversi argv ke format `command:subcommand` |

### colors.ts — Terminal Colors

| Function | Deskripsi |
|---|---|
| `colors.red(s)` | Teks merah |
| `colors.green(s)` | Teks hijau |
| `colors.yellow(s)` | Teks kuning |
| `colors.blue(s)` | Teks biru |
| `colors.magenta(s)` | Teks magenta |
| `colors.cyan(s)` | Teks cyan |
| `colors.gray(s)` | Teks abu-abu |
| `colors.white(s)` | Teks putih |
| `colors.bold(s)` | Teks tebal |
| `colors.dim(s)` | Teks redup |
| `colors.italic(s)` | Teks miring |
| `colors.underline(s)` | Teks bergaris bawah |
| `stripColors(s)` | Hapus semua kode warna dari string |
| `isColorSupported()` | Cek apakah terminal mendukung warna |

### logger.ts — Logger

| Class / Function | Deskripsi |
|---|---|
| `class Logger` | Logger dengan level debug/info/warn/error |
| `new Logger(options?)` | Buat instance Logger baru |
| `logger.debug(msg, meta?)` | Log level debug |
| `logger.info(msg, meta?)` | Log level info |
| `logger.warn(msg, meta?)` | Log level warning |
| `logger.error(msg, meta?)` | Log level error |
| `logger.child(name)` | Buat child logger dengan namespace |
| `logger.setLevel(level)` | Ubah level log |
| `logger` | Singleton logger default |
| `formatTimestamp(tz?)` | Format timestamp (WIB/WITA/WIT/UTC) |

### crypto.ts — Encryption & Hashing

| Function | Deskripsi |
|---|---|
| `encrypt(data, key)` | Enkripsi AES-256-GCM => `{ encrypted, iv, tag }` |
| `decrypt(data, key)` | Dekripsi AES-256-GCM |
| `hash(data, algorithm?)` | Hash SHA-256/384/512 |
| `hmac(data, secret, algorithm?)` | HMAC SHA-256/384 |
| `constantTimeEqual(a, b)` | Perbandingan constant-time (cegah timing attack) |
| `randomHex(bytes?)` | Generate random hex string |
| `generateToken(bytes?)` | Generate token base64url |
| `generateOTP(length?)` | Generate OTP numerik |
| `uuid()` | Generate UUID v4 |
| `base64Encode(data)` | Encode ke base64 |
| `base64Decode(data)` | Decode dari base64 |
| `checksum(data)` | Short checksum (8 karakter base64) |
| `generateEncryptionKey()` | Generate key AES (32 bytes base64) |
| `deriveKey(password, salt?, iterations?)` | Key derivation PBKDF2 |

### hashing.ts — Password Hashing

| Function | Deskripsi |
|---|---|
| `hashPassword(password)` | Hash password dengan scrypt (OWASP recomended) |
| `verifyPassword(password, hash)` | Verifikasi password dengan scrypt |
| `hashPasswordFast(password)` | Hash password cepat dengan PBKDF2 |
| `verifyPasswordFast(password, hash)` | Verifikasi password cepat |
| `needsRehash(hash)` | Cek apakah perlu rehash (parameter berubah) |

### helpers/str.ts — Str Class

| Method | Deskripsi |
|---|---|
| `Str.camelCase(str)` | Konversi ke camelCase |
| `Str.snakeCase(str)` | Konversi ke snake_case |
| `Str.kebabCase(str)` | Konversi ke kebab-case |
| `Str.pascalCase(str)` | Konversi ke PascalCase |
| `Str.titleCase(str)` | Konversi ke Title Case |
| `Str.slug(str)` | Buat URL slug |
| `Str.uuid()` | Generate UUID v4 |
| `Str.nanoid(size?)` | Nano ID generator (default 21) |
| `Str.random(length?)` | Random alphanumeric (default 16) |
| `Str.limit(str, limit)` | Potong teks hingga limit karakter |
| `Str.words(str)` | Split string menjadi array kata |
| `Str.plural(str)` | Pluralize kata (support irregular) |
| `Str.singular(str)` | Singularize kata |
| `Str.contains(str, search)` | Cek apakah mengandung substring |
| `Str.startsWith(str, search)` | Cek prefix |
| `Str.endsWith(str, search)` | Cek suffix |
| `Str.replace(str, search, replace)` | Replace semua occurence |
| `Str.mask(str, chars, mask?)` | Masking karakter kecuali N terakhir |
| `Str.truncate(str, length, suffix?)` | Potong di word boundary |

### helpers/arr.ts — Arr Class

| Method | Deskripsi |
|---|---|
| `Arr.first(arr)` | Elemen pertama |
| `Arr.last(arr)` | Elemen terakhir |
| `Arr.pluck(arr, key)` | Extract nilai key tertentu dari array objek |
| `Arr.groupBy(arr, key)` | Group array berdasarkan key/callback |
| `Arr.keyBy(arr, key)` | Index array berdasarkan key/callback |
| `Arr.sortBy(arr, key)` | Stable sort berdasarkan key |
| `Arr.unique(arr)` | Hapus duplikat |
| `Arr.uniqueBy(arr, key)` | Hapus duplikat berdasarkan key |
| `Arr.chunk(arr, size)` | Bagi array menjadi potongan |
| `Arr.shuffle(arr)` | Fisher-Yates shuffle |
| `Arr.flatten(arr)` | Deep flatten array |
| `Arr.where(arr, key, value)` | Filter array berdasarkan nilai |
| `Arr.whereIn(arr, key, values)` | Filter array berdasarkan array nilai |
| `Arr.random(arr)` | Ambil elemen random |

### helpers/number.ts — SuperNumber Class

| Method | Deskripsi |
|---|---|
| `SuperNumber.format(value, options?)` | Format angka dengan locale (default id-ID) |
| `SuperNumber.clamp(value, min, max)` | Clamp antara min dan max |
| `SuperNumber.inRange(value, min, max)` | Cek apakah dalam range |
| `SuperNumber.randomInt(min, max)` | Random integer |
| `SuperNumber.sum(values)` | Jumlah array |
| `SuperNumber.average(values)` | Rata-rata |
| `SuperNumber.median(values)` | Median |
| `SuperNumber.round(value, precision?)` | Pembulatan |
| `SuperNumber.floor(value, precision?)` | Floor ke presisi tertentu |
| `SuperNumber.ceil(value, precision?)` | Ceil ke presisi tertentu |
| `SuperNumber.isEven(value)` | Cek genap |
| `SuperNumber.isOdd(value)` | Cek ganjil |
| `SuperNumber.formatRupiah(value)` | Format Rupiah Indonesia |
| `SuperNumber.terbilang(value)` | Angka ke kata (contoh: 123 => "seratus dua puluh tiga") |

---

## 2. Schema

> Import: `SpeexJS/schema` | File: `src/schema/`

### Factory Namespace `s`

```ts
import { s } from 'SpeexJS/schema'
```

#### Primitives

| Factory | Deskripsi |
|---|---|
| `s.string()` | StringSchema — validasi string |
| `s.number()` | NumberSchema — validasi number |
| `s.boolean()` | BooleanSchema — validasi boolean |
| `s.bigint()` | BigIntSchema — validasi bigint |
| `s.symbol()` | SymbolSchema — validasi symbol |
| `s.undefined()` | UndefinedSchema — validasi undefined |
| `s.null()` | NullSchema — validasi null |
| `s.nan()` | NaNSchema — validasi NaN |

#### Complex

| Factory | Deskripsi |
|---|---|
| `s.object(shape)` | ObjectSchema — validasi object dengan shape |
| `s.array(itemSchema)` | ArraySchema — validasi array |
| `s.tuple(...schemas)` | TupleSchema — validasi tuple dengan posisi |
| `s.enum(values)` | EnumSchema — validasi enum value |
| `s.union(...schemas)` | UnionSchema — salah satu dari beberapa schema |
| `s.intersection(a, b)` | IntersectionSchema — gabungan dua schema |
| `s.record(valueSchema)` | RecordSchema — object dengan nilai seragam |
| `s.map(keySchema, valueSchema)` | MapSchema — validasi Map |
| `s.set(itemSchema)` | SetSchema — validasi Set |
| `s.date()` | DateSchema — validasi Date |
| `s.literal(value)` | LiteralSchema — validasi literal |
| `s.any()` | AnySchema — menerima apapun |
| `s.unknown()` | UnknownSchema — menerima apapun (unknown) |

#### Indonesia

| Factory | Validasi |
|---|---|
| `s.nik()` | NIK (16 digit, validasi tanggal) |
| `s.npwp()` | NPWP (15-16 digit, checksum) |
| `s.phone()` | Nomor telepon Indonesia (62/08) |
| `s.alamat()` | Alamat Indonesia (min 10 char, keyword Jl/Gg/RT/RW) |
| `s.kodepos()` | Kode pos 5 digit |
| `s.rekening()` | Rekening bank (10-16 digit) |

#### Coerce & Transform

| Factory | Deskripsi |
|---|---|
| `s.coerce.string()` | Coerce ke string (dari apapun) |
| `s.coerce.number()` | Coerce ke number (dari string/Date/bigint) |
| `s.coerce.boolean()` | Coerce ke boolean ("true"/"false"/"1"/"0") |
| `s.coerce.date()` | Coerce ke Date (dari number/string) |
| `s.transform(fn)` | Custom transform function |

### Base Class: `Schema<T>`

| Method | Deskripsi |
|---|---|
| `schema.parse(value)` | Parse & throw jika error |
| `schema.safeParse(value)` | Parse => `{ success, data?, error? }` |
| `schema.optional()` | Buat schema optional (undefined allowed) |
| `schema.nullable()` | Buat schema nullable (null allowed) |
| `schema.default(val)` | Default value jika undefined |
| `schema.desc(description)` | Tambah deskripsi |
| `schema.refine(fn, msg)` | Validasi kustom |
| `schema.transform(fn)` | Transformasi output |

### StringSchema Methods

| Method | Deskripsi |
|---|---|
| `.min(n)` | Min length |
| `.max(n)` | Max length |
| `.length(n)` | Exact length |
| `.email()` | Format email |
| `.url()` | Format URL |
| `.regex(pattern)` | Regex pattern |
| `.includes(s)` | Contain substring |
| `.startsWith(p)` | Prefix |
| `.endsWith(s)` | Suffix |
| `.trim()` | Trim whitespace |
| `.lowercase()` | To lowercase |
| `.uppercase()` | To uppercase |

### NumberSchema Methods

| Method | Deskripsi |
|---|---|
| `.min(n)` | Minimum value |
| `.max(n)` | Maximum value |
| `.int()` | Harus integer |
| `.positive()` | > 0 |
| `.negative()` | < 0 |
| `.finite()` | Harus finite |
| `.safe()` | Harus safe integer |

### ObjectSchema Methods

| Method | Deskripsi |
|---|---|
| `.strict()` | Tolak field tidak dikenal |
| `.passthrough()` | Izinkan field tidak dikenal |
| `.partial()` | Semua field opsional |
| `.pick(keys)` | Ambil field tertentu |
| `.omit(keys)` | Hapus field tertentu |
| `.extend(shape)` | Tambah field |
| `.merge(other)` | Gabung dua object schema |

### ArraySchema Methods

| Method | Deskripsi |
|---|---|
| `.min(n)` | Min panjang array |
| `.max(n)` | Max panjang array |
| `.length(n)` | Exact panjang |
| `.nonempty()` | Tidak boleh kosong |
| `.unique()` | Semua elemen unik |

### Utility

| Function | Deskripsi |
|---|---|
| `SchemaError` | Error class untuk validasi |
| `Infer<S>` | Type helper untuk infer tipe dari schema |
| `setLocale(locale)` | Set locale pesan error (`id` / `en`) |
| `getLocale()` | Get locale saat ini |
| `msg(path, params?)` | Format pesan error |

---

## 3. Server / HTTP

> Import: `SpeexJS/server/http` | File: `src/server/http/`

### SuperRequest

| Method | Deskripsi |
|---|---|
| `request.method` | HTTP method |
| `request.url` | URL lengkap |
| `request.path` | Path saja |
| `request.headers` | HeadersMap |
| `request.query` | Query parameters |
| `request.params` | Route parameters |
| `request.ip` | IP address |
| `request.body()` | Parse body (raw) |
| `request.json()` | Parse body sebagai JSON |
| `request.text()` | Parse body sebagai text |
| `request.formData()` | Parse form data |
| `request.file(name)` | Get uploaded file |
| `request.files()` | Get semua uploaded files |
| `request.cookie(name)` | Get cookie |
| `request.validate(schema)` | Validasi body dengan schema |
| `request.isAjax()` | Cek apakah request AJAX |
| `request.wantsJson()` | Cek apakah request minta JSON |
| `request.bearerToken()` | Ambil Bearer token dari header |

### SuperResponse

| Method | Deskripsi |
|---|---|
| `response.status(code)` | Set status code |
| `response.header(name, val)` | Set response header |
| `response.setHeader(name, val)` | Alias header |
| `response.getHeader(name)` | Get header |
| `response.removeHeader(name)` | Hapus header |
| `response.hasHeader(name)` | Cek header |
| `response.type(contentType)` | Set Content-Type |
| `response.json(data, status?)` | Kirim JSON response |
| `response.send(body, status?, type?)` | Kirim response mentah |
| `response.html(html, status?)` | Kirim HTML response |
| `response.redirect(url, status?)` | Redirect (301/302/307/308) |
| `response.stream(stream, status?)` | Stream response |
| `response.file(path, options?)` | Kirim file |
| `response.download(path, filename?)` | Download file |
| `response.attachment(filename?)` | Set Content-Disposition |
| `response.cookie(name, val, opts?)` | Set cookie |
| `response.clearCookie(name, opts?)` | Hapus cookie |
| `response.flush()` | Flush response |

### HttpStatus

| Constant | Value |
|---|---|
| `HttpStatus.OK` | 200 |
| `HttpStatus.CREATED` | 201 |
| `HttpStatus.ACCEPTED` | 202 |
| `HttpStatus.NO_CONTENT` | 204 |
| `HttpStatus.MOVED_PERMANENTLY` | 301 |
| `HttpStatus.FOUND` | 302 |
| `HttpStatus.BAD_REQUEST` | 400 |
| `HttpStatus.UNAUTHORIZED` | 401 |
| `HttpStatus.FORBIDDEN` | 403 |
| `HttpStatus.NOT_FOUND` | 404 |
| `HttpStatus.CONFLICT` | 409 |
| `HttpStatus.UNPROCESSABLE_ENTITY` | 422 |
| `HttpStatus.TOO_MANY_REQUESTS` | 429 |
| `HttpStatus.INTERNAL_SERVER_ERROR` | 500 |
| *... dan 20+ status lainnya* | |

| Function | Deskripsi |
|---|---|
| `statusText(code)` | Dapatkan teks dari status code |

### HeadersMap

| Method | Deskripsi |
|---|---|
| `headers.get(name)` | Get header value |
| `headers.getAll(name)` | Get semua value |
| `headers.set(name, val)` | Set header |
| `headers.append(name, val)` | Append header |
| `headers.has(name)` | Cek header |
| `headers.delete(name)` | Hapus header |
| `headers.entries()` | Iterator entries |
| `headers.toJSON()` | Konversi ke JSON |
| `headers.toNodeHeaders()` | Konversi ke Node headers |
| `headers.size` | Jumlah headers |

### Cookie

| Function | Deskripsi |
|---|---|
| `parseCookies(header)` | Parse cookie header |
| `serializeCookie(name, val, opts?)` | Serialize cookie ke string |
| `clearCookie(name, opts?)` | Buat cookie清除 string |

### SuperUploadedFile

| Method | Deskripsi |
|---|---|
| `file.fieldName` | Nama field |
| `file.originalName` | Nama file asli |
| `file.mimeType` | MIME type |
| `file.size` | Ukuran file (bytes) |
| `file.extension` | Ekstensi file |
| `file.move(dest, filename?)` | Pindahkan file |
| `file.toBuffer()` | Baca sebagai Buffer |
| `file.toBase64()` | Konversi ke base64 |
| `file.isImage()` | Cek apakah gambar |
| `file.isVideo()` | Cek apakah video |
| `SuperUploadedFile.createFromBuffer(...)` | Buat instance dari buffer |
| `file.cleanup()` | Hapus file temporary |

---

## 4. Server / Router

> Import: `SpeexJS/server/router` | File: `src/server/router/`

### Router Class

| Method | Deskripsi |
|---|---|
| `router.get(path, handler)` | Route GET |
| `router.post(path, handler)` | Route POST |
| `router.put(path, handler)` | Route PUT |
| `router.patch(path, handler)` | Route PATCH |
| `router.delete(path, handler)` | Route DELETE |
| `router.options(path, handler)` | Route OPTIONS |
| `router.any(path, handler)` | Route semua method |
| `router.match(methods, path, handler)` | Route method tertentu |
| `router.group(prefix, callback)` | Group route dengan prefix |
| `router.resource(name, controller)` | RESTful resource (7 actions) |
| `router.apiResource(name, controller)` | API resource (5 actions) |
| `router.middleware(mw)` | Tambah middleware ke router |
| `router.name(name)` | Beri nama route terakhir |
| `router.route(name, params?)` | Generate URL dari named route |
| `router.resolve(method, path)` | Resolve route |
| `router.getRoutes()` | Dapatkan semua route |
| `router.getNamedRoutes()` | Dapatkan named routes |

### RESTful Resource Actions

| Action | Method | Path | Controller Method |
|---|---|---|---|
| Index | GET | `/resource` | `index` |
| Create | GET | `/resource/create` | `create` |
| Store | POST | `/resource` | `store` |
| Show | GET | `/resource/{id}` | `show` |
| Edit | GET | `/resource/{id}/edit` | `edit` |
| Update | PUT/PATCH | `/resource/{id}` | `update` |
| Destroy | DELETE | `/resource/{id}` | `destroy` |

### Route Context

```ts
interface RouteContext {
  request: SuperRequest
  response: SuperResponse
  params: Record<string, string>
  query: Record<string, string | string[]>
  container: Container
}
```

---

## 5. Server / Middleware

> Import: `SpeexJS/server/middleware` | File: `src/server/middleware/`

### Built-in Middleware (10)

| Factory | Deskripsi |
|---|---|
| `cors(options?)` | CORS headers (origin, methods, credentials, dll) |
| `bodyParser()` | Parse request body (JSON, form, multipart) |
| `session(options?)` | Session management |
| `auth(guard?)` | Authentication guard |
| `throttle(limit?, window?)` | Rate limiting |
| `logger()` | Request logging |
| `staticFiles(root, opts?)` | Static file serving |
| `csrf()` | CSRF protection |
| `compress()` | Response compression (gzip/deflate) |
| `helmet()` | Security headers (XSS, nosniff, dll) |

### MiddlewarePipeline

| Method | Deskripsi |
|---|---|
| `pipeline.use(mw)` | Tambah middleware |
| `pipeline.prepend(mw)` | Tambah di awal |
| `pipeline.remove(name)` | Hapus middleware |
| `pipeline.run(ctx, final)` | Eksekusi pipeline |

### Middleware Type

```ts
type Middleware = (ctx: RouteContext, next: () => Promise<void>) => void | Promise<void>
```

---

## 6. Server / Controller

> Import: `SpeexJS/server/controller` | File: `src/server/controller/`

### Base Controller

| Method | Deskripsi |
|---|---|
| `request` | SuperRequest (getter protected) |
| `response` | SuperResponse (getter protected) |
| `container` | Container (getter protected) |
| `validate(schema)` | Validasi body request |
| `ok(data)` | Response 200 OK |
| `created(data)` | Response 201 Created |
| `noContent()` | Response 204 No Content |
| `badRequest(msg?)` | Response 400 |
| `notFound(msg?)` | Response 404 |
| `unauthorized(msg?)` | Response 401 |
| `forbidden(msg?)` | Response 403 |
| `error(status, msg?)` | Response error kustom |

### Decorators

| Decorator | Deskripsi |
|---|---|
| `@controller(prefix?)` | Class decorator — daftarkan controller |
| `@get(path)` | Method decorator — route GET |
| `@post(path)` | Method decorator — route POST |
| `@put(path)` | Method decorator — route PUT |
| `@patch(path)` | Method decorator — route PATCH |
| `@del(path)` | Method decorator — route DELETE |

---

## 7. Server / Container

> Import: `SpeexJS/server/container` | File: `src/server/container/`

### Container (DI)

| Method | Deskripsi |
|---|---|
| `container.bind(name, factory)` | Daftarkan binding transient |
| `container.singleton(name, factory)` | Daftarkan singleton |
| `container.instance(name, instance)` | Daftarkan instance siap pakai |
| `container.resolve(name)` | Resolve dependency (circular-safe) |
| `container.has(name)` | Cek binding |
| `container.remove(name)` | Hapus binding |
| `container.clear()` | Kosongkan semua binding |
| `container.getBindings()` | Dapatkan semua binding |

---

## 8. Server / Engine

> Import: `SpeexJS/server/engine` | File: `src/server/engine/`

| Class / Interface | Deskripsi |
|---|---|
| `ServerEngine` | Interface untuk server engine |
| `NodeEngine` | Engine menggunakan `http.createServer` Node.js |
| `ServerInstance` | Instance server (`{ close, raw }`) |

---

## 9. Server / Auth

> Import: `SpeexJS/server/auth` | File: `src/server/auth/`

### AuthManager

| Method | Deskripsi |
|---|---|
| `auth.guard(name, instance)` | Daftarkan guard |
| `auth.guard(name?)` | Ambil guard |
| `auth.defaultGuard(name)` | Set default guard |
| `auth.setLoginPath(path)` | Set login path |
| `auth.getLoginPath()` | Get login path |
| `auth.hasGuard(name)` | Cek guard |
| `auth.removeGuard(name)` | Hapus guard |
| `auth.getGuardNames()` | Daftar semua guard |

### SessionGuard

| Method | Deskripsi |
|---|---|
| `guard.attempt(credentials, remember?)` | Login dengan email+password |
| `guard.login(userId, remember?)` | Login by user ID |
| `guard.loginUser(user)` | Login langsung user object |
| `guard.logout()` | Logout |
| `guard.user()` | Dapatkan user saat ini |
| `guard.check()` | Cek apakah sudah login |
| `guard.guest()` | Cek apakah guest |
| `guard.id()` | Dapatkan user ID |
| `guard.set(key, val)` | Set session data |
| `guard.get(key)` | Get session data |

### TokenGuard

| Method | Deskripsi |
|---|---|
| `guard.createToken(userId, name?, abilities?)` | Buat token baru |
| `guard.user(token)` | Dapatkan user dari token |
| `guard.validate(token)` | Validasi token |
| `guard.abilities(token)` | Dapatkan abilities token |
| `guard.can(token, ability)` | Cek ability token |
| `guard.revokeToken(token)` | Revoke token |
| `guard.revokeAllTokens(userId)` | Revoke semua token user |

### Middleware

| Function | Deskripsi |
|---|---|
| `authMiddleware(guard?)` | Middleware — harus login |
| `guestMiddleware()` | Middleware — hanya guest |

---

## 10. Server / Gate

> Import: `SpeexJS/server/gate` | File: `src/server/gate/`

### Gate Class

| Method | Deskripsi |
|---|---|
| `gate.define(ability, callback)` | Definisikan ability |
| `gate.policy(resource, policy)` | Definisikan policy |
| `gate.allows(ability, user, ...args)` | Cek apakah diizinkan |
| `gate.denies(ability, user, ...args)` | Cek apakah ditolak |
| `gate.authorize(ability, user, ...args)` | Authorize (throw jika ditolak) |
| `gate.any(abilities, user, ...args)` | Cek salah satu ability |
| `gate.all(abilities, user, ...args)` | Cek semua ability |
| `gate.abilitiesFor(user)` | Dapatkan abilities user |
| `gate.before(callback)` | Hook sebelum |
| `gate.after(callback)` | Hook setelah |

### Middleware

| Function | Deskripsi |
|---|---|
| `authorize(ability, ...args)` | Middleware authorization |

---

## 11. Server / Cache

> Import: `SpeexJS/server/cache` | File: `src/server/cache/`

### Cache Class

| Method | Deskripsi |
|---|---|
| `cache.get(key)` | Ambil dari cache |
| `cache.remember(key, ttl, callback)` | Ambil atau set cache |
| `cache.set(key, value, ttl?)` | Simpan ke cache |
| `cache.add(key, value, ttl?)` | Simpan jika belum ada |
| `cache.delete(key)` | Hapus dari cache |
| `cache.clear()` | Kosongkan semua cache |
| `cache.has(key)` | Cek key di cache |
| `cache.getMultiple(keys)` | Ambil banyak key |
| `cache.setMultiple(items, ttl?)` | Simpan banyak key |
| `cache.increment(key, val?)` | Increment nilai |
| `cache.decrement(key, val?)` | Decrement nilai |
| `cache.forever(key, value)` | Simpan tanpa TTL |
| `cache.stats()` | Statistik cache (hits, misses, keys, size) |

### Middleware

| Function | Deskripsi |
|---|---|
| `cacheResponse(ttl?)` | Middleware — cache GET response |

---

## 12. Server / Storage

> Import: `SpeexJS/server/storage` | File: `src/server/storage/`

### Storage Class

| Method | Deskripsi |
|---|---|
| `storage.disk(name?)` | Pilih disk |
| `storage.put(path, content)` | Simpan file |
| `storage.get(path)` | Baca file |
| `storage.exists(path)` | Cek file |
| `storage.delete(path)` | Hapus file |
| `storage.copy(from, to)` | Copy file |
| `storage.move(from, to)` | Pindahkan file |
| `storage.url(path)` | Dapatkan URL publik |
| `storage.size(path)` | Ukuran file |
| `storage.lastModified(path)` | Waktu modifikasi |
| `storage.files(directory?)` | Daftar file di direktori |
| `storage.directories(directory?)` | Daftar subdirektori |
| `storage.makeDirectory(path)` | Buat direktori |
| `storage.deleteDirectory(path)` | Hapus direktori |
| `storage.append(path, content)` | Append ke file |
| `storage.prepend(path, content)` | Prepend ke file |

### Factory

| Function | Deskripsi |
|---|---|
| `createStorage(config)` | Inisialisasi singleton storage |
| `storage()` | Dapatkan singleton storage |

---

## 13. Server / Events

> Import: `SpeexJS/server/events` | File: `src/server/events/`

### Event Class

| Method | Deskripsi |
|---|---|
| `event.on(event, handler)` | Daftarkan listener |
| `event.addListener(event, handler)` | Alias on |
| `event.once(event, handler)` | Listener sekali jalan |
| `event.emit(event, ...args)` | Emit event |
| `event.off(event, handler)` | Hapus listener |
| `event.removeListener(event, handler)` | Alias off |
| `event.removeAllListeners(event?)` | Hapus semua listener |
| `event.listeners(event)` | Daftar listener |
| `event.hasListeners(event)` | Cek listener |
| `event.onPattern(pattern, handler)` | Wildcard pattern (`user.*`) |
| `event.ask(event, ...args)` | Emit & kumpulkan return values |
| `event.listenerCount(event?)` | Jumlah listener |
| `event.eventNames()` | Daftar event names |

### Factory

| Function | Deskripsi |
|---|---|
| `createEvent(config?)` | Buat instance Event |
| `event()` | Dapatkan singleton Event |

---

## 14. Server / Database

> Import: `SpeexJS/server/database` | File: `src/server/database/`

### Connection

| Method | Deskripsi |
|---|---|
| `connection.connect()` | Connect ke database |
| `connection.disconnect()` | Disconnect |
| `connection.raw(sql, bindings?)` | Raw SQL query |
| `connection.table(name)` | QueryBuilder untuk table |
| `connection.isConnected()` | Status koneksi |
| `connection.getDriver()` | Tipe driver (mysql/sqlite/postgresql) |
| `connection.getDialect()` | Dialect object |
| `connection.transaction(callback)` | Transaction |

### QueryBuilder

| Method | Deskripsi |
|---|---|
| **SELECT** | |
| `.select(...columns)` | Kolom yang di-select |
| `.addSelect(...columns)` | Tambah kolom select |
| `.distinct()` | Distinct |
| **FROM** | |
| `.from(table)` | Table |
| **WHERE** | |
| `.where(col, op?, val)` | WHERE clause |
| `.orWhere(col, op?, val)` | OR WHERE |
| `.whereIn(col, values)` | WHERE IN |
| `.whereNotIn(col, values)` | WHERE NOT IN |
| `.whereNull(col)` | WHERE NULL |
| `.whereNotNull(col)` | WHERE NOT NULL |
| `.whereBetween(col, range)` | WHERE BETWEEN |
| `.whereNotBetween(col, range)` | WHERE NOT BETWEEN |
| `.whereLike(col, pattern)` | WHERE LIKE |
| `.orWhereLike(col, pattern)` | OR WHERE LIKE |
| `.whereGroup(callback)` | Nested WHERE group |
| **JOIN** | |
| `.join(table, first, op, second, type?)` | JOIN |
| `.leftJoin(...)` | LEFT JOIN |
| `.rightJoin(...)` | RIGHT JOIN |
| `.crossJoin(...)` | CROSS JOIN |
| **ORDER** | |
| `.orderBy(col, dir?)` | ORDER BY |
| `.orderByDesc(col)` | ORDER BY DESC |
| `.latest(col?)` | ORDER BY created_at DESC |
| `.oldest(col?)` | ORDER BY created_at ASC |
| `.inRandomOrder()` | ORDER BY RANDOM |
| **LIMIT** | |
| `.limit(n)` | LIMIT |
| `.offset(n)` | OFFSET |
| `.skip(n)` | Alias offset |
| `.take(n)` | Alias limit |
| **GROUP** | |
| `.groupBy(...cols)` | GROUP BY |
| `.having(col, op, val)` | HAVING |
| **EXECUTION** | |
| `.get()` | Dapatkan semua hasil |
| `.first()` | Dapatkan satu hasil |
| `.find(id)` | Cari by primary key |
| `.pluck(col)` | Ambil satu kolom |
| `.count(col?)` | Hitung jumlah |
| `.exists()` | Cek apakah ada |
| `.doesntExist()` | Cek apakah tidak ada |
| `.max(col)` | Nilai maksimum |
| `.min(col)` | Nilai minimum |
| `.sum(col)` | Jumlah |
| `.avg(col)` | Rata-rata |
| `.paginate(perPage?, page?)` | Paginasi |
| **MUTATION** | |
| `.insert(data)` | Insert data |
| `.insertGetId(data)` | Insert & dapatkan ID |
| `.insertReturning(data)` | Insert & return data |
| `.update(data)` | Update data |
| `.delete()` | Delete data |
| `.truncate()` | Truncate table |
| **UTILITY** | |
| `.chunk(size, callback)` | Chunk processing |
| `.clone()` | Clone query builder |
| `.toSQL()` | Dapatkan SQL & bindings |
| `.dd()` | Dump SQL & exit |

### SchemaBuilder (Migration)

| Method | Deskripsi |
|---|---|
| `schema.createTable(name, callback)` | Buat table baru |
| `schema.dropTable(name)` | Drop table |
| `schema.dropTableIfExists(name)` | Drop if exists |
| `schema.renameTable(from, to)` | Rename table |
| `schema.alterTable(name, callback)` | Alter table |
| `schema.hasTable(name)` | Cek table |
| `schema.hasColumn(table, col)` | Cek column |

### TableBlueprint (Column Types)

| Method | Deskripsi |
|---|---|
| `.id(name?)` | INT AUTO_INCREMENT PRIMARY KEY |
| `.increments(name?)` | INT AUTO_INCREMENT |
| `.bigIncrements(name?)` | BIGINT AUTO_INCREMENT |
| `.string(name, length?)` | VARCHAR |
| `.text(name)` | TEXT |
| `.integer(name)` | INTEGER |
| `.bigInteger(name)` | BIGINT |
| `.tinyInteger(name)` | TINYINT |
| `.smallInteger(name)` | SMALLINT |
| `.boolean(name)` | BOOLEAN |
| `.float(name)` | FLOAT |
| `.double(name)` | DOUBLE |
| `.decimal(name, precision?, scale?)` | DECIMAL |
| `.date(name)` | DATE |
| `.datetime(name)` | DATETIME |
| `.timestamp(name)` | TIMESTAMP |
| `.time(name)` | TIME |
| `.year(name)` | YEAR |
| `.json(name)` | JSON |
| `.jsonb(name)` | JSONB |
| `.binary(name)` | BLOB |
| `.uuid(name)` | UUID |
| `.enum(name, values)` | ENUM |
| `.foreignId(name)` | INT UNSIGNED (FK) |
| `.timestamps()` | created_at + updated_at |
| `.softDeletes()` | deleted_at |
| `.rememberToken()` | remember_token string |

### Column Constraints

| Method | Deskripsi |
|---|---|
| `.nullable()` | Allow NULL |
| `.default(val)` | Default value |
| `.unsigned()` | UNSIGNED |
| `.unique()` | UNIQUE |
| `.primary()` | PRIMARY KEY |
| `.index()` | INDEX |
| `.comment(text)` | Column comment |
| `.after(col)` | Letakkan setelah kolom |
| `.first()` | Letakkan di awal |

### ForeignKey

| Method | Deskripsi |
|---|---|
| `.references(col)` | Kolom referensi |
| `.on(table)` | Table referensi |
| `.onDelete(action)` | ON DELETE |
| `.onUpdate(action)` | ON UPDATE |

### Migrator

| Method | Deskripsi |
|---|---|
| `migrator.addMigrations(defs)` | Tambah migrasi |
| `migrator.setMigrations(defs)` | Set semua migrasi |
| `migrator.run()` | Jalankan migrasi |
| `migrator.rollback()` | Rollback migrasi terakhir |
| `migrator.reset()` | Reset semua migrasi |
| `migrator.refresh()` | Rollback + run ulang |
| `migrator.status()` | Lihat status migrasi |

### Pagination

| Property / Method | Deskripsi |
|---|---|
| `result.data` | Data halaman saat ini |
| `result.currentPage` | Halaman saat ini |
| `result.perPage` | Per page |
| `result.total` | Total data |
| `result.lastPage` | Halaman terakhir |
| `result.from` | Nomor awal |
| `result.to` | Nomor akhir |
| `result.hasMore` | Ada halaman berikutnya |
| `result.hasPrev` | Ada halaman sebelumnya |
| `result.isEmpty` | Kosong |
| `pagination.nextPage()` | URL halaman berikutnya |
| `pagination.prevPage()` | URL halaman sebelumnya |
| `pagination.map(fn)` | Transform data |
| `pagination.items()` | Dapatkan data |
| `pagination.toJSON()` | Konversi ke JSON |

### Seeder

| Method | Deskripsi |
|---|---|
| `seeder.call(seederClass)` | Jalankan seeder |
| `seeder.insert(table, data)` | Insert data |
| `seeder.truncate(table)` | Truncate table |

---

## 15. Server / Helpers

> Import: `SpeexJS/server` (via helpers) | File: `src/server/helpers.ts`

### URLBuilder

| Method | Deskripsi |
|---|---|
| `urlBuilder.route(name, params?)` | Generate URL dari named route |
| `urlBuilder.to(path)` | Buat absolute URL |
| `urlBuilder.asset(path)` | Buat URL asset |
| `urlBuilder.secure(path)` | Buat HTTPS URL |
| `urlBuilder.setBaseUrl(url)` | Set base URL |
| `urlBuilder.getBaseUrl()` | Get base URL |

### Response Macros

| Function | Deskripsi |
|---|---|
| `registerMacro(name, fn)` | Daftarkan macro baru |
| `response.success(data, msg?)` | Response sukses |
| `response.error(msg?, status?)` | Response error |
| `response.created(data, msg?)` | Response created |
| `response.noContent()` | Response no content |
| `response.accepted(data, msg?)` | Response accepted |
| `response.paginated(data, meta)` | Response paginated |

### Singleton

| Function | Deskripsi |
|---|---|
| `url()` | Dapatkan URLBuilder singleton |

---

## 16. Client

> Import: `SpeexJS/client` | File: `src/client/`

### Signals (`SpeexJS/client/signals`)

| Class / Function | Deskripsi |
|---|---|
| `class Signal<T>` | Reactive signal |
| `signal.value` | Getter (tracking) / Setter (notify) |
| `signal.peek()` | Baca tanpa tracking |
| `signal.set(v)` | Set value |
| `signal.update(fn)` | Update dengan callback |
| `signal.subscribe(fn)` | Subscribe perubahan |
| `class Computed<T>` | Computed value (lazy, cached) |
| `class Effect` | Side effect (auto-run) |
| `signal(initial)` | Buat Signal |
| `computed(fn)` | Buat Computed |
| `effect(fn)` | Buat Effect (dengan cleanup) |
| `untracked(fn)` | Eksekusi tanpa tracking |
| `batch(fn)` | Batch notifikasi |
| `isSignal(val)` | Cek apakah Signal |
| `isComputed(val)` | Cek apakah Computed |
| `toSignal(val)` | Konversi ke Signal |
| `mergeSignals(signals)` | Gabung multiple signals |

### VDOM (`SpeexJS/client/vdom`)

| Function | Deskripsi |
|---|---|
| `h(tag, props?, ...children)` | Buat VNode (hyperscript) |
| `fragment(...children)` | Fragment VNode |
| `text(content)` | Text VNode |
| `createComponent(comp, props?, ...children)` | Buat component VNode |
| `render(vnode, container)` | Mount ke DOM |
| `patch(dom, oldVNode, newVNode)` | Diff & patch |
| `hydrate(vnode, container)` | Hydrate SSR |
| `renderToString(vnode)` | SSR — render ke string |
| `renderToStream(vnode)` | SSR — render ke stream |

### JSX

| Export | Deskripsi |
|---|---|
| `createElement(tag, props, ...children)` | JSX factory (`SpeexJS/client/vdom/jsx`) |
| `jsx(tag, props, key?)` | Automatic JSX runtime |
| `jsxs(tag, props, key?)` | JSX with multiple children |
| `Fragment` | JSX Fragment |

### Server Render (`SpeexJS/client/render`)

| Function | Deskripsi |
|---|---|
| `ServerRenderer` | SSR utility class |
| `generateHydrationScript()` | Generate hydration script |

### Adapters

| Function | Deskripsi |
|---|---|
| `defineAdapter(framework)` | Definisikan adapter framework |

### Client Router (`SpeexJS/client/router`)

| Class / Type | Deskripsi |
|---|---|
| `ClientRouter` | Client-side router |
| `RouteDefinition` | Definisi route |
| `RouteGuard` | Route guard |

---

## 17. RPC

> Import: `SpeexJS/rpc` | File: `src/rpc/`

### RpcServer

| Method / Type | Deskripsi |
|---|---|
| `RpcServer<T>` | Server RPC type-safe |
| `rpc()` | Factory function |
| `RpcServerOptions` | Opsi server |

### RpcClient

| Method / Type | Deskripsi |
|---|---|
| `createClient(options?)` | Buat RPC client |
| `RpcClient` | Client RPC |
| `RpcClientError` | Error class |

### Types

| Type | Deskripsi |
|---|---|
| `RpcProcedure` | Definisi prosedur |
| `RpcContext` | Context RPC |
| `RpcDefinitions` | Kumpulan definisi |
| `RpcQuery` | Query (GET) procedure |
| `RpcMutation` | Mutation (POST) procedure |
| `RpcError` | RPC error |
| `InferRpcInput` | Infer tipe input |
| `InferRpcOutput` | Infer tipe output |

---

## 18. CLI

> Command: `SpeexJS` (global) | File: `src/cli/`

### Commands

| Command | Deskripsi |
|---|---|
| `SpeexJS init [name]` | Buat project baru (blank/fullstack/api-only) |
| `SpeexJS make:controller <name>` | Generate controller file |
| `SpeexJS make:middleware <name>` | Generate middleware file |
| `SpeexJS make:schema <name>` | Generate schema file |
| `SpeexJS list-routes` | Lihat semua route |
| `SpeexJS serve` | Jalankan development server |
| `SpeexJS --help` | Tampilkan bantuan |

### Options

| Option | Deskripsi |
|---|---|
| `--template <type>` | Template project (blank, fullstack, api-only) |
| `--frontend <fe>` | Frontend framework (super, react, vue) |
| `--port <number>` | Port server (default: 3000) |
| `--host <string>` | Host address (default: localhost) |

### Aliases

| Alias | Perintah |
|---|---|
| `SpeexJS routes` | `list-routes` |
| `SpeexJS lr` | `list-routes` |
| `SpeexJS dev` | `serve` |
| `SpeexJS -v` | `version` |
| `SpeexJS -h` | `help` |

### Generate Commands

| Command | File Output |
|---|---|
| `make:controller UserController` | `app/controllers/user-controller.ts` |
| `make:middleware AuthMiddleware` | `app/middleware/auth-middleware.ts` |
| `make:schema UserSchema` | `app/schemas/user-schema.ts` |

---

## 19. Entry Point (SuperApp)

> Import: `SpeexJS` | File: `src/server/index.ts`

```ts
import { SpeexJS } from 'SpeexJS'
```

### SuperApp Class

| Method | Deskripsi |
|---|---|
| `app.get(path, handler)` | Route GET |
| `app.post(path, handler)` | Route POST |
| `app.put(path, handler)` | Route PUT |
| `app.patch(path, handler)` | Route PATCH |
| `app.delete(path, handler)` | Route DELETE |
| `app.options(path, handler)` | Route OPTIONS |
| `app.any(path, handler)` | Route semua method |
| `app.match(methods, path, handler)` | Route custom methods |
| `app.group(prefix, callback)` | Route group |
| `app.resource(name, controller)` | RESTful resource |
| `app.apiResource(name, controller)` | API resource |
| `app.controller(ctrl)` | Decorator-based controller |
| `app.use(middleware)` | Global middleware |
| `app.middleware(mw)` | Set middleware array |
| `app.setEngine(engine)` | Ganti server engine |
| `app.static(path, options?)` | Static file serving |
| `app.view(engine)` | Set view engine |
| `app.getServer()` | Dapatkan server instance |
| `app.start(port?, host?)` | Start server (async) |
| `app.listen(port?, callback?)` | Start server (callback) |
| `app.close()` | Stop server |
| `app.ready()` | Tunggu hingga server siap |

### Factory

```ts
function SpeexJS(options?: AppOptions): SuperApp
```

---

## Index Subpath Exports

| Import | Modul |
|---|---|
| `SpeexJS` | Schema, Server, Client, RPC (gabungan) |
| `SpeexJS/server` | SuperApp, Router, Middleware, Controller, Container, Engine, Auth, Gate, Cache, Storage, Events, Database, Helpers |
| `SpeexJS/server/http` | SuperRequest, SuperResponse, HeadersMap, HttpStatus, Cookies, Upload |
| `SpeexJS/server/router` | Router, RouteHandler, RouteContext |
| `SpeexJS/server/middleware` | Middleware, MiddlewarePipeline, 10 middleware factories |
| `SpeexJS/server/controller` | Controller, decorators (@controller, @get, @post, @put, @patch, @del) |
| `SpeexJS/server/container` | Container |
| `SpeexJS/server/auth` | AuthManager, SessionGuard, TokenGuard |
| `SpeexJS/server/gate` | Gate, AuthorizationError |
| `SpeexJS/server/cache` | Cache, cacheResponse |
| `SpeexJS/server/storage` | Storage, LocalDisk, createStorage |
| `SpeexJS/server/events` | Event, createEvent |
| `SpeexJS/server/database` | DatabaseConnection, QueryBuilder, SchemaBuilder, Migrator, Pagination, Seeder |
| `SpeexJS/client` | Signals, VDOM, Render, Router |
| `SpeexJS/client/signals` | Signal, Computed, Effect |
| `SpeexJS/client/vdom` | h, fragment, render, patch, hydrate, renderToString |
| `SpeexJS/client/vdom/jsx-runtime` | jsx, jsxs, Fragment |
| `SpeexJS/rpc` | RpcServer, RpcClient, types |
| `SpeexJS/schema` | s, all schema types, Infer |
