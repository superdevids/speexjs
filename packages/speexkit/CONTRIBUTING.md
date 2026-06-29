# Contributing - SpeexKit

## Setup

```bash
cd packages/speex
npm install
npm run build
npm test
npm run lint
```

## Standards

- TypeScript strict mode
- Zero runtime dependencies
- JSDoc with @param, @returns, @example for all exports
- Biome linter: 2-space indent, 120 width, single quotes
- Tests required before committing

## Adding a Module

1. Create src/<module>/ with index.ts
2. Add entry to tsup.config.ts
3. Add export path to package.json
4. Write tests in tests/<module>.test.ts
5. Run npm run build && npm test
6. Update SUMMARY.md

## PR Process

- Branch from master
- Use Conventional Commits (feat:, fix:, docs:, etc.)
- Ensure npm run build && npm test passes
- Open PR with clear description
