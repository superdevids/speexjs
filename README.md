# SpeexJS Monorepo 🚀

**Dua package dalam satu monorepo — untuk developer JavaScript/TypeScript Indonesia dan dunia.**

```
SpeexJS/
├── packages/
│   ├── SpeexJS/   → SpeexJS          (Fullstack Framework — zero dep, server+client+rpc+db+auth+cli)
│   └── core/      → SpeexJS-core     (Utility Library — zero dep, 90+ functions)
```

---

## 📦 Package

| Package | npm | Deskripsi |
|---------|-----|-----------|
| **SpeexJS** | `npm install SpeexJS` | Fullstack framework: Server (Laravel-like), Client (Signal-based VDOM), RPC (type-safe), Database (Query Builder + Migrations), Auth (Session + Token), CLI. Zero dependencies. |
| **SpeexJS-core** | `npm install SpeexJS-core` | Utility library: deepClone, debounce, formatDate, terbilang, isNIK, Logger, dep-exray, dan 90+ fungsi lainnya. Zero runtime dependencies. |

---

## 🚀 Quickstart

### SpeexJS (Fullstack Framework)

```bash
npm install SpeexJS
```

```typescript
import { SpeexJS } from 'SpeexJS/server'
import { s } from 'SpeexJS/schema'

const app = SpeexJS()

app.get('/', async ({ response }) => {
  return response.html('<h1>SpeexJS 🚀</h1>')
})

app.get('/api/users', async ({ response }) => {
  const users = await db.table('users').paginate(10, 1)
  return response.json(users)
})

app.listen(3000, () => console.log('SpeexJS running on http://localhost:3000'))
```

Dokumentasi lengkap: **[packages/SpeexJS/README.md](./packages/SpeexJS/README.md)**

### SpeexJS-core (Utility Library)

```bash
npm install SpeexJS-core
```

```typescript
import { deepClone } from 'SpeexJS-core'
import { formatDate } from 'SpeexJS-core/date'
import { isNIK } from 'SpeexJS-core/validation'
import { terbilang, formatRupiah } from 'SpeexJS-core/string'

deepClone({ a: 1, b: { c: new Date() } })
formatDate(new Date(), 'DD/MM/YYYY')  // "28/06/2026"
isNIK('3201010203940001')             // true
terbilang(1500000)                    // "satu juta lima ratus ribu"
formatRupiah(1500000)                 // "Rp1.500.000"
```

Dokumentasi lengkap: **[packages/core/README.md](./packages/core/README.md)**

---

## ✨ Fitur Unggulan

### SpeexJS (Framework)
- **Zero dependencies** — 100% native Node.js
- **Server** — Laravel-like: Router, Middleware, Controller, DI, Engine
- **Database** — Query Builder, Migrations, Pagination (MySQL/SQLite/PostgreSQL)
- **Auth** — Session Guard, Token Guard, Gate Authorization
- **Schema** — 25+ validation types + 🇮🇩 NIK/NPWP/Phone/Kodepos
- **Client** — Signal-based reactivity, Virtual DOM, JSX, SSR
- **RPC** — Type-safe bidirectional communication
- **Cache, Storage, Events** — Enterprise features
- **CLI** — `SpeexJS init`, `make:*`, `serve`, `list-routes`

### SpeexJS-core
- **90+ functions** — 16 modules (core, math, date, collection, string, async, io, type, crypto, path, validation, error, logger, color, dep-exray)
- **TypeScript strict** — full type safety, zero `any`
- **Zero runtime dependencies** — pure JS/TS
- **Tree-shakeable** — import only what you need
- **🇮🇩 Indonesia** — NIK, NPWP, Phone, terbilang, formatRupiah

---

## 📊 Statistik

| Metrik | SpeexJS | SpeexJS-core |
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
- [SpeexJS ROADMAP](./packages/SpeexJS/ROADMAP.md)
- [SpeexJS-core ROADMAP](./packages/core/ROADMAP.md)

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
