# Panduan Publishing

## Prasyarat

```bash
npm login
```

## Cara Publish constx-core

```bash
cd packages/core

# 1. Build
npx tsup

# 2. Test (828 tests)
npx vitest run

# 3. Bump version
npm version patch
# atau: npm version minor
# atau: npm version major

# 4. Build ulang setelah version bump
npx tsup

# 5. Publish ke npm
npm publish

# 6. Commit dan push ke GitHub
cd ../..
git add -A
git commit -m "chore: bump ke v$(node -p \"require('./packages/core/package.json').version\")"
git push origin master
```

## Checklist Sebelum Publish

- [ ] `npx tsup` — build sukses
- [ ] `npx vitest run` — 828 tests pass
- [ ] `npm login` — udah login
- [ ] Changelog udah diupdate
- [ ] README udah sesuai
- [ ] Git commit — semua perubahan ter-commit
