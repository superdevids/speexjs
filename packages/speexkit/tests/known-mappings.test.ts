import { describe, it, expect } from 'vitest'
import { KNOWN_MAPPINGS, KNOWN_CVES } from '../src/dep-exray/known-mappings.js'

describe('KNOWN_MAPPINGS', () => {
  it('should have at least one entry', () => {
    expect(KNOWN_MAPPINGS.length).toBeGreaterThan(0)
  })

  it('each entry should have all required properties', () => {
    for (const mapping of KNOWN_MAPPINGS) {
      expect(mapping).toHaveProperty('name')
      expect(mapping).toHaveProperty('size')
      expect(mapping).toHaveProperty('replacement')
      expect(mapping).toHaveProperty('confidence')
      expect(mapping).toHaveProperty('autoPrReady')
      expect(mapping).toHaveProperty('reason')
      expect(mapping).toHaveProperty('detectionPattern')

      expect(typeof mapping.name).toBe('string')
      expect(mapping.name.length).toBeGreaterThan(0)

      expect(typeof mapping.size).toBe('string')
      expect(mapping.size.length).toBeGreaterThan(0)

      expect(typeof mapping.replacement).toBe('string')
      expect(mapping.replacement.length).toBeGreaterThan(0)

      expect(['high', 'medium', 'low']).toContain(mapping.confidence)

      expect(typeof mapping.autoPrReady).toBe('boolean')

      expect(typeof mapping.reason).toBe('string')
      expect(mapping.reason.length).toBeGreaterThan(0)

      expect(typeof mapping.detectionPattern).toBe('string')
      expect(mapping.detectionPattern.length).toBeGreaterThan(0)
    }
  })

  it('each detectionPattern should be a valid regex', () => {
    for (const mapping of KNOWN_MAPPINGS) {
      expect(() => new RegExp(mapping.detectionPattern)).not.toThrow()
      const regex = new RegExp(mapping.detectionPattern)
      expect(regex).toBeInstanceOf(RegExp)
    }
  })

  it('each detectionPattern should match its package name in import statements', () => {
    for (const mapping of KNOWN_MAPPINGS) {
      const regex = new RegExp(mapping.detectionPattern)
      const importFrom = `import something from '${mapping.name}'`
      expect(regex.test(importFrom)).toBe(true)
      if (mapping.name !== 'lodash.merge') {
        const requireCall = `const x = require('${mapping.name}')`
        expect(regex.test(requireCall)).toBe(true)
      }
    }
  })

  it('confidence values should be consistent with autoPrReady', () => {
    for (const mapping of KNOWN_MAPPINGS) {
      if (mapping.confidence === 'high') {
        expect(mapping.autoPrReady).toBe(true)
      }
    }
  })
})

describe('KNOWN_CVES', () => {
  it('should have at least one entry', () => {
    expect(Object.keys(KNOWN_CVES).length).toBeGreaterThan(0)
  })

  it('each CVE entry should have correct structure', () => {
    for (const [packageName, cves] of Object.entries(KNOWN_CVES)) {
      expect(typeof packageName).toBe('string')
      expect(Array.isArray(cves)).toBe(true)
      expect(cves.length).toBeGreaterThan(0)

      for (const cve of cves) {
        expect(cve).toHaveProperty('cve')
        expect(cve).toHaveProperty('severity')
        expect(cve).toHaveProperty('fix')

        expect(typeof cve.cve).toBe('string')
        expect(cve.cve).toMatch(/^CVE-\d{4}-\d+$/)

        expect(['critical', 'high', 'medium', 'low']).toContain(cve.severity)

        expect(typeof cve.fix).toBe('string')
        expect(cve.fix.length).toBeGreaterThan(0)
      }
    }
  })

  it('all CVE entries should have a valid CVE ID format', () => {
    for (const cves of Object.values(KNOWN_CVES)) {
      for (const cve of cves) {
        expect(cve.cve).toMatch(/^CVE-\d{4}-\d+$/)
      }
    }
  })
})
