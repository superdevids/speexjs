# 📦 Publishing Guide

## Prerequisites

```bash
# 1. Login ke npm (sekali doang)
npm login

# 2. Set NPM_TOKEN di GitHub Secrets (buat auto-publish CI)
#    Settings → Secrets and variables → Actions → New repository secret
#    Name: NPM_TOKEN
#    Value: dapatkan dari npm token: https://www.npmjs.com/settings/~/tokens
```

---

## 🚀 Manual Publish (Full)

Jalanin satu per satu:

```bash
# 1. Build & test
pnpm build
pnpm test

# 2. Create changeset (pilih jenis perubahan)
pnpm changeset

# 3. Bump version
pnpm ci:version

# 4. Build ulang setelah version bump
pnpm build

# 5. Publish ke npm
pnpm ci:publish
```

## ⚡ Quick Publish (Patch)

```bash
pnpm build && pnpm test && pnpm changeset && pnpm ci:version && pnpm build && pnpm ci:publish
```

## 🤖 Auto-Publish (CI/CD)

Sudah setup otomatis di `.github/workflows/publish.yml`:

1. Push ke `main` → otomatis deteksi changeset → publish
2. **Syarat:** Tambahin `NPM_TOKEN` di GitHub Secrets

---

## 🖥️ VS Code Extension

```bash
# Package
cd extensions/vscode-dep-exray
npx vsce package

# Publish ke Marketplace (butuh publisher key)
npx vsce publish

# Atau install manual dari .vsix
# VS Code → Extensions → ... → Install from VSIX
```

---

## ✅ Checklist Pre-Publish

- [ ] `pnpm build` — sukses
- [ ] `pnpm test` — 428 tests pass
- [ ] `npm login` — sudah login
- [ ] Git commit — semua perubahan ter-commit
- [ ] GitHub Secrets — `NPM_TOKEN` terisi
