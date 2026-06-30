export interface ParsedArgs {
  command: string
  subcommand?: string
  args: string[]
  options: Record<string, string | boolean | string[]>
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  const result: ParsedArgs = {
    command: '',
    args: [],
    options: {},
  }

  if (args.length === 0) return result

  const first = args[0]!

  if (first.includes(':')) {
    result.command = first
    parseOptions(args.slice(1), result)
    return result
  }

  result.command = first

  if (args.length > 1) {
    const second = args[1]!
    if (!second.startsWith('-')) {
      result.subcommand = second
      result.args.push(second)
      parseOptions(args.slice(2), result)
      return result
    }
  }

  parseOptions(args.slice(1), result)
  return result
}

function parseOptions(argv: string[], result: ParsedArgs): void {
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]!

    if (arg === '--') {
      for (let j = i + 1; j < argv.length; j++) {
        result.args.push(argv[j]!)
      }
      break
    }

    if (arg.startsWith('--no-')) {
      const key = arg.slice(5)
      if (key) {
        result.options[key] = false
      }
      i++
      continue
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      if (i + 1 < argv.length && !argv[i + 1]!.startsWith('-')) {
        const val = argv[i + 1]!
        const existing = result.options[key]
        if (existing !== undefined) {
          result.options[key] = Array.isArray(existing)
            ? ([...existing, val] as string[])
            : [existing as string, val]
        } else {
          result.options[key] = val
        }
        i += 2
      } else {
        result.options[key] = true
        i++
      }
      continue
    }

    if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1)
      if (i + 1 < argv.length && !argv[i + 1]!.startsWith('-')) {
        const val = argv[i + 1]!
        result.options[key] = val
        i += 2
      } else {
        result.options[key] = true
        i++
      }
      continue
    }

    result.args.push(arg)
    i++
  }
}

export function toCommandName(argv: string[]): string {
  const args = argv.slice(2)
  if (args.length === 0) return ''

  const first = args[0]!

  if (first.includes(':')) return first

  if (args.length > 1 && !args[1]!.startsWith('-')) {
    return `${first}:${args[1]}`
  }

  return first
}
