import { colors, isColorSupported } from './colors.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LoggerOptions {
  level?: LogLevel
  name?: string
  colors?: boolean
  timestamps?: boolean
  timezone?: 'WIB' | 'WITA' | 'WIT' | 'UTC'
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const TIMEZONE_OFFSETS: Record<string, number> = {
  WIB: 7,
  WITA: 8,
  WIT: 9,
  UTC: 0,
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function formatTimestamp(tz?: string): string {
  const offset = TIMEZONE_OFFSETS[tz ?? ''] ?? 7
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const local = new Date(utc + offset * 3600000)

  const y = local.getFullYear()
  const M = pad(local.getMonth() + 1)
  const d = pad(local.getDate())
  const h = pad(local.getHours())
  const m = pad(local.getMinutes())
  const s = pad(local.getSeconds())

  return `${y}-${M}-${d} ${h}:${m}:${s} ${tz ?? 'WIB'}`
}

const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
}

const LEVEL_COLOR: Record<LogLevel, (s: string) => string> = {
  debug: colors.gray,
  info: colors.cyan,
  warn: colors.yellow,
  error: colors.red,
}

export class Logger {
  private _level: LogLevel
  private _name: string
  private _useColors: boolean
  private _useTimestamps: boolean
  private _timezone: string

  constructor(options?: LoggerOptions) {
    this._level = options?.level ?? 'info'
    this._name = options?.name ?? ''
    this._useColors = options?.colors ?? isColorSupported()
    this._useTimestamps = options?.timestamps ?? true
    this._timezone = options?.timezone ?? 'WIB'
  }

  private _format(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
    const parts: string[] = []

    if (this._useTimestamps) {
      parts.push(formatTimestamp(this._timezone))
    }

    if (this._useColors) {
      parts.push(LEVEL_COLOR[level](LEVEL_PREFIX[level]))
    } else {
      parts.push(LEVEL_PREFIX[level])
    }

    if (this._name) {
      parts.push(this._useColors ? colors.dim(`[${this._name}]`) : `[${this._name}]`)
    }

    if (this._useColors) {
      parts.push(LEVEL_COLOR[level](msg))
    } else {
      parts.push(msg)
    }

    if (meta && Object.keys(meta).length > 0) {
      parts.push(JSON.stringify(meta))
    }

    return parts.join(' ')
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[this._level] > LOG_LEVELS.debug) return
    console.debug(this._format('debug', msg, meta))
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[this._level] > LOG_LEVELS.info) return
    console.info(this._format('info', msg, meta))
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[this._level] > LOG_LEVELS.warn) return
    console.warn(this._format('warn', msg, meta))
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[this._level] > LOG_LEVELS.error) return
    console.error(this._format('error', msg, meta))
  }

  child(name: string): Logger {
    const childName = this._name ? `${this._name}:${name}` : name
    return new Logger({
      level: this._level,
      name: childName,
      colors: this._useColors,
      timestamps: this._useTimestamps,
      timezone: this._timezone as LoggerOptions['timezone'],
    })
  }

  setLevel(level: LogLevel): void {
    this._level = level
  }
}

export const logger = new Logger()
