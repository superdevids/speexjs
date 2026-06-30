# Product Requirements Document — SpeexJS

## Volume 8 — Brutal Red-Team Audit: Security, Algorithm, Basecode & Feature Integrity

> **Version:** 2.1.3 (PRD)
> **Status:** 🆕 Proposed — hasil audit, belum diimplementasikan
> **Last Updated:** 2026-06-30
> **Metodologi:** Black-box/grey-box documentation audit — **source code aktual (`.ts`) tidak diupload**, sehingga audit ini dilakukan terhadap _klaim_ di README/ARCHITECTURE/SECURITY/PRD01-06/CHANGELOG sebagai spesifikasi, diperlakukan dengan mindset penyerang: setiap klaim "zero-dep, kami implementasi sendiri" dianggap **belum terbukti aman** sampai ada bukti (test file, audit eksternal, fuzz report) yang menunjuk eksplisit.
> **Severity scale:** CRITICAL (eksploitasi realistis, dampak besar) · HIGH · MEDIUM · LOW · INFO (tidak vulnerable, tapi red flag proses/desain)

---

## 1. Executive Summary

Temuan paling penting dari audit ini **bukan** bug spesifik di kode (karena kode tidak tersedia untuk diperiksa langsung), melainkan **pola desain yang secara struktural meningkatkan attack surface**: SpeexJS mengklaim **zero runtime dependency** sambil mengimplementasikan ulang dari nol primitif keamanan yang secara historis adalah sumber CVE paling sering di ekosistem JS/TS — SAML2 XML parsing, JWT/JWKS validation, CBOR/COSE parsing untuk WebAuthn, dan OIDC discovery — semuanya custom-built, bukan memakai library yang sudah di-battle-test bertahun-tahun (`jsonwebtoken`, `jose`, `samlify`, `@simplewebauthn/server`, dll).

"Zero dependencies = zero attack surface dari supply chain" (klaim di README & SECURITY.md) **adalah setengah benar dan setengah menyesatkan**: itu menghilangkan risiko supply-chain (dependency confusion, malicious package), tapi **memindahkan seluruh beban korektivitas kriptografi/parsing ke tim sendiri** — dan tim sendiri tidak menyediakan satupun bukti independent security audit, fuzzing report, atau bahkan test count yang konsisten (lihat audit Volume 6). Untuk kelas vulnerability seperti **JWT `alg: none`** atau **XML Signature Wrapping (XSW)** di SAML, satu baris validasi yang salah = full auth bypass — dan dokumen TESTING.md sendiri _menguji_ serangan-serangan ini secara generik tanpa bukti bahwa implementasi spesifik SpeexJS sudah lulus.

Audit ini dibagi 4 lensa sesuai permintaan: **Security**, **Algorithm**, **Basecode/Maintainability**, **Feature Integrity** (apakah klaim fitur realistis/dapat diverifikasi).

---

## 2. Lensa Security (S-series)

### S1 — CRITICAL: Hand-rolled JWT validation tanpa bukti perlindungan terhadap algorithm confusion

`OidcGuard` mengklaim _"JWT validation (RS/ES algorithms), JWKS lookup"_ (SECURITY.md:47) dibangun dari nol. Kelas vulnerability klasik yang **wajib** ditest eksplisit dan didokumentasikan hasilnya:

- **`alg: none` bypass** — TESTING.md §2.2 menyebutkan test case ini secara generik, tapi tidak ada satupun dokumen (CHANGELOG, ARCHITECTURE) yang mengonfirmasi hasil test spesifik untuk `OidcGuard`.
- **RS256 → HS256 confusion** — penyerang mengganti algoritma dari asymmetric (RS256) ke symmetric (HS256) lalu menandatangani token pakai public key sebagai HMAC secret. Tidak ada mention eksplisit bahwa implementasi _mengunci_ algoritma yang di-expect per-key (bukan membaca `alg` dari header token yang dikontrol penyerang).
- **JWKS lookup tanpa rate-limit / cache-poisoning protection** — jika `OidcGuard` fetch JWKS endpoint setiap validasi tanpa cache TTL yang jelas, ini jadi vector DoS (lihat S5) sekaligus titik SSRF jika `iss`/`jwks_uri` tidak divalidasi terhadap allowlist provider yang dikonfigurasi.

