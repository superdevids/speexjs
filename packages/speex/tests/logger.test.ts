import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  Logger,
  consoleTransport,
  createConsoleTransport,
  createJsonTransport,
  createFileTransport,
  createBufferedTransport,
} from '../src/logger/index.js'
import type { Transport, LogLevel } from '../src/logger/index.js'

// ---------------------------------------------------------------------------
// Helper: capture console.log calls
// ---------------------------------------------------------------------------
let logs: string[][] = []
beforeEach(() => {
  logs = []
  vi.spyOn(console, 'log').mockImplementation((...args: string[]) => {
    logs.push(args)
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Helper: in-memory transport that records every call
// ---------------------------------------------------------------------------
function createMockTransport(): { transport: Transport; calls: Array<{ level: LogLevel; message: string; meta?: Record<string, unknown> }> } {
  const calls: Array<{ level: LogLevel; message: string; meta?: Record<string, unknown> }> = []
  return {
    calls,
    transport: { log: (level, message, meta) => calls.push({ level, message, meta }) },
  }
}

// ===========================================================================
// Logger class
// ===========================================================================
describe('Logger', () => {
  // ----- construction & defaults -------------------------------------------
  describe('constructor defaults', () => {
    it('creates with default level "info"', () => {
      const log = new Logger()
      expect(log.getLevel()).toBe('info')
    })

    it('creates with default consoleTransport', () => {
      const log = new Logger()
      log.info('hi')
      expect(logs[0][0]).toContain('[INFO] hi')
    })

    it('accepts a custom level via options', () => {
      const log = new Logger({ level: 'debug' })
      expect(log.getLevel()).toBe('debug')
    })

    it('accepts a name via options', () => {
      const log = new Logger({ name: 'myapp' })
      log.info('started')
      expect(logs[0][0]).toContain('[myapp]')
    })

    it('accepts a custom transport via options', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ transport })
      log.info('hello')
      expect(calls).toHaveLength(1)
      expect(calls[0].level).toBe('info')
      expect(calls[0].message).toBe('hello')
    })
  })

  // ----- level filtering ---------------------------------------------------
  describe('level filtering', () => {
    it('debug does NOT log when level is "info"', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ level: 'info', transport })
      log.debug('should not appear')
      expect(calls).toHaveLength(0)
    })

    it('debug DOES log when level is "debug"', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ level: 'debug', transport })
      log.debug('debug message')
      expect(calls).toHaveLength(1)
      expect(calls[0].level).toBe('debug')
    })

    it('info DOES log when level is "info"', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ level: 'info', transport })
      log.info('info message')
      expect(calls).toHaveLength(1)
      expect(calls[0].level).toBe('info')
    })

    it('info DOES log when level is "debug" (lower level)', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ level: 'debug', transport })
      log.info('still shows')
      expect(calls).toHaveLength(1)
    })

    it('warn DOES log when level is "warn"', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ level: 'warn', transport })
      log.warn('warning')
      expect(calls).toHaveLength(1)
      expect(calls[0].level).toBe('warn')
    })

    it('warn does NOT log when level is "error"', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ level: 'error', transport })
      log.warn('should not show')
      expect(calls).toHaveLength(0)
    })

    it('error ALWAYS logs regardless of level', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ level: 'error', transport })
      log.error('fatal')
      expect(calls).toHaveLength(1)
      expect(calls[0].level).toBe('error')
    })
  })

  // ----- setLevel / getLevel -----------------------------------------------
  describe('setLevel / getLevel', () => {
    it('setLevel changes the effective level', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ level: 'error', transport })
      log.debug('no')
      log.setLevel('debug')
      log.debug('yes')
      expect(calls).toHaveLength(1)
      expect(calls[0].message).toBe('yes')
    })

    it('getLevel returns the current level', () => {
      const log = new Logger({ level: 'warn' })
      expect(log.getLevel()).toBe('warn')
      log.setLevel('debug')
      expect(log.getLevel()).toBe('debug')
    })
  })

  // ----- child loggers -----------------------------------------------------
  describe('child()', () => {
    it('creates a child that inherits level', () => {
      const { transport, calls } = createMockTransport()
      const parent = new Logger({ level: 'error', transport })
      const child = parent.child({})
      child.info('should not log')
      expect(calls).toHaveLength(0)
    })

    it('creates a child that inherits name', () => {
      const { transport, calls } = createMockTransport()
      const parent = new Logger({ name: 'root', transport })
      const child = parent.child({})
      child.info('hello')
      expect(calls[0].message).toContain('[root]')
    })

    it('child merges own meta with parent meta', () => {
      const { transport, calls } = createMockTransport()
      const parent = new Logger({ transport })
      const child = parent.child({ requestId: 'abc' })
      child.info('hi', { extra: 1 })
      expect(calls[0].meta).toEqual({ requestId: 'abc', extra: 1 })
    })

    it('child meta does NOT mutate parent meta', () => {
      const { transport, calls } = createMockTransport()
      const parent = new Logger({ transport })
      const child = parent.child({ childOnly: true })
      parent.info('parent msg')
      child.info('child msg', { childKey: 1 })
      expect(calls).toHaveLength(2)
      expect(calls[0].meta).toBeUndefined()
      expect(calls[1].meta).toEqual({ childOnly: true, childKey: 1 })
    })
  })

  // ----- static create() ---------------------------------------------------
  describe('static create()', () => {
    it('creates a named logger', () => {
      const { transport, calls } = createMockTransport()
      const log = Logger.create('mymodule', { transport })
      log.info('started')
      expect(calls[0].message).toBe('[mymodule] started')
    })

    it('returns a Logger instance', () => {
      const log = Logger.create('test')
      expect(log).toBeInstanceOf(Logger)
      expect(log.getLevel()).toBe('info')
    })
  })

  // ----- meta merging ------------------------------------------------------
  describe('meta handling', () => {
    it('includes meta object in the log call', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ transport })
      log.info('hello', { user: 'alice', role: 'admin' })
      expect(calls[0].meta).toEqual({ user: 'alice', role: 'admin' })
    })

    it('omits meta from transport when none provided', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ transport })
      log.info('bare message')
      expect(calls[0].meta).toBeUndefined()
    })

    it('merges empty meta as undefined', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ transport })
      log.info('test', {})
      expect(calls[0].meta).toBeUndefined()
    })
  })

  // ----- name formatting ---------------------------------------------------
  describe('name formatting', () => {
    it('prepends [name] when name is set', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ name: 'svc', transport })
      log.warn('slow')
      expect(calls[0].message).toBe('[svc] slow')
    })

    it('does not prepend brackets when name is absent', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ transport })
      log.warn('plain')
      expect(calls[0].message).toBe('plain')
    })
  })

  // ----- custom transport receives correct data ----------------------------
  describe('custom transport integration', () => {
    it('receives level, message, and meta', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ transport })
      log.error('crash', { code: 500 })
      expect(calls[0]).toEqual({ level: 'error', message: 'crash', meta: { code: 500 } })
    })

    it('does not receive filtered-out messages', () => {
      const { transport, calls } = createMockTransport()
      const log = new Logger({ level: 'error', transport })
      log.debug('hidden')
      log.info('hidden')
      log.warn('hidden')
      expect(calls).toHaveLength(0)
    })
  })
})

