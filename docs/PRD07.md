# Product Requirements Document — SpeexJS

## Volume 7 — Documentation Integrity, Governance & Next-Phase Development Pipeline

> **Version:** 2.1.2 (PRD)
> **Status:** 🆕 Proposed — belum diimplementasikan
> **Last Updated:** 2026-06-30
> **Author:** Audit independen terhadap 16 dokumen project (README, ARCHITECTURE, CHANGELOG, SUMMARY, ROADMAP, SECURITY, CONTRIBUTING, SUPPORT, PUBLISH, TESTING, PRD01–PRD06)
> **Tujuan:** Mengidentifikasi inkonsistensi lintas-dokumen secara faktual (bukan asumsi), lalu mendefinisikan pipeline perbaikan + pengembangan lanjutan yang relevan dan sejalan dengan arah project yang sudah ada.

---

## 1. Executive Summary

Audit menyeluruh terhadap 16 file dokumentasi SpeexJS menemukan bahwa **konten teknis (fitur, arsitektur, security scope) secara umum solid dan detail**, tetapi terdapat **ketidakkonsistenan angka dan status lintas-dokumen yang signifikan** — versi, jumlah test, coverage, jumlah CLI command, dan penomoran PRD itu sendiri saling bertentangan antar file. Ini adalah kelas masalah _"documentation drift"_: setiap file ditulis/diupdate secara independen tanpa single source of truth, sehingga klaim "100% aligned" pada README/SUMMARY tidak benar-benar bisa diverifikasi karena angka rujukannya sendiri tidak konsisten.

PRD ini punya dua bagian:

1. **Gap Analysis** — temuan konkret per kategori, dengan lokasi file:baris.
2. **Development Pipeline** — rencana perbaikan dokumentasi (G-series) + pengembangan teknis lanjutan (D-series) yang align dengan ROADMAP v3.x AI-Native yang sudah ada di PRD06/ROADMAP.md, bukan arah baru yang melenceng.

---

## 2. Gap Analysis — Temuan Faktual

### 2.1 Versi Produk Tidak Konsisten (CRITICAL)

| Sumber                                  | Klaim Versi                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| README.md:9, SUMMARY.md:3, ROADMAP.md:5 | **v2.1.1** sebagai versi current/published                                                                                                    |
| SECURITY.md (Supported Versions table)  | **3.x = Active**, 2.x = _Limited_, 1.x = EOL                                                                                                  |
| PRD01–PRD03 header                      | `Version: 3.0.0 (PRD)`                                                                                                                        |
| PRD04.md:22                             | Gap analysis tabel memakai baseline **"Current State (v1.6.1)"** padahal header dokumen yang sama bilang status sudah "implemented in v2.1.1" |
| CHANGELOG.md                            | Sempat ada tag **v3.0.0-alpha.14** ("Developer Maturity") yang kemudian publish aktual jatuh ke **v2.1.1**, bukan 3.0.0                       |

**Masalah:** SECURITY.md menyatakan versi 3.x sebagai "Active" padahal package yang benar-benar dipublish ke npm (lihat PUBLISH.md & CHANGELOG.md) adalah **2.1.1** — versi 3.x tidak pernah dirilis. Ini bukan sekadar typo, tapi bisa menyesatkan reporter security vulnerability soal versi mana yang didukung. PRD-PRD (01-04) memakai versioning sendiri ("3.0.0 (PRD)") yang tertukar dengan versioning produk — dua sistem version berbeda dipakai bergantian tanpa disambiguasi (_PRD spec version_ vs _package version_).

### 2.2 Dua Sistem Penomoran "PRD" yang Bentrok (CRITICAL)

Ditemukan **dua skema "PRD-XX" yang berbeda dan tidak berkorelasi**:

