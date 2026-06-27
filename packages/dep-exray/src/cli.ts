#!/usr/bin/env node
import { Command } from 'commander'
import { scanProject } from './scanner/index.js'
import { generateReport } from './reporter/index.js'

const program = new Command()

program
  .name('dep-exray')
  .description('Dependency health scanner for JavaScript/TypeScript projects')
  .version('0.1.0')
  .argument('[path]', 'Project path to scan', '.')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('--fix', 'Auto-generate migration PRs')
  .action(async (path: string, options: { json?: boolean; verbose?: boolean; fix?: boolean }) => {
    try {
      const result = await scanProject({ path, verbose: options.verbose, jsonOutput: options.json })
      console.log(generateReport(result, options.json))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`\n  ✖ ${message}\n`)
      process.exit(1)
    }
  })

program.parse()
