# Contributing to ConstX

> **Bahasa Indonesia** · *English version below*

Terima kasih atas minat Anda untuk berkontribusi ke **ConstX**! Kami sangat menghargai kontribusi dari komunitas, baik berupa laporan bug, permintaan fitur, maupun pull request.

---

## Daftar Isi

- [Laporan Bug](#laporan-bug)
- [Pengajuan Fitur Baru](#pengajuan-fitur-baru)
- [Panduan Pull Request](#panduan-pull-request)
- [Coding Standards](#coding-standards)
- [Development Setup](#development-setup)
- [Struktur Monorepo](#struktur-monorepo)
- [Lisensi](#lisensi)

---

## Laporan Bug

Jika Anda menemukan bug, harap laporkan melalui [GitHub Issues](https://github.com/superdevids/ConstX/issues).

**Sebelum melaporkan:**

1. Pastikan bug belum pernah dilaporkan sebelumnya (cari di issues yang sudah ada).
2. Gunakan template laporan bug yang tersedia.
3. Sertakan langkah-langkah untuk mereproduksi bug.

**Informasi yang diperlukan:**

- Versi ConstX yang digunakan
- Versi Node.js (`node --version`)
- Sistem operasi
- Kode minimal untuk mereproduksi masalah
- Expected behavior vs actual behavior
- Log error atau stack trace (jika ada)

---

## Pengajuan Fitur Baru

Kami terbuka untuk ide-ide baru! Silakan ajukan fitur melalui [GitHub Issues](https://github.com/superdevids/ConstX/issues) dengan label `enhancement`.

**Panduan:**

- Jelaskan masalah yang ingin diselesaikan, bukan hanya solusi yang diinginkan.
- Berikan contoh use case yang jelas.
- Jika memungkinkan, sertakan contoh kode atau API yang diharapkan.
- Diskusikan terlebih dahulu sebelum memulai implementasi.

---

## Panduan Pull Request

### Proses

1. **Fork** repository ke akun GitHub Anda.
2. **Clone** fork Anda ke lokal:
   ```bash
   git clone https://github.com/USERNAME/ConstX.git
   cd ConstX
   ```
3. **Buat branch** baru untuk perubahan Anda:
   ```bash
   git checkout -b feat/nama-fitur
   # atau
   git checkout -b fix/nama-bug
   ```
4. **Lakukan perubahan** dengan mengikuti coding standards.
5. **Tulis test** untuk perubahan Anda.
6. **Pastikan semua test lulus**:
   ```bash
   npm test
   ```
7. **Commit** dengan pesan yang jelas:
   ```bash
   git commit -m "feat: menambahkan fitur X"
   git commit -m "fix: memperbaiki bug pada Y"
   ```
8. **Push** ke fork Anda:
   ```bash
   git push origin nama-branch
   ```
9. **Buat Pull Request** ke branch `main` repository utama.

### Checklist PR

- [ ] Kode mengikuti coding standards
- [ ] Test sudah ditambahkan/diupdate
- [ ] Semua test lulus (`npm test`)
- [ ] TypeScript type checking lulus (`npm run typecheck`)
- [ ] Build berhasil (`npm run build`)
- [ ] Dokumentasi sudah diupdate (jika perlu)
- [ ] Perubahan sudah dijelaskan dengan jelas di deskripsi PR

### Conventional Commits

Kami menggunakan [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — Fitur baru
- `fix:` — Perbaikan bug
- `docs:` — Perubahan dokumentasi
- `refactor:` — Refaktor kode
- `test:` — Penambahan test
- `chore:` — Tugas maintenance
- `perf:` — Optimasi performa

---

## Coding Standards

### TypeScript Strict

- Semua kode harus menggunakan TypeScript dengan strict mode.
- Dilarang menggunakan `any` — gunakan `unknown` jika tipe tidak diketahui.
- Semua function dan method harus memiliki type signature yang eksplisit.
- Gunakan `interface` untuk object shapes, `type` untuk union/intersection.

### Zero Dependencies

ConstX berkomitmen untuk **zero runtime dependencies**. Semua fungsionalitas harus diimplementasikan tanpa menggunakan package npm eksternal (kecuali devDependencies untuk build/testing).

### Testing

- Setiap kode baru harus memiliki unit test.
- Gunakan Vitest sebagai test runner.
- Coverage minimal: **80%**.
- Test file ditempatkan di `tests/` dengan nama `*.test.ts`.

### Code Style

- Gunakan `Biome` untuk formatting (sudah terkonfigurasi).
- Jalankan `npx @biomejs/biome check --write` sebelum commit.
- Gunakan 2 spasi untuk indentasi.
- Gunakan single quotes untuk string.
- Akhiri baris dengan semicolon (;).

### File Organization

- Satu file export satu class/function utama.
- Barrel export via `index.ts` untuk setiap modul.
- Nama file menggunakan **kebab-case**.
- Nama class menggunakan **PascalCase**.
- Nama function/variable menggunakan **camelCase**.

---

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Clone & Install

```bash
# Clone repository
git clone https://github.com/superdevids/ConstX.git
cd ConstX

# Install dependencies (hanya devDependencies)
npm install
```

### Build

```bash
# Build semua package
npm run build
```

### Test

```bash
# Jalankan semua test
npm test

# Test dengan coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Type Checking

```bash
npm run typecheck
```

### Development Mode

```bash
# Build dengan watch mode
npm run dev

# Link untuk testing lokal di project lain
npm link
cd /path/to/project
npm link ConstX
```

---

## Struktur Monorepo

ConstX menggunakan **monorepo** dengan struktur sebagai berikut:

```
ConstX/
├── packages/
│   └── ConstX/              # Package utama (framework)
│       ├── src/
│       │   ├── index.ts      # Entry point utama
│       │   ├── native/       # Core helpers (zero-dependency)
│       │   │   ├── args.ts
│       │   │   ├── colors.ts
│       │   │   ├── logger.ts
│       │   │   ├── crypto.ts
│       │   │   ├── hashing.ts
│       │   │   └── helpers/
│       │   │       ├── str.ts
│       │   │       ├── arr.ts
│       │   │       └── number.ts
│       │   ├── schema/       # Validasi & schema system
│       │   ├── server/       # Server-side framework
│       │   │   ├── http/     # Request, Response, Headers, Cookies
│       │   │   ├── router/
│       │   │   ├── middleware/
│       │   │   ├── controller/
│       │   │   ├── container/
│       │   │   ├── engine/
│       │   │   ├── auth/
│       │   │   ├── gate/
│       │   │   ├── cache/
│       │   │   ├── storage/
│       │   │   ├── events/
│       │   │   └── database/
│       │   ├── client/       # Client-side (Signals, VDOM, SSR)
│       │   ├── rpc/          # Type-safe RPC
│       │   └── cli/          # CLI commands
│       └── tests/
├── package.json              # Root workspace config
└── README.md
```

### Subpath Exports

| Import Path | Deskripsi |
|---|---|
| `ConstX` | Main entry (schema, server, client, rpc) |
| `ConstX/server` | Server framework |
| `ConstX/server/http` | HTTP layer |
| `ConstX/server/router` | Router |
| `ConstX/server/middleware` | Middleware |
| `ConstX/server/controller` | Controller |
| `ConstX/server/container` | DI Container |
| `ConstX/server/auth` | Authentication |
| `ConstX/server/gate` | Authorization |
| `ConstX/server/cache` | Cache system |
| `ConstX/server/storage` | File storage |
| `ConstX/server/events` | Event system |
| `ConstX/server/database` | Database layer |
| `ConstX/client` | Client framework |
| `ConstX/client/signals` | Reactive signals |
| `ConstX/client/vdom` | Virtual DOM |
| `ConstX/client/vdom/jsx-runtime` | JSX runtime |
| `ConstX/rpc` | RPC system |
| `ConstX/schema` | Schema validation |

---

## Lisensi

Dengan berkontribusi ke ConstX, Anda setuju bahwa kontribusi Anda akan dilisensikan di bawah [MIT License](LICENSE).

---

---

# Contributing to ConstX

> *English version*

Thank you for your interest in contributing to **ConstX**! We appreciate all contributions, including bug reports, feature requests, and pull requests.

---

## Reporting Bugs

Report bugs via [GitHub Issues](https://github.com/superdevids/ConstX/issues).

**Before reporting:**

- Search existing issues to avoid duplicates.
- Use the bug report template.

**Required information:**

- ConstX version
- Node.js version
- Operating system
- Minimal reproduction code
- Expected vs actual behavior
- Error logs or stack traces

---

## Feature Requests

Submit feature requests via [GitHub Issues](https://github.com/superdevids/ConstX/issues) with the `enhancement` label.

- Describe the problem, not just the solution.
- Provide clear use cases.
- Include expected API examples.

---

## Pull Request Guidelines

1. Fork and clone the repository.
2. Create a branch: `feat/your-feature` or `fix/your-bug`.
3. Follow coding standards.
4. Write tests for your changes.
5. Ensure all tests pass (`npm test`).
6. Use [Conventional Commits](https://www.conventionalcommits.org/).
7. Push and create a PR to `main`.

### PR Checklist

- [ ] Code follows coding standards
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] TypeScript type check passes
- [ ] Build succeeds
- [ ] Documentation updated (if needed)

---

## Coding Standards

- **TypeScript strict mode** — no `any`, use `unknown`.
- **Zero runtime dependencies** — implement everything without external npm packages.
- **Testing** — Vitest, minimum **80% coverage**.
- **Formatting** — Biome (2 spaces, single quotes, semicolons).
- **File naming** — kebab-case for files, PascalCase for classes, camelCase for functions.

---

## Development Setup

```bash
git clone https://github.com/superdevids/ConstX.git
cd ConstX
npm install
npm run build
npm test
```

---

## License

By contributing to ConstX, you agree that your contributions will be licensed under the [MIT License](LICENSE).
