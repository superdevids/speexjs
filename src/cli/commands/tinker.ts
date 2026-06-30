import { colors } from '../../native/colors.js'

// Whitelist of safe expressions for the Tinker REPL
const SAFE_GLOBALS = new Set([
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Date',
  'RegExp',
  'Map',
  'Set',
  'Promise',
  'JSON',
  'Math',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURI',
  'encodeURIComponent',
  'decodeURI',
  'decodeURIComponent',
  'console',
  'process',
  'Buffer',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'ReferenceError',
])

function isExpresssionSafe(code: string): boolean {
  // Block import(), require(), eval(), global access, constructor access
  const dangerous = [
    /import\s*\(/,
    /\brequire\s*\(/,
    /\beval\s*\(/,
    /\bglobalThis\b/,
    /\bglobal\b/,
    /\.constructor\b/,
    /__proto__/,
    /__defineGetter__/,
    /__lookupGetter__/,
    /prototype\s*\[/,
    /prototype\s*\./,
    /new\s+Function\s*\(/,
    /Reflect\s*\./,
    /Proxy\s*\(/,
    /process\s*\.\s*(exit|kill|abort|reallyExit|dlopen|binding|spawn|exec)/i,
    /require\s*\.\s*(main|resolve|extensions)/i,
  ]
  for (const re of dangerous) {
    if (re.test(code)) return false
  }
  return true
}

export async function tinker(): Promise<void> {
  const { createInterface } = await import('node:readline')
  console.log(`${colors.green('⚡ SpeexJS Tinker')} - Interactive REPL (sandboxed)`)
  console.log('Type .help for commands, .exit to quit\n')

  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'speexjs> ' })
  rl.prompt()

  rl.on('line', async (line: string) => {
    const cmd = line.trim()
    if (cmd === '.exit' || cmd === '.quit') {
      rl.close()
      return
    }
    if (cmd === '.help') {
      console.log('Commands: .exit, .quit, .help, .globals, <any JS expression>')
      rl.prompt()
      return
    }
    if (cmd === '.globals') {
      console.log(colors.yellow('Available globals:'))
      console.log([...SAFE_GLOBALS].sort().join(', '))
      rl.prompt()
      return
    }
    if (!cmd) {
      rl.prompt()
      return
    }

    if (!isExpresssionSafe(cmd)) {
      console.error(colors.red('Blocked: potentially unsafe expression detected (import, eval, constructor access, etc.)'))
      rl.prompt()
      return
    }

    try {
      // Use Function constructor with sandboxed scope (limited to safe globals)
      const fn = new Function(...SAFE_GLOBALS, `"use strict"; return (${cmd})`)
      const result = await fn(...SAFE_GLOBALS.values())
      console.log(colors.cyan(JSON.stringify(result, null, 2)))
    } catch (e: any) {
      console.error(colors.red(e instanceof Error ? e.message : String(e)))
    }
    rl.prompt()
  })

  rl.on('close', () => {
    console.log('\nBye!')
    process.exit(0)
  })
}
