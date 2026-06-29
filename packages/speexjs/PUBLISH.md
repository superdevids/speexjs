# Publishing

Guide to publishing **SpeexJS** to npm.

## Prerequisites

```bash
npm login
npm whoami        # verify you are logged in
```

## Step-by-Step

```bash
# 1. Build
npm run build

# 2. Bump version
npm version patch -m "chore: bump version to %s"

# 3. Verify
npm pack --dry-run

# 4. Publish
npm publish
```

## Semantic Versioning

| Command | Effect |
|---------|--------|
| `npm version patch` | Bug fix (0.0.x) |
| `npm version minor` | New feature (0.x.0) |
| `npm version major` | Breaking change (x.0.0) |

## Dist Tags

```bash
npm publish --tag beta       # speexjs@beta
npm publish --tag alpha      # speexjs@alpha
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `403 Forbidden` | Check access & login |
| `402 Payment Required` | Set up 2FA |
| `Package name exists` | Bump version |
| Build error | Fix TypeScript errors |

## Rollback

Use deprecate instead of unpublish (unless within 72 hours):

```bash
npm deprecate speexjs@0.6.0 "Critical bug. Upgrade to 0.6.1"
```
