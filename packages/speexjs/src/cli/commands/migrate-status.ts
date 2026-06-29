import { resolve } from 'node:path'
import { readdirSync } from 'node:fs'
import { colors } from '../../native/colors.js'

export async function migrateStatus(): Promise<void> {
  const migrationsDir = resolve(process.cwd(), 'src/database/migrations')
  try {
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.ts')).sort()
    console.log(`\n  ${colors.bold('Migration Status:')}`)
    for (const file of files) {
      console.log(`  ${colors.dim('─')} ${file}`)
    }
    console.log(`  ${colors.dim(`${files.length} migration${files.length !== 1 ? 's' : ''}`)}\n`)
  } catch {
    console.log(`  ${colors.yellow('!')} No migrations directory found.`)
  }
}