**Rekomendasi:** Publikasikan test suite spesifik nama-nama attack class di atas dengan hasil PASS/FAIL eksplisit per attack, bukan generic checklist.

### S2 — CRITICAL: SAML2 XML parsing custom-built = XXE & XML Signature Wrapping risk

SECURITY.md:46 — _"SAML2 Guard: RSA-SHA256 signature verification, XML parsing security"_. XML parsing adalah salah satu kategori paling berbahaya untuk diimplementasikan custom karena:

- **XXE (XML External Entity)** — disebutkan sebagai test case di TESTING.md §4.1 _("XXE jika ada XML parser: inject external entity")_ tapi tidak ada bukti eksplisit parser SAML sudah disable `DOCTYPE`/external entity resolution.
- **XML Signature Wrapping (XSW)** — kelas serangan SAML paling umum di mana penyerang menyisipkan elemen XML tambahan agar signature verification memvalidasi node yang berbeda dari node yang benar-benar diproses sebagai assertion. Tidak disebutkan sama sekali di SECURITY.md maupun ARCHITECTURE.md — ini gap yang sangat spesifik dan sangat sering jadi sumber auth bypass di SAML real-world.
- Tidak ada mention soal validasi `Audience`, `NotBefore`/`NotOnOrAfter`, atau replay protection (`InResponseTo` tracking) untuk SAML response.

**Rekomendasi:** Eksplisit dokumentasikan mitigasi XSW (canonical XML + strict node referencing by ID, bukan posisi), dan tambahkan replay-protection store untuk `InResponseTo`.

### S3 — HIGH: WebAuthn/CBOR COSE parser custom-built tanpa fuzzing

SECURITY.md:51 — CBOR adalah format binary yang notoriously rawan terhadap parsing bug (integer overflow, malformed length prefix, recursive structure bomb). Tidak ada bukti SpeexJS menjalankan fuzz testing terhadap parser CBOR custom-nya. TESTING.md §1.1 menyebut _"kirim nested object dengan depth 1000 level"_ sebagai generic test, tapi CBOR attestation object dari WebAuthn punya struktur jauh lebih spesifik (COSE key types, curve parameters) yang generic fuzz test tidak otomatis mencakup edge case CBOR (indefinite-length array, duplicate map keys, non-canonical encoding).

### S4 — HIGH: "Zero dependencies" untuk crypto inti — perlu klarifikasi apakah Node `crypto` native dipakai atau benar-benar custom

ARCHITECTURE.md menyebut `native/crypto.ts` sebagai _"Encryption, hashing"_ di bawah folder `native/` yang dideskripsikan sebagai _"Zero-dep core helpers"_. Ini ambigu secara kritis:

- **Jika** `crypto.ts` adalah wrapper tipis di atas Node.js built-in `node:crypto` (AES-256-GCM, HMAC, scrypt semua tersedia native) — ini **aman** dan klaim "zero dependency" valid karena Node core bukan "dependency" dalam arti supply-chain.
- **Jika** AES-256-GCM/HMAC/scrypt benar-benar diimplementasikan ulang di pure JS (bukan binding ke `node:crypto`) — ini **bencana keamanan**, karena implementasi cipher custom rentan timing attack.

**Rekomendasi:** Dokumen wajib menyatakan eksplisit: _"semua primitif crypto adalah binding langsung ke `node:crypto`, tidak ada reimplementasi algoritma"_ — kalimat ini sekarang tidak ada di manapun, dan ambiguitasnya sendiri adalah security smell.

### S5 — HIGH: Rate limiting "adaptive" tanpa spesifikasi algoritma — rawan bypass

