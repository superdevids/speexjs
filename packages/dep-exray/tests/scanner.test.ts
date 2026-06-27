import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { scanProject } from '../src/scanner/index.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'dep-exray-test-'))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

function writePackageJson(dir: string, deps: Record<string, string> = {}, devDeps: Record<string, string> = {}) {
  const pkg = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: deps,
    devDependencies: devDeps,
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2))
}

function writeLockfile(dir: string, transitiveDeps: string[] = []) {
  const packages: Record<string, { version: string }> = {}
  for (const dep of transitiveDeps) {
    packages[`node_modules/${dep}`] = { version: '1.0.0' }
  }
  const lock = {
    name: 'test-project',
    lockfileVersion: 3,
    packages,
  }
  writeFileSync(join(dir, 'package-lock.json'), JSON.stringify(lock, null, 2))
}

function writeSourceFile(dir: string, subdir: string, filename: string, content: string) {
  const fullDir = join(dir, subdir)
  mkdirSync(fullDir, { recursive: true })
  writeFileSync(join(fullDir, filename), content)
}

describe('scanProject', () => {
  it('should return scan result for a project with dependencies', async () => {
    writePackageJson(tmpDir, { lodash: '^4.17.21', moment: '^2.29.4' })
    writeLockfile(tmpDir, ['some-transitive-dep'])
    writeSourceFile(tmpDir, 'src', 'index.ts', `import _ from 'lodash'\nconst x = _.join([1,2], '-')`)

    const result = await scanProject({ path: tmpDir })

    expect(result.projectName).toBe('test-project')
    expect(result.directDeps).toBe(2)
    expect(result.transitiveDeps).toBeGreaterThanOrEqual(1)
    expect(result.totalEstimatedSize).toBeTruthy()
    expect(Array.isArray(result.highImpactReplacements)).toBe(true)
    expect(Array.isArray(result.mediumImpactReplacements)).toBe(true)
    expect(Array.isArray(result.securityIssues)).toBe(true)
  })

  it('should detect high-impact replacements for known packages', async () => {
    writePackageJson(tmpDir, { lodash: '^4.17.21' })
    writeSourceFile(tmpDir, 'src', 'index.ts', `import _ from 'lodash'`)

    const result = await scanProject({ path: tmpDir })

    const lodashReplacement = result.highImpactReplacements.find(r => r.packageName === 'lodash')
    expect(lodashReplacement).toBeTruthy()
    expect(lodashReplacement!.confidence).toBe('high')
    expect(lodashReplacement!.replacement).toContain('@jscore/core')
  })

  it('should detect security issues for packages with known CVEs', async () => {
    writePackageJson(tmpDir, { lodash: '^4.17.21' })
    writeSourceFile(tmpDir, 'src', 'index.ts', `import _ from 'lodash'`)

    const result = await scanProject({ path: tmpDir })

    expect(result.securityIssues.length).toBeGreaterThan(0)
    const lodashIssue = result.securityIssues.find(i => i.packageName === 'lodash')
    expect(lodashIssue).toBeTruthy()
    expect(lodashIssue!.cveId).toMatch(/^CVE-\d{4}-\d+$/)
  })

  it('should return empty replacements for project with no known deps', async () => {
    writePackageJson(tmpDir, { 'some-unknown-pkg': '^1.0.0' })
    writeSourceFile(tmpDir, 'src', 'index.ts', `import x from 'some-unknown-pkg'`)

    const result = await scanProject({ path: tmpDir })

    expect(result.directDeps).toBe(1)
    expect(result.highImpactReplacements).toHaveLength(0)
    expect(result.mediumImpactReplacements).toHaveLength(0)
    expect(result.securityIssues).toHaveLength(0)
  })

  it('should throw for invalid path with no package.json', async () => {
    await expect(scanProject({ path: join(tmpDir, 'nonexistent') })).rejects.toThrow(
      /No package.json found/
    )
  })

  it('should handle projects with no source files', async () => {
    writePackageJson(tmpDir, { lodash: '^4.17.21' })
    mkdirSync(join(tmpDir, 'src'), { recursive: true })

    const result = await scanProject({ path: tmpDir })

    expect(result.projectName).toBe('test-project')
    expect(result.directDeps).toBe(1)
  })

  it('should handle projects with devDependencies only', async () => {
    writePackageJson(tmpDir, {}, { lodash: '^4.17.21' })
    writeSourceFile(tmpDir, 'src', 'index.ts', `import _ from 'lodash'`)

    const result = await scanProject({ path: tmpDir })

    expect(result.directDeps).toBe(1)
  })

  it('should return correct totalEstimatedSize format', async () => {
    writePackageJson(tmpDir, { lodash: '^4.17.21', moment: '^2.29.4' })
    writeSourceFile(tmpDir, 'src', 'index.ts', `import _ from 'lodash'`)

    const result = await scanProject({ path: tmpDir })

    expect(typeof result.totalEstimatedSize).toBe('string')
    expect(result.totalEstimatedSize).toMatch(/\d+(\.\d+)?\s*(KB|MB)/)
  })
})
