const RESET = '\x1b[0m'

const codes: Record<string, string> = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
}

export const colors = {
  red: (s: string): string => `${codes.red}${s}${RESET}`,
  green: (s: string): string => `${codes.green}${s}${RESET}`,
  yellow: (s: string): string => `${codes.yellow}${s}${RESET}`,
  blue: (s: string): string => `${codes.blue}${s}${RESET}`,
  magenta: (s: string): string => `${codes.magenta}${s}${RESET}`,
  cyan: (s: string): string => `${codes.cyan}${s}${RESET}`,
  gray: (s: string): string => `${codes.gray}${s}${RESET}`,
  white: (s: string): string => `${codes.white}${s}${RESET}`,
  bold: (s: string): string => `${codes.bold}${s}${RESET}`,
  dim: (s: string): string => `${codes.dim}${s}${RESET}`,
  italic: (s: string): string => `${codes.italic}${s}${RESET}`,
  underline: (s: string): string => `${codes.underline}${s}${RESET}`,
}

export function stripColors(s: string): string {
  const ansi = String.fromCharCode(27)
  const re = new RegExp(`${ansi}\\[\\d+m`, 'g')
  return s.replace(re, '')
}

export function isColorSupported(): boolean {
  if (typeof process === 'undefined') return false
  if (process.env.NO_COLOR) return false
  if (process.env.FORCE_COLOR) return true
  if (!process.stdout) return false
  if (!process.stdout.isTTY) return false
  return true
}