README.md menyebut **Adaptive Rate Limit** — _"Dynamic multiplier based on server load via `adaptiveThrottle()`"_ tanpa menjelaskan algoritma dasarnya (token bucket? sliding window? fixed window?). Fixed-window rate limiting punya celah klasik **boundary burst** — TESTING.md §2.3 sendiri menyebut test case ini tapi tidak ada konfirmasi algoritma yang dipakai immune terhadap ini. Tambahan:

- Tidak disebutkan apakah rate limit key berbasis IP murni (mudah di-bypass via `X-Forwarded-For` spoofing jika app tidak di belakang trusted proxy yang strip header itu).
- "Adaptive" berbasis _server load_ berarti rate limit makin longgar saat server idle — attacker bisa probe kapan limit paling longgar lalu burst di window tersebut (timing side-channel terhadap rate limiter itu sendiri).

### S6 — MEDIUM: Migration Safety Guard (N5, PRD04) — bypass-able by design via `--force`

PRD04 §N5 mendesain migration guard yang _"Requires `--force` for destructive operations"_. Standar industri, tapi tidak ada mention **audit log** wajib ketika `--force` dipakai di environment production — kombinasi flag yang gampang diketik ulang di CI script adalah pola umum penyebab insiden `DROP TABLE` tidak sengaja di production. Rekomendasi: wajibkan confirmation interaktif tambahan ketika `NODE_ENV=production` terdeteksi, regardless of `--force`.

### S7 — MEDIUM: DevTools Dashboard exposed by default — potensi info disclosure

README.md mendeskripsikan **DevTools Dashboard** di `/_speex/devtools` dengan **Env Viewer** (_"All env vars, secrets masked"_) dan **Query Inspector**. PRD04 Appendix bahkan eksplisit mengusulkan _"Make debug dashboard require no env flag"_ sebagai quick win — frasa ini ambigu tapi berbahaya kalau diartikan dashboard aktif tanpa perlu flag tambahan, berarti **default ON**, termasuk berpotensi di production. Tidak ada dokumen yang eksplisit menyatakan dashboard ini **default-disabled di `NODE_ENV=production`** dan butuh auth terpisah.

**Rekomendasi:** Dashboard wajib (a) default-off di production, (b) butuh auth guard terpisah dari auth aplikasi utama, (c) algoritma "secrets masked" di Env Viewer harus didefinisikan — masking berbasis nama key (`*_SECRET`, `*_KEY`, `*_TOKEN`) rawan miss untuk env var custom sensitif yang tidak match pattern (mis. `DB_PASS` vs pattern yang hanya match `*_PASSWORD`).

### S8 — MEDIUM: CSRF "double-submit cookie" — perlu konfirmasi SameSite + binding ke session

SECURITY.md menyebut _"CSRF double-submit cookie pattern"_. Pola ini rawan kalau tidak mem-bind token CSRF ke session spesifik (stateless double-submit klasik bisa diserang via subdomain cookie injection). Tidak ada mention `SameSite=Strict/Lax` sebagai layer tambahan, padahal best practice modern mengombinasikan keduanya.

### S9 — LOW/INFO: Tidak ada SBOM atau security.txt

Untuk framework yang sangat vokal soal "zero dependencies = security feature", tidak ada `security.txt` (RFC 9116) di well-known path, dan tidak ada SBOM yang dipublikasikan — ironis untuk project yang mengklaim transparansi supply-chain sebagai nilai jual utama.

---

## 3. Lensa Algorithm (A-series)

### A1 — HIGH: TF-IDF + Levenshtein fuzzy search — tidak scalable, tidak disclosed limitnya

README menyebut **Search Engine**: _"TF-IDF Search"_ + _"Fuzzy Search via Levenshtein distance (≤1)"_. Dua masalah algoritmik:

