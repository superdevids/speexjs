import { describe, it, expect } from 'vitest'
import { generateReport } from '../src/reporter/index.js'
import type { ScanResult } from '../src/types.js'

function makeMockResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    projectName: 'test-project',
    directDeps: 5,
    transitiveDeps: 20,
    totalEstimatedSize: '2.3 MB',
    highImpactReplacements: [
      {
        packageName: 'lodash',
        reason: 'Most lodash functions have direct replacements in @jscore/core',
        replacement: '@jscore/core',
        estimatedSizeReduction: '4.2 MB → 5 KB',
        confidence: 'high',
        autoPrReady: true,
      },
    ],
    mediumImpactReplacements: [
      {
        packageName: 'axios',
        reason: 'Native fetch covers most use cases',
        replacement: 'native fetch + @jscore/core/async/retry',
        estimatedSizeReduction: '1.6 MB → 5 KB',
        confidence: 'medium',
        autoPrReady: false,
      },
    ],
    securityIssues: [
      {
        packageName: 'lodash',
        cveId: 'CVE-2020-28502',
        severity: 'high',
        fix: 'Update to lodash@4.17.21 or later',
      },
    ],
    ...overrides,
  }
}

describe('generateReport', () => {
  it('should contain the project name in the output', () => {
    const result = makeMockResult()
    const output = generateReport(result)
    expect(output).toContain('test-project')
  })

  it('should contain dependency counts in the output', () => {
    const result = makeMockResult()
    const output = generateReport(result)
    expect(output).toContain('5')
    expect(output).toContain('20')
  })

  it('should contain total estimated size in the output', () => {
    const result = makeMockResult()
    const output = generateReport(result)
    expect(output).toContain('2.3 MB')
  })

  it('should contain high impact replacement details', () => {
    const result = makeMockResult()
    const output = generateReport(result)
    expect(output).toContain('lodash')
    expect(output).toContain('@jscore/core')
    expect(output).toContain('HIGH IMPACT')
  })

  it('should contain medium impact replacement details', () => {
    const result = makeMockResult()
    const output = generateReport(result)
    expect(output).toContain('axios')
    expect(output).toContain('MEDIUM IMPACT')
  })

  it('should contain security issue details', () => {
    const result = makeMockResult()
    const output = generateReport(result)
    expect(output).toContain('CVE-2020-28502')
    expect(output).toContain('SECURITY')
  })

  it('should return valid JSON when jsonOutput is true', () => {
    const result = makeMockResult()
    const output = generateReport(result, true)
    const parsed = JSON.parse(output)
    expect(parsed.projectName).toBe('test-project')
    expect(parsed.directDeps).toBe(5)
    expect(parsed.transitiveDeps).toBe(20)
    expect(parsed.totalEstimatedSize).toBe('2.3 MB')
    expect(parsed.highImpactReplacements).toHaveLength(1)
    expect(parsed.mediumImpactReplacements).toHaveLength(1)
    expect(parsed.securityIssues).toHaveLength(1)
  })

  it('should handle empty replacements gracefully', () => {
    const result = makeMockResult({
      highImpactReplacements: [],
      mediumImpactReplacements: [],
      securityIssues: [],
    })
    const output = generateReport(result)
    expect(output).toContain('test-project')
    expect(output).not.toContain('HIGH IMPACT')
    expect(output).not.toContain('MEDIUM IMPACT')
    expect(output).not.toContain('SECURITY')
  })

  it('should handle empty replacements in JSON output', () => {
    const result = makeMockResult({
      highImpactReplacements: [],
      mediumImpactReplacements: [],
      securityIssues: [],
    })
    const output = generateReport(result, true)
    const parsed = JSON.parse(output)
    expect(parsed.highImpactReplacements).toHaveLength(0)
    expect(parsed.mediumImpactReplacements).toHaveLength(0)
    expect(parsed.securityIssues).toHaveLength(0)
  })

  it('should return a non-empty string', () => {
    const result = makeMockResult()
    const output = generateReport(result)
    expect(typeof output).toBe('string')
    expect(output.length).toBeGreaterThan(0)
  })
})
