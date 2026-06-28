# Security Policy — ConstX

> **Bahasa Indonesia** · *English version below*

---

## Bahasa Indonesia

### Melaporkan Kerentanan Keamanan

Kami sangat serius dalam menangani keamanan ConstX. Jika Anda menemukan kerentanan keamanan, harap laporkan dengan **responsible disclosure**:

**JANGAN** melaporkan kerentanan keamanan melalui GitHub Issues publik.

**Cara melaporkan:**

1. Kirim email ke **`keamanan@ConstX.org`** (kode: `[SECURITY]`)
2. Sertakan informasi berikut:
   - Deskripsi kerentanan
   - Langkah-langkah reproduksi
   - Versi ConstX yang terpengaruh
   - Dampak potensial
   - Saran perbaikan (jika ada)

3. Kami akan merespon dalam **48 jam** untuk mengkonfirmasi penerimaan laporan.
4. Kami akan bekerja sama dengan Anda untuk memahami dan memperbaiki masalah.
5. Setelah fix dirilis, kami akan mengumumkannya di release notes.

### Kebijakan Keamanan

#### Versi yang Didukung

| Versi | Dukungan Keamanan |
|---|---|
| 0.2.x | ✅ Active |
| 0.1.x | ⚠️ Limited |
| < 0.1.0 | ❌ Tidak didukung |

#### Cakupan Keamanan

Area berikut termasuk dalam scope keamanan ConstX:

- **Server**: Request validation, CSRF protection, helmet headers, session security, rate limiting
- **Auth**: Password hashing (scrypt/PBKDF2), token management, session hijacking prevention
- **Schema**: Input validation untuk mencegah injection attack
- **Crypto**: AES-256-GCM encryption, constant-time comparison, secure random generation
- **Database**: SQL injection prevention via parameterized queries
- **Storage**: Path traversal prevention, file upload validation
- **Dependencies**: Zero runtime dependencies — mengurangi attack surface

#### Di Luar Cakupan

- Aplikasi yang dibangun menggunakan ConstX (keamanan aplikasi adalah tanggung jawab pengembang)
- Plugin atau ekstensi pihak ketiga
- Versi yang sudah tidak didukung

### Responsible Disclosure

Kami mengikuti prinsip responsible disclosure:

1. **Lapor dulu** — jangan publikasikan kerentanan sebelum ada fix.
2. **Beri waktu** — kami butuh waktu untuk memperbaiki (biasanya 30-90 hari tergantung kompleksitas).
3. **Kerja sama** — kami akan melibatkan Anda dalam proses perbaikan jika Anda menginginkannya.
4. **Kredit** — kami akan mencantumkan nama Anda di release notes (jika diizinkan).

#### Yang Tidak Kami Anjurkan

- Mengeksploitasi kerentanan untuk tujuan selain verifikasi
- Mengakses data pengguna lain
- Merusak atau mengganggu layanan
- Mempublikasikan kerentanan sebelum ada perbaikan

### Kontak

| Kanal | Detail |
|---|---|
| Email | `keamanan@ConstX.org` |
| Subjek | `[SECURITY]` + deskripsi singkat |
| Enkripsi | PGP key tersedia di `https://ConstX.org/security/pgp` |
| Respons | 48 jam untuk konfirmasi |

---

## English

### Reporting Security Vulnerabilities

We take the security of ConstX seriously. If you discover a security vulnerability, please follow **responsible disclosure**:

**DO NOT** report security vulnerabilities via public GitHub Issues.

**How to report:**

1. Email us at **`keamanan@ConstX.org`** with subject prefix `[SECURITY]`
2. Include:
   - Vulnerability description
   - Reproduction steps
   - Affected versions
   - Potential impact
   - Suggested fix (if any)

3. We will respond within **48 hours** to acknowledge receipt.
4. We will work with you to understand and fix the issue.
5. After a fix is released, we will announce it in release notes.

### Supported Versions

| Version | Security Support |
|---|---|
| 0.2.x | ✅ Active |
| 0.1.x | ⚠️ Limited |
| < 0.1.0 | ❌ Unsupported |

### Security Scope

- **Server**: Request validation, CSRF, Helmet, session security, rate limiting
- **Auth**: scrypt/PBKDF2 password hashing, token management
- **Schema**: Input validation against injection attacks
- **Crypto**: AES-256-GCM, constant-time comparison, secure random
- **Database**: Parameterized queries prevent SQL injection
- **Storage**: Path traversal prevention
- **Dependencies**: Zero runtime dependencies = minimal attack surface

### Responsible Disclosure

1. **Report first** — do not publish before a fix is available.
2. **Allow time** — we typically need 30-90 days depending on complexity.
3. **Collaborate** — we will involve you in the fix process if desired.
4. **Credit** — we will acknowledge your report in release notes (with permission).

### Contact

| Channel | Detail |
|---|---|
| Email | `keamanan@ConstX.org` |
| Subject | `[SECURITY]` + brief description |
| PGP | Available at `https://ConstX.org/security/pgp` |
| Response | Within 48 hours |