- **Skema A** (file fisik): `PRD01.md` s/d `PRD06.md` — masing-masing dokumen besar (Feature Taxonomy, No-Effort Framework F1-F15, Scale F16-F30, Production Hardening N1-N10, v3.x Vision, AI-Native).
- **Skema B** (dipakai di ROADMAP.md dan CHANGELOG.md): `PRD-01` s/d `PRD-10` merujuk ke fitur v2.1.1 yang sama sekali berbeda — DevTools Dashboard, HMR 2.0, CLI Gen 2, Query Builder 2.0, Auth 2.0, Queue 2.0, Storage 2.0, Search Engine, Performance Analyzer, API Versioning.

Contoh konkret: CHANGELOG.md menyebut _"PRD-01: SpeexJS DevTools Dashboard"_, tapi `PRD01.md` yang sebenarnya isinya adalah **Full Feature Taxonomy**, bukan DevTools. Siapa pun yang mencoba menelusuri "PRD-01" dari changelog ke file PRD akan salah baca dokumen. Ini perlu rename skema B menjadi sesuatu yang non-collision, misalnya `R2.1-01` (Release 2.1 item 1) atau `F-DEVTOOLS`.

### 2.3 Angka Test Count Saling Bertentangan (HIGH)

| File                                       | Klaim                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| README.md / SUMMARY.md / PRD06.md          | **~2.400 tests**                                                                                          |
| ARCHITECTURE.md §13                        | **"Test Count: 3.000+"** sebagai judul section                                                            |
| ARCHITECTURE.md §2 (rincian per file test) | Jumlah 11 file test = 221+193+63+182+176+103+49+51+79+316+554 = **1.987 tests** (bukan 2.400 atau 3.000+) |
| CHANGELOG.md                               | Tiga angka berbeda di entry berurutan: **1.849**, **1.990**, lalu lompat ke **2.400**                     |
| PRD04.md §2 (Gap Analysis)                 | Baseline **2.158 tests**, target **3.000+**                                                               |

Tidak ada satupun angka yang konsisten dengan rincian per-file di ARCHITECTURE.md sendiri. Ini indikasi angka ditulis manual tanpa diverifikasi ulang dari `npm test` output setiap kali dokumen diupdate.

### 2.4 Test Coverage Berbeda (MEDIUM)

ARCHITECTURE.md §13 dan SUMMARY.md menyebut **97.1%**, sementara CHANGELOG.md (3 lokasi) dan PRD02.md menyebut **96.3%**. Tidak jelas mana yang terbaru.

### 2.5 Jumlah CLI Command Tidak Konsisten (HIGH)

| Sumber                                       | Klaim                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| README.md heading §"CLI Reference"           | **35+ commands**                                                                            |
| README.md — jumlah baris aktual di tabel CLI | **42 baris** (dihitung langsung dari tabel)                                                 |
| README.md tabel Benchmarks                   | **33**                                                                                      |
| SUMMARY.md                                   | **33 CLI commands (29 wired)** — istilah "wired" tidak pernah dijelaskan di dokumen manapun |
| ROADMAP.md                                   | **33 CLI commands**                                                                         |
| PRD04.md §2 Gap Analysis                     | Current **27+**, target **35+**                                                             |
| PRD04.md §6 Success Metrics                  | Current **27**, target v2.1 **35+**, target v2.2 **40+**                                    |

Selisih antara baris tabel aktual (42) vs angka yang diklaim di tempat lain (27/33/35) cukup besar — kemungkinan tabel CLI di README sudah berkembang lebih cepat dari narasi angka di sekitarnya, atau sebagian command di tabel sebenarnya belum "wired" (istilah dari SUMMARY.md) sehingga dihitung beda, tapi ini tidak pernah didefinisikan secara eksplisit di dokumen manapun.

### 2.6 Struktur Source Layout Mengandung Duplikasi (MEDIUM)

Di `ARCHITECTURE.md` §2 (Source Layout), folder berikut **muncul dua kali** dalam satu pohon direktori yang sama:

- `search/` — sekali sebagai "Full-text search" generik, sekali lagi sebagai "Full-Text Search Engine (TF-IDF, fuzzy, highlight)"
- `storage/` — sekali sebagai "File storage (Local, S3)", sekali lagi sebagai "Storage v2 (validation, image processing, signed URLs)"
- `router/deprecation.ts` dicantumkan sebagai entri sejajar folder top-level `server/`, padahal seharusnya nested di bawah `router/` yang sudah disebut di atasnya.

Ini mengindikasikan dokumen di-merge dari beberapa versi tanpa proses dedup — pembaca baru akan bingung apakah `search/` v1 dan v2 hidup berdampingan atau v2 menggantikan v1 (tidak dijelaskan migrasinya).

### 2.7 PRD Berstatus "✅ 100% Implemented" tapi Isinya Proposal yang Belum Direvisi (HIGH)

PRD02.md dan PRD03.md mencantumkan di header: _"Author: Independent Analysis (based on speexjs v1.6.1)"_ dan PRD03 bahkan menulis _"Predecessor: PRD v1.0 (F1–F15, target v2.0)"_ — padahal header yang sama persis menyatakan _"Status: ✅ All features implemented in v2.1.1"_. Artinya dokumen proposal lama (ditulis saat baseline masih v1.6.1, menargetkan v2.0) ditandai selesai/implemented tanpa pernah di-rewrite kontennya ke present-tense / baseline terbaru. Ini membuat pembaca tidak bisa membedakan: apakah fitur di PRD02/03 itu **rencana lama yang kebetulan sudah terealisasi**, atau **rencana yang di-checklist secara serampangan tanpa verifikasi nyata** di kode.

### 2.8 SECURITY.md vs CONTRIBUTING.md/SUPPORT.md — Kontak & Repo Konsisten, tapi Versi Tidak Sinkron dengan Repo Itu Sendiri

Repo URL (`github.com/superdevids/speexjs`) konsisten di CONTRIBUTING.md dan SUPPORT.md — ini bagus, tidak ada gap di sini. Namun SECURITY.md tidak mereferensikan PUBLISH.md sama sekali padahal keduanya bicara tentang versi rilis — tidak ada cross-link, sehingga kontributor yang baca SECURITY.md tidak tahu versi 3.x yang diklaim "Active" itu sebenarnya tidak pernah dipublish (lihat 2.1).

### 2.9 PRD06 (AI-Native) Berstatus "In Progress" tapi README/SUMMARY Mengklaim "100% PRD Aligned" Tanpa Pengecualian

README.md tagline: _"All 5 PRDs (Product Requirements Documents) are 100% aligned"_ — ini benar **hanya jika PRD06 tidak dihitung** (SUMMARY.md sendiri menandai PRD06 sebagai 🚧 _In Progress_, bukan ✅). Tapi tagline README tidak menyebut pengecualian ini sama sekali, berpotensi misleading bagi pengguna baru yang membaca README sebagai satu-satunya entry point.

### 2.10 TESTING.md Tidak Spesifik ke SpeexJS

`TESTING.md` adalah brutal-testing prompt template generik untuk _"FULLSTACK JS/TS WEB FRAMEWORK"_ — tidak ada satupun referensi eksplisit ke nama package SpeexJS, struktur folder `src/server/...` miliknya, atau command CLI (`speexjs test`, dll). Dokumen ini bisa di-paste ke project lain tanpa modifikasi. Untuk dokumentasi project yang sudah sangat presisi di tempat lain (ARCHITECTURE, SECURITY), level genericness di TESTING.md ini adalah outlier kualitas.

### 2.11 Bundle Size — Klaim Berbeda Antar Dokumen (LOW–MEDIUM)

README.md Benchmarks table: **~218 KB**. PRD04.md §2 Gap Analysis: current **218 KB gzip**, target **<150 KB gzip** — namun tidak ada dokumen manapun (CHANGELOG, ROADMAP) yang mengonfirmasi target ini tercapai atau dibatalkan di v2.1.1. README masih menampilkan 218 KB sebagai angka final tanpa catatan bahwa optimasi (N2 di PRD04) belum dieksekusi.

---

## 3. Root Cause

