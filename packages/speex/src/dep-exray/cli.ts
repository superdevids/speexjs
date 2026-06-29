#!/usr/bin/env node
import { scanProject } from './scanner/index.js'
import { generateReport } from './reporter/index.js'

function parseArgs(args: string[]): { path: string; json: boolean; verbose: boolean; fix: boolean } {
  let path = '.'
  let json = false
  let verbose = false
  let fix = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--json' || arg === '-j') {
      json = true
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true
    } else if (arg === '--fix') {
      fix = true
    } else if (!arg.startsWith('-')) {
      path = arg
    }
  }

  return { path, json, verbose, fix }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
  dep-exray — Dependency Health Scanner

  Usage:
    dep-exray [path] [options]

  Arguments:
    path        Project path to scan (default: .)

  Options:
    -j, --json      Output as JSON
    -v, --verbose   Verbose output
    --fix           Auto-generate migration PRs
    -h, --help      Show this help
    `)
    process.exit(0)
  }

  const { path, json, verbose, fix } = parseArgs(args)

  try {
    const result = await scanProject({ path, verbose, jsonOutput: json })
    console.log(generateReport(result, json))
    if (fix) {
      console.log('\n  --fix mode: Auto-PR generation not yet implemented\n')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\n  ✖ ${message}\n`)
    process.exit(1)
  }
}

main()