- **TF-IDF murni in-memory** akan **O(n)** atau lebih buruk terhadap jumlah dokumen saat query — tidak ada disclosure berapa dokumen maksimal sebelum performa degradasi. Untuk dataset besar ini bukan "full-text search engine" yang scalable, lebih cocok disebut "small-corpus search utility".
- **Levenshtein distance ≤1 dihitung naif** terhadap seluruh index akan menjadi **O(n × m)** per query tanpa BK-tree/trie optimization — tidak ada mention struktur data optimasi ini di ARCHITECTURE.md.

### A2 — HIGH: N+1 Detection berbasis "pattern matching >5x" — false negative tinggi

README: _"Automatic alerts when same query pattern detected >5x"_. Threshold tetap (>5) adalah heuristic kasar — N+1 yang terjadi tepat 5x atau kurang (loop kecil di high-traffic endpoint) tidak terdeteksi. Tidak dijelaskan apakah "same query pattern" berbasis normalized SQL (placeholder-replaced) atau literal string match — kalau literal, detection rate akan rendah.

### A3 — MEDIUM: Cron expression parser custom — edge case DST tidak disebutkan

Cron parser disebut _"Full cron expression parser"_ tanpa mention bagaimana parser menghadapi **Daylight Saving Time transition** — kelas bug klasik scheduler custom yang menyebabkan job skip atau run-twice di sekitar pergantian DST.

### A4 — MEDIUM: Connection pooling — tidak ada circuit breaker disclosed

ARCHITECTURE.md §7 menyebut _"Connection pooling (MySQL/PostgreSQL)"_ tapi PRD04 §3.2 _("Test behavior ketika DB down sama sekali")_ menunjukkan ini masih **test case yang diusulkan**, bukan fitur yang sudah diverifikasi punya circuit-breaker/exponential backoff. Tanpa circuit breaker, satu DB outage bisa membuat pool exhausted oleh retry naif (thundering herd terhadap DB yang baru recover).

### A5 — LOW: Cache Inspector "hit rate" — metodologi penghitungan tidak dijelaskan

README menyebut _"hit rate"_ untuk Cache Inspector tanpa menjelaskan window pengukuran (lifetime sejak start? rolling 1 jam?) — angka tanpa window jelas menyesatkan keputusan tuning TTL.

---

## 4. Lensa Basecode / Maintainability (C-series)

### C1 — CRITICAL: Tidak ada source code yang bisa diaudit langsung — klaim tidak terverifikasi by definition

Seluruh repo tidak diupload, hanya dokumentasi. Status default audit brutal: **semua klaim fitur "unverified" sampai kode dilihat langsung**. README mengklaim _"0 known bugs"_ — klaim ini secara definisi tidak bisa true untuk codebase dengan 550+ fitur custom termasuk crypto/parsing kompleks; realistisnya artinya "0 bugs yang _dilaporkan_", bukan "0 bugs yang _ada_". Frasa ini perlu direvisi sebelum dipublikasikan lebih luas — ini false confidence marketing.

### C2 — HIGH: Duplikasi folder di source layout — indikasi merge tanpa review

Folder `search/` dan `storage/` muncul dua kali di pohon direktori ARCHITECTURE.md §2 dengan deskripsi berbeda (v1 generic vs v2 spesifik). Kalau dokumentasi auto-generated dari struktur folder aktual, ini indikasi repo punya folder duplikat/module v1+v2 yang co-exist tanpa migrasi jelas — technical debt nyata, bukan cuma typo dokumentasi.

### C3 — HIGH: Test count tidak rekonsiliasi dengan coverage 97.1% — coverage tinggi dengan assertion lemah?

Audit Volume 6 menemukan test count berbeda 4 cara. Coverage tinggi tidak otomatis berarti aman — line coverage bisa tinggi sementara assertion quality rendah (`expect(result).toBeDefined()` tanpa cek isi). Tidak ada mention mutation testing (Stryker, dll) di TESTING.md/CONTRIBUTING.md — tanpa itu, 97.1% coverage adalah vanity metric yang tidak membuktikan robustness assertion.

