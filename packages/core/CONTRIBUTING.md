# Kontribusi ke speexjs-core

## Setup Development

```bash
cd packages/core
npm install
npx tsup
npx vitest run
```

## Cara Nambah Fungsi Baru

1. Tambah fungsi di module yang sesuai `packages/core/src/<module>/`
2. Export dari `index.ts` module tersebut
3. Tambah test di `packages/core/tests/`
4. Jalankan `npx vitest run` (828 tests harus passing)
5. Jalankan `npx tsup` biar build sukses
6. Update `SUMMARY.md` sama `README.md`

## Module yang Tersedia

| Module | Lokasi |
|--------|--------|
| core | `src/core/` |
| math | `src/math/` |
| date | `src/date/` |
| collection | `src/collection/` |
| string | `src/string/` |
| async | `src/async/` |
| io | `src/io/` |
| type | `src/type/` |
| crypto | `src/crypto/` |
| path | `src/path/` |
| color | `src/color/` |
| validation | `src/validation/` |
| error | `src/error/` |
| logger | `src/logger/` |
| dep-exray | `src/dep-exray/` |

## Aturan Commit

Pake [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): nambah deepMerge function
fix(math): benerin floating point rounding
docs: update README
```

## Pull Request

1. Bikin branch dari `master`
2. Pastikan `npx tsup && npx vitest run` lolos
3. Buka PR ke `master` dengan judul dan deskripsi jelas
