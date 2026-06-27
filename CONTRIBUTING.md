# Contributing to superjs

## Setup Development

```bash
cd packages/core
npm install
npx tsup
npx vitest run
```

## Adding a New Function

1. Add the function in the appropriate module under `packages/core/src/`
2. Export it from the module's `index.ts`
3. Add comprehensive tests in the corresponding `tests/` file
4. Run `npx vitest run` to verify everything passes
5. Run `npx tsup` to confirm the build succeeds

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature (triggers a minor version bump)
- `fix:` — bug fix (triggers a patch version bump)
- `docs:` — documentation only
- `chore:` — maintenance tasks (no version bump)
- `refactor:` — code restructuring (no version bump)
- `test:` — adding or updating tests (no version bump)

Examples:

```
feat(core): add deepMerge function
fix(dep-exray): handle circular dependencies in scanner
docs: update README with new API examples
```

## Pull Request Process

1. Create a branch from `main` with a descriptive name
2. Make your changes and ensure `npx tsup && npx vitest run` passes
3. Commit using conventional commit format
4. Open a PR against `main` with a clear title and description
5. Wait for CI checks to pass before merging
