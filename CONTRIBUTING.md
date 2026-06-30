# Contributing

Thank you for considering contributing to **SpeexJS**!

## Bug Reports & Feature Requests

- Report bugs via [GitHub Issues](https://github.com/superdevids/speexjs/issues)
- Use the available templates
- Include SpeexJS version, Node.js version, OS, and reproduction code

## Pull Requests

1. Fork & clone the repo
2. Create a branch: `feat/name` or `fix/name`
3. Follow the coding standards
4. Write tests and ensure all pass (`npm test`)
5. Use [Conventional Commits](https://www.conventionalcommits.org/)
6. Push and open a PR against the `master` branch

## Development Setup

```bash
git clone https://github.com/superdevids/speexjs.git
cd speexjs
npm install
npm run build
npm test
```

## Coding Standards

- **TypeScript strict** — no `any`, use `unknown`
- **Zero runtime dependencies** — all native
- **Tests** — Vitest, minimum 80% coverage
- **Format** — Biome (2 spaces, single quotes, semicolons)
- **Files** — kebab-case, classes PascalCase, functions camelCase
- **Imports** — use `speexjs/*` paths, e.g. `from 'speexjs/server'`

## Structure

```
speexjs/
├── src/
│   ├── schema/     # Validation
│   ├── server/     # Server framework
│   ├── client/     # Client framework
│   ├── rpc/        # Type-safe RPC
│   ├── cli/        # CLI commands
│   └── native/     # Core helpers (zero-dep)
└── tests/
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
