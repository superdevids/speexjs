# Contributing — speexkit

## Setup
`ash
cd packages/speexkit
npm install
npm run build
npm test
npm run lint
`

## Standards
- TypeScript strict mode
- Zero runtime dependencies
- JSDoc with @param, @returns, @example for all exports
- Biome linter: 2-space indent, 120 width, single quotes
- Tests required: 
pm test before committing

## Adding a Module
1. Create src/<module>/ with index.ts
2. Add entry to 	sup.config.ts
3. Add export path to package.json
4. Write tests in 	ests/<module>.test.ts
5. Run 
pm run build && npm test
6. Update SUMMARY.md

## PR Process
- Branch from master
- Conventional Commits (feat:, fix:, docs:, etc.)
- Ensure 
pm run build && npm test passes
- Open PR with clear description
