# Publishing Guide

## Prerequisites

```bash
npm login
```

## Publish superjs-core

```bash
cd packages/core

# 1. Build & test
npx tsup
npx vitest run

# 2. Bump version (manual di package.json)
#    ubah "version" field

# 3. Build ulang
npx tsup

# 4. Publish
npm publish
```

## Checklist Pre-Publish

- [ ] `npx tsup` — sukses
- [ ] `npx vitest run` — 428 tests pass
- [ ] `npm login` — sudah login
- [ ] Git commit — semua perubahan ter-commit
