import { readFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function isSourceFile(file: string): boolean {
  return SOURCE_EXTENSIONS.has(extname(file))
}

function collectSourceFiles(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'coverage' || entry.name === '.tsup') {
        continue
      }
      if (entry.isDirectory()) {
        results.push(...collectSourceFiles(fullPath))
      } else if (entry.isFile() && isSourceFile(entry.name)) {
        results.push(fullPath)
      }
    }
  } catch {
    // skip directories we can't read
  }
  return results
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function analyzeUsage(
  projectPath: string,
  packageName: string,
): Promise<{
  isUsed: boolean
  importCount: number
  importLocations: string[]
}> {
  const importLocations: string[] = []
  const escaped = escapeRegex(packageName)
  const importRegex = new RegExp(
    `(?:from\\s+['"]${escaped}(?:/['"]|['"])|require\\(\\s*['"]${escaped}(?:/|['"]))`,
    'g',
  )

  const srcDir = join(projectPath, 'src')
  let files: string[]
  try {
    if (statSync(srcDir).isDirectory()) {
      files = collectSourceFiles(srcDir)
    } else {
      files = collectSourceFiles(projectPath)
    }
  } catch {
    files = collectSourceFiles(projectPath)
  }

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8')
      importRegex.lastIndex = 0
      if (importRegex.test(content)) {
        importLocations.push(file)
      }
    } catch {
      // skip unreadable files
    }
  }

  return {
    isUsed: importLocations.length > 0,
    importCount: importLocations.length,
    importLocations,
  }
}
