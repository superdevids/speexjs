/**
 * Represents the severity level of a log entry.
 * Ordered from least to most severe: debug < info < warn < error.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log function signature bound to a specific severity level.
 */
export type LogFn = (message: string, meta?: Record<string, unknown>) => void

/**
 * Configuration options for creating a Logger instance.
 */
export interface LoggerOptions {
  /** Minimum log level to output (default: 'info'). */
  level?: LogLevel
  /** Optional name tag prepended to every message as `[name]`. */
  name?: string
  /** Custom transport; defaults to {@link consoleTransport}. */
  transport?: Transport
}

/**
 * A transport handles the formatted output of log entries.
 * Implementations write to stdout, files, buffers, or remote services.
 */
export interface Transport {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

/**
 * Structured logger with level filtering, child loggers, and pluggable transport.
 *
 * @example
 * ```ts
 * const log = new Logger({ level: 'debug', name: 'app' })
 * log.info('server started', { port: 3000 })
 *
 * const child = log.child({ requestId: 'abc-123' })
 * child.warn('slow query', { durationMs: 450 })
 * ```
 */
export class Logger {
  private _level: LogLevel
  private _name?: string
  private _transport: Transport
  private _extraMeta: Record<string, unknown>

  constructor(options?: LoggerOptions) {
    this._level = options?.level ?? 'info'
    this._name = options?.name
    this._transport = options?.transport ?? consoleTransport
    this._extraMeta = Object.create(null)
  }

  private _shouldLog(target: LogLevel): boolean {
    return LEVEL_ORDER[this._level] <= LEVEL_ORDER[target]
  }

  private _log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (level !== 'error' && !this._shouldLog(level)) return

    const merged: Record<string, unknown> = Object.create(null)
    for (const key of Object.keys(this._extraMeta)) {
      merged[key] = (this._extraMeta as Record<string, unknown>)[key]!
    }
    if (meta !== undefined) {
      for (const key of Object.keys(meta)) {
        merged[key] = meta[key]!
      }
    }

    const label = this._name !== undefined ? `[${this._name}] ${message}` : message
    const finalMeta = Object.keys(merged).length > 0 ? merged : undefined
    this._transport.log(level, label, finalMeta)
  }

  /** Log at `debug` level. Only emitted when the current level is `'debug'`. */
  debug: LogFn = (message, meta?) => this._log('debug', message, meta)

  /** Log at `info` level. Emitted when level is `'debug'` or `'info'`. */
  info: LogFn = (message, meta?) => this._log('info', message, meta)

  /** Log at `warn` level. Emitted when level is `'debug'`, `'info'`, or `'warn'`. */
  warn: LogFn = (message, meta?) => this._log('warn', message, meta)

  /** Log at `error` level. Always emitted regardless of current level. */
  error: LogFn = (message, meta?) => this._log('error', message, meta)

  /**
   * Creates a child logger that inherits the parent's level, name, and transport,
   * but merges `extraMeta` into every log call. Child metadata is shallow-merged
   * on top of the parent's inherited metadata.
   *
   * @param extraMeta - Additional context to include in every log entry.
   */
  child(extraMeta: Record<string, unknown>): Logger {
    const child = new Logger({
      level: this._level,
      name: this._name,
      transport: this._transport,
    })
    const inherited: Record<string, unknown> = Object.create(null)
    for (const key of Object.keys(this._extraMeta)) {
      inherited[key] = (this._extraMeta as Record<string, unknown>)[key]!
    }
    for (const key of Object.keys(extraMeta)) {
      inherited[key] = extraMeta[key]!
    }
    child._extraMeta = inherited
    return child
  }

  /** Updates the minimum log level for this instance. */
  setLevel(level: LogLevel): void {
    this._level = level
  }

  /** Returns the current minimum log level. */
  getLevel(): LogLevel {
    return this._level
  }

  /**
   * Creates a new named Logger.
   * Convenience shorthand for `new Logger({ ...options, name })`.
   *
   * @param name - The name tag shown in log output.
   * @param options - Additional configuration.
   */
  static create(name: string, options?: LoggerOptions): Logger {
    return new Logger({ ...options, name })
  }
}

/**
 * Default transport that writes formatted log lines to `console.log`.
 *
 * Output format: `[LEVEL] message {meta}`
 *
 * When a logger has a name, the format becomes: `[LEVEL] [name] message {meta}`
 */
export const consoleTransport: Transport = {
  log(level, message, meta) {
    const metaStr =
      meta !== undefined && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
    console.log(`[${level.toUpperCase()}] ${message}${metaStr}`)
  },
}

/**
 * Default logger instance at `'info'` level with no name.
 */
export const logger: Logger = new Logger()
