import * as assert from 'assert'
import { runBuiltinScan } from '../scanner'

suite('Extension Tests', () => {
  test('Built-in scanner should detect known packages', () => {
    const result = runBuiltinScan(__dirname + '/../../test-fixtures/package.json')
    assert.ok(result.directDeps > 0)
    assert.ok(result.highImpactReplacements.length > 0)
    assert.strictEqual(result.highImpactReplacements[0].packageName, 'lodash')
  })

  test('Built-in scanner should return security issues for known CVEs', () => {
    const result = runBuiltinScan(__dirname + '/../../test-fixtures/package.json')
    const lodashCves = result.securityIssues.filter(i => i.packageName === 'lodash')
    assert.ok(lodashCves.length > 0)
    assert.ok(lodashCves.some(i => i.cveId.startsWith('CVE-')))
  })

  test('Built-in scanner should return size estimate', () => {
    const result = runBuiltinScan(__dirname + '/../../test-fixtures/package.json')
    assert.ok(result.totalEstimatedSize.length > 0)
  })
})