### C4 — MEDIUM: CLI Gen 2 men-generate kode produksi otomatis — supply-chain risk internal

_"Schema-driven full CRUD with validation, routes, tests"_ — generator yang menghasilkan kode langsung ke production adalah vektor risiko kalau template-nya sendiri punya bug (satu bug template = ratusan endpoint vulnerable sekaligus di seluruh project yang pakai generator). Tidak ada mention apakah generated code di-lint/typecheck otomatis sebagai bagian command.

### C5 — MEDIUM: TESTING.md sendiri adalah red flag proses

`TESTING.md` adalah template generik yang tidak spesifik ke SpeexJS sama sekali. Dokumen testing generik = tidak ada bukti dokumen itu pernah benar-benar dieksekusi terhadap codebase nyata. Kalau benar dieksekusi, hasil per-fase (sesuai format laporan yang diminta dokumen itu sendiri) seharusnya ada sebagai artifact terpisah — tidak ada satupun di 16 file yang diaudit.

### C6 — LOW: Tidak ada SBOM untuk devDependencies

"Zero runtime dependencies" cuma bicara _runtime_. Framework ini tetap punya devDependencies (vitest, tsup, typescript, dll). Supply-chain attack terhadap devDependency (mis. malicious build plugin) tetap bisa mengompromikan build pipeline meskipun runtime "zero-dep" — klaim keamanan zero-dep tidak membedakan ini secara eksplisit.

---

## 5. Lensa Feature Integrity (F-series) — Skeptisisme terhadap Klaim Marketing

### F1 — HIGH: "550+ fitur" tidak punya definisi unit yang jelas

Tidak ada dokumen yang mendefinisikan apa yang dihitung sebagai "1 fitur" — apakah `hasOne` dan `hasMany` dihitung 2 fitur terpisah meski sama-sama "relation"? Tanpa unit yang jelas, angka 550+ tidak bisa diverifikasi atau dibantah — klasik _vanity metric_.

### F2 — MEDIUM: Benchmark table membandingkan diri dengan Hono/Fastify/Express tanpa metodologi terbuka

Kolom "Features" untuk kompetitor diisi angka generik (_"20+, 30+, 20+"_) tanpa sumber. Perbandingan apple-to-apple hampir mustahil karena filosofi framework yang sangat berbeda (Hono = minimal router, bukan fullstack). Benchmark ini cacat secara metodologi untuk dipakai sebagai marketing claim.

### F3 — INFO: PRD06 (AI-Native) — "RAG Pipeline" tanpa disclosure model/vector DB compatibility

ROADMAP menyebut **Vector Search** dan **RAG Pipeline** sudah _"Already Implemented (foundation)"_, hanya cosine similarity + text chunking in-memory — bukan integrasi vector DB production-grade (pgvector, Pinecone, dll). Untuk klaim "AI-Native Platform", ini foundation minimal yang berisiko tidak scalable melewati toy-project scale, sama seperti A1.

---

## 6. Ringkasan Severity Matrix

| Severity     | Jumlah Temuan                      | Kategori Dominan                                                                    |
| ------------ | ---------------------------------- | ----------------------------------------------------------------------------------- |
| **CRITICAL** | 3 (S1, S2, C1)                     | Hand-rolled crypto/parsing tanpa bukti hardening; tidak ada kode untuk diverifikasi |
| **HIGH**     | 7 (S3, S4, S5, A1, A2, C2, C3, F1) | Custom algoritma tanpa scalability/security disclosure                              |
| **MEDIUM**   | 8 (S6, S7, S8, A3, A4, C4, C5, F2) | Konfigurasi default berisiko, proses QA lemah                                       |
| **LOW/INFO** | 4 (S9, A5, C6, F3)                 | Transparansi & metodologi                                                           |

---

## 7. Remediation Pipeline

### Sprint 1 — Crypto/Parsing Hardening (CRITICAL, blocking release apapun yang klaim "production-ready")