Seluruh temuan di atas berakar dari **tidak adanya single source of truth (SSOT)** untuk angka-angka project (versi, test count, coverage, CLI count) dan **tidak adanya proses sinkronisasi otomatis** antara kode aktual ↔ dokumentasi. Setiap file di-update manual secara terpisah pada waktu berbeda, sehingga angka yang sama "dibekukan" di titik waktu yang berbeda-beda lalu tidak pernah direkonsiliasi.

---

## 4. Development Pipeline

### 4.1 Governance Track (G-series) — Perbaikan Dokumentasi, prioritas P0

| ID      | Item                                     | Deskripsi                                                                                                                                                                                                                                                                                                                        | Effort |
| ------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **G1**  | Single Source of Truth file              | Buat `project.meta.json` di root berisi `{version, testCount, coverage, cliCommandCount, subpathExports}` yang di-generate otomatis dari `package.json` + hasil `npm test -- --reporter=json` + `npm run typecheck`. Semua doc (README, SUMMARY, ARCHITECTURE, ROADMAP) wajib inject angka dari file ini, bukan hardcode manual. |
| **G2**  | Script `docs:verify`                     | CLI command baru `speexjs docs:verify` yang membandingkan angka hardcode di setiap `.md` terhadap `project.meta.json`, exit code ≠0 jika ada mismatch — dipasang sebagai CI gate sebelum `npm publish`.                                                                                                                          |
| **G3**  | Resolusi skema penomoran PRD ganda       | Rename skema B (ROADMAP/CHANGELOG) dari `PRD-01..10` menjadi `R2.1-01..10` (Release-scoped), supaya tidak collide dengan `PRD01.md..PRD06.md`. Update semua referensi di ROADMAP.md & CHANGELOG.md.                                                                                                                              |
| **G4**  | Rekonsiliasi versi produk vs SECURITY.md | Update SECURITY.md Supported Versions table agar mencerminkan realita: hanya 2.x yang pernah dipublish; hapus baris 3.x "Active" atau ubah jadi "Planned — not yet released".                                                                                                                                                    |
| **G5**  | Rewrite PRD02/PRD03 baseline reference   | Update header PRD02.md & PRD03.md: ganti _"based on speexjs v1.6.1"_ menjadi baseline saat ini, dan tambahkan changelog internal di tiap PRD yang mencatat tanggal status berubah dari 🚧 → ✅, bukan langsung overwrite jadi "implemented" tanpa jejak.                                                                         |
| **G6**  | Dedup source layout di ARCHITECTURE.md   | Hapus duplikasi entry `search/` dan `storage/`, gabungkan jadi satu entry dengan keterangan versi gabungan (v1 legacy + v2 fitur), pindahkan `router/deprecation.ts` ke nested posisi yang benar.                                                                                                                                |
| **G7**  | README disclaimer untuk PRD06            | Tambahkan baris eksplisit di README: _"PRD01-05: 100% aligned. PRD06 (AI-Native): in progress, foundation only"_ — supaya klaim "100% aligned" tidak menyesatkan.                                                                                                                                                                |
| **G8**  | Spesifikasi ulang TESTING.md             | Inject referensi konkret ke struktur SpeexJS: command CLI aktual (`npx vitest`, `npm run test:coverage`), folder test nyata (`tests/server.test.ts` dst.), dan endpoint DevTools (`/_speex/devtools`) ke dalam template brutal-testing supaya tidak generik.                                                                     |
| **G9**  | Cross-link SECURITY.md ↔ PUBLISH.md      | Tambahkan section "Release & Support Lifecycle" yang menjelaskan versi mana yang live di npm (rujuk PUBLISH.md) vs versi yang didukung security-wise.                                                                                                                                                                            |
| **G10** | Definisikan istilah "wired"              | SUMMARY.md memakai istilah _"33 CLI commands (29 wired)"_ tanpa definisi. Tambahkan footnote/glossary: command yang "wired" = terdaftar di CLI registry & punya test, vs command yang baru di-scaffold tanpa implementasi penuh.                                                                                                 |

