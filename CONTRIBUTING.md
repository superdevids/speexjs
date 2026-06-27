# Contributing to jscore

## Setup Development

```bash
pnpm install
pnpm build
pnpm test

# Extension development
pnpm ext:install
pnpm ext:compile
```

## Adding a New Function

1. Add the function in the appropriate module under `packages/core/src/`
2. Export it from the module's `index.ts`
3. Add comprehensive tests in the corresponding `__tests__/` file
4. Run `pnpm test` to verify everything passes
5. Run `pnpm build` to confirm the build succeeds

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
2. Make your changes and ensure `pnpm build && pnpm test` passes
3. Run `pnpm changeset` to create a changeset describing your changes
4. Commit using conventional commit format
5. Open a PR against `main` with a clear title and description
6. Wait for CI checks to pass before merging

## Changeset

Always run `pnpm changeset` for any user-facing change. This generates a markdown file that documents what changed and which packages are affected. The CI pipeline will use these to generate changelogs and version bumps.