// ===========================================================================
// consoleTransport (default export from logger.ts)
// ===========================================================================
describe('consoleTransport (default)', () => {
  it('outputs [LEVEL] message format', () => {
    consoleTransport.log('info', 'hello world')
    expect(logs[0][0]).toBe('[INFO] hello world')
  })

  it('appends JSON meta when meta is present', () => {
    consoleTransport.log('warn', 'be careful', { reason: 'test' })
    expect(logs[0][0]).toBe('[WARN] be careful {"reason":"test"}')
  })

  it('handles messages with named prefix', () => {
    consoleTransport.log('error', '[api] failed')
    expect(logs[0][0]).toBe('[ERROR] [api] failed')
  })

  it('omits meta when empty object', () => {
    consoleTransport.log('debug', 'noop', {})
    expect(logs[0][0]).toBe('[DEBUG] noop')
  })

  it('uppercases the level', () => {
    consoleTransport.log('debug', 'x')
    expect(logs[0][0]).toMatch(/^\[DEBUG\]/)
  })
})

// ===========================================================================
// createConsoleTransport
// ===========================================================================
describe('createConsoleTransport', () => {
  it('outputs colored output by default', () => {
    const t = createConsoleTransport()
    t.log('info', 'hello')
    expect(logs[0][0]).toContain('[INFO]')
  })

  it('outputs plain text when colors: false', () => {
    const t = createConsoleTransport({ colors: false })
    t.log('error', 'plain')
    expect(logs[0][0]).toBe('[ERROR] plain')
  })

  it('includes timestamp when timestamp: true', () => {
    const t = createConsoleTransport({ colors: false, timestamp: true })
    t.log('info', 'timed')
    expect(logs[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
    expect(logs[0][0]).toContain('[INFO] timed')
  })

  it('appends meta when provided', () => {
    const t = createConsoleTransport({ colors: false })
    t.log('warn', 'watch out', { key: 1 })
    expect(logs[0][0]).toBe('[WARN] watch out {"key":1}')
  })

  it('uses ANSI color codes when colors enabled', () => {
    const t = createConsoleTransport({ colors: true })
    t.log('debug', 'test')
    const line = logs[0][0]
    expect(line).toContain('\x1b[')
    expect(line).toContain('[DEBUG]')
    expect(line).toContain('\x1b[0m')
  })

  it('uses gray for debug, blue for info, yellow for warn, red for error', () => {
    const t = createConsoleTransport({ colors: true })
    t.log('debug', 'd')
    expect(logs[0][0]).toContain('\x1b[90m')
    t.log('info', 'i')
    expect(logs[1][0]).toContain('\x1b[34m')
    t.log('warn', 'w')
    expect(logs[2][0]).toContain('\x1b[33m')
    t.log('error', 'e')
    expect(logs[3][0]).toContain('\x1b[31m')
  })
})

// ===========================================================================
// createJsonTransport
// ===========================================================================
describe('createJsonTransport', () => {
  it('writes valid JSON to the provided stream', () => {
    const lines: string[] = []
    const stream = { write: (data: string) => lines.push(data) }
    const t = createJsonTransport({ stream })
    t.log('info', 'hello', { user: 1 })
    expect(lines).toHaveLength(1)
    const obj = JSON.parse(lines[0])
    expect(obj.level).toBe('info')
    expect(obj.message).toBe('hello')
    expect(obj.meta).toEqual({ user: 1 })
    expect(obj.timestamp).toBeDefined()
    expect(typeof obj.timestamp).toBe('string')
  })

  it('omits meta field when no meta provided', () => {
    const lines: string[] = []
    const stream = { write: (data: string) => lines.push(data) }
    const t = createJsonTransport({ stream })
    t.log('warn', 'no meta')
    const obj = JSON.parse(lines[0])
    expect(obj.meta).toBeUndefined()
    expect(obj.level).toBe('warn')
    expect(obj.message).toBe('no meta')
  })

  it('omits meta field when meta is empty', () => {
    const lines: string[] = []
    const stream = { write: (data: string) => lines.push(data) }
    const t = createJsonTransport({ stream })
    t.log('debug', 'empty meta', {})
    const obj = JSON.parse(lines[0])
    expect(obj.meta).toBeUndefined()
  })

  it('falls back to console.log when no stream provided', () => {
    const origWrite = process.stdout.write
    process.stdout.write = undefined as unknown as typeof origWrite
    try {
      const t = createJsonTransport()
      t.log('info', 'console fallback')
      expect(logs[0][0]).toBeTruthy()
      const obj = JSON.parse(logs[0][0])
      expect(obj.level).toBe('info')
      expect(obj.message).toBe('console fallback')
    } finally {
      process.stdout.write = origWrite
    }
  })

  it('writes a newline after each entry', () => {
    const lines: string[] = []
    const stream = { write: (data: string) => lines.push(data) }
    const t = createJsonTransport({ stream })
    t.log('error', 'boom')
    expect(lines[0]).toMatch(/\n$/)
  })
})

// ===========================================================================
// createFileTransport
// ===========================================================================
describe('createFileTransport', () => {
  it('creates transport without crashing', () => {
    const t = createFileTransport('/tmp/test.log')
    expect(t).toBeDefined()
    expect(typeof t.log).toBe('function')
  })

  it('does not throw on log call', () => {
    const t = createFileTransport('/tmp/test.log')
    expect(() => t.log('info', 'hello')).not.toThrow()
  })

  it('accepts maxSize option without throwing', () => {
    const t = createFileTransport('/tmp/test.log', { maxSize: 1024 })
    expect(() => t.log('warn', 'sized')).not.toThrow()
  })

  it('silently returns when fs is unavailable', () => {
    const t = createFileTransport('/nonexistent/path.log')
    expect(() => t.log('error', 'silent drop')).not.toThrow()
  })
})

// ===========================================================================
// createBufferedTransport
// ===========================================================================
describe('createBufferedTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('forwards entries to underlying transport on flush', () => {
    const { transport: inner, calls } = createMockTransport()
    const buf = createBufferedTransport(inner, { maxSize: 3, flushIntervalMs: 0 })
    buf.log('info', 'a')
    buf.log('info', 'b')
    expect(calls).toHaveLength(0)
    buf.log('info', 'c')
    expect(calls).toHaveLength(3)
    expect(calls[0].message).toBe('a')
    expect(calls[1].message).toBe('b')
    expect(calls[2].message).toBe('c')
  })

  it('flushes after flushIntervalMs', () => {
    const { transport: inner, calls } = createMockTransport()
    const buf = createBufferedTransport(inner, { maxSize: 100, flushIntervalMs: 1000 })
    buf.log('info', 'delayed')
    expect(calls).toHaveLength(0)
    vi.advanceTimersByTime(999)
    expect(calls).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(calls).toHaveLength(1)
    expect(calls[0].message).toBe('delayed')
  })

  it('preserves level and meta on flush', () => {
    const { transport: inner, calls } = createMockTransport()
    const buf = createBufferedTransport(inner, { maxSize: 2, flushIntervalMs: 0 })
    buf.log('error', 'fail', { code: 500 })
    buf.log('warn', 'caution', { count: 3 })
    expect(calls).toHaveLength(2)
    expect(calls[0]).toEqual({ level: 'error', message: 'fail', meta: { code: 500 } })
    expect(calls[1]).toEqual({ level: 'warn', message: 'caution', meta: { count: 3 } })
  })

  it('does not schedule flush when flushIntervalMs is 0 and buffer not full', () => {
    const { transport: inner, calls } = createMockTransport()
    const buf = createBufferedTransport(inner, { maxSize: 100, flushIntervalMs: 0 })
    buf.log('info', 'never flush via timer')
    vi.advanceTimersByTime(99999)
    expect(calls).toHaveLength(0)
  })

  it('starts a new timer after flush', () => {
    const { transport: inner, calls } = createMockTransport()
    const buf = createBufferedTransport(inner, { maxSize: 100, flushIntervalMs: 1000 })
    buf.log('info', 'first batch')
    vi.advanceTimersByTime(1000)
    expect(calls).toHaveLength(1)
    buf.log('info', 'second batch')
    vi.advanceTimersByTime(1000)
    expect(calls).toHaveLength(2)
  })

  it('uses defaults when no options provided', () => {
    const { transport: inner, calls } = createMockTransport()
    const buf = createBufferedTransport(inner)
    for (let i = 0; i < 99; i++) buf.log('debug', `msg-${i}`)
    expect(calls).toHaveLength(0)
    buf.log('debug', 'msg-99')
    expect(calls).toHaveLength(100)
  })
})
