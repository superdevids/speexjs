# Panduan Publishing ConstX ke npm

> Panduan lengkap untuk mempublikasikan package ConstX ke npm registry.

---

## Daftar Isi

- [Prerequisites](#prerequisites)
- [Build](#build)
- [Update Versi](#update-versi)
- [Publishing ConstX](#publishing-ConstX)
- [Verifikasi](#verifikasi)
- [Menangani Error Publish](#menangani-error-publish)
- [Rollback](#rollback)
- [Checklist Publikasi](#checklist-publikasi)

---

## Prerequisites

Sebelum melakukan publish, pastikan hal-hal berikut sudah siap:

### 1. npm Account

```bash
# Login ke npm
npm login

# Verifikasi status login
npm whoami
```

Pastikan Anda memiliki akses publish ke package `ConstX`:

```bash
# Cek akses
npm access ls-collaborators ConstX
```

### 2. Build Siap

```bash
# Bersihkan hasil build sebelumnya
npm run clean  # jika ada, atau hapus manual: rm -rf dist/

# Build production
npm run build

# Verifikasi build berhasil
ls dist/
# Harus ada: index.js, index.d.ts, server/, client/, schema/, rpc/, cli/
```

### 3. Test Lulus

```bash
# Jalankan semua test
npm test

# Test coverage
npm run test:coverage

# Type checking
npm run typecheck
```

### 4. Git Clean

```bash
# Pastikan tidak ada perubahan yang belum di-commit
git status

# Pastikan Anda di branch main
git branch

# Pastikan branch main sudah update
git pull origin main
```

---

## Update Versi

ConstX mengikuti [Semantic Versioning](https://semver.org/):

| Command | Efek | Contoh |
|---|---|---|
| `npm version patch` | Perbaikan bug (0.0.x) | 0.2.0 → 0.2.1 |
| `npm version minor` | Fitur baru backward-compatible (0.x.0) | 0.2.0 → 0.3.0 |
| `npm version major` | Perubahan breaking (x.0.0) | 0.2.0 → 1.0.0 |

### Cara Update Versi

**Otomatis (recommended):**

```bash
# Patch (bug fix)
npm version patch -m "chore: bump version to %s"

# Minor (fitur baru)
npm version minor -m "chore: bump version to %s"

# Major (breaking changes)
npm version major -m "chore: bump version to %s"
```

Perintah di atas akan:
1. Update `version` di `package.json`
2. Membuat git commit dengan pesan yang diberikan (`%s` diganti dengan versi baru)
3. Membuat git tag (contoh: `v0.3.0`)

**Manual:**

```bash
# Edit package.json secara manual
# lalu commit dan tag
git add package.json
git commit -m "chore: bump version to 0.3.0"
git tag v0.3.0
```

---

## Publishing ConstX

### Step-by-step

```bash
# 1. Masuk ke package ConstX
cd packages/ConstX

# 2. Update versi
npm version patch -m "chore: bump version to %s"

# 3. Build
npm run build

# 4. Verifikasi file yang akan dipublish
npm pack --dry-run
# Periksa daftar file — hanya direktori dist/ yang boleh masuk

# 5. Publish ke npm
npm publish
```

### Publishing Tag Khusus

```bash
# Publish dengan tag beta
npm publish --tag beta

# Install dengan tag beta
npm install ConstX@beta

# Publish dengan tag alpha
npm publish --tag alpha

# Publish dengan tag next (untuk prerelease)
npm version prepatch --preid alpha
npm publish --tag next
```

### Publish dari GitHub Actions (CI/CD)

```yaml
# .github/workflows/publish.yml (contoh)
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org/
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Verifikasi

Setelah publish, verifikasi bahwa package terpublish dengan benar:

```bash
# Cek versi terbaru di npm
npm view ConstX version

# Cek detail package
npm view ConstX

# Coba install di project kosong
cd /tmp
mkdir test-publish
cd test-publish
npm init -y
npm install ConstX
node -e "const sjs = require('ConstX'); console.log(Object.keys(sjs))"

# Cek bahwa file dist ada
npm pack ConstX
tar -xzf ConstX-*.tgz
ls package/
```

---

## Menangani Error Publish

### 1. `403 Forbidden` — Tidak Punya Akses

```
npm ERR! 403 403 Forbidden
npm ERR! You do not have permission to publish "ConstX"
```

**Solusi:**

```bash
# Cek siapa yang login
npm whoami

# Cek collaborators
npm access ls-collaborators ConstX

# Minta akses dari maintainer: superdevids
```

### 2. `402 Payment Required` — 2FA Belum Aktif

```
npm ERR! 402 Payment Required
npm ERR! This package requires 2FA
```

**Solusi:**

```bash
# Enable 2FA di akun npm (web)
# atau generate OTP
npm publish --otp=123456
```

### 3. `403 Forbidden` — Package Name Sama

```
npm ERR! 403 Forbidden
npm ERR! Package name already exists
```

**Solusi:**

- Update versi (tidak boleh publish versi yang sama)
- Atau ubah nama package di `package.json`

### 4. Build Error

```
Error: src/xxx.ts(1,1): error TS...
```

**Solusi:**

```bash
# Debug dengan melihat error lengkap
npm run build 2>&1

# Perbaiki error, lalu publish ulang
```

### 5. Test Failed

```
FAIL  tests/xxx.test.ts
```

**Solusi:**

- Jangan publish jika test gagal
- Perbaiki test atau kode yang rusak
- Pastikan semua test lulus sebelum publish

### 6. Git Tag Conflict

```
fatal: tag 'v0.2.0' already exists
```

**Solusi:**

```bash
# Hapus tag lokal
git tag -d v0.2.0

# Hapus tag remote (jika ada)
git push origin :refs/tags/v0.2.0
```

### 7. Unpublished Package

Jika terpaksa harus unpublish (dalam 72 jam):

```bash
npm unpublish ConstX@0.2.0 --force
```

> **Catatan:** npm memiliki kebijakan ketat tentang unpublish. Hanya versi tertentu dalam 72 jam ke belakang yang bisa di-unpublish. Jika melebihi 72 jam, buat versi baru dengan deprecation warning:

```bash
npm deprecate ConstX@0.2.0 "Versi ini mengandung bug kritis. Gunakan >=0.2.1"
```

---

## Rollback

Jika publish menyebabkan masalah, langkah yang disarankan:

1. **Jangan unpublish** jika lebih dari 72 jam — gunakan `npm deprecate`.
2. **Buat patch baru** dengan perbaikan.
3. **Update dokumentasi** jika ada perubahan API.

```bash
# Deprecate versi bermasalah
npm deprecate ConstX@0.2.0 "Versi ini bermasalah. Upgrade ke 0.2.1"

# Buat fix
git checkout -b fix/rollback-fix
# ... perbaiki kode ...
git commit -m "fix: rollback fix untuk masalah di v0.2.0"
git checkout main
git merge fix/rollback-fix
npm version patch
npm publish
```

---

## Checklist Publikasi

Sebelum publish, pastikan checklist berikut terpenuhi:

- [ ] Semua test lulus (`npm test`)
- [ ] Type checking bersih (`npm run typecheck`)
- [ ] Build berhasil (`npm run build`)
- [ ] Versi sudah diupdate (`npm version`)
- [ ] Git tag sudah dibuat
- [ ] Commit sudah di-push ke remote
- [ ] `npm pack --dry-run` menunjukkan file yang benar
- [ ] Sudah login ke npm (`npm whoami`)
- [ ] 2FA code sudah siap (jika diperlukan)
- [ ] Dokumentasi sudah update (README, CHANGELOG)
- [ ] Tidak ada secrets atau credentials di file yang dipublish

---

## Troubleshooting Cepat

| Masalah | Solusi |
|---|---|
| `npm ERR! 403` | Cek akses dan login |
| `npm ERR! 402` | Setup 2FA |
| `build failed` | Perbaiki error TypeScript |
| `test failed` | Perbaiki test |
| `version exists` | Bump versi lagi |
| `wrong files` | Cek `files` di `package.json` dan `.npmignore` |
| `git tag conflict` | Hapus tag lama |

---

> **Catatan:** Package `ConstX` sudah dikonfigurasi dengan `"publishConfig": { "access": "public" }` dan `"files": ["dist"]`, jadi hanya folder `dist/` yang akan dipublish ke npm.
