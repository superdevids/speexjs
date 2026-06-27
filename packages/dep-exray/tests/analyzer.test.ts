import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { analyzeUsage } from '../src/analyzer/index.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'dep-exray-analyzer-'))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

function writeSourceFile(subdir: string, filename: string, content: string) {
  const fullDir = join(tmpDir, subdir)
  mkdirSync(fullDir, { recursive: true })
  writeFileSync(join(fullDir, filename), content)
}

describe('analyzeUsage', () => {
  it('should detect package used via import statement', async () => {
    writeSourceFile('src', 'index.ts', `import _ from 'lodash'\nconst result = _.join([1, 2], '-')`)

    const result = await analyzeUsage(tmpDir, 'lodash')

    expect(result.isUsed).toBe(true)
    expect(result.importCount).toBeGreaterThanOrEqual(1)
    expect(result.importLocations.length).toBeGreaterThanOrEqual(1)
    expect(result.importLocations[0]).toContain('index.ts')
  })

  it('should detect package used via require statement', async () => {
    writeSourceFile('src', 'index.js', `const _ = require('lodash')`)

    const result = await analyzeUsage(tmpDir, 'lodash')

    expect(result.isUsed).toBe(true)
    expect(result.importCount).toBeGreaterThanOrEqual(1)
  })

  it('should return isUsed false for unused package', async () => {
    writeSourceFile('src', 'index.ts', `import fs from 'node:fs'`)

    const result = await analyzeUsage(tmpDir, 'lodash')

    expect(result.isUsed).toBe(false)
    expect(result.importCount).toBe(0)
    expect(result.importLocations).toHaveLength(0)
  })

  it('should detect package used in multiple files', async () => {
    writeSourceFile('src', 'a.ts', `import _ from 'lodash'`)
    writeSourceFile('src', 'b.ts', `const _ = require('lodash')`)
    writeSourceFile('src', 'c.ts', `import fs from 'node:fs'`)

    const result = await analyzeUsage(tmpDir, 'lodash')

    expect(result.isUsed).toBe(true)
    expect(result.importCount).toBe(2)
    expect(result.importLocations).toHaveLength(2)
  })

  it('should search multiple source files', async () => {
    writeSourceFile('src', 'a.ts', `import _ from 'lodash'`)
    writeSourceFile('src', 'b.ts', `const _ = require('lodash')`)

    const result = await analyzeUsage(tmpDir, 'lodash')

    expect(result.isUsed).toBe(true)
    expect(result.importCount).toBe(2)
    expect(result.importLocations).toHaveLength(2)
  })

  it('should skip node_modules directory', async () => {
    writeSourceFile('src', 'index.ts', `import _ from 'lodash'`)
    writeSourceFile('node_modules', 'some-pkg', `module.exports = {}`)

    const result = await analyzeUsage(tmpDir, 'lodash')

    expect(result.isUsed).toBe(true)
    expect(result.importCount).toBe(1)
  })

  it('should handle project path without src directory', async () => {
    writeSourceFile('lib', 'index.ts', `import _ from 'lodash'`)

    const result = await analyzeUsage(tmpDir, 'lodash')

    expect(result.isUsed).toBe(true)
    expect(result.importCount).toBeGreaterThanOrEqual(1)
  })

  it('should handle project with no source files', async () => {
    const result = await analyzeUsage(tmpDir, 'lodash')

    expect(result.isUsed).toBe(false)
    expect(result.importCount).toBe(0)
    expect(result.importLocations).toHaveLength(0)
  })

  it('should handle nested directory structure', async () => {
    writeSourceFile('src/utils', 'helpers.ts', `import { randomUUID } from 'crypto'`)
    writeSourceFile('src/utils/deep', 'nested.ts', `import { v4 } from 'uuid'`)

    const result = await analyzeUsage(tmpDir, 'uuid')

    expect(result.isUsed).toBe(true)
    expect(result.importCount).toBe(1)
  })

  it('should not confuse similar package names', async () => {
    writeSourceFile('src', 'index.ts', `import stuff from 'lodash.merge'`)

    const result = await analyzeUsage(tmpDir, 'lodash')

    expect(result.isUsed).toBe(false)
    expect(result.importCount).toBe(0)
  })
})
