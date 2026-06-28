import type { LogLevel } from './logger.js'

/**
 * A transport handles the formatted output of log entries.
 */
export interface Transport {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[34m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
}

const RESET = '\x1b[0m'

/**
 * Creates a console transport that writes formatted log lines to `console.log`.
 *
 * The level prefix is optionally colored using ANSI escape codes:
 * - `debug` → gray
 * - `info`  → blue
 * - `warn`  → yellow
 * - `error` → red
 *
 * @param options - Configuration for the console transport.
 * @param options.colors - Enable ANSI color output (default: `true`).
 * @param options.timestamp - Prepend an ISO-8601 timestamp (default: `false`).
 */
export function createConsoleTransport(options?: {
  colors?: boolean
  timestamp?: boolean
}): Transport {
  const useColors = options?.colors !== false
  const showTimestamp = options?.timestamp ?? false

  return {
    log(level, message, meta) {
      const parts: string[] = []

      if (showTimestamp) {
        parts.push(new Date().toISOString())
      }

      if (useColors) {
        const color = LEVEL_COLORS[level]
        parts.push(`${color}[${level.toUpperCase()}]${RESET}`)
      } else {
        parts.push(`[${level.toUpperCase()}]`)
      }

      parts.push(message)

      if (meta !== undefined && Object.keys(meta).length > 0) {
        parts.push(JSON.stringify(meta))
      }

      console.log(parts.join(' '))
    },
  }
}

/**
 * Creates a transport that outputs structured JSON lines.
 *
 * Each log entry is serialized as a single JSON object with
 * `timestamp`, `level`, `message`, and optional `meta` fields.
 *
 * @param options - Configuration for the JSON transport.
 * @param options.stream - A writable stream (e.g. `process.stdout`).
 *                         Defaults to `process.stdout` in Node.js, falls
 *                         back to `console.log` in browsers.
 */
export function createJsonTransport(options?: {
  stream?: { write(data: string): void }
}): Transport {
  const writeStream =
    options?.stream ??
    (typeof process !== 'undefined' &&
    typeof process.stdout !== 'undefined' &&
    typeof process.stdout.write === 'function'
      ? (process.stdout as { write(data: string): void })
      : undefined)

  return {
    log(level, message, meta) {
      const entry: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level,
        message,
      }
      if (meta !== undefined && Object.keys(meta).length > 0) {
        entry.meta = meta
      }
      const line = JSON.stringify(entry)
      if (writeStream !== undefined) {
        writeStream.write(line + '\n')
      } else {
        console.log(line)
      }
    },
  }
}

/**
 * Creates a transport that appends log entries to a file.
 *
 * Each line is formatted as: `[timestamp] [LEVEL] message {meta}`
 *
 * ⚠️ Node.js only. Silently discards log entries when `fs` is unavailable
 * (browsers, Deno, Bun — though Bun supports `fs`).
 *
 * @param filename - Path to the log file.
 * @param options - Configuration for the file transport.
 * @param options.maxSize - Maximum file size in bytes before rotation
 *                          (default: 10 MB). **Note:** rotation is not
 *                          yet implemented; this is reserved for future use.
 */
export function createFileTransport(
  filename: string,
  _options?: { maxSize?: number },
): Transport {
  // Try to resolve fs synchronously at construction time
  // Uses process.versions.node as a heuristic for Node.js environment
  let fs: { appendFileSync: (path: string, data: string) => void } | null = null
  try {
    if (typeof process !== 'undefined' && process.versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const m = require('fs') as { appendFileSync: (path: string, data: string) => void }
      fs = m
    }
  } catch {
    // fs unavailable (browser, edge runtime)
  }

  return {
    log(level, message, meta) {
      if (fs === null) return

      const metaStr =
        meta !== undefined && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
      const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${metaStr}\n`

      try {
        fs.appendFileSync(filename, line)
      } catch {
        // Silently drop if write fails (disk full, permissions, etc.)
      }
    },
  }
}

/**
 * Creates a buffered transport that batches log entries and flushes them
 * to the underlying transport when either the buffer size or flush interval
 * is reached (whichever comes first).
 *
 * Useful for reducing I/O pressure in high-throughput scenarios.
 *
 * @param transport - The underlying transport to flush to.
 * @param options - Configuration for the buffer.
 * @param options.maxSize - Maximum number of entries before forced flush
 *                          (default: 100).
 * @param options.flushIntervalMs - How often to auto-flush in milliseconds
 *                                  (default: 5000). Set to `0` to disable
 *                                  interval flushing.
 */
export function createBufferedTransport(
  transport: Transport,
  options?: { maxSize?: number; flushIntervalMs?: number },
): Transport {
  const maxSize = options?.maxSize ?? 100
  const flushIntervalMs = options?.flushIntervalMs ?? 5000

  const buffer: Array<{
    level: LogLevel
    message: string
    meta?: Record<string, unknown>
  }> = []

  let timer: ReturnType<typeof setTimeout> | undefined

  function flush(): void {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    for (let i = 0; i < buffer.length; i++) {
      const entry = buffer[i]!
      transport.log(entry.level, entry.message, entry.meta)
    }
    buffer.length = 0
  }

  function scheduleFlush(): void {
    if (timer !== undefined || flushIntervalMs <= 0) return
    timer = setTimeout((): void => {
      timer = undefined
      flush()
    }, flushIntervalMs)
  }

  return {
    log(level, message, meta) {
      buffer.push({ level, message, meta })
      if (buffer.length >= maxSize) {
        flush()
      } else {
        scheduleFlush()
      }
    },
  }
}
