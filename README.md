# ConstX Monorepo 🚀

**Dua package dalam satu monorepo — untuk developer JavaScript/TypeScript Indonesia dan dunia.**

```
ConstX/
├── packages/
│   ├── ConstX/   → ConstX          (Fullstack Framework — zero dep, server+client+rpc+db+auth+cli)
│   └── core/      → ConstX-core     (Utility Library — zero dep, 90+ functions)
```

---

## 📦 Package

| Package | npm | Deskripsi |
|---------|-----|-----------|
| **ConstX** | `npm install ConstX` | Fullstack framework: Server (Laravel-like), Client (Signal-based VDOM), RPC (type-safe), Database (Query Builder + Migrations), Auth (Session + Token), CLI. Zero dependencies. |
| **ConstX-core** | `npm install ConstX-core` | Utility library: deepClone, debounce, formatDate, terbilang, isNIK, Logger, dep-exray, dan 90+ fungsi lainnya. Zero runtime dependencies. |

---

## 🚀 Quickstart

### ConstX (Fullstack Framework)

```bash
npm install ConstX
```

```typescript
import { ConstX } from 'ConstX/server'
import { s } from 'ConstX/schema'

const app = ConstX()

app.get('/', async ({ response }) => {
  return response.html('<h1>ConstX 🚀</h1>')
})

app.get('/api/users', async ({ response }) => {
  const users = await db.table('users').paginate(10, 1)
  return response.json(users)
})

app.listen(3000, () => console.log('ConstX running on http://localhost:3000'))
```

Dokumentasi lengkap: **[packages/ConstX/README.md](./packages/ConstX/README.md)**

### ConstX-core (Utility Library)

```bash
npm install ConstX-core
```

```typescript
import { deepClone } from 'ConstX-core'
import { formatDate } from 'ConstX-core/date'
import { isNIK } from 'ConstX-core/validation'
import { terbilang, formatRupiah } from 'ConstX-core/string'

deepClone({ a: 1, b: { c: new Date() } })
formatDate(new Date(), 'DD/MM/YYYY')  // "28/06/2026"
isNIK('3201010203940001')             // true
terbilang(1500000)                    // "satu juta lima ratus ribu"
formatRupiah(1500000)                 // "Rp1.500.000"
```

Dokumentasi lengkap: **[packages/core/README.md](./packages/core/README.md)**

---

## ✨ Fitur Unggulan

### ConstX (Framework)
- **Zero dependencies** — 100% native Node.js
- **Server** — Laravel-like: Router, Middleware, Controller, DI, Engine
- **Database** — Query Builder, Migrations, Pagination (MySQL/SQLite/PostgreSQL)
- **Auth** — Session Guard, Token Guard, Gate Authorization
- **Schema** — 25+ validation types + 🇮🇩 NIK/NPWP/Phone/Kodepos
- **Client** — Signal-based reactivity, Virtual DOM, JSX, SSR
- **RPC** — Type-safe bidirectional communication
- **Cache, Storage, Events** — Enterprise features
- **CLI** — `ConstX init`, `make:*`, `serve`, `list-routes`

### ConstX-core
- **90+ functions** — 16 modules (core, math, date, collection, string, async, io, type, crypto, path, validation, error, logger, color, dep-exray)
- **TypeScript strict** — full type safety, zero `any`
- **Zero runtime dependencies** — pure JS/TS
- **Tree-shakeable** — import only what you need
- **🇮🇩 Indonesia** — NIK, NPWP, Phone, terbilang, formatRupiah

---

## 📊 Statistik

| Metrik | ConstX | ConstX-core |
|--------|-------------|---------|
| Versi | 0.2.0 | 0.6.0 |
| File | 67 | 50+ |
| Baris kode | 9.887 | 6.500+ |
| Dependencies | **0**  | **0** |
| Tests | 69 | 828 |
| TypeScript | Strict ✅ | Strict ✅ |

---

## 🗺️ Roadmap

Lihat roadmap masing-masing package:
- [ConstX ROADMAP](./packages/ConstX/ROADMAP.md)
- [ConstX-core ROADMAP](./packages/core/ROADMAP.md)

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan buat issue atau pull request.

- [CONTRIBUTING.md](./packages/core/CONTRIBUTING.md)
- [SECURITY.md](./packages/core/SECURITY.md)

---

## 📝 License

MIT — bebas digunakan, dimodifikasi, dan didistribusikan.

---

**🇮🇩 Dibuat oleh developer Indonesia, untuk developer dunia.**
