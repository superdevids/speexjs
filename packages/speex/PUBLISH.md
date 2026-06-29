# Publishing — speex-kit

`ash
npm login
npm version patch # or minor / major
npm run build
npm run test:coverage
npm publish
git push origin master --tags
`

## Checklist
- [ ] npm run lint && npm run typecheck
- [ ] npm run build
- [ ] npm run test:coverage
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] npm login verified
