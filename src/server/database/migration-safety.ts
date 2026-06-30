import * as fs from 'node:fs'
import * as path from 'node:path'

export type DestructiveOperation = 'drop_table' | 'drop_column' | 'rename_column' | 'alter_column'

export interface DestructiveChange {
  type: DestructiveOperation
  table: string
  column?: string
  details: string
}

export interface CodeReference {
  file: string
  line: number
  snippet: string
}

export interface SafetyWarning {
  change: DestructiveChange
  references: CodeReference[]
  severity: 'low' | 'medium' | 'high'
  message: string
}

export interface SafetyReport {
  safe: boolean
  warnings: SafetyWarning[]
  totalChanges: number
  destructiveCount: number
  referencedCount: number
}

export interface TableDiff {
  table: string
  operations: DestructiveChange[]
}

export interface MigrationSafetyGuardOptions {
  srcDir?: string
}

export function parseMigrationSource(source: string): TableDiff[] {
  const opsByTable = new Map<string, DestructiveChange[]>()
  const getOps = (table: string): DestructiveChange[] => {
    let arr = opsByTable.get(table)
    if (!arr) {
      arr = []
      opsByTable.set(table, arr)
    }
    return arr
  }

  let currentTable = ''
  const lines = source.split('\n')

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue

    const tableCtx = trimmed.match(/(?:schema\.)?(?:createTable|alterTable)\s*\(\s*['"`]([^'"`]+)['"`]/)
    if (tableCtx) currentTable = tableCtx[1]!
    if (/^\s*\}\)?\s*;?\s*$/.test(trimmed) || /^\s*\}\)?\s*\)?\s*;?\s*$/.test(trimmed)) currentTable = ''

    const dropTable = trimmed.match(/(?:schema\.)?dropTable(?:IfExists)?\s*\(\s*['"`]([^'"`]+)['"`]/)
    if (dropTable) getOps(dropTable[1]!).push({ type: 'drop_table', table: dropTable[1]!, details: `DROP TABLE "${dropTable[1]}"` })

    const dropCol = trimmed.match(/table\.dropColumn\s*\(\s*['"`]([^'"`]+)['"`]/)
    if (dropCol) {
      const table = currentTable || 'unknown'
      getOps(table).push({ type: 'drop_column', table, column: dropCol[1]!, details: `DROP COLUMN "${table}"."${dropCol[1]}"` })
    }

    if (trimmed.includes('dropTimestamps()')) {
      const table = currentTable || 'unknown'
      getOps(table).push({ type: 'drop_column', table, column: 'created_at', details: `DROP "${table}".created_at (dropTimestamps)` })
      getOps(table).push({ type: 'drop_column', table, column: 'updated_at', details: `DROP "${table}".updated_at (dropTimestamps)` })
    }

    if (trimmed.includes('dropSoftDeletes()')) {
      const table = currentTable || 'unknown'
      getOps(table).push({ type: 'drop_column', table, column: 'deleted_at', details: `DROP "${table}".deleted_at (dropSoftDeletes)` })
    }
  }

  return Array.from(opsByTable.entries())
    .filter(([, ops]) => ops.length > 0)
    .map(([table, operations]) => ({ table, operations }))
}

export function parseMigrationFile(filePath: string): TableDiff[] {
  const source = fs.readFileSync(filePath, 'utf-8')
  return parseMigrationSource(source)
}

export class MigrationSafetyGuard {
  private srcDir: string

  constructor(options?: MigrationSafetyGuardOptions) {
    this.srcDir = options?.srcDir ?? path.resolve(process.cwd(), 'src')
  }

  inspect(diffs: TableDiff[]): SafetyReport {
    const warnings: SafetyWarning[] = []
    let totalChanges = 0
    let destructiveCount = 0

    const allChanges: DestructiveChange[] = []
    for (const diff of diffs) {
      for (const op of diff.operations) {
        allChanges.push(op)
        totalChanges++
        if (op.type === 'drop_table' || op.type === 'drop_column') destructiveCount++
      }
    }

    for (const change of allChanges) {
      switch (change.type) {
        case 'drop_table': {
          const refs = this.scanForTable(change.table)
          if (refs.length > 0) {
            warnings.push({
              change,
              references: refs,
              severity: 'high',
              message: `Table "${change.table}" is referenced in ${refs.length} location(s). Dropping it will break dependent code.`,
            })
          }
          break
        }
        case 'drop_column': {
          const refs = this.scanForColumn(change.column!)
          if (refs.length > 0) {
            warnings.push({
              change,
              references: refs,
              severity: 'high',
              message: `Column "${change.column}" (in "${change.table}") referenced in ${refs.length} location(s). Dropping it causes data loss.`,
            })
          }
          break
        }
        case 'rename_column': {
          const refs = this.scanForColumn(change.column!)
          if (refs.length > 0) {
            warnings.push({
              change,
              references: refs,
              severity: 'medium',
              message: `Column "${change.column}" renamed. ${refs.length} reference(s) may need updating.`,
            })
          }
          break
        }
      }
    }

    const hasHighSeverity = warnings.some((w) => w.severity === 'high')
    const referencedCount = warnings.reduce((sum, w) => sum + w.references.length, 0)

    return { safe: !hasHighSeverity, warnings, totalChanges, destructiveCount, referencedCount }
  }

  private scanForTable(tableName: string): CodeReference[] {
    const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return this.scanLines((line) => new RegExp(`['"\`]${escaped}['"\`]`).test(line))
  }

  private scanForColumn(columnName: string): CodeReference[] {
    const escaped = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return this.scanLines((line) => new RegExp(`['"\`]${escaped}['"\`]`).test(line))
  }

  private scanLines(matcher: (line: string) => boolean): CodeReference[] {
    const refs: CodeReference[] = []
    const files = this.collectSourceFiles()
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i]!.trim()
          if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue
          if (matcher(lines[i]!))
            refs.push({ file: path.relative(process.cwd(), file).replace(/\\/g, '/'), line: i + 1, snippet: trimmed.substring(0, 120) })
        }
      } catch {
        /* skip */
      }
    }
    return refs
  }

  private collectSourceFiles(): string[] {
    const files: string[] = []
    this.walkDir(this.srcDir, files)
    return files
  }

  private walkDir(dir: string, acc: string[]): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', '.git'].includes(entry.name) && !entry.name.startsWith('.')) this.walkDir(full, acc)
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          acc.push(full)
        }
      }
    } catch {
      /* skip */
    }
  }
}