- [ ] **S1**: Publish test report eksplisit per attack class (alg confusion, `alg:none`, JWKS SSRF) untuk `OidcGuard`.
- [ ] **S2**: Implementasi & dokumentasikan mitigasi XSW + replay protection (`InResponseTo` store) untuk `SamlGuard`.
- [ ] **S4**: Tambahkan pernyataan eksplisit di SECURITY.md bahwa seluruh crypto primitif adalah binding `node:crypto`, bukan reimplementasi.
- [ ] **C1**: Hapus/revisi klaim "0 known bugs" di README menjadi "0 _reported_ bugs" atau hapus seluruhnya.

### Sprint 2 — Algorithm Scalability Disclosure (HIGH)

- [ ] **A1**: Dokumentasikan batas wajar jumlah dokumen untuk Search Engine sebelum perlu migrasi ke external index; pertimbangkan trie/BK-tree untuk fuzzy search.
- [ ] **A2**: Buat threshold N+1 detection configurable, bukan hardcoded >5.
- [ ] **S3, S5**: Tambahkan fuzz testing report untuk CBOR parser; dokumentasikan algoritma rate limiter (token bucket vs fixed window) secara eksplisit.

### Sprint 3 — Process & Default-Safety (MEDIUM)

- [ ] **S7**: Pastikan DevTools Dashboard default-off di `NODE_ENV=production`, tambahkan auth guard terpisah.
- [ ] **S6**: Tambahkan confirmation interaktif untuk migration destructive di production meski `--force` dipakai.
- [ ] **C3**: Adopsi mutation testing (mis. Stryker) minimal untuk modul auth/crypto/schema sebagai bukti assertion quality, bukan cuma line coverage.
- [ ] **C5**: Eksekusi TESTING.md secara nyata terhadap codebase, publish laporan sesuai format yang diminta dokumen itu sendiri sebagai artifact terpisah (`TEST_REPORT_v2.1.1.md`).

### Sprint 4 — Marketing Claim Integrity (LOW/INFO, tapi reputational risk)

- [ ] **F1**: Definisikan unit "1 fitur" secara eksplisit atau turunkan klaim jadi range/kategori yang lebih honest.
- [ ] **F2**: Hapus atau footnote tabel benchmark kompetitor sampai ada metodologi terbuka & reproducible benchmark script.
- [ ] **S9**: Tambahkan `security.txt` dan SBOM (termasuk devDependencies) untuk transparansi penuh.

---

## 8. Catatan Metodologis (Wajib Dibaca Sebelum Bertindak)

Audit ini **tidak bisa menggantikan code review/pentest langsung terhadap source code**. Semua temuan di atas adalah **hipotesis berbasis red-flag dari klaim dokumentasi**, bukan bukti eksploitasi langsung (tidak ada PoC yang dijalankan karena tidak ada kode). Prioritas nyata harus ditentukan setelah source code di-review langsung — PRD ini berfungsi sebagai **daftar pertanyaan wajib dijawab dengan bukti konkret** (test report, fuzz result, security audit eksternal) sebelum klaim "production-ready, 0 known bugs, zero dependencies = secure" bisa dipertanggungjawabkan secara profesional.

## 9. Acceptance Criteria

- [ ] Setiap item CRITICAL (S1, S2, C1) punya bukti tertulis (test report/PoC defense) sebelum versi berikutnya dipublish ke npm.
- [ ] SECURITY.md direvisi untuk menjelaskan boundary "zero-dependency" secara presisi (runtime vs build-time vs reimplementasi algoritma).
- [ ] README tidak lagi memuat klaim absolut yang tidak bisa diverifikasi ("0 known bugs") tanpa kualifikasi.
- [ ] Ada minimal satu external/independent security review terhadap modul `SamlGuard`, `OidcGuard`, dan `WebAuthn` sebelum modul-modul ini direkomendasikan untuk enterprise production use.