### 4.2 Development Track (D-series) — Lanjutan Teknis, align dengan PRD06/ROADMAP v3.x

Bagian ini **tidak menambah arah baru** — murni melanjutkan apa yang sudah dirintis PRD06 (AI-Native, status 🚧) dan N2/N6/N7/N8/N9 di PRD04 yang **belum dieksekusi**:

| ID     | Item                                                                                       | Sumber Rujukan                                               | Prioritas |
| ------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | --------- |
| **D1** | Eksekusi N2 — Build Optimization (<150 KB gzip)                                            | PRD04 §N2, belum ada konfirmasi tercapai di CHANGELOG/README | P1        |
| **D2** | Lanjutkan PRD06 — Prompt Management + Embedding Providers (OpenAI/Anthropic/Cohere/Ollama) | ROADMAP.md "🚧 Planned"                                      | P1        |
| **D3** | Lanjutkan PRD06 — LLM Provider SDK (unified streaming + structured output)                 | ROADMAP.md "🚧 Planned"                                      | P1        |
| **D4** | Cloud Functions Mode (N7) — AWS Lambda/GCF/Vercel handler bundling                         | PRD04 §N7, belum disebut shipped di manapun                  | P2        |
| **D5** | Plugin Marketplace Search (N8) — `speexjs plugin:search` ke registry `plugins.speexjs.dev` | PRD04 §N8                                                    | P2        |
| **D6** | Automated Performance Profiler (N9) — `speexjs profile` p50/p95/p99 + heap snapshot        | PRD04 §N9                                                    | P2        |
| **D7** | Comprehensive Documentation Site (N10)                                                     | PRD04 §N10, paralel dengan G-series di atas                  | P1        |
| **D8** | Reconcile & republish bundle size setelah D1 selesai, update README Benchmarks table       | Hasil dari D1                                                | P1        |

### 4.3 Urutan Eksekusi yang Disarankan

```
Sprint 1 (Governance Foundation)
  G1 → G2 → G3 → G4
  (tanpa SSOT, semua perbaikan lain berisiko drift lagi)

Sprint 2 (Doc Cleanup)
  G5, G6, G7, G8, G9, G10
  (bisa paralel, tidak saling depend)

Sprint 3+ (Technical Continuation)
  D1 → D8 (build opt duluan karena angkanya dirujuk di banyak tempat)
  D2, D3 (AI-Native core, paling tinggi value sesuai visi PRD06)
  D4, D5, D6 (P2, bisa setelah D2/D3)
  D7 (dokumentasi situs, jalan paralel sepanjang sprint 3+)
```

---

## 5. Acceptance Criteria — PRD ini selesai jika:

- [ ] `project.meta.json` ada dan seluruh angka di README/SUMMARY/ARCHITECTURE/ROADMAP dirujuk dari sana, bukan hardcode.
- [ ] `speexjs docs:verify` lulus tanpa mismatch di CI.
- [ ] Tidak ada lagi dua skema "PRD-XX" yang collide — semua referensi ROADMAP/CHANGELOG memakai skema baru.
- [ ] SECURITY.md Supported Versions mencerminkan versi yang benar-benar dipublish ke npm.
- [ ] README mencantumkan disclaimer eksplisit soal status PRD06.
- [ ] ARCHITECTURE.md source layout tanpa duplikasi folder.
- [ ] D1–D8 punya tracking status individual di ROADMAP.md dengan tanggal target, bukan sekadar "🚧 Planned" tanpa timeline.

---

## 6. Out of Scope

PRD ini tidak mengusulkan fitur produk baru di luar yang sudah dirintis PRD04/PRD06 — fokusnya murni _governance_ (kebenaran dokumentasi) dan _penyelesaian utang_ dari PRD sebelumnya yang sudah ditulis tapi belum dieksekusi. Fitur baru di luar itu sebaiknya dibahas di PRD07.x terpisah agar tidak mencampur audit dengan proposal.
